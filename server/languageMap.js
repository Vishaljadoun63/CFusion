/**
 * CFusion - Judge0 Language Mapping Engine
 * Translates CFusion language keys to verified Judge0 language IDs
 */

// Baseline default mappings (standard Judge0 CE)
const DEFAULT_LANGUAGE_MAP = {
  cpp17: 54,   // C++ (GCC 9.2.0)
  cpp20: 105,  // C++ (GCC 14.1.0)
  python3: 92, // Python (3.11.2)
  java: 91     // Java (JDK 17.0.6)
};

// Active runtime map (populated with env overrides and verified against Judge0 /languages)
let activeLanguageMap = { ...DEFAULT_LANGUAGE_MAP };
let verifiedWithJudge0 = false;
let availableJudge0Languages = [];

/**
 * Load environment variable overrides if provided
 */
export function loadEnvLanguageOverrides() {
  if (process.env.JUDGE0_LANG_CPP17) {
    activeLanguageMap.cpp17 = parseInt(process.env.JUDGE0_LANG_CPP17, 10);
  }
  if (process.env.JUDGE0_LANG_CPP20) {
    activeLanguageMap.cpp20 = parseInt(process.env.JUDGE0_LANG_CPP20, 10);
  }
  if (process.env.JUDGE0_LANG_PYTHON3) {
    activeLanguageMap.python3 = parseInt(process.env.JUDGE0_LANG_PYTHON3, 10);
  }
  if (process.env.JUDGE0_LANG_JAVA) {
    activeLanguageMap.java = parseInt(process.env.JUDGE0_LANG_JAVA, 10);
  }
}

/**
 * Verify language IDs against target Judge0 /languages endpoint
 */
export async function verifyLanguages(judge0ApiUrl, headers = {}) {
  loadEnvLanguageOverrides();

  try {
    const url = `${judge0ApiUrl.replace(/\/+$/, '')}/languages`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      console.warn(`[CFusion Server] Warning: Could not verify /languages with Judge0 (${res.status} ${res.statusText}). Using default mappings.`);
      return activeLanguageMap;
    }

    const languages = await res.json();
    if (!Array.isArray(languages)) {
      console.warn('[CFusion Server] Warning: Unexpected /languages response format. Using defaults.');
      return activeLanguageMap;
    }

    availableJudge0Languages = languages;
    const idMap = new Map(languages.map(l => [l.id, l.name]));

    // Check each CFusion language
    for (const [cfusionId, judge0Id] of Object.entries(activeLanguageMap)) {
      if (idMap.has(judge0Id)) {
        console.log(`[CFusion Server] Language verified: ${cfusionId} -> ID ${judge0Id} (${idMap.get(judge0Id)})`);
      } else {
        // Fallback auto-discovery
        console.warn(`[CFusion Server] Warning: Configured ID ${judge0Id} for ${cfusionId} not found on Judge0 instance. Searching alternatives...`);
        const alt = findAlternativeLanguage(cfusionId, languages);
        if (alt) {
          activeLanguageMap[cfusionId] = alt.id;
          console.log(`[CFusion Server] Discovered alternative for ${cfusionId}: ID ${alt.id} (${alt.name})`);
        } else {
          console.error(`[CFusion Server] Error: No compatible runtime found for ${cfusionId} on this Judge0 instance.`);
        }
      }
    }

    verifiedWithJudge0 = true;
    return activeLanguageMap;
  } catch (err) {
    console.warn(`[CFusion Server] Could not reach Judge0 /languages during verification: ${err.message}. Using configured defaults.`);
    return activeLanguageMap;
  }
}

/**
 * Heuristic fallback to match languages if default ID is missing on custom Judge0 instances
 */
function findAlternativeLanguage(cfusionId, languages) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (cfusionId === 'cpp17' || cfusionId === 'cpp20') {
    return languages.find(l => {
      const n = normalize(l.name);
      return n.includes('c') && (n.includes('gcc') || n.includes('clang'));
    });
  }

  if (cfusionId === 'python3') {
    return languages.find(l => {
      const n = normalize(l.name);
      return n.includes('python3') || (n.includes('python') && !n.includes('2'));
    });
  }

  if (cfusionId === 'java') {
    return languages.find(l => {
      const n = normalize(l.name);
      return n.includes('java') && (n.includes('jdk') || n.includes('openjdk'));
    });
  }

  return null;
}

/**
 * Get Judge0 language ID for a CFusion language identifier
 */
export function getJudge0LanguageId(cfusionLangId) {
  if (!cfusionLangId || typeof cfusionLangId !== 'string') {
    throw new Error('Language ID is required and must be a string.');
  }

  const normalized = cfusionLangId.trim().toLowerCase();
  const judge0Id = activeLanguageMap[normalized];

  if (!judge0Id) {
    const supported = Object.keys(activeLanguageMap).join(', ');
    throw new Error(`Unsupported languageId "${cfusionLangId}". Supported languages: ${supported}`);
  }

  return judge0Id;
}

/**
 * Get current language map summary
 */
export function getActiveLanguageMap() {
  return { ...activeLanguageMap };
}

/**
 * Check if languages have been verified
 */
export function isLanguagesVerified() {
  return verifiedWithJudge0;
}
