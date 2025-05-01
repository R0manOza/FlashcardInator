document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const cardContainer = document.getElementById('flashcardContainer');
    const cardInner = document.getElementById('flashcardInner');
    const cardFront = document.getElementById('cardFront');
    const cardBack = document.getElementById('cardBack');
    const controlsDiv = document.getElementById('controls');
    const showAnswerBtn = document.getElementById('showAnswerBtn');
    const feedbackBtnsDiv = document.getElementById('feedbackBtns');
    const getHintBtn = document.getElementById('hintBtn');
    const hintspace = document.getElementById('hintspace');

    let cards = [];
    let currentIndex = 0;
    let isFlipped = false;
    let isLoading = true;

    async function fetchQuickPracticeCards() {
        try {
            const response = await fetch('http://localhost:3001/api/quick-practice');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            cards = data.cards || [];
            isLoading = false;
            setupSession();
        } catch (error) {
            console.error("Error fetching quick practice cards:", error);
            statusDiv.textContent = 'Error loading cards. Is the backend running?';
            isLoading = false;
        }
    }

    function setupSession() {
        if (cards.length === 0) {
            statusDiv.textContent = '🎉 No cards available for quick practice!';
            cardContainer.style.display = 'none';
            controlsDiv.style.display = 'none';
        } else {
            statusDiv.style.display = 'none'; // Hide loading message
            cardContainer.style.display = 'block';
            controlsDiv.style.display = 'block';
            currentIndex = 0;
            displayCard();
        }
    }

    function displayCard() {
        if (currentIndex >= cards.length) {
            finishSession();
            return;
        }
        const card = cards[currentIndex];
        cardFront.textContent = card.front;
        cardBack.textContent = card.back;
        isFlipped = false;
        cardInner.classList.remove('flipped');
        showAnswerBtn.style.display = 'inline-block';
        getHintBtn.style.display = 'inline-block';
        feedbackBtnsDiv.style.display = 'none';
        hintDisplay.textContent = ''; // Clear previous hint
        hintDisplay.style.display = 'none'; 
    }

    function flipCard() {
        isFlipped = !isFlipped;
        cardInner.classList.toggle('flipped');
        showAnswerBtn.style.display = 'none'; // Hide after showing answer
        getHintBtn.style.display = 'none';
        feedbackBtnsDiv.style.display = 'block';
    }
    function showHint() {
        if (currentIndex < cards.length && hintDisplay && getHintBtn) {
            const card = cards[currentIndex];
            // Use the hint from the card data, provide a default if empty/null
            const hintText = card.hint || "No hint available for this card.";
            hintDisplay.textContent = `Hint: ${hintText}`;
            hintDisplay.style.display = 'block'; // Show the hint paragraph
            getHintBtn.style.display = 'none'; // Hide the hint button itself
        }
    }

    function nextCard() {
        currentIndex++;
        displayCard();
    }

    function finishSession() {
         statusDiv.textContent = '🎉 Quick Practice Finished!';
         statusDiv.style.display = 'block';
         cardContainer.style.display = 'none';
         controlsDiv.style.display = 'none';
    }

    // --- Event Listeners ---
    if (showAnswerBtn) {
        showAnswerBtn.addEventListener('click', flipCard);
    }
    if (getHintBtn) {
        getHintBtn.addEventListener('click', showHint);
    }

    if (feedbackBtnsDiv) {
        feedbackBtnsDiv.addEventListener('click', (event) => {
            if (event.target && event.target.matches('button[data-action="next"]')) {
                nextCard();
            }
        });
    }

    // --- Initial Load ---
    fetchQuickPracticeCards();
});