import { Flashcard,BucketMap,AnswerDifficulty } from "../src/logic/flashcards";
import { PracticeRecord } from "./types";
import { toBucketSets } from "..//src/logic/algorithm";

const initialCards: Flashcard[] = [
    new Flashcard("der Tisch", "the table", "Starts with T", ["noun", "german"]),
    new Flashcard("la silla", "the chair", "Starts with S", ["noun", "spanish"]),
    new Flashcard("bonjour", "hello", "Greeting", ["phrase", "french"]),
    new Flashcard("arigato", "thank you", "Expression of gratitude", [
      "phrase",
      "japanese",
    ]),
    new Flashcard("der Hund", "the dog", "Common pet", ["noun", "german"]),
    new Flashcard("el gato", "the cat", "Common pet", ["noun", "spanish"]),
  ];
  
  // --- State Variables ---
  // Initialize buckets: Put all initial cards in bucket 0
  let currentBuckets: BucketMap = new Map();
  const initialCardSet = new Set(initialCards);
  currentBuckets.set(0, initialCardSet);

let practiceHistory: PracticeRecord[] = [];

let currentDay: number = 0;

export function getBucket():BucketMap{
    return currentBuckets;
}

export function setBucket(newBucket:BucketMap):void{
    currentBuckets=newBucket;
}

export function getHistory():PracticeRecord[]{
    return practiceHistory;
}

export function addHistoryRecord(record:PracticeRecord):void{
    practiceHistory.push(record);
}

export function getCurrentDay():number{
    return currentDay;
}

export function incrementDay():void{
    currentDay++;
}

export function findCard(front:string,back:string):Flashcard|undefined{
    for(let bucket of currentBuckets.values()){
        for(let card of bucket){
            if(card.front===front && card.back===back){
                return card;
            }
        }
    }
}

export function findCardBucket(cardToFind :Flashcard):number|undefined{
    for(let [key,value] of currentBuckets){
        if(value.has(cardToFind)){
            return key;
        }
    }
}


export function createCard(front: string, back: string, hint: string, tag: ReadonlyArray<string>): Flashcard {
    let card = new Flashcard(front, back, hint, tag);
    let existingCards = currentBuckets.get(0) || new Set<Flashcard>();
    existingCards.add(card);
    currentBuckets.set(0, existingCards);

    return card;
}


console.log("Initial State has been Loaded")


