"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBucket = getBucket;
exports.getHistory = getHistory;
exports.getCurrentDay = getCurrentDay;
exports.findCard = findCard;
exports.findCardBucket = findCardBucket;
exports.setBucket = setBucket;
exports.addHistoryRecord = addHistoryRecord;
exports.incrementDay = incrementDay;
exports.createCard = createCard;
const fs_1 = __importDefault(require("fs")); // Use the core 'fs' module
const path_1 = __importDefault(require("path"));
const flashcards_1 = require("./logic/flashcards"); // Adjust path if needed relative to 'src'
// --- Configuration ---
const STATE_FILE_PATH = path_1.default.resolve(__dirname, '..', 'data', 'state.json'); // Resolves path relative to the compiled JS file location (likely in dist/src)
const DATA_DIR = path_1.default.dirname(STATE_FILE_PATH);
// --- Helper Functions (Internal) ---
// Defines the default state when no save file is found
function getDefaultState() {
    console.log("Using default initial state (empty). No save file found or loaded.");
    return {
        buckets: new Map(), // Start completely empty
        history: [],
        currentDay: 0,
    };
}
// Synchronously loads state from the JSON file
function loadStateSync() {
    try {
        if (!fs_1.default.existsSync(STATE_FILE_PATH)) {
            // File doesn't exist, use default
            return getDefaultState();
        }
        const jsonString = fs_1.default.readFileSync(STATE_FILE_PATH, 'utf-8');
        const loadedData = JSON.parse(jsonString);
        // Convert loaded plain objects back into Map and Set<Flashcard>
        const loadedBuckets = new Map();
        if (loadedData.buckets && Array.isArray(loadedData.buckets)) {
            loadedData.buckets.forEach((bucketFromFile) => {
                const cardSet = new Set();
                if (bucketFromFile.cards && Array.isArray(bucketFromFile.cards)) {
                    bucketFromFile.cards.forEach((cardObj) => {
                        // Recreate Flashcard instances, providing defaults for optional fields
                        cardSet.add(new flashcards_1.Flashcard(cardObj.front, cardObj.back, cardObj.hint || '', // Default hint if missing
                        cardObj.tags || [] // Default tags if missing
                        ));
                    });
                }
                // Ensure bucketNumber is treated as a number
                loadedBuckets.set(Number(bucketFromFile.bucketNumber), cardSet);
            });
        }
        // Load history, default to empty array if missing or not an array
        const loadedHistory = (loadedData.history && Array.isArray(loadedData.history))
            ? loadedData.history
            : [];
        // Load current day, default to 0 if missing or not a number
        const loadedDay = (typeof loadedData.currentDay === 'number')
            ? loadedData.currentDay
            : 0;
        console.log(`State loaded successfully from ${STATE_FILE_PATH}. Day: ${loadedDay}, Buckets: ${loadedBuckets.size}, History: ${loadedHistory.length}`);
        return { buckets: loadedBuckets, history: loadedHistory, currentDay: loadedDay };
    }
    catch (error) {
        console.error(`ERROR loading state from ${STATE_FILE_PATH}:`, error.message);
        console.error("Falling back to default state due to error.");
        return getDefaultState();
    }
}
// Synchronously saves the current state variables to the JSON file
function saveStateSync() {
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
        if (!fs_1.default.existsSync(DATA_DIR)) {
            fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`Created data directory: ${DATA_DIR}`);
        }
        fs_1.default.writeFileSync(STATE_FILE_PATH, jsonString, 'utf-8');
        // console.log("State saved successfully."); // Optional: Can be noisy
    }
    catch (error) {
        // Log errors during save but don't crash the server
        console.error(`ERROR saving state to ${STATE_FILE_PATH}:`, error.message);
    }
}
// --- Initialize State Variables ONCE on module load ---
// Call loadStateSync immediately to load initial state from file or defaults
let { buckets: initialBuckets, history: initialHistory, currentDay: initialDay } = loadStateSync();
// These are the module-level variables holding the current state
let currentBuckets = initialBuckets;
let practiceHistory = initialHistory;
let currentDay = initialDay;
// --- Exported Functions ---
// Accessors (Read the current state)
function getBucket() {
    return currentBuckets;
}
function getHistory() {
    return practiceHistory;
}
function getCurrentDay() {
    return currentDay;
}
// Finders (Read without modifying state)
function findCard(front, back) {
    for (let bucket of currentBuckets.values()) {
        for (let card of bucket) {
            if (card.front === front && card.back === back) {
                return card;
            }
        }
    }
    return undefined; // Return undefined if not found
}
function findCardBucket(cardToFind) {
    for (let [key, value] of currentBuckets) {
        if (value.has(cardToFind)) {
            return key;
        }
    }
    return undefined; // Return undefined if not found
}
// Mutators (Modify state AND save)
function setBucket(newBucket) {
    currentBuckets = newBucket;
    saveStateSync(); // Save after modifying
}
function addHistoryRecord(record) {
    practiceHistory.push(record);
    saveStateSync(); // Save after modifying
}
function incrementDay() {
    currentDay++;
    saveStateSync(); // Save after modifying
}
function createCard(front, back, hint, tag) {
    const newCard = new flashcards_1.Flashcard(front, back, hint, tag);
    // Get bucket 0, or create it if it doesn't exist
    const bucketZero = currentBuckets.get(0) || new Set();
    bucketZero.add(newCard); // Add the new card instance
    currentBuckets.set(0, bucketZero); // Put the updated Set back into the Map
    saveStateSync(); // Save after modifying
    return newCard;
}
