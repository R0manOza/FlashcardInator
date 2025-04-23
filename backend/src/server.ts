import express, { Request, Response } from "express";
import cors from "cors";
import * as logic from "./logic/algorithm";
import { Flashcard,AnswerDifficulty } from "./logic/flashcards";
import * as state from "./state";
import { UpdateRequest,ProgressStats,PracticeRecord } from "./types";

const app=express();
const PORT=process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/practice",(req:Request,res:Response)=>{
    try{
        const day=state.getCurrentDay();
        const buckets=state.getBucket();
        const bucketsArray=logic.toBucketSets(buckets);
        const cardsToPractice=logic.practice(bucketsArray,day);

        const cardsToPracticeArray=Array.from(cardsToPractice);

        console.log(`Day ${day}: Practicing ${cardsToPracticeArray.length} cards.`);
        res.json({cards:cardsToPracticeArray,day});
    }catch(error){
        console.error("Error Getting practice cards:", error);
        res.status(500).json({error:"Error getting practice cards"});
    }
});

app.post("/api/update", (req: Request, res: Response) => {
    try{
        const { cardFront, cardBack, difficulty }: UpdateRequest = req.body;

        if(!(difficulty in AnswerDifficulty)){
            res.status(400).json({error:"Invalid difficulty value"});
            return;
        }
        const card=state.findCard(cardFront, cardBack);
        if(!card){
            res.status(404).json({error:"Card not found"});
            return;
        }
        const currentBuckets=state.getBucket();
        const previousBucket=state.findCardBucket(card);
        const updatedBuckets=logic.update(currentBuckets, card, difficulty);
        state.setBucket(updatedBuckets);

        const newBucket=state.findCardBucket(card);
        const record: PracticeRecord = {
            cardFront: card.front,
            cardBack: card.back,
            timestamp: Date.now(),
            difficulty: difficulty as AnswerDifficulty,
            previousBucket: previousBucket as number,
            newBucket: newBucket as number,
        };
        state.addHistoryRecord(record);

        console.log(`Updated card: ${cardFront} ${cardBack} to bucket ${newBucket}`);
        res.status(200).json({message:"Card updated successfully"});
    }catch(error){
        console.error("Error updating card:", error);
        res.status(500).json({error:"Error updating card"});
    } 
})

app.get("/api/hint", (req: Request, res: Response) => {
    try{
        const {cardFront,cardBack}=req.query
        if(typeof cardFront !== "string" || typeof cardBack !== "string"){
            res.status(400).json({error:"Invalid query parameters"});
            return;
        }
        const card=state.findCard(cardFront,cardBack);
        if(!card){
            res.status(404).json({error:"Card not found"});
            return;
        }
        const hint=logic.getHint(card);

        console.log(`Hint for card ${cardFront} ${cardBack}: ${hint}`);
        res.status(200).json({hint});
    }catch(error){
        console.error("Error getting hint:", error);
        res.status(500).json({error:"Error getting hint"});
    }
})

app.get("/api/progress", (req: Request, res: Response) => {
    try{
        const bucket=state.getBucket();
        const history=state.getHistory();
        const computeProgress=logic.computeProgress(bucket,history);
        const stats: ProgressStats = {
            total: computeProgress.total,
            correct: computeProgress.correct,
            attempted: computeProgress.attempted,
            accuracy: computeProgress.accuracy,
            distribution: computeProgress.distribution,
        };
        console.log(`Progress stats: ${JSON.stringify(stats)}`);
        res.status(200).json(stats);
    }catch(error){
        console.error("Error getting progress:", error);
        res.status(500).json({error:"Error getting progress"});
    }
})

app.post("/api/day/next", (req: Request, res: Response) => {
    try{
        state.incrementDay();
        const newDay=state.getCurrentDay();
        console.log(`Incremented day to ${newDay}`);
        res.status(200).json({message:"Day incremented successfully"});
    }catch(error){  
        console.error("Error incrementing day:", error);
        res.status(500).json({error:"Error incrementing day"});
    }
})


app.post("/api/createCard",(req:Request,res:Response)=>{
    try {
        const { front, back,hint,tag }: { front: string; back: string;hint:string;tag:ReadonlyArray<string>} = req.body;

        if (!front || !back) {
            res.status(400).json({ error: "Both front and back of the card are required" });
            return;
        }

        const existingCard = state.findCard(front, back);
        if (existingCard) {
            res.status(409).json({ error: "Card already exists" });
            return;
        }
        const newCard=state.createCard(front,back,hint,tag);

        console.log(`Created new card: ${front} - ${back}`);
        res.status(201).json({ message: "Card created successfully", card: newCard });
    } catch (error) {
        console.error("Error creating card:", error);
        res.status(500).json({ error: "Error creating card" });
    }
})


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

