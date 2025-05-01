
document.addEventListener('DOMContentLoaded', function() {
   
    const form = document.getElementById('createCardForm');
    const frontInput = document.getElementById('frontText');
    const backInput = document.getElementById('backText');
    const hintInput = document.getElementById('hintText');
    const tagsInput = document.getElementById('tags');
    const saveButton = document.getElementById('saveButton');
    const statusMessage = document.getElementById('statusMessage');
    const openPracticeButton = document.getElementById('openPracticePageBtn');
  
    console.log("Create Popup: DOM Loaded. Checking storage..."); // Log for debugging
  
    // --- Check storage for pending text ON LOAD (Fallback/Initial Fill) ---
    chrome.storage.local.get(['pendingFront', 'pendingBack'], (result) => {
      if (chrome.runtime.lastError) {
          console.error("Create Popup: Error getting storage:", chrome.runtime.lastError.message);
          
      } else {
          console.log("Create Popup: Initial storage state:", result);
          const keysToRemove = [];
  
          if (result.pendingFront && frontInput) {
            console.log("Create Popup: Initial fill - Found pendingFront:", result.pendingFront);
            frontInput.value = result.pendingFront;
            keysToRemove.push('pendingFront');
          }
          if (result.pendingBack && backInput) {
            console.log("Create Popup: Initial fill - Found pendingBack:", result.pendingBack);
            backInput.value = result.pendingBack;
            keysToRemove.push('pendingBack');
          }
  
          // --- Immediately clear used storage items ---
          if (keysToRemove.length > 0) {
            chrome.storage.local.remove(keysToRemove, () => {
              if (chrome.runtime.lastError) {
                console.error("Create Popup: Error clearing storage on load:", chrome.runtime.lastError.message);
              } else {
                console.log("Create Popup: Cleared used keys from storage on load:", keysToRemove);
              }
            });
          }
      }
    }); // End of chrome.storage.local.get on load
  
    // --- ADD Message Listener for updates ---
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("Create Popup: Received message:", message);
      if (message.type === "PREFILL_FIELD" && message.payload) {
        const { field, text } = message.payload;
        if (field === 'front' && frontInput) {
          console.log("Create Popup: Pre-filling front via message:", text);
          frontInput.value = text;
          // Clear the corresponding storage item as message confirms receipt
          chrome.storage.local.remove('pendingFront');
        } else if (field === 'back' && backInput) {
          console.log("Create Popup: Pre-filling back via message:", text);
          backInput.value = text;
          // Clear the corresponding storage item as message confirms receipt
          chrome.storage.local.remove('pendingBack');
        }
      }
      
      return false; // Indicate synchronous response (or no response needed)
    });
  
    // --- Form Submission Logic (using fetch -) ---
    if (form && frontInput && backInput && hintInput && tagsInput && saveButton && statusMessage) {
      form.addEventListener('submit', async function(event) {
          event.preventDefault();
          // ... fetch logic  ...
           statusMessage.textContent = ''; statusMessage.className = '';
          const frontText = frontInput.value.trim();
          const backText = backInput.value.trim();
          if (!frontText || !backText) {
              statusMessage.textContent = 'Front and Back fields are required.'; statusMessage.className = 'error'; return;
          }
          const hintText = hintInput.value.trim();
          const tagsString = tagsInput.value.trim();
          const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
          const cardData = { front: frontText, back: backText, hint: hintText, tag: tags };
          const CREATE_CARD_URL = 'http://localhost:3001/api/createCard';
          statusMessage.textContent = 'Saving...'; saveButton.disabled = true;
          try {
              const response = await fetch(CREATE_CARD_URL, {
                  method: 'POST', headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(cardData),
              });
              saveButton.disabled = false;
              if (response.ok) {
                  const result = await response.json();
                  statusMessage.textContent = result.message || 'Card saved successfully!'; statusMessage.className = 'success';
                  form.reset();
              } else {
                  let errorMessage = `Error: ${response.status} ${response.statusText}`;
                  try { const errorResult = await response.json(); errorMessage = `Error: ${errorResult.error || errorMessage}`; } catch (e) {}
                  statusMessage.textContent = errorMessage; statusMessage.className = 'error';
              }
          } catch (error) {
              console.error("Network error:", error); saveButton.disabled = false;
              statusMessage.textContent = 'Network error. Is the backend server running?'; statusMessage.className = 'error';
          }
      }); // End form submit listener
    } else {
        console.error("Create Popup: One or more form elements not found for submit listener.");
    }
  
    // --- Open Practice Page Button Logic ---
    if (openPracticeButton) {
      openPracticeButton.addEventListener('click', function() {
        const practicePageUrl = chrome.runtime.getURL('practice_page.html');
        chrome.tabs.create({ url: practicePageUrl });
      });
    }

    function boom(){
      confetti({
        particleCount: 160,
        spread: 70,
        origin: { y: 0.65 }
      });
    }
    
    // after DOM loads…
    document.addEventListener('DOMContentLoaded', ()=>{
      const form   = document.getElementById('createCardForm');
      const status = document.getElementById('statusMessage');
    
      form.addEventListener('submit', async e=>{
        e.preventDefault();
        // … your existing fetch logic …
        // pretend success:
        status.textContent = 'Saved! 💥 Knowledge +1';
        status.className   = 'success';
        boom();                // launch confetti
        new Audio(chrome.runtime.getURL('sfx/ta-da.mp3')).play()
          .catch(()=>{/* ignore autoplay block */});
        form.reset();
      });
    });
  
  }); // End DOMContentLoaded