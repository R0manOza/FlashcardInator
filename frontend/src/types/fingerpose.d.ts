// src/types/fingerpose.d.ts

declare module 'fingerpose' {

    // --- Enums (Define possible values) ---
    export enum Finger {
      Thumb = 0,
      Index = 1,
      Middle = 2,
      Ring = 3,
      Pinky = 4,
    }
  
    export enum FingerCurl {
      NoCurl = 0,
      HalfCurl = 1,
      FullCurl = 2,
    }
  
    export enum FingerDirection {
      VerticalUp = 0,
      VerticalDown = 1,
      HorizontalLeft = 2,
      HorizontalRight = 3,
      DiagonalUpRight = 4,
      DiagonalUpLeft = 5,
      DiagonalDownRight = 6,
      DiagonalDownLeft = 7,
    }
  
    // --- Classes (Declare the classes we use) ---
  
    /**
     * Describes a gesture based on finger curls and directions.
     */
    export class GestureDescription {
      name: string;
      constructor(name: string);
  
      /**
       * Adds a finger curl requirement to the gesture.
       * @param finger The finger to check.
       * @param curl The required curl type.
       * @param confidence Minimum confidence score (0-1.0).
       */
      addCurl(finger: Finger, curl: FingerCurl, confidence: number): void;
  
      /**
       * Adds a finger direction requirement to the gesture.
       * @param finger The finger to check.
       * @param direction The required direction.
       * @param confidence Minimum confidence score (0-1.0).
       */
      addDirection(finger: Finger, direction: FingerDirection, confidence: number): void;
  
      /**
       * Sets a weight for a specific finger's contribution to the score.
       * @param finger The finger to weight.
       * @param weight The weight value (higher means more important).
       */
      setWeight(finger: Finger, weight: number): void;
  
      // Add other methods if you use them (e.g., addRatioCurl)
    }
  
    /**
     * Estimates gestures from predicted hand landmarks.
     */
    export class GestureEstimator {
      constructor(knownGestures: GestureDescription[], estimatorOptions?: object);
  
      /**
       * Estimates gestures based on provided landmarks.
       * @param landmarks An array of 21 landmark points [x, y, z].
       * @param minScore Minimum confidence score for a gesture match (e.g., 7.5 - 9.0).
       * @returns An object containing estimated gestures sorted by score.
       */
      estimate(landmarks: Array<[number, number, number]>, minScore: number): {
        poseData: Array<[string, number, number]>; // Usually [finger, curl_enum, direction_enum]
        gestures: Array<{ name: string; score: number }>;
      };
    }
  
    // --- Pre-defined Gestures (Declare the Gestures object) ---
    export const Gestures: {
      VictoryGesture: GestureDescription;
      ThumbsUpGesture: GestureDescription;
      // Add others if you import them directly, like ThumbsDownGesture if it existed
    };
  
    // Add any other types or constants you might import from fingerpose
  }