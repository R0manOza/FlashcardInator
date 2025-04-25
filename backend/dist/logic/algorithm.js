"use strict";
/**
 * Problem Set 1: Flashcards - Algorithm Functions
 *
 * This file contains the implementations for the flashcard algorithm functions
 * as described in the problem set handout.
 *
 * Please DO NOT modify the signatures of the exported functions in this file,
 * or you risk failing the autograder.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBucketSets = toBucketSets;
exports.getBucketRange = getBucketRange;
exports.practice = practice;
exports.update = update;
exports.getHint = getHint;
exports.computeProgress = computeProgress;
const flashcards_1 = require("./flashcards");
/**
 * Converts a Map representation of learning buckets into an Array-of-Set representation.
 *
 * @param buckets Map where keys are bucket numbers and values are sets of Flashcards.
 * @returns Array of Sets, where element at index i is the set of flashcards in bucket i.
 *          Buckets with no cards will have empty sets in the array.
 * @spec.requires buckets is a valid representation of flashcard buckets.
 */
function toBucketSets(buckets) {
    let arr = [];
    buckets.forEach((value, key) => {
        arr.push(value);
    });
    return arr;
}
/**
 * Finds the range of buckets that contain flashcards, as a rough measure of progress.
 *
 * @param buckets Array-of-Set representation of buckets.
 * @returns object with minBucket and maxBucket properties representing the range,
 *          or undefined if no buckets contain cards.
 * @spec.requires buckets is a valid Array-of-Set representation of flashcard buckets.
 */
function getBucketRange(buckets) {
    let minBucket = 0;
    let maxBucket = 0;
    for (let bucket of buckets) {
        if (bucket.size > 0) {
            minBucket = buckets.indexOf(bucket);
            break;
        }
    }
    for (let bucket of buckets) {
        if (buckets.indexOf(bucket) > maxBucket && bucket.size > 0) {
            maxBucket = buckets.indexOf(bucket);
        }
    }
    return { minBucket, maxBucket };
}
/**
 * Selects cards to practice on a particular day.
 *
 * @param buckets Array-of-Set representation of buckets.
 * @param day current day number (starting from 0).
 * @returns a Set of Flashcards that should be practiced on day `day`,
 *          according to the Modified-Leitner algorithm.
 * @spec.requires buckets is a valid Array-of-Set representation of flashcard buckets.
 */
function practice(buckets, day) {
    let practice_set = new Set();
    for (let bucket of buckets) {
        if (day % 2 ** buckets.indexOf(bucket) == 0) {
            for (let flashcard of bucket) {
                practice_set.add(flashcard);
            }
        }
    }
    return practice_set;
}
/**
 * Updates a card's bucket number after a practice trial.
 *
 * @param buckets Map representation of learning buckets.
 * @param card flashcard that was practiced.
 * @param difficulty how well the user did on the card in this practice trial.
 * @returns updated Map of learning buckets.
 * @spec.requires buckets is a valid representation of flashcard buckets.
 * USE CASES !!! TOO MANY IFS !!!
 *
 */
function update(buckets, card, difficulty) {
    // Create a deep copy of the buckets map
    const newBuckets = new Map();
    // Find which bucket currently contains the card
    let currentBucket = -1;
    for (const [bucketNum, cards] of buckets.entries()) {
        const newSet = new Set(cards);
        newBuckets.set(bucketNum, newSet);
        if (cards.has(card)) {
            currentBucket = bucketNum;
        }
    }
    // If card wasn't found in any bucket, add bucket 0
    if (currentBucket === -1 && !newBuckets.has(0)) {
        newBuckets.set(0, new Set());
    }
    // Remove card from current bucket
    if (currentBucket !== -1) {
        const currentSet = newBuckets.get(currentBucket);
        currentSet.delete(card);
    }
    // Calculate new bucket
    let newBucket;
    if (difficulty === flashcards_1.AnswerDifficulty.Wrong) {
        newBucket = 0; // Answered wrong, go back to bucket 0
    }
    else if (difficulty === flashcards_1.AnswerDifficulty.Hard) {
        newBucket = currentBucket; // Hard, stay in the same bucket
    }
    else {
        // Easy, move to the next bucket
        newBucket = currentBucket + 1;
    }
    // Ensure the new bucket exists
    if (!newBuckets.has(newBucket)) {
        newBuckets.set(newBucket, new Set());
    }
    // Add card to its new bucket
    newBuckets.get(newBucket).add(card);
    return newBuckets;
}
/**
 * Generates a hint for a flashcard.
 *
 * @param card flashcard to hint
 * @returns a hint for the front of the flashcard If hint is empty string give user first letter of answer.
 * @spec.requires card is a valid Flashcard.
 */
function getHint(card) {
    if (card.hint === "") {
        if (card.back === "") {
            return "";
        }
        return card.back[0] + '';
    }
    return card.hint;
}
/**
 * Computes statistics about the user's learning progress.
 *
 * @param buckets representation of learning buckets.
 * @param history representation of user's answer history maps flashcard to number of correct and incorrect answers.
 * @returns statistics about learning progress.
 * @spec.requires history is valid representation of history defined in this function with flashcard as key and number of correct and incorrect answers on that flashcard as value.
 */
function computeProgress(buckets, history) {
    let total = 0;
    let distribution = new Map();
    buckets.forEach((value, key) => {
        total += value.size;
        distribution.set(key, value.size);
    });
    // making sure that buckets are continuous
    for (let i = 0; i < Math.max(...Array.from(distribution.keys()), 0); i++) {
        if (!distribution.has(i)) {
            distribution.set(i, 0);
        }
    }
    let attempted = history.length;
    let correct = history.filter((record) => record.difficulty === flashcards_1.AnswerDifficulty.Easy ||
        record.difficulty === flashcards_1.AnswerDifficulty.Hard).length;
    let accuracy = attempted > 0 ? parseFloat(((correct / attempted) * 100).toFixed(2)) : 0;
    return { total, correct, attempted, accuracy, distribution };
}
