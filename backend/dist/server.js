"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const logic = __importStar(require("./logic/algorithm"));
const flashcards_1 = require("./logic/flashcards");
const state = __importStar(require("./state"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/api/practice", (req, res) => {
    try {
        const day = state.getCurrentDay();
        const buckets = state.getBucket();
        const bucketsArray = logic.toBucketSets(buckets);
        const cardsToPractice = logic.practice(bucketsArray, day);
        const cardsToPracticeArray = Array.from(cardsToPractice);
        console.log(`Day ${day}: Practicing ${cardsToPracticeArray.length} cards.`);
        res.json({ cards: cardsToPracticeArray, day });
    }
    catch (error) {
        console.error("Error Getting practice cards:", error);
        res.status(500).json({ error: "Error getting practice cards" });
    }
});
app.post("/api/update", (req, res) => {
    try {
        const { cardFront, cardBack, difficulty } = req.body;
        if (!(difficulty in flashcards_1.AnswerDifficulty)) {
            res.status(400).json({ error: "Invalid difficulty value" });
            return;
        }
        const card = state.findCard(cardFront, cardBack);
        if (!card) {
            res.status(404).json({ error: "Card not found" });
            return;
        }
        const currentBuckets = state.getBucket();
        const previousBucket = state.findCardBucket(card);
        const updatedBuckets = logic.update(currentBuckets, card, difficulty);
        state.setBucket(updatedBuckets);
        const newBucket = state.findCardBucket(card);
        const record = {
            cardFront: card.front,
            cardBack: card.back,
            timestamp: Date.now(),
            difficulty: difficulty,
            previousBucket: previousBucket,
            newBucket: newBucket,
        };
        state.addHistoryRecord(record);
        console.log(`Updated card: ${cardFront} ${cardBack} to bucket ${newBucket}`);
        res.status(200).json({ message: "Card updated successfully" });
    }
    catch (error) {
        console.error("Error updating card:", error);
        res.status(500).json({ error: "Error updating card" });
    }
});
app.get("/api/hint", (req, res) => {
    try {
        const { cardFront, cardBack } = req.query;
        if (typeof cardFront !== "string" || typeof cardBack !== "string") {
            res.status(400).json({ error: "Invalid query parameters" });
            return;
        }
        const card = state.findCard(cardFront, cardBack);
        if (!card) {
            res.status(404).json({ error: "Card not found" });
            return;
        }
        const hint = logic.getHint(card);
        console.log(`Hint for card ${cardFront} ${cardBack}: ${hint}`);
        res.status(200).json({ hint });
    }
    catch (error) {
        console.error("Error getting hint:", error);
        res.status(500).json({ error: "Error getting hint" });
    }
});
app.get("/api/progress", (req, res) => {
    try {
        const bucket = state.getBucket();
        const history = state.getHistory();
        const computeProgress = logic.computeProgress(bucket, history);
        const stats = {
            total: computeProgress.total,
            correct: computeProgress.correct,
            attempted: computeProgress.attempted,
            accuracy: computeProgress.accuracy,
            distribution: computeProgress.distribution,
        };
        console.log(`Progress stats: ${JSON.stringify(stats)}`);
        res.status(200).json(stats);
    }
    catch (error) {
        console.error("Error getting progress:", error);
        res.status(500).json({ error: "Error getting progress" });
    }
});
app.post("/api/day/next", (req, res) => {
    try {
        state.incrementDay();
        const newDay = state.getCurrentDay();
        console.log(`Incremented day to ${newDay}`);
        res.status(200).json({ message: "Day incremented successfully" });
    }
    catch (error) {
        console.error("Error incrementing day:", error);
        res.status(500).json({ error: "Error incrementing day" });
    }
});
app.post("/api/createCard", (req, res) => {
    try {
        const { front, back, hint, tag } = req.body;
        if (!front || !back) {
            res.status(400).json({ error: "Both front and back of the card are required" });
            return;
        }
        const existingCard = state.findCard(front, back);
        if (existingCard) {
            res.status(409).json({ error: "Card already exists" });
            return;
        }
        const newCard = state.createCard(front, back, hint, tag);
        console.log(`Created new card: ${front} - ${back}`);
        res.status(201).json({ message: "Card created successfully", card: newCard });
    }
    catch (error) {
        console.error("Error creating card:", error);
        res.status(500).json({ error: "Error creating card" });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
