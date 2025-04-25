document.addEventListener('DOMContentLoaded', function() {
    const openButton = document.getElementById('openPracticePage');
    if (openButton) {
      openButton.addEventListener('click', function() {
        // Define the URL of the practice page WITHIN the extension
        const practicePageUrl = chrome.runtime.getURL('index.html'); // We'll name the React app's host file this
  
        // Use the chrome.tabs API to create a new tab
        chrome.tabs.create({ url: practicePageUrl });
  
        // Optional: Close the popup window after clicking the button
        window.close();
      });
    } else {
      console.error("PRACTICE? PRACTICE? YOU THINK THIS IS A GAME? Button not found in popup.html  idot go  and fix it .");
    }
  });