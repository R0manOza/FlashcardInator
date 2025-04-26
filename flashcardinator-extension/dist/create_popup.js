document.addEventListener('DOMContentLoaded', function() {
  // Get elements for the form
  const form = document.getElementById('createCardForm');
  const frontInput = document.getElementById('frontText');
  const backInput = document.getElementById('backText');
  const hintInput = document.getElementById('hintText');
  const tagsInput = document.getElementById('tags');
  const saveButton = document.getElementById('saveButton');
  const statusMessage = document.getElementById('statusMessage');

  // Get element for the open practice page button
  const openPracticeButton = document.getElementById('openPracticePageBtn');

  // Backend API endpoint URL
  const CREATE_CARD_URL = 'http://localhost:3001/api/createCard'; // Your backend endpoint

  // --- Form Submission Logic ---
  if (form) {
    form.addEventListener('submit', async function(event) { // Make the handler async
      event.preventDefault(); // Prevent default form submission

      // Clear previous status messages
      statusMessage.textContent = '';
      statusMessage.className = '';

      // --- Get values ---
      const frontText = frontInput.value.trim();
      const backText = backInput.value.trim();
      const hintText = hintInput.value.trim();
      const tagsString = tagsInput.value.trim();

      // --- Basic Validation ---
      if (!frontText || !backText) {
        statusMessage.textContent = 'Front and Back fields are required.';
        statusMessage.className = 'error';
        return; // Stop submission
      }

      // --- Prepare Data ---
      const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

      // *** Match the backend's expected body structure ***
      // Your backend '/api/createCard' expects: { front, back, hint, tag }
      // Note: backend expects 'tag' (singular) but takes an array
      const cardData = {
        front: frontText, // Use 'front' to match backend
        back: backText,   // Use 'back' to match backend
        hint: hintText,   // Use 'hint' to match backend
        tag: tags         // Use 'tag' (singular key) with the array value
      };

      // --- Send to Backend API using fetch ---
      statusMessage.textContent = 'Saving...';
      statusMessage.className = '';
      if(saveButton) saveButton.disabled = true; // Disable button while saving

      try {
        const response = await fetch(CREATE_CARD_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cardData),
        });

        // Re-enable button after fetch completes
        if(saveButton) saveButton.disabled = false;

        // Check if the request was successful (status code 2xx)
        if (response.ok) {
          const result = await response.json(); // Assuming backend sends JSON confirmation
          statusMessage.textContent = result.message || 'Card saved successfully!'; // Use message from backend if available
          statusMessage.className = 'success';
          if(form) form.reset(); // Clear form
          // Optional: close popup after a delay
          // setTimeout(() => window.close(), 1500);
        } else {
          // Handle HTTP errors (like 400, 409, 500)
          let errorMessage = `Error: ${response.status} ${response.statusText}`;
          try {
            // Try to get more specific error message from backend response body
            const errorResult = await response.json();
            errorMessage = `Error: ${errorResult.error || errorMessage}`;
          } catch (e) {
            // Ignore if response body is not JSON
          }
          statusMessage.textContent = errorMessage;
          statusMessage.className = 'error';
        }
      } catch (error) {
        // Handle network errors (fetch couldn't connect)
        console.error("Network error:", error);
        if(saveButton) saveButton.disabled = false; // Re-enable button
        statusMessage.textContent = 'Network error. Is the backend server running?';
        statusMessage.className = 'error';
      }
    });
  } else {
      console.error("Form with ID 'createCardForm' not found.");
  }

  // --- Open Practice Page Button Logic (Remains the same) ---
  if (openPracticeButton) {
    openPracticeButton.addEventListener('click', function() {
      const practicePageUrl = chrome.runtime.getURL('practice_page.html');
      chrome.tabs.create({ url: practicePageUrl });
    });
  } else {
      console.error("Button with ID 'openPracticePageBtn' not found.");
  }

}); // End DOMContentLoaded