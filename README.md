# CFusion — Codeforces Reimagined

> A modern, production-quality Chrome and Brave extension that transforms Codeforces into a sleek competitive programming workspace with integrated dark mode, Monaco Code Editor, and in-browser code execution.

---

## 🚀 Key Features

- **Phase 1 (Completed)**:
  - Manifest V3 architecture with Vite & React.
  - Zero-FOUC (Flash of Unstyled Content) modern dark theme (`#0B1120`).
  - Modern typography with `Inter` and `JetBrains Mono`.
  - Polished cards, navigation, sample tests, and datatables.
  - Interactive Action Popup with live theme toggling via Chrome Storage API.
  - Preserves Codeforces' native authentication, rating colors, math formulas (MathJax), and form submissions.
- **Phase 2 (Upcoming)**: Deep UI redesign of Problemsets, Standings, Contests, and responsive layouts.
- **Phase 3 (Upcoming)**: Embedded Monaco Code Editor directly in problem pages.
- **Phase 4 (Upcoming)**: Judge0 API code execution with custom test cases.
- **Phase 5 (Upcoming)**: Multi-case test runner, problem bookmarks, local code storage.

---

## 🛠️ Tech Stack

- **Extension Framework**: Chrome Extension Manifest V3 (MV3)
- **Frontend**: React 18, Tailwind CSS, Lucide Icons
- **Bundler**: Vite & Rollup Multi-Entry
- **Code Editor**: Monaco Editor (Phase 3)
- **Execution**: Judge0 API (Phase 4)

---

## 📦 How to Build and Install in Chrome or Brave

### 1. Install Dependencies & Build
Open PowerShell in the project directory:

```bash
# 1. Install dependencies
npm install

# 2. Build the extension for production
npm run build
```

This generates the ready-to-load extension in the `dist/` directory.

### 2. Load the Unpacked Extension in Your Browser

#### In Google Chrome:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Browse to and select the `C:\CFusion\dist` folder.
5. You should now see **CFusion — Codeforces Reimagined** in your extensions list!

#### In Brave Browser:
1. Open Brave and navigate to `brave://extensions/`
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `C:\CFusion\dist` folder.

---

## 🧪 How to Test

1. Visit [Codeforces](https://codeforces.com/) or open any problem (e.g. [Problem 4A - Watermelon](https://codeforces.com/problemset/problem/4/A)).
2. Observe the instant modern dark theme, clean typography, rounded cards, and the `CFusion • Problem 4A` status badge in the bottom-right corner.
3. Open DevTools Console (`F12`) to see the CFusion greeting banner:
   ```
   [CFusion] Codeforces Reimagined active! 🚀
   [CFusion] Page Context detected: { type: 'problem', contestId: '4', problemIndex: 'A', isContest: false }
   ```
4. Click the **CFusion icon** in your browser toolbar to open the popup. Toggle theme or settings and observe immediate live updates!

---

## 🔄 Development Mode (Live Watch)

To rebuild automatically whenever you make changes to files:
```bash
npm run dev
```
After making changes, click the **Reload (⟳)** button on the extension card in `chrome://extensions`.
