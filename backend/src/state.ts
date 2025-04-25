import fs from 'fs'; // Use the core 'fs' module
import path from 'path';
import { Flashcard, BucketMap, AnswerDifficulty } from "./logic/flashcards"; // Adjust path if needed relative to 'src'
import { PracticeRecord } from "./types"; // Adjust path if needed relative to 'src'

// --- Configuration ---
const STATE_FILE_PATH = path.resolve(__dirname, '..', 'data', 'state.json'); // Resolves path relative to the compiled JS file location (likely in dist/src)
const DATA_DIR = path.dirname(STATE_FILE_PATH);

// --- Helper Functions (Internal) ---

// Defines the default state when no save file is found
function getDefaultState(): { buckets: BucketMap; history: PracticeRecord[]; currentDay: number } {
  console.log("Using default initial state (empty). No save file found or loaded.");
  return {
    buckets: new Map<number, Set<Flashcard>>(), // Start completely empty
    history: [],
    currentDay: 0,
  };
}

// Synchronously loads state from the JSON file
function loadStateSync(): { buckets: BucketMap; history: PracticeRecord[]; currentDay: number } {
  try {
    if (!fs.existsSync(STATE_FILE_PATH)) {
      // File doesn't exist, use default
      return getDefaultState();
    }

    const jsonString = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
    const loadedData = JSON.parse(jsonString);

    // Convert loaded plain objects back into Map and Set<Flashcard>
    const loadedBuckets = new Map<number, Set<Flashcard>>();
    if (loadedData.buckets && Array.isArray(loadedData.buckets)) {
       // Type assertion for the structure we expect after JSON parse
       type CardObject = { front: string; back: string; hint?: string; tags?: string[] };
       type BucketFromFile = { bucketNumber: number; cards: CardObject[] };

       loadedData.buckets.forEach((bucketFromFile: BucketFromFile) => {
         const cardSet = new Set<Flashcard>();
         if (bucketFromFile.cards && Array.isArray(bucketFromFile.cards)) {
           bucketFromFile.cards.forEach((cardObj: CardObject) => {
             // Recreate Flashcard instances, providing defaults for optional fields
             cardSet.add(new Flashcard(
                cardObj.front,
                cardObj.back,
                cardObj.hint || '', // Default hint if missing
                cardObj.tags || []   // Default tags if missing
              ));
           });
         }
         // Ensure bucketNumber is treated as a number
         loadedBuckets.set(Number(bucketFromFile.bucketNumber), cardSet);
       });
    }

    // Load history, default to empty array if missing or not an array
    const loadedHistory: PracticeRecord[] = (loadedData.history && Array.isArray(loadedData.history))
      ? loadedData.history
      : [];

    // Load current day, default to 0 if missing or not a number
    const loadedDay: number = (typeof loadedData.currentDay === 'number')
      ? loadedData.currentDay
      : 0;

    console.log(`State loaded successfully from ${STATE_FILE_PATH}. Day: ${loadedDay}, Buckets: ${loadedBuckets.size}, History: ${loadedHistory.length}`);
    return { buckets: loadedBuckets, history: loadedHistory, currentDay: loadedDay };

  } catch (error: any) {
    console.error(`ERROR loading state from ${STATE_FILE_PATH}:`, error.message);
    console.error("Falling back to default state due to error.");
    return getDefaultState();
  }
}

// Synchronously saves the current state variables to the JSON file
function saveStateSync(): void {
  try {
    // Convert current Map<number, Set<Flashcard>> to a serializable array format
    const serializableBuckets = Array.from(currentBuckets.entries()).map(([bucketNumber, cardSet]) => ({
        bucketNumber: bucketNumber,
        // Convert Set<Flashcard> to Array of plain objects for JSON
        cards: Array.from(cardSet).map(card => ({
          front: card.front,
          back: card.back,
          hint: card.hint,
          tags: card.tags,
        })),
      }));

    const stateToSave = {
      currentDay: currentDay,
      buckets: serializableBuckets,
      history: practiceHistory, // History is already an array of objects
    };

    const jsonString = JSON.stringify(stateToSave, null, 2); // Pretty print JSON

    // Ensure data directory exists before writing
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`Created data directory: ${DATA_DIR}`);
    }

    fs.writeFileSync(STATE_FILE_PATH, jsonString, 'utf-8');
    // console.log("State saved successfully."); // Optional: Can be noisy

  } catch (error: any) {
    // Log errors during save but don't crash the server
    console.error(`ERROR saving state to ${STATE_FILE_PATH}:`, error.message);
  }
}

// --- Initialize State Variables ONCE on module load ---
// Call loadStateSync immediately to load initial state from file or defaults
let { buckets: initialBuckets, history: initialHistory, currentDay: initialDay } = loadStateSync();

// These are the module-level variables holding the current state
let currentBuckets: BucketMap = initialBuckets;
let practiceHistory: PracticeRecord[] = initialHistory;
let currentDay: number = initialDay;

// --- Exported Functions ---

// Accessors (Read the current state)
export function getBucket(): BucketMap {
  return currentBuckets;
}

export function getHistory(): PracticeRecord[] {
  return practiceHistory;
}

export function getCurrentDay(): number {
  return currentDay;
}

// Finders (Read without modifying state)
export function findCard(front: string, back: string): Flashcard | undefined {
  for (let bucket of currentBuckets.values()) {
    for (let card of bucket) {
      if (card.front === front && card.back === back) {
        return card;
      }
    }
  }
  return undefined; // Return undefined if not found
}

export function findCardBucket(cardToFind: Flashcard): number | undefined {
  for (let [key, value] of currentBuckets) {
    if (value.has(cardToFind)) {
      return key;
    }
  }
  return undefined; // Return undefined if not found
}


// Mutators (Modify state AND save)
export function setBucket(newBucket: BucketMap): void {
  currentBuckets = newBucket;
  saveStateSync(); // Save after modifying
}

export function addHistoryRecord(record: PracticeRecord): void {
  practiceHistory.push(record);
  saveStateSync(); // Save after modifying
}

export function incrementDay(): void {
  currentDay++;
  saveStateSync(); // Save after modifying
}

export function createCard(front: string, back: string, hint: string, tag: ReadonlyArray<string>): Flashcard {
  const newCard = new Flashcard(front, back, hint, tag);
  // Get bucket 0, or create it if it doesn't exist
  const bucketZero = currentBuckets.get(0) || new Set<Flashcard>();
  bucketZero.add(newCard); // Add the new card instance
  currentBuckets.set(0, bucketZero); // Put the updated Set back into the Map
  saveStateSync(); // Save after modifying
  return newCard;
}

