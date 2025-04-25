"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBucket = getBucket;
exports.setBucket = setBucket;
exports.getHistory = getHistory;
exports.addHistoryRecord = addHistoryRecord;
exports.getCurrentDay = getCurrentDay;
exports.incrementDay = incrementDay;
exports.findCard = findCard;
exports.findCardBucket = findCardBucket;
exports.createCard = createCard;
const flashcards_1 = require("../src/logic/flashcards");
const initialCards = [
    new flashcards_1.Flashcard("der Tisch", "the table", "Starts with T", ["noun", "german"]),
    new flashcards_1.Flashcard("la silla", "the chair", "Starts with S", ["noun", "spanish"]),
    new flashcards_1.Flashcard("bonjour", "hello", "Greeting", ["phrase", "french"]),
    new flashcards_1.Flashcard("arigato", "thank you", "Expression of gratitude", [
        "phrase",
        "japanese",
    ]),
    new flashcards_1.Flashcard("der Hund", "the dog", "Common pet", ["noun", "german"]),
    new flashcards_1.Flashcard("el gato", "the cat", "Common pet", ["noun", "spanish"]),
];
// --- State Variables ---
// Initialize buckets: Put all initial cards in bucket 0
let currentBuckets = new Map();
const initialCardSet = new Set(initialCards);
currentBuckets.set(0, initialCardSet);
let practiceHistory = [];
let currentDay = 0;
function getBucket() {
    return currentBuckets;
}
function setBucket(newBucket) {
    currentBuckets = newBucket;
}
function getHistory() {
    return practiceHistory;
}
function addHistoryRecord(record) {
    practiceHistory.push(record);
}
function getCurrentDay() {
    return currentDay;
}
function incrementDay() {
    currentDay++;
}
function findCard(front, back) {
    for (let bucket of currentBuckets.values()) {
        for (let card of bucket) {
            if (card.front === front && card.back === back) {
                return card;
            }
        }
    }
}
function findCardBucket(cardToFind) {
    for (let [key, value] of currentBuckets) {
        if (value.has(cardToFind)) {
            return key;
        }
    }
}
function createCard(front, back, hint, tag) {
    let card = new flashcards_1.Flashcard(front, back, hint, tag);
    let existingCards = currentBuckets.get(0) || new Set();
    existingCards.add(card);
    currentBuckets.set(0, existingCards);
    return card;
}
console.log("Initial State has been Loaded");
