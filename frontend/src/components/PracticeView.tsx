import React, { useState, useEffect, useRef } from "react";
import { Flashcard, AnswerDifficulty } from "../types";
import {
  fetchPracticeCards,
  submitAnswer,
  fetchHint,
  advanceDay,
} from "../services/api";
import * as handpose from "@tensorflow-models/handpose";
import * as fp from "fingerpose";
import * as tf from "@tensorflow/tfjs";

const PracticeView: React.FC = () => {
  const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [day, setDay] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedGestureInfo, setDetectedGestureInfo] = useState<string | null>(
    null
  );
  const [videoKey, setVideoKey] = useState(0); // 🆕 force remount trick

  const videoRef = useRef<HTMLVideoElement>(null);
  const modelRef = useRef<handpose.HandPose | null>(null);
  const gestureEstimatorRef = useRef<fp.GestureEstimator | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      modelRef.current = await handpose.load();

      const knownGestures = [
        fp.Gestures.ThumbsUpGesture,
        createThumbsDownGesture(),
        createOpenPalmGesture(),
        createMiddleFingerGesture(),
      ];
      gestureEstimatorRef.current = new fp.GestureEstimator(knownGestures);

      startVideo();
    };

    const loadCards = async () => {
      try {
        const session = await fetchPracticeCards();
        setPracticeCards(session.cards);
        setDay(session.day);
        setSessionFinished(session.cards.length === 0);
      } catch (err) {
        setError("Failed to load practice session");
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();
    loadCards();
  }, []);

  const startVideo = async () => {
    if (navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    }
  };

  useEffect(() => {
    let animationId: number;

    const detect = async () => {
      if (
        !detecting ||
        !modelRef.current ||
        !gestureEstimatorRef.current ||
        !videoRef.current
      ) {
        animationId = requestAnimationFrame(detect);
        return;
      }

      const predictions = await modelRef.current.estimateHands(
        videoRef.current
      );
      if (predictions.length > 0) {
        const est = gestureEstimatorRef.current.estimate(
          predictions[0].landmarks as any,
          8.5
        );

        if (est.gestures.length > 0) {
          const best = est.gestures.reduce((p, c) =>
            p.score > c.score ? p : c
          );

          if (best.score > 7.5) {
            console.log("Gesture detected:", best.name);

            if (best.name === "middle_finger") {
              window.location.href =
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
              return;
            }

            let difficulty: AnswerDifficulty | null = null;
            if (best.name === "thumbs_up") difficulty = AnswerDifficulty.Easy;
            if (best.name === "thumbs_down")
              difficulty = AnswerDifficulty.Wrong;
            if (best.name === "open_palm") difficulty = AnswerDifficulty.Hard;

            if (difficulty !== null) {
              await handleAnswer(difficulty, best.name);
              setDetecting(false);
              return;
            }
          }
        }
      }

      animationId = requestAnimationFrame(detect);
    };

    if (detecting) {
      animationId = requestAnimationFrame(detect);
    }

    return () => cancelAnimationFrame(animationId);
  }, [detecting, videoKey]); // <-- 🆕 depend also on videoKey

  const handleAnswer = async (
    difficulty: AnswerDifficulty,
    gestureName: string
  ) => {
    const currentCard = practiceCards[currentCardIndex];
    if (!currentCard) return;

    try {
      await submitAnswer(currentCard.front, currentCard.back, difficulty);
      setDetectedGestureInfo(
        `Detected "${gestureName}" ➔ Submitted "${AnswerDifficulty[difficulty]}"`
      );
      if (currentCardIndex + 1 < practiceCards.length) {
        setCurrentCardIndex((prev) => prev + 1);
        setShowBack(false);
        setHint(null);
      } else {
        setSessionFinished(true);
      }
    } catch (err) {
      setError("Failed to submit answer");
    }
  };

  const handleShowAnswer = () => {
    setShowBack(true);
    setDetecting(true);
    setDetectedGestureInfo(null);
  };

  const handleNextDay = async () => {
    try {
      await advanceDay();
      window.location.reload(); // 🧹 full page reload
    } catch {
      setError("Failed to advance day");
    }
  };

  const handleGetHint = async () => {
    const currentCard = practiceCards[currentCardIndex];
    if (!currentCard) return;
    try {
      const fetchedHint = await fetchHint(currentCard);
      setHint(fetchedHint);
    } catch (err) {
      setHint("Failed to fetch hint");
    }
  };

  const currentCard = practiceCards[currentCardIndex];

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (sessionFinished)
    return (
      <div>
        <p>🎉 No more cards today!</p>
        <button onClick={handleNextDay}>Next Day</button>
      </div>
    );

  return (
    <div>
      <h2>
        Day {day} - Card {currentCardIndex + 1} of {practiceCards.length}
      </h2>

      <video
        key={videoKey}
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "320px", height: "240px", transform: "scaleX(-1)" }}
      />

      <div>
        <p>
          <strong>Front:</strong> {currentCard.front}
        </p>
        {showBack && (
          <p>
            <strong>Back:</strong> {currentCard.back}
          </p>
        )}
      </div>

      {detectedGestureInfo && (
        <p>
          <strong>Last Detection:</strong> {detectedGestureInfo}
        </p>
      )}

      {!showBack && (
        <>
          <button onClick={handleGetHint}>Get Hint</button>
          {hint && <p>Hint: {hint}</p>}
          <button onClick={handleShowAnswer}>Show Answer</button>
        </>
      )}
    </div>
  );
};

// --- Gesture Definitions
function createThumbsDownGesture() {
  const thumbsDown = new fp.GestureDescription("thumbs_down");
  thumbsDown.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
  thumbsDown.addDirection(
    fp.Finger.Thumb,
    fp.FingerDirection.VerticalDown,
    1.0
  );
  thumbsDown.addDirection(
    fp.Finger.Thumb,
    fp.FingerDirection.DiagonalDownLeft,
    0.8
  );
  thumbsDown.addDirection(
    fp.Finger.Thumb,
    fp.FingerDirection.DiagonalDownRight,
    0.8
  );
  for (let finger of [
    fp.Finger.Index,
    fp.Finger.Middle,
    fp.Finger.Ring,
    fp.Finger.Pinky,
  ]) {
    thumbsDown.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
    thumbsDown.addCurl(finger, fp.FingerCurl.HalfCurl, 0.8);
  }
  return thumbsDown;
}

function createOpenPalmGesture() {
  const openPalm = new fp.GestureDescription("open_palm");
  for (let finger of [
    fp.Finger.Thumb,
    fp.Finger.Index,
    fp.Finger.Middle,
    fp.Finger.Ring,
    fp.Finger.Pinky,
  ]) {
    openPalm.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    openPalm.addDirection(finger, fp.FingerDirection.VerticalUp, 0.9);
    openPalm.addDirection(finger, fp.FingerDirection.DiagonalUpLeft, 0.8);
    openPalm.addDirection(finger, fp.FingerDirection.DiagonalUpRight, 0.8);
  }
  return openPalm;
}

function createMiddleFingerGesture() {
  const middleFinger = new fp.GestureDescription("middle_finger");
  middleFinger.addCurl(fp.Finger.Middle, fp.FingerCurl.NoCurl, 1.0);
  middleFinger.addDirection(
    fp.Finger.Middle,
    fp.FingerDirection.VerticalUp,
    1.0
  );
  for (let finger of [
    fp.Finger.Thumb,
    fp.Finger.Index,
    fp.Finger.Ring,
    fp.Finger.Pinky,
  ]) {
    middleFinger.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
    middleFinger.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
  }
  return middleFinger;
}

export default PracticeView;
