# Todo Checklist: Flashcard Chrome Extension (v1.0)

This checklist outlines the steps to build the Quick Flashcard Adder Chrome Extension based on the provided specification. Follow the steps sequentially, building and testing incrementally.

## Chunk 1: Project Setup & Context Menu Foundation

-   [ ] **1.1: Project Setup**
    -   [ ] Create project directory structure (`flashcard-extension/`, `src/`, `dist/`).
    -   [ ] Initialize `package.json` (`npm init -y`).
    *   [ ] Install TypeScript and necessary types (`@types/chrome`) as dev dependencies (`npm install --save-dev typescript @types/chrome`).
    -   [ ] Create initial `tsconfig.json` (target ES2020, module CommonJS, outDir `./dist`, rootDir `./src`, sourceMap true, strict true).
    -   [ ] Create initial `src/manifest.json` (v3, name, version, description, permissions: `contextMenus`, `scripting`, background service worker, minimal action).
    -   [ ] Create empty `src/background.ts`.
    -   [ ] Add build script to `package.json` (`"build": "tsc && cp src/manifest.json dist/"`).
    -   [ ] Run initial build (`npm run build`) and verify `dist/` content.
-   [ ] **1.2: Context Menu Creation (Background Script)**
    -   [ ] Modify `src/background.ts`.
    -   [ ] Add `chrome.runtime.onInstalled` listener.
    -   [ ] Inside listener, use `chrome.contextMenus.create` (id: "addAsFlashcard", title: "Add as Flashcard", contexts: ["selection"]).
    -   [ ] Build (`npm run build`).
    -   [ ] *Test:* Load unpacked extension, select text, right-click, verify menu item appears.
-   [ ] **1.3: Context Menu Click Handler (Background Script)**
    -   [ ] Modify `src/background.ts`.
    -   [ ] Add `chrome.contextMenus.onClicked` listener.
    -   [ ] Inside listener, check `menuItemId === "addAsFlashcard"`.
    -   [ ] Log `info.selectionText` to the background console.
    -   [ ] Build (`npm run build`).
    -   [ ] *Test:* Reload extension, select text, click menu item, check background console for selected text.

## Chunk 2: Message Passing & Content Script Basics

-   [ ] **2.1: Basic Content Script**
    -   [ ] Create `src/content.ts`.
    -   [ ] Add initial `console.log("Content script loaded.");`
    -   [ ] Ensure build process compiles `content.ts` to `dist/content.js`.
    -   [ ] Build (`npm run build`).
-   [ ] **2.2: Programmatic Injection & Basic Message Sending (Background -> Content)**
    -   [ ] Modify `src/background.ts` `onClicked` listener.
    -   [ ] Get active tab ID from `info.tab.id`.
    -   [ ] Use `chrome.scripting.executeScript` to inject `dist/content.js` into the active tab.
    -   [ ] After injection (handle async if needed, simple sequence for now), use `chrome.tabs.sendMessage` to send `{ type: "SHOW_MODAL_REQUEST", data: { backText: info.selectionText } }`.
    -   [ ] Remove console log from background script.
    -   [ ] Modify `src/content.ts`.
    -   [ ] Remove initial console log.
    -   [ ] Add `chrome.runtime.onMessage` listener.
    -   [ ] Inside listener, check for `message.type === "SHOW_MODAL_REQUEST"`.
    -   [ ] Log `message.data.backText` to the *page's* console.
    -   [ ] Build (`npm run build`).
    -   [ ] *Test:* Reload extension, select text, click menu item, check page's console for selected text.

## Chunk 3: Modal UI & Interaction

-   [ ] **3.1: Modal HTML Structure (Content Script)**
    -   [ ] Modify `src/content.ts`.
    -   [ ] Define modal HTML string (container ID `flashcard-modal`, elements with IDs: `flashcard-back-text`, `flashcard-front-input`, `flashcard-hint-input`, `flashcard-save-button`, `flashcard-cancel-button`, `flashcard-error-message`).
-   [ ] **3.2: Modal Injection and Removal (Content Script)**
    -   [ ] Modify `src/content.ts`.
    -   [ ] Implement `injectModal(htmlString)` function (append to body, check if exists).
    -   [ ] Implement `removeModal()` function (find by ID `flashcard-modal` and remove).
