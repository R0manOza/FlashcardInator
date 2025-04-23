import React, { useState } from "react";
import { Flashcard } from "../types";
import { fetchHint } from "../services/api";

interface Props {
  card: Flashcard;
  showBack: boolean;
}

const FlashcardComponent: React.FC<Props> = ({ card, showBack }) => {
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  // Async function to handle fetching the hint
  const handleGetHint = async () => {
    setLoadingHint(true);
    setHintError(null);
    try {
      const hintText = await fetchHint(card);
      setHint(hintText);
    } catch (error) {
      setHintError("Failed to fetch hint.");
    } finally {
      setLoadingHint(false);
    }
  };

  return (
    <div style={styles.card}>
      <p style={styles.front}>{card.front}</p>
      <p style={styles.back}>{showBack ? card.back : "???"}</p>

      {!showBack && (
        <button
          onClick={handleGetHint}
          disabled={loadingHint}
          style={styles.button}
        >
          {loadingHint ? "Loading Hint..." : "Get Hint"}
        </button>
      )}

      {hint && <p style={styles.hint}>Hint: {hint}</p>}
      {hintError && <p style={styles.error}>{hintError}</p>}
    </div>
  );
};

// Basic inline styles
const styles = {
  card: {
    border: "2px solid #333",
    borderRadius: "8px",
    padding: "16px",
    width: "250px",
    textAlign: "center" as const,
    backgroundColor: "#f9f9f9",
    boxShadow: "3px 3px 10px rgba(0,0,0,0.1)",
    margin: "10px auto",
  },
  front: {
    fontSize: "18px",
    fontWeight: "bold",
  },
  back: {
    fontSize: "16px",
    margin: "10px 0",
  },
  button: {
    padding: "8px 12px",
    fontSize: "14px",
    cursor: "pointer",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#007BFF",
    color: "white",
    marginTop: "10px",
  },
  hint: {
    fontSize: "14px",
    color: "#28a745",
    marginTop: "10px",
  },
  error: {
    fontSize: "14px",
    color: "#d9534f",
    marginTop: "10px",
  },
};

export default FlashcardComponent;
