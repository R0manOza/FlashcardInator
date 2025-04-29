//the meat and potatos of this extension the thing that makes it BOOM! 0_O
// src/background.ts

// --- Function to Setup Context Menus ---
function setupContextMenus() {
    // Use chrome.contextMenus.create inside onInstalled or onStartup
    // Important: Check if menu item already exists before creating, or use removeAll first
    chrome.contextMenus.create({
      id: "addAsFront",
      title: "Use Selection as Front", // Clearer title
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "addAsBack",
      title: "Use Selection as Back", // Clearer title
      contexts: ["selection"]
    });
    console.log("Background: Context menus setup/verified.");
  }