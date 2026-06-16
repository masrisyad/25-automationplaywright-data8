# 🧪 Automated E2E Test: TS004 Kelasku Info Delete

This repository contains an automated UI test built with **TypeScript** and **Playwright**. It is designed to validate the **Delete/Remove** functionality of an informational post within the "Kelasku" (My Class) module.

Engineered for high reliability in volatile web environments, this script incorporates advanced Quality Engineering (QE) practices. It features multi-layered locator fallbacks, aggressive retry mechanisms with state verification, DOM telemetry dumping, automated PDF reporting, and email dispatch integration.

---

## ✨ Architectural Highlights & QE Features

* **Advanced State Verification & Retry Logic:** The `enterClassIfNeeded` function doesn't just click and wait; it implements a robust 3-attempt loop. It checks for URL mutations, workspace indicators (like the presence of edit/delete icons), and falls back to forced clicks if standard UI interactions are intercepted.
* **Smart UI Fallbacks (Self-Healing):** If the Delete/Trash icon is not immediately found on the main dashboard, the script automatically navigates into the specific Class Detail view to locate the deletion controls from within the workspace.
* **Intelligent Dialog Handling:** Automatically detects and confirms modal popups (e.g., "Ya", "Hapus", "OK") without hard-crashing if the application removes the confirmation step in future updates.
* **DOM Telemetry (Debugging Dumps):** If a critical interaction fails or state verification hangs, the script dumps the current URL, page title, textual content, and all button states to the console. This localized telemetry drastically reduces triage and debugging time for broken builds.
* **Comprehensive Reporting:** Automatically compiles execution logs and captures the final visual state, packaging them into a professional PDF report.

---

## 📋 Prerequisites

To run this test locally or within a CI/CD pipeline, ensure the following are installed:

* **Node.js** (v16.x or higher recommended)
* **npm** or **yarn** (Package managers)

### Setup & Installation

1. Install the core dependencies defined in your project:
```bash
npm install

```



```
2. Install Playwright's required browser binaries:
   ```bash
npx playwright install chromium

```

---

## ⚙️ Configuration (.env)

The test suite relies on environment variables for flexible execution across different environments. Ensure a `.env` file is present in your root directory with the following base configurations:

| Environment Variable | Description | Default Value |
| --- | --- | --- |
| `HEADLESS` | Boolean flag to run the browser without a GUI (ideal for CI). | `true` |
| `TIMEOUT_MS` | Maximum allowable time (in milliseconds) for an element to resolve. | `30000` |
| `WAIT_AFTER_ACTION_SECONDS` | Seconds to wait before taking the concluding screenshot. | `3` |
| `SEND_EMAIL` | Set to `true` to dispatch the finalized PDF report via email. | `false` |

*(Note: Dependencies such as authentication credentials and API keys are securely managed by the shared `automation_shared.js` module).*

---

## 🚀 Execution Guide

Run the script using your preferred TypeScript execution engine (e.g., `ts-node` or `tsx`):

```bash
npx tsx <filename>.ts

```

### 🔄 Test Execution Lifecycle

1. **Authentication & Setup:** Initializes an isolated Chromium context and executes the login sequence.
2. **Navigation:** Waits for loading spinners to clear, then navigates to the "Kelasku" module.
3. **Element Targeting & Fallback:**
* Iterates through an array of CSS/SVG/Role-based locators to find the Delete/Trash icon.
* *Fallback:* If not found, it opens the class details. It then utilizes a 3-attempt retry loop to enter the class workspace, verifying state changes via URL and DOM indicators.


4. **Deletion Confirmation:** Triggers the delete action and intelligently waits for and accepts confirmation dialogs.
5. **Teardown & Verification:** Captures visual evidence (`screenshot4_kelasku_info_delete.png`), gracefully terminates the browser context, and generates the final PDF report.

---

## 📂 Output Artifacts

Following completion, whether the test **PASSED** or **FAILED**, the following artifacts are securely generated in your working directory:

* **Visual Evidence:** `screenshot4_kelasku_info_delete.png`
* **Execution Report:** `test_report_kelasku_info_delete.pdf`

---

## 🛠️ Maintenance

* **Monitor the Retry Loop:** The script utilizes `button.click({ force: true })` inside the `enterClassIfNeeded` retry block. While this is an excellent tactical fix for flaky UI elements (like overlapping overlays), Quality Assurance teams should investigate *why* the standard click is failing. If a transparent overlay is blocking the user, it might be a legitimate frontend bug that needs addressing by the development team.
* **Telemetry Logs:** Always review the `DEBUG: Page state after attempting to enter class:` outputs in your CI pipeline logs if this test begins to fail. The dumped HTML state will immediately tell you if the frontend team changed a class name or drastically altered the DOM structure.