-   [ ] **3.3: Display Modal and Handle Cancel (Content Script)**
    -   [ ] Modify `src/content.ts` `onMessage` listener for `SHOW_MODAL_REQUEST`.
    -   [ ] Call `injectModal()`.
    -   [ ] Wait for DOM update if necessary (e.g., `setTimeout(..., 0)`).
    -   [ ] Find and populate `#flashcard-back-text` with `message.data.backText`.
    -   [ ] Find `#flashcard-cancel-button` and add click listener to call `removeModal()`.
    -   [ ] Build (`npm run build`).
    -   [ ] *Test:* Reload extension, select text, click menu item, verify modal appears with back text, verify Cancel button closes modal.

## Chunk 4: Save Flow Implementation (Mocked Backend)

-   [ ] **4.1: Input Validation (Content Script)**
    -   [ ] Modify `src/content.ts`.
    -   [ ] Implement `validateInputs()` function (get values from `#flashcard-front-input`, `#flashcard-hint-input`, check empty/whitespace).
    -   [ ] Return `{ isValid: boolean, frontError: string | null, hintError: string | null }`.
    -   [ ] Implement `displayValidationErrors(errors)` function (query `#flashcard-error-message`, clear, display errors).
-   [ ] **4.2: Save Button Logic & Message Sending (Content -> Background)**
    -   [ ] Modify `src/content.ts` `onMessage` listener (after modal setup).
    -   [ ] Find `#flashcard-save-button` and add click listener.
    -   [ ] Inside listener: call `validateInputs()`, call `displayValidationErrors()`.
    -   [ ] If valid: get front/back/hint values, send `{ type: "SAVE_FLASHCARD_REQUEST", data: { ... } }` message to background, call `removeModal()`.
    -   [ ] Build (`npm run build`).
    -   [ ] *Test:* Reload, trigger modal, test validation (empty inputs), fill inputs, click Save, verify modal closes.
-   [ ] **4.3: Background Listener for Save Request**
    -   [ ] Modify `src/background.ts`.
    -   [ ] Add/Modify `chrome.runtime.onMessage` listener.
    -   [ ] Check for `message.type === "SAVE_FLASHCARD_REQUEST"`.
    -   [ ] Log `message.data` to background console.
    -   [ ] Build (`npm run build`).
    -   [ ] *Test:* Reload, trigger modal, fill inputs, click Save, check background console for correct card data.

## Chunk 5: Gemini API Integration

-   [ ] **5.1: Mock Gemini API Call (Background Script)**
    -   [ ] Modify `src/background.ts`.
    -   [ ] Implement `mockCallGeminiAPI(backText)` async function (simulate delay, random success/fail, return `{ suggestedFront, error }`).
-   [ ] **5.2: Integrate Mock Gemini Call & Update Message (Background Script)**
    -   [ ] Modify `src/background.ts` `onClicked` listener (make async).
    -   [ ] `await mockCallGeminiAPI()` before sending message.
    -   [ ] Update `SHOW_MODAL_REQUEST` message payload to include `suggestedFront` and `geminiError`.
    -   [ ] Build (`npm run build`).
-   [ ] **5.3: Handle Gemini Result in Modal (Content Script)**
    -   [ ] Modify `src/content.ts` `onMessage` listener for `SHOW_MODAL_REQUEST`.
    -   [ ] Pre-fill `#flashcard-front-input` value if `message.data.suggestedFront` exists.
    -   [ ] Display `message.data.geminiError` in `#flashcard-error-message` if it exists.
    -   [ ] Build (`npm run build`).
    -   [ ] *Test:* Reload, trigger modal multiple times, verify 'Front' is sometimes pre-filled and Gemini error sometimes appears.
-   [ ] **5.4: Implement Real Gemini API Call (Background Script)**
    -   [ ] Modify `src/background.ts`.
    -   [ ] Add `GEMINI_API_KEY`, `GEMINI_API_ENDPOINT` constants (placeholders).
    -   [ ] Replace `mockCallGeminiAPI` with real `callGeminiAPI` using `fetch` (POST, body format, headers, error handling, response parsing).
    -   [ ] Update `onClicked` listener to call real function.
    -   [ ] Modify `src/manifest.json`.
    -   [ ] Add Gemini endpoint URL to `host_permissions`.
    -   [ ] Build (`npm run build`).
    -   [ ] **Action:** Replace placeholder API key/endpoint with real values.
    -   [ ] *Test:* Reload, trigger modal, verify 'Front' is pre-filled based on actual API call, test API error scenarios if possible.

