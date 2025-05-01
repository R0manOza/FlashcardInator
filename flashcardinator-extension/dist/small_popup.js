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
    if(quickpracticeButton) {
      quickpracticeButton.addEventListener('click', function() {
        const quickPracticeUrl = chrome.runtime.getURL('quick_practice.html');
        const windowWidth = 380; 
        const windowHeight = 500;
  
        chrome.windows.create({
          url: quickPracticeUrl,
          type: 'popup',
          width: windowWidth,
          height: windowHeight
        });
        window.close();
      
      })
    }else{
      console.error("Button with ID 'goToquickpractice' not found in small_popup.html .");
    }
  });