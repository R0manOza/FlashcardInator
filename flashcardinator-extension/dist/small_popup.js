document.addEventListener('DOMContentLoaded', function() {
    const practiceButton = document.getElementById('goToPractice');
    const quickpracticeButton = document.getElementById('goToquickpractice');
  
    if (practiceButton) {
      practiceButton.addEventListener('click', function() {
        // Get the URL for the practice page within the extension
        const practicePageUrl = chrome.runtime.getURL('practice_page.html');
  
        // Use the chrome.tabs API to create a new tab
        chrome.tabs.create({ url: practicePageUrl });
        window.close();
      });
    } else {
      console.error("Button with ID 'goToPractice' not found in small_popup.html .");
    }
    if(quickpracticeButton) {//give me a sec gotta add some logic into backend 
      
    }
    else{
      console.error("Button with ID 'goToquickpractice' not found in small_popup.html .");
    }
  });