## Chunk 6: Firebase API Integration

-   [ ] **6.1: Mock Firebase Save Function (Background Script)**
    -   [ ] Modify `src/background.ts`.
    -   [ ] Define `FlashcardData` interface.
    -   [ ] Implement `mockSaveToFirebase(cardData)` async function (log data, simulate delay, random resolve/reject).
-   [ ] **6.2: Integrate Mock Firebase Call (Background Script)**
    -   [ ] Modify `src/background.ts` `onMessage` listener for `SAVE_FLASHCARD_REQUEST` (make async).
    -   [ ] Create `cardData` object (with `difficulty: null`).
    -   [ ] Add `try/catch` around `await mockSaveToFirebase(cardData)`.
    -   [ ] Log success/error based on promise resolution/rejection.
    -   [ ] Build (`npm run build`).
    -   [ ] *Test:* Reload, save a card, check background console logs for mock save attempt and success/failure message.
-   [ ] **6.3: Implement Real Firebase Save Call (Background Script)**
    -   [ ] Modify `src/background.ts`.
    -   [ ] Add `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_COLLECTION_ID` constants (placeholders).
    -   [ ] Define Firestore REST API URL.
    -   [ ] Replace `mockSaveToFirebase` with real `saveToFirebase` using `fetch` (POST, Firestore document format, headers, error handling, re-throw error).
    -   [ ] Update `onMessage` listener to call real function (keep try/catch).
    -   [ ] Modify `src/manifest.json`.
    -   [ ] Add Firestore endpoint URL to `host_permissions`.
    -   [ ] Build (`npm run build`).
    -   [ ] **Action:** Replace placeholder Firebase details with real values.
    -   [ ] *Test:* Reload, save a card, check background console for logs, check Firebase console (Firestore database) to verify the document was created correctly. Test save failures if possible.

## Chunk 7: Final Polish & Error Handling

-   [ ] **7.1: Add Basic Modal Styling (Content Script)**
    -   [ ] Create `src/modal.css` (or define styles directly).
    -   [ ] Add CSS rules for modal positioning, background, border, shadow, z-index, text color, width.
    *   [ ] Add basic styling for inputs, buttons, error messages within the modal.
    -   [ ] Embed CSS rules within a `<style>` tag in the modal HTML string defined in `src/content.ts`.
    -   [ ] Build (`npm run build`).
    -   [ ] *Test:* Reload, trigger modal, verify basic styling is applied and modal is usable.
-   [ ] **7.2: Refine Error Display (Content Script)**
    -   [ ] Modify modal HTML string in `src/content.ts` for potentially separate/better error placeholders (e.g., small divs under inputs).
    -   [ ] Modify `displayValidationErrors` to target specific placeholders.
    -   [ ] Ensure Gemini errors are displayed clearly (e.g., in `#flashcard-error-message`).
    -   [ ] Update CSS within the modal `<style>` tag for error message styling (e.g., color: red).
    -   [ ] Build (`npm run build`).
    -   [ ] *Test:* Reload, trigger validation errors and Gemini errors (if possible), verify they display correctly and clearly.

## Final Steps & Testing

-   [ ] **Code Review:** Review all code for clarity, consistency, error handling, and adherence to spec.
-   [ ] **Replace Placeholders:** Double-check that all placeholder API keys and URLs have been replaced with actual values.
-   [ ] **End-to-End Testing:** Perform thorough manual testing as outlined in the specification's "Testing Plan" section:
    -   [ ] Test on various websites.
    -   [ ] Test with different text selections.
    -   [ ] Test full Gemini success flow.
    -   [ ] Test full Gemini failure flow.
    -   [ ] Test validation errors.
    -   [ ] Test Cancel button.
    -   [ ] Verify data creation in Firebase for successful saves.
-   [ ] **Clean Up:** Remove unnecessary `console.log` statements used for debugging.
-   [ ] **Prepare for Distribution:** (Optional) Package the extension for distribution if needed.