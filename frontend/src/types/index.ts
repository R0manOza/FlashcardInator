export interface Flashcard {
    readonly front: string;
    readonly back: string;
    readonly hint?: string;
    readonly tags: ReadonlyArray<string>;
  }
  
  export enum AnswerDifficulty {
    Wrong = 0,
    Hard = 1,
    Easy = 2,
  }
  
// API response for practice session
export interface PracticeSession {
  cards: Flashcard[];
  day: number;
}

// Request structure for updating a card
export interface UpdateRequest {
  cardFront: string;
  cardBack: string;
  difficulty: AnswerDifficulty;
}

// Request structure for getting a hint
export interface HintRequest {
  cardFront: string;
  cardBack: string;
}

// Structure for progress statistics
export interface ProgressStats {
  total: number;
  correct: number;
  attempted: number;
  accuracy: number;
  distribution: Map<number, number>;
}

// Structure for practice history record
export interface PracticeRecord {
  cardFront: string;
  cardBack: string;
  timestamp: number;
  difficulty: AnswerDifficulty;
  previousBucket: number;
  newBucket: number;
}
