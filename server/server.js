/**
 * CFusion - Judge0 Local Proxy Server
 * Securely proxies execution requests to Judge0 without exposing credentials in client extensions.
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  verifyLanguages,
  getJudge0LanguageId,
  getActiveLanguageMap
} from './languageMap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment configuration from server/.env
dotenv.config({ path: resolve(__dirname, '.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '127.0.0.1';
const JUDGE0_API_URL = (process.env.JUDGE0_API_URL || 'https://ce.judge0.com').replace(/\/+$/, '');
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || '';

// Security: Construct upstream authentication headers without logging them
function getJudge0Headers() {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (JUDGE0_API_KEY) {
    // Support RapidAPI or direct Judge0 Auth tokens
    if (JUDGE0_API_HOST) {
      headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
      headers['X-RapidAPI-Host'] = JUDGE0_API_HOST;
    } else {
      headers['X-Auth-Token'] = JUDGE0_API_KEY;
    }
  }

  return headers;
}

// Security: Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : null;

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server) and chrome-extension://
    if (!origin) return callback(null, true);
    if (!allowedOrigins) {
      // By default allow localhost and Chrome extensions
      if (origin.startsWith('chrome-extension://') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.includes('codeforces.com')) {
        return callback(null, true);
      }
      return callback(null, true);
    }
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser with size limit to prevent payload flooding
app.use(express.json({ limit: '256kb' }));

// Rate limiting: 30 requests per minute per IP for code execution
const executionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit exceeded: Maximum 30 execution requests per minute. Please wait a moment.'
  }
});

/**
 * GET /api/health
 * Returns service status and Judge0 connectivity confirmation
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'CFusion Execution Server',
    judge0Configured: Boolean(JUDGE0_API_URL),
    authConfigured: Boolean(JUDGE0_API_KEY),
    supportedLanguages: Object.keys(getActiveLanguageMap())
  });
});

/**
 * Map Judge0 numeric status ID to clean CFusion execution response status
 */
function mapJudge0Status(statusObj) {
  const id = statusObj?.id || 0;
  const description = statusObj?.description || 'Unknown';

  switch (id) {
    case 3: // Accepted
    case 4: // Wrong Answer (standard execution without expected output)
      return { status: 'success', description: 'Accepted' };
    case 5: // Time Limit Exceeded
      return { status: 'time_limit', description: 'Time Limit Exceeded' };
    case 6: // Compilation Error
      return { status: 'compilation_error', description: 'Compilation Error' };
    case 7: // Runtime Error (SIGSEGV)
    case 8: // Runtime Error (SIGXFSZ)
    case 9: // Runtime Error (SIGFPE)
    case 10: // Runtime Error (SIGABRT)
    case 11: // Runtime Error (NZEC)
    case 12: // Runtime Error (Other)
      return { status: 'runtime_error', description };
    case 13: // Internal Error
    case 14: // Exec Format Error
      return { status: 'error', description };
    default:
      return { status: 'error', description };
  }
}

/**
 * POST /api/execute
 * Validates, submits, polls, and returns normalized execution results
 */
app.post('/api/execute', executionLimiter, async (req, res) => {
  try {
    const { languageId, sourceCode, stdin } = req.body;

    // 1. Request Validation
    if (!languageId || typeof languageId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "languageId" is required and must be a string.'
      });
    }

    if (typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "sourceCode" is required and cannot be empty.'
      });
    }

    if (stdin !== undefined && typeof stdin !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "stdin" must be a string if provided.'
      });
    }

    // 2. Resolve Judge0 Language ID
    let judge0LangId;
    try {
      judge0LangId = getJudge0LanguageId(languageId);
    } catch (langErr) {
      return res.status(400).json({
        success: false,
        error: langErr.message
      });
    }

    const headers = getJudge0Headers();

    // 3. Submit code to Judge0
    const submissionPayload = {
      source_code: sourceCode,
      language_id: judge0LangId,
      stdin: stdin || ''
    };

    const submitUrl = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`;
    const submitResponse = await fetch(submitUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(submissionPayload)
    });

    if (submitResponse.status === 401 || submitResponse.status === 403) {
      return res.status(502).json({
        success: false,
        error: 'Judge0 Authentication Error: Invalid or missing API key.'
      });
    }

    if (submitResponse.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Judge0 Queue Full: Upstream Judge0 service rate limit reached. Please retry in a few seconds.'
      });
    }

    if (!submitResponse.ok) {
      const errText = await submitResponse.text().catch(() => '');
      return res.status(502).json({
        success: false,
        error: `Judge0 Submission Failed (${submitResponse.status}): ${errText || submitResponse.statusText}`
      });
    }

    const submitData = await submitResponse.json();
    const token = submitData?.token;

    if (!token) {
      return res.status(502).json({
        success: false,
        error: 'Judge0 response did not contain a valid submission token.'
      });
    }

    // 4. Poll Judge0 until execution completes
    const MAX_POLL_ATTEMPTS = 25; // 25 attempts * 800ms ≈ 20 seconds maximum
    const POLL_INTERVAL_MS = 800;
    let attempts = 0;
    let executionResult = null;

    while (attempts < MAX_POLL_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      attempts++;

      const pollUrl = `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`;
      const pollResponse = await fetch(pollUrl, { headers });

      if (!pollResponse.ok) {
        continue;
      }

      const data = await pollResponse.json();
      const statusId = data.status?.id;

      // Status 1: In Queue, Status 2: Processing
      if (statusId && statusId > 2) {
        executionResult = data;
        break;
      }
    }

    if (!executionResult) {
      return res.status(504).json({
        success: false,
        error: 'Execution Timeout: Code execution took longer than the 20-second threshold.'
      });
    }

    // 5. Build Normalized Response
    const statusMapping = mapJudge0Status(executionResult.status);

    const normalizedResponse = {
      success: true,
      status: statusMapping.status,
      stdout: executionResult.stdout || '',
      stderr: executionResult.stderr || '',
      compile_output: executionResult.compile_output || '',
      time: executionResult.time ? `${executionResult.time}s` : null,
      memory: executionResult.memory ? `${executionResult.memory} KB` : null,
      statusDescription: statusMapping.description
    };

    return res.json(normalizedResponse);

  } catch (error) {
    console.error('[CFusion Server] Execution Error:', error.message);
    return res.status(500).json({
      success: false,
      error: `Server Error: ${error.message || 'An unexpected error occurred during execution.'}`
    });
  }
});

// Start Server and verify Judge0 languages
app.listen(PORT, HOST, async () => {
  console.log('====================================================');
  console.log(`[CFusion Server] Running at: http://${HOST}:${PORT}`);
  console.log(`[CFusion Server] Judge0 Endpoint: ${JUDGE0_API_URL}`);
  console.log(`[CFusion Server] Authentication: ${JUDGE0_API_KEY ? 'Configured (Secret)' : 'None (Public CE)'}`);
  console.log('====================================================');

  // Verify language mappings with upstream Judge0
  await verifyLanguages(JUDGE0_API_URL, getJudge0Headers());
});
