
// nika don't forget this shit is the meat and potaotes this is what needs the most testing !
const CREATE_POPUP_URL = chrome.runtime.getURL('create_popup.html');
let createPopupId: number | null = null; // Track window ID (will be imperfect due to service worker lifecycle)

// --- Function to Setup Context Menus ---
function setupContextMenus() {
  // Use chrome.contextMenus.create inside onInstalled or onStartup
  chrome.contextMenus.create({
    id: "addAsFront",
    title: "Use Selection as Front",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "addAsBack",
    title: "Use Selection as Back",
    contexts: ["selection"]
  });
  console.log("Background: Context menus setup/verified.");
}

// --- Event Listeners ---
chrome.runtime.onInstalled.addListener(() => {
  console.log("Background: onInstalled event received.");
  chrome.contextMenus.removeAll(() => { // Clear first
    if (chrome.runtime.lastError) {
        console.error("Background: Error removing context menus:", chrome.runtime.lastError);
    }
    setupContextMenus();
  });
});

chrome.runtime.onStartup.addListener(() => {
    console.log("Background: onStartup event received.");
    setupContextMenus();
});

// --- Find Create Popup Window Function ---
async function findOrCreateWindow(): Promise<{ windowId: number | undefined, tabId: number | undefined }> {
    try {
        // Try getting the last known window ID (might be invalid if closed)
        const result = await chrome.storage.local.get('createWindowId');
        if (result.createWindowId) {
            try {
                // Check if the window actually exists
                const win = await chrome.windows.get(result.createWindowId, { populate: true });
                //  Verify it still has the correct URL, 
                const currentTab = win.tabs?.find(tab => tab.active);
                if (win && currentTab && currentTab.url === CREATE_POPUP_URL) {
                    console.log("Background: Found existing window:", win.id);
                    return { windowId: win.id, tabId: currentTab.id };
                } else {
                    // Window exists but isn't our popup or no active tab? Clear storage.
                    await chrome.storage.local.remove('createWindowId');
                }
            } catch (e) {
                // Window with that ID doesn't exist anymore
                console.log("Background: Stored window ID not found, creating new window.");
                await chrome.storage.local.remove('createWindowId');
            }
        }
    } catch (storageError) {
         console.error("Background: Error accessing storage for window ID:", storageError);
    }

    // If we're here, window wasn't found or ID was invalid - create a new one
    console.log("Background: Creating new window.");
    const windowWidth = 400;
    const windowHeight = 450;
    const newWindow = await chrome.windows.create({
        url: CREATE_POPUP_URL,
        type: 'popup',
        width: windowWidth,
        height: windowHeight
    });

    if (newWindow?.id) {
         await chrome.storage.local.set({ createWindowId: newWindow.id });
         const currentTab = newWindow.tabs?.find(tab => tab.active);
         return { windowId: newWindow.id, tabId: currentTab?.id };
    } else {
        console.error("Background: Failed to create window.");
        return { windowId: undefined, tabId: undefined };
    }
}

// --- Listen for window removal to clear storage ---
chrome.windows.onRemoved.addListener(async (windowId) => {
     const result = await chrome.storage.local.get('createWindowId');
     if (result.createWindowId === windowId) {
         console.log("Background: Create window closed, removing ID from storage.");
         await chrome.storage.local.remove('createWindowId');
     }
});


// --- Handle Context Menu Clicks ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText) return;

  const selectedText = info.selectionText.trim();
  const isFront = info.menuItemId === "addAsFront";
  const targetFieldKey = isFront ? 'pendingFront' : 'pendingBack';

  console.log(`Background: Storing "${selectedText}" for key "${targetFieldKey}"`);

  try {
    // 1. Store text temporarily (for the new window load)
    await chrome.storage.local.set({ [targetFieldKey]: selectedText });
    console.log("Background: Pending data stored.");

    // 2. Find existing window or create a new one
    const { windowId, tabId } = await findOrCreateWindow();

    if (windowId && tabId) {
         // 3. Focus the window
         await chrome.windows.update(windowId, { focused: true });
         console.log(`Background: Focused window ${windowId}.`);

         // 4. Send message to the tab inside the window to prefill
         try {
             await chrome.tabs.sendMessage(tabId, {
                type: "PREFILL_FIELD",
                payload: {
                   field: isFront ? 'front' : 'back', // Use simple 'front'/'back' for message
                   text: selectedText
                }
             });
             console.log(`Background: Sent PREFILL_FIELD message to tab ${tabId}.`);
             // Clear storage AFTER successfully sending message (or let popup clear it)
             // Consider clearing storage here if message passing is reliable enough
             // await chrome.storage.local.remove(targetFieldKey);
         } catch (msgError: any) {
             console.warn(`Background: Could not send message to tab ${tabId} (maybe not ready yet?):`, msgError.message);
             // Popup will pick it up from storage on load if message failed
         }
    } else {
        console.error("Background: Could not get window/tab ID to send message.");
        // Still stored the data, so new window should pick it up on load.
    }

  } catch (error) {
    console.error("Background: Error handling context menu click:", error);
  }
});

console.log("Background script loaded and listeners attached.");