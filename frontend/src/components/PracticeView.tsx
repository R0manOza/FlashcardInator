import React, { useState, useEffect } from "react";
import { Flashcard, AnswerDifficulty } from "../types";
import { fetchPracticeCards, submitAnswer, advanceDay, fetchHint,newCard} from "../services/api";
import { CSSProperties } from "react";

const styles: Record<string, CSSProperties> = {
  container: {
    textAlign: "center",
    padding: "20px",
    backgroundColor: "teal",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#433A3F", // Warm dark text
  },
  cardContainer: {
    perspective: "1000px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "20px",
  },
  card: {
    width: "300px",
    height: "200px",
    position: "relative",
    transformStyle: "preserve-3d",
    transition: "transform 0.6s",
    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
  },
  cardFlipped: {
    transform: "rotateY(180deg)",
  },
  cardFace: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    borderRadius: "15px",
    fontSize: "20px",
    padding: "20px",
    boxSizing: "border-box",
  },
  front: {
    backgroundColor: "#4A90E2", // Light blue for front
    color: "white",
  },
  back: {
    backgroundColor: "#1A4B8C", // Darker blue for back
    color: "white",
    transform: "rotateY(180deg)",
  },
  button: {
    padding: "12px 24px",
    fontSize: "16px",
    borderRadius: "30px", // More rounded for elegance
    border: "none",
    cursor: "pointer",
    margin: "8px",
    transition: "all 0.3s ease",
    backgroundColor: "#F67280", // Warm coral
    color: "white",
    fontWeight: "500",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  buttonHover: {
    backgroundColor: "#E8616C",
    transform: "translateY(-2px)",
    boxShadow: "0 6px 8px rgba(0,0,0,0.15)",
  },
  showAnswerButton: {
    padding: "12px 24px",
    fontSize: "16px",
    borderRadius: "30px",
    border: "none",
    cursor: "pointer",
    margin: "8px",
    transition: "all 0.3s ease",
    backgroundColor: "#6C5B7B", // Purple hue
    color: "white",
    fontWeight: "500",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  nextDayButton: {
    padding: "12px 24px",
    fontSize: "16px",
    borderRadius: "30px",
    border: "none",
    cursor: "pointer",
    margin: "8px",
    transition: "all 0.3s ease",
    backgroundColor: "#C06C84", // Mauve
    color: "white",
    fontWeight: "500",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  answerButtons: {
    display: "flex",
    gap: "15px",
    justifyContent: "center",
    marginTop: "10px",
  },
  easyButton: {
    backgroundColor: "#7CB342", // Green
    color: "white",
    padding: "12px 24px",
    fontSize: "16px",
    borderRadius: "30px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontWeight: "500",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  hardButton: {
    backgroundColor: "#F9A825", // Dark yellow
    color: "white",
    padding: "12px 24px",
    fontSize: "16px",
    borderRadius: "30px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontWeight: "500",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  wrongButton: {
    backgroundColor: "#E53935", // Red
    color: "white",
    padding: "12px 24px",
    fontSize: "16px",
    borderRadius: "30px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontWeight: "500",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  hintButton: {
    backgroundColor: "#F2C1B6", // Light coral
    color: "#433A3F",
    padding: "10px 20px",
    fontSize: "14px",
    borderRadius: "30px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontWeight: "500",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    marginBottom: "10px",
  },
  hint: {
    color: "#6C5B7B",
    fontStyle: "italic",
    maxWidth: "80%",
    margin: "10px auto",
    backgroundColor: "rgba(255,255,255,0.3)",
    padding: "10px 15px",
    borderRadius: "10px",
  },
};

const PracticeView: React.FC = () => {
  const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  const loadPracticeCards = async () => {
    setIsLoading(true);
    setError(null);
    setSessionFinished(false);
    try {
      const session = await fetchPracticeCards();
      setPracticeCards(session.cards);
      setDay(session.day);
      setSessionFinished(session.cards.length === 0);
      setCurrentCardIndex(0);
      setShowBack(false);
      setIsFlipped(false);
    } catch (err) {
      setError("Failed to load practice session.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPracticeCards();
  }, []);

  const handleShowBack = () => {
    setShowBack(true);
    setIsFlipped(true);
  };

  const handleNewCard = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const front = prompt("Please enter what must be written on the front of the flashcard")?.trim();
      const back = prompt("Please enter what must be the answer of the flashcard")?.trim();
      const hint = prompt("Please enter what must be the hint for the flashcard")?.trim();
      const tag: ReadonlyArray<string> = prompt("Please enter tags for the flashcard, separated by commas")?.split(",").map(tag => tag.trim()) || [];
  
      // Manual validation before calling createCard
      if (!front || !back || !hint) {
        throw new Error("Front, back, and hint are required.");
      }
  
      
      await newCard(front, back, hint, tag);
      alert("New card created successfully!");
  
      // Optionally refresh the practice session to include the new card
      await loadPracticeCards();
  
    } catch (err) {
      setError("Failed to create new card.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAnswer = async (difficulty: AnswerDifficulty) => {
    const currentCard = practiceCards[currentCardIndex];
    if (!currentCard) return;``
    try {
      await submitAnswer(currentCard.front, currentCard.back, difficulty);
      if (currentCardIndex + 1 < practiceCards.length) {
        setCurrentCardIndex((prev) => prev + 1);
        setShowBack(false);
        setIsFlipped(false);
        setHint(null);
      } else {
        setSessionFinished(true);
        setPracticeCards([]);
        setCurrentCardIndex(0);
        setShowBack(false);
        setIsFlipped(false);
        setHint(null);
      }
    } catch (err) {
      setError("Failed to submit answer.");
    }
  };

  const handleNextDay = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await advanceDay();
      setDay(response.currentDay);
      await loadPracticeCards();
    } catch (err) {
      setError("Failed to advance day.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetHint = async () => {
    const currentCard = practiceCards[currentCardIndex];
    if (!currentCard) return;
    setLoadingHint(true);
    setHintError(null);
    setHint(null);
    try {
      const fetchedHint = await fetchHint(currentCard);
      setHint(fetchedHint);
    } catch (err) {
      setHintError("Could not load hint.");
    } finally {
      setLoadingHint(false);
    }
  };

  if (isLoading) return <p>Loading practice session...</p>;
  if (error) return <p style={{ color: "#E53935" }}>{error}</p>;
  if (sessionFinished)
    return (
      <div style={styles.container}>
        <p>🎉 Session complete! Come back tomorrow.</p>
        <button onClick={handleNextDay} style={styles.nextDayButton}>
          Go to Next Day
        </button>
      </div>
    );

  const currentCard = practiceCards[currentCardIndex];
  return (
    <div style={styles.container}>
      <h2>
        📅 Day {day} - Card {currentCardIndex + 1} of {practiceCards.length}
      </h2>
      <div style={styles.cardContainer}>
        <div style={{ ...styles.card, ...(isFlipped ? styles.cardFlipped : {}) }}>
          <div style={{ ...styles.cardFace, ...styles.front }}>{currentCard.front}</div>
          <div style={{ ...styles.cardFace, ...styles.back }}>{currentCard.back}</div>
        </div>
      </div>
      
      {!showBack && (
        <button onClick={handleGetHint} disabled={loadingHint} style={styles.hintButton}>
          {loadingHint ? "Loading Hint..." : "Get Hint"}
        </button>
      )}
      {hint && <p style={styles.hint}>Hint: {hint}</p>}
      {hintError && <p style={{ color: "#E53935" }}>{hintError}</p>}
  
      {!showBack ? (
        <button onClick={handleShowBack} style={styles.showAnswerButton}>Show Answer</button>
      ) : (
        <div style={styles.answerButtons}>
          <button onClick={() => handleAnswer(AnswerDifficulty.Easy)} style={styles.easyButton}>Easy</button>
          <button onClick={() => handleAnswer(AnswerDifficulty.Wrong)} style={styles.wrongButton}>Wrong</button>
          <button onClick={() => handleAnswer(AnswerDifficulty.Hard)} style={styles.hardButton}>Hard</button>
        </div>
      )}
  
      {/* Create New Card Button */}
      <button onClick={handleNewCard} style={styles.button}>
        ➕ Create New Card
      </button>
    </div>
  );  
};

export default PracticeView;