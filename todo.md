# ✅ ToDo: Flashcard Chrome Extension (v1.0)

## ✅ 1. Overview

- [x] Chrome Extension to create flashcards from selected text
- [x] Uses Google Gemini to suggest the 'front' text
- [x] User provides a 'hint'
- [x] Saves to Firebase Firestore (shared DB)
- [x] Reviewing & difficulty updates handled elsewhere

## 🧠 2. Core Functionality: Adding a Flashcard

- [ ] Capture selected text on any webpage
- [ ] Add context menu item: "Add as Flashcard"
- [ ] On menu click: send selected text to Gemini API
- [ ] Modal appears regardless of Gemini success/failure
  - [ ] On success: pre-fill 'Front', display 'Back', editable 'Hint'
  - [ ] On failure: empty 'Front', error message, display 'Back'
- [ ] Modal UI:
  - [ ] Editable input for 'Front'
  - [ ] Non-editable display for 'Back'
  - [ ] Editable input for 'Hint'
  - [ ] 'Save' button
  - [ ] Optional 'Cancel' button or close (X)
- [ ] Client-side validation:
  - [ ] Error if 'Front' is empty
  - [ ] Error if 'Hint' is empty
- [ ] Save action:
  - [ ] Send validated data to background script
  - [ ] Save to Firebase Firestore with fields:
    - [ ] frontText
    - [ ] backText
    - [ ] hintText
    - [ ] difficulty = null
  - [ ] Remove modal after save or cancel

## 🏗️ 3. Technical Architecture

- [x] Language: TypeScript
- [x] Platform: Chrome Extension (Manifest V3)
- [ ] Background Script:
  - [ ] Setup context menu
  - [ ] Call Gemini API
  - [ ] Call Firebase API
  - [ ] Communicate with content script
- [ ] Content Script:
  - [ ] Inject modal
  - [ ] Populate modal
  - [ ] Handle user input & validation
  - [ ] Send data back to background
  - [ ] Remove modal

## 🔁 4. Data Flow

- [ ] Context menu -> Background -> Gemini
- [ ] Background -> Content -> Modal
- [ ] Modal -> Save -> Validate -> Background -> Firebase
- [ ] (Optional) Confirmation -> Modal removed

## 🗃️ 5. Database: Firebase Firestore

- [x] Shared DB with hardcoded API key
- [ ] Collection: `flashcards`
- [ ] Document structure:
  - [ ] frontText (string)
  - [ ] backText (string)
  - [ ] hintText (string)
  - [ ] difficulty: null

## 🤖 6. LLM: Google Gemini API

- [x] Auth via hardcoded API key
- [ ] Input: backText
- [ ] Output: generated frontText

## 🎨 7. UI/UX Design

- [ ] Context menu on selection only
- [ ] Modal styling (clean & unobtrusive)
- [ ] Fields: 'Front', 'Back', 'Hint'
- [ ] Save & Cancel buttons
- [ ] Error handling UI

## 🔌 8. API Integration

- [ ] Gemini API call in background script
- [ ] Parse Gemini response
- [ ] Firebase API call to save flashcard

## ❗ 9. Error Handling

- [ ] Gemini failure → empty 'Front' + error msg
- [ ] Front or Hint empty → field-specific error msg
- [ ] Firebase failure → log error or notify user
- [ ] General network errors → graceful handling

## 🔐 10. Security Considerations

- [x] Accept hardcoded API keys (v1.0 only)
- [ ] Use minimal permissions in `manifest.json`
- [ ] Note: future enhancements for auth & security

## 📄 11. Manifest File

- [ ] Manifest V3 with:
  - [ ] Permissions: contextMenus, scripting
  - [ ] Host permissions: Gemini, Firestore
  - [ ] Background: service_worker = background.js

## 🧪 12. Testing Plan

### Unit Tests

- [ ] Validate 'Front' and 'Hint' fields
- [ ] Message format tests (background <-> content)
- [ ] Mock Gemini & Firebase calls

### Integration Tests

- [ ] Full message passing: context menu -> modal -> Firebase

### Manual End-to-End Tests

- [ ] Install extension in Chrome
- [ ] Verify context menu on text selection
- [ ] Test Gemini success → modal shows prefilled front
- [ ] Test Gemini failure → modal shows empty front + error
- [ ] Test validation (empty inputs)
- [ ] Check Firestore for saved docs
- [ ] Test cancel/close modal

## 🚀 13. Future Considerations

- [ ] Add Firebase Auth
- [ ] Secure API key storage
- [ ] Per-user data collections
- [ ] Options/settings page
- [ ] Visual feedback on successful save
