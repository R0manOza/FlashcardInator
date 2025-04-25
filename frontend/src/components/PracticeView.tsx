// src/components/PracticeView.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
// Import necessary backends. WebGL is primary again.
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu'; // Keep CPU backend imported as fallback/for testing if needed


// **** MAKE SURE THESE IMPORTS ARE PRESENT AND USED BELOW ****
import { Flashcard, AnswerDifficulty } from "../types";
import { fetchPracticeCards, submitAnswer, advanceDay, fetchHint, newCard } from "../services/api";
// **** END IMPORTS CHECK ****

// Import the CSS file
import "./PracticeView.css";

// Define connections for drawing the hand skeleton
const connections = [
    ['wrist', 'thumb_mcp'], ['thumb_mcp', 'thumb_ip'], ['thumb_ip', 'thumb_tip'],
    ['wrist', 'index_finger_mcp'], ['index_finger_mcp', 'index_finger_pip'], ['index_finger_pip', 'index_finger_dip'], ['index_finger_dip', 'index_finger_tip'],
    ['wrist', 'middle_finger_mcp'], ['middle_finger_mcp', 'middle_finger_pip'], ['middle_finger_pip', 'middle_finger_dip'], ['middle_finger_dip', 'middle_finger_tip'],
    ['wrist', 'ring_finger_mcp'], ['ring_finger_mcp', 'ring_finger_pip'], ['ring_finger_pip', 'ring_finger_dip'], ['ring_finger_dip', 'ring_finger_tip'],
    ['wrist', 'pinky_mcp'], ['pinky_mcp', 'pinky_pip'], ['pinky_pip', 'pinky_dip'], ['pinky_dip', 'pinky_tip'],
    ['index_finger_mcp', 'middle_finger_mcp'], ['middle_finger_mcp', 'ring_finger_mcp'], ['ring_finger_mcp', 'pinky_mcp'] // Palm lines
];

const PracticeView: React.FC = () => {
    // --- State and Refs ---
    const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showBack, setShowBack] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [day, setDay] = useState(0);
    const [sessionFinished, setSessionFinished] = useState(false);
    const [hint, setHint] = useState<string | null>(null);
    // **** MAKE SURE setLoadingHint IS USED BELOW ****
    const [loadingHint, setLoadingHint] = useState(false);
    const [hintError, setHintError] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [detector, setDetector] = useState<handPoseDetection.HandDetector | null>(null);
    const [detectedGesture, setDetectedGesture] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const detectionIntervalRef = useRef<number | null>(null);
    const lastGestureRef = useRef<string | null>(null);
    const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastRawGestureRef = useRef<string | null>(null);

    // --- Gesture Classification Logic (with robust NaN check) ---
    const classifyGesture = useCallback((landmarks: handPoseDetection.Keypoint[]): string | null => {
        if (!landmarks || landmarks.length === 0) return null;
        const getLandmark = (name: string): handPoseDetection.Keypoint | undefined => landmarks.find(p => p.name === name);
        const wrist = getLandmark('wrist'); const thumbTip = getLandmark('thumb_tip'); const thumbIp = getLandmark('thumb_ip'); const thumbMcP = getLandmark('thumb_mcp'); const indexTip = getLandmark('index_finger_tip'); const indexPip = getLandmark('index_finger_pip'); const middleTip = getLandmark('middle_finger_tip'); const middlePip = getLandmark('middle_finger_pip'); const ringTip = getLandmark('ring_finger_tip'); const ringPip = getLandmark('ring_finger_pip'); const pinkyTip = getLandmark('pinky_tip'); const pinkyPip = getLandmark('pinky_pip');
        // Check all required landmarks *before* calculations
        if ( !wrist || isNaN(wrist.x) || isNaN(wrist.y) || !thumbTip || isNaN(thumbTip.x) || isNaN(thumbTip.y) || !thumbIp || isNaN(thumbIp.x) || isNaN(thumbIp.y) || !thumbMcP || isNaN(thumbMcP.x) || isNaN(thumbMcP.y) || !indexTip || isNaN(indexTip.x) || isNaN(indexTip.y) || !indexPip || isNaN(indexPip.x) || isNaN(indexPip.y) || !middleTip || isNaN(middleTip.x) || isNaN(middleTip.y) || !middlePip || isNaN(middlePip.x) || isNaN(middlePip.y) || !ringTip || isNaN(ringTip.x) || isNaN(ringTip.y) || !ringPip || isNaN(ringPip.x) || isNaN(ringPip.y) || !pinkyTip || isNaN(pinkyTip.x) || isNaN(pinkyTip.y) || !pinkyPip || isNaN(pinkyPip.x) || isNaN(pinkyPip.y) ) { console.log("[classifyGesture] Failed: One or more required landmarks missing or have NaN coordinates."); return null; }
        // --- Calculations ---
        const thumbTipHigherThanIp = thumbTip.y < thumbIp.y;
        // **** MAKE SURE thumbTipHigherThanMcp IS USED BELOW ****
        const thumbTipHigherThanMcp = thumbTip.y < thumbMcP.y;
        const thumbTipSignificantlyHigherThanMcp = thumbTip.y < thumbMcP.y - 5;
        // **** MAKE SURE thumbTipLowerThanMcp IS USED BELOW ****
        const thumbTipLowerThanIp = thumbTip.y > thumbIp.y;
        const thumbTipLowerThanMcp = thumbTip.y > thumbMcP.y;
        const thumbTipSignificantlyLowerThanMcp = thumbTip.y > thumbMcP.y + 5;
        // **** USAGE CHECK: These ARE used here ****
        const isThumbExtendedUp = thumbTipHigherThanIp && thumbTipSignificantlyHigherThanMcp;
        const isThumbPointingDown = thumbTipLowerThanIp && thumbTipSignificantlyLowerThanMcp;
        // **** END USAGE CHECK ****
        const curlThreshold = 3; const indexFingerCurled = indexTip.y > indexPip.y + curlThreshold; const middleFingerCurled = middleTip.y > middlePip.y + curlThreshold; const ringFingerCurled = ringTip.y > ringPip.y + curlThreshold; const pinkyFingerCurled = pinkyTip.y > pinkyPip.y + curlThreshold; const curledCount = [indexFingerCurled, middleFingerCurled, ringFingerCurled, pinkyFingerCurled].filter(Boolean).length; const areMostlyCurled = curledCount >= 3; const extendThreshold = -3; const indexFingerExtended = indexTip.y < indexPip.y + extendThreshold; const middleFingerExtended = middleTip.y < middlePip.y + extendThreshold; const ringFingerExtended = ringTip.y < ringPip.y + extendThreshold; const pinkyFingerExtended = pinkyTip.y < pinkyPip.y + extendThreshold; const extendedCount = [indexFingerExtended, middleFingerExtended, ringFingerExtended, pinkyFingerExtended].filter(Boolean).length; const areMostlyExtended = extendedCount >= 3; const areFingersAboveWrist = indexTip.y < wrist.y && middleTip.y < wrist.y && ringTip.y < wrist.y && pinkyTip.y < wrist.y; const isThumbOpenPalm = thumbTip.y < thumbMcP.y || thumbTip.y < indexPip.y;
        console.log(`[Classify Check]: ThUp=${isThumbExtendedUp} ThDown=${isThumbPointingDown} MostlyCurl=${areMostlyCurled}(${curledCount}) MostlyExt=${areMostlyExtended}(${extendedCount}) FingersAboveWrist=${areFingersAboveWrist} ThumbOpen=${isThumbOpenPalm}`); // DEBUG
        if (isThumbExtendedUp && areMostlyCurled) { console.log("[classifyGesture] Result: Thumbs Up"); return "Thumbs Up"; } if (isThumbPointingDown && areMostlyCurled) { console.log("[classifyGesture] Result: Thumbs Down"); return "Thumbs Down"; } if (areMostlyExtended && areFingersAboveWrist && isThumbOpenPalm) { console.log("[classifyGesture] Result: Open Palm"); return "Open Palm"; } return null;
    }, []);


    // --- Core Practice Logic Callbacks ---
    const handleAnswer = useCallback(async (difficulty: AnswerDifficulty) => {
        console.log("[handleAnswer] Submitting answer:", AnswerDifficulty[difficulty]); // DEBUG
        lastRawGestureRef.current = null;
        setIsDetecting(false);
        if (detectionIntervalRef.current) cancelAnimationFrame(detectionIntervalRef.current); detectionIntervalRef.current = null;
        if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current); gestureTimeoutRef.current = null;
        const currentCard = practiceCards[currentCardIndex];
        if (!currentCard) { console.error("[handleAnswer] No current card found!"); return; }
        try {
            await submitAnswer(currentCard.front, currentCard.back, difficulty); // submitAnswer is used
            const nextIndex = currentCardIndex + 1;
            if (nextIndex < practiceCards.length) { setCurrentCardIndex(nextIndex); setShowBack(false); setIsFlipped(false); setHint(null); setHintError(null); setDetectedGesture(null); lastGestureRef.current = null; }
            else { setSessionFinished(true); setPracticeCards([]); setCurrentCardIndex(0); setShowBack(false); setIsFlipped(false); setHint(null); setHintError(null); setDetectedGesture(null); lastGestureRef.current = null; }
        } catch (err: any) { console.error("[handleAnswer] Submit error:", err); setError("Failed to save answer."); }
        finally { setIsDetecting(false); const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }, [practiceCards, currentCardIndex]);

    // --- Gesture Action Trigger ---
    const triggerAnswerFromGesture = useCallback((gesture: string) => {
        console.log("[triggerAnswerFromGesture] Called with stable gesture:", gesture); // DEBUG
        if (!showBack || !isDetecting) { console.log("[triggerAnswerFromGesture] Ignored (Not showing back or not detecting)."); return; }
        let difficulty: AnswerDifficulty | null = null;
        switch (gesture) { case "Thumbs Up": difficulty = AnswerDifficulty.Easy; break; case "Thumbs Down": difficulty = AnswerDifficulty.Wrong; break; case "Open Palm": difficulty = AnswerDifficulty.Hard; break; }
        if (difficulty !== null) {
            console.log("[triggerAnswerFromGesture] Triggering handleAnswer with difficulty:", AnswerDifficulty[difficulty]); // DEBUG
            setIsDetecting(false);
            if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current); if (detectionIntervalRef.current) cancelAnimationFrame(detectionIntervalRef.current);
            detectionIntervalRef.current = null; gestureTimeoutRef.current = null; lastGestureRef.current = null; lastRawGestureRef.current = null; setDetectedGesture(null);
            handleAnswer(difficulty); // handleAnswer is used
        } else { console.log("[triggerAnswerFromGesture] Gesture recognized but not mapped to an action:", gesture); }
    }, [showBack, isDetecting, handleAnswer]); // Depends on handleAnswer


    // --- Hand Detection & Drawing Loop ---
    const detectHands = useCallback(async () => {
        if (!isDetecting) { detectionIntervalRef.current = null; return; }
        const canvas = canvasRef.current; const ctx = canvas ? canvas.getContext('2d') : null;
        if (!detector || !videoRef.current || !canvas || !ctx || videoRef.current.readyState < 3) { if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); if (isDetecting) detectionIntervalRef.current = requestAnimationFrame(detectHands); return; }
        try {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const hands = await detector.estimateHands(videoRef.current, { flipHorizontal: false }); // flipHorizontal: false
            let currentGesture: string | null = null;
            if (hands.length > 0) {
                const keypoints = hands[0].keypoints;
                if (keypoints && keypoints.length > 0) {
                    console.log(`[detectHands] Keypoints DETECTED: ${keypoints.length}. Example: Wrist Y=${keypoints[0]?.y?.toFixed(1)}`); // DEBUG
                    ctx.fillStyle = 'red'; ctx.strokeStyle = 'lime'; ctx.lineWidth = 3;
                    for (const point of keypoints) { if (point && !isNaN(point.x) && !isNaN(point.y)) { ctx.beginPath(); ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI); ctx.fill(); } }
                    ctx.beginPath();
                    for(const [startName, endName] of connections) { const startPoint = keypoints.find(p => p.name === startName); const endPoint = keypoints.find(p => p.name === endName); if (startPoint && endPoint && !isNaN(startPoint.x) && !isNaN(startPoint.y) && !isNaN(endPoint.x) && !isNaN(endPoint.y)) { ctx.moveTo(startPoint.x, startPoint.y); ctx.lineTo(endPoint.x, endPoint.y); } }
                    ctx.stroke();
                    currentGesture = classifyGesture(keypoints); // classifyGesture is used
                } else { console.log("[detectHands] Keypoints Issue: Hand detected by estimateHands, but keypoints array missing/empty."); currentGesture = null; }
            } else { if (lastRawGestureRef.current !== null) { console.log(`[detectHands] Gesture Classifier Output Cleared (No hand)`); lastRawGestureRef.current = null; } currentGesture = null; }
            setDetectedGesture(currentGesture);
            if (currentGesture !== lastRawGestureRef.current) { console.log(`[detectHands] Gesture Classifier Output Changed: ${currentGesture ?? 'None'}`); lastRawGestureRef.current = currentGesture; }
            if (currentGesture && currentGesture === lastGestureRef.current) { if (!gestureTimeoutRef.current) { console.log(`[detectHands] Gesture '${currentGesture}' stable, starting action timer...`); gestureTimeoutRef.current = setTimeout(() => { console.log(`[Action Trigger] Stable timer fired for: ${currentGesture}`); triggerAnswerFromGesture(currentGesture!); gestureTimeoutRef.current = null; }, 700); } } else { if (gestureTimeoutRef.current) { console.log(`[detectHands] Gesture changed from '${lastGestureRef.current}' to '${currentGesture}', clearing action timer.`); clearTimeout(gestureTimeoutRef.current); gestureTimeoutRef.current = null; } lastGestureRef.current = currentGesture; }
        } catch (error: any) { console.error("[detectHands] Detection Error:", error); setError("Hand detection error occurred. Stopping detection."); setIsDetecting(false); if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); }
        finally { if (isDetecting) { detectionIntervalRef.current = requestAnimationFrame(detectHands); } else { if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); detectionIntervalRef.current = null; } }
    }, [detector, isDetecting, triggerAnswerFromGesture, classifyGesture]); // Depends on classifyGesture, triggerAnswerFromGesture

    // --- Effect for Detection Loop Start/Stop ---
    useEffect(() => {
        if (isDetecting && detector && isCameraReady) { console.log("[Effect] Starting detection loop..."); lastGestureRef.current = null; lastRawGestureRef.current = null; if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current); gestureTimeoutRef.current = null; if (detectionIntervalRef.current === null) { detectionIntervalRef.current = requestAnimationFrame(detectHands); } }
        else { if (detectionIntervalRef.current !== null) { console.log("[Effect] Stopping detection loop."); cancelAnimationFrame(detectionIntervalRef.current); detectionIntervalRef.current = null; if (gestureTimeoutRef.current) { clearTimeout(gestureTimeoutRef.current); gestureTimeoutRef.current = null; } lastGestureRef.current = null; lastRawGestureRef.current = null; const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if(ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height); } }
    }, [isDetecting, detector, isCameraReady, detectHands]); // Depends on detectHands

    // --- Load Practice Cards Callback ---
    const loadPracticeCards = useCallback(async () => {
        console.log("[loadPracticeCards] Loading cards..."); setIsLoading(true); setError(null); setSessionFinished(false); setIsDetecting(false);
        try { const session = await fetchPracticeCards(); setPracticeCards(session.cards); setDay(session.day); const isFinished = session.cards.length === 0; setSessionFinished(isFinished); setCurrentCardIndex(0); setShowBack(false); setIsFlipped(false); setHint(null); setHintError(null); setDetectedGesture(null); lastGestureRef.current = null; lastRawGestureRef.current = null; console.log(isFinished ? "[loadPracticeCards] No cards found for today." : `[loadPracticeCards] Loaded ${session.cards.length} cards for day ${session.day}.`); }
        catch (err: any) { console.error("[loadPracticeCards] Load error:", err); setError("Failed to load practice session."); setPracticeCards([]); }
        finally { setIsLoading(false); }
    }, []);

    // --- Effect for Initial Setup ---
    useEffect(() => {
        let isMounted = true; let streamReference: MediaStream | null = null; let createdDetector: handPoseDetection.HandDetector | null = null;
        const setup = async () => {
            setError(null); console.log("[Effect Setup] Starting TensorFlow and Camera setup...");
            try {
                console.log("[Effect Setup] Attempting to set backend to WebGL..."); await tf.setBackend('webgl'); await tf.ready();
                console.log(`[Effect Setup] TF Backend Ready: ${tf.getBackend()}`); console.log("[Effect Setup] TF Environment Features:", tf.env().features);
                try { console.log("[Effect Setup] Running simple tensor test..."); const simpleTensor = tf.tensor2d([[1, 2], [3, 4]]); const squared = simpleTensor.square(); const squaredData = await squared.data(); if (squaredData.some(isNaN)) { console.error("[Effect Setup] !!! NaN detected in simple tensor test !!!"); } else { console.log("[Effect Setup] Simple tensor test completed successfully (No NaN)."); } simpleTensor.dispose(); squared.dispose(); } catch (tensorError: any) { console.error("[Effect Setup] Simple tensor test FAILED:", tensorError); }
                const model = handPoseDetection.SupportedModels.MediaPipeHands; const detectorConfig: handPoseDetection.MediaPipeHandsTfjsModelConfig = { runtime: 'tfjs', modelType: 'full', maxHands: 1 }; console.log("[Effect Setup] Creating detector (modelType='full')..."); createdDetector = await handPoseDetection.createDetector(model, detectorConfig); if (!isMounted) { createdDetector?.dispose(); return; } setDetector(createdDetector); console.log("[Effect Setup] Detector loaded successfully.");
                console.log("[Effect Setup] Requesting camera access...");
                if (navigator.mediaDevices?.getUserMedia) {
                     const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 }, audio: false }); streamReference = stream; if (!isMounted) { stream.getTracks().forEach(t => t.stop()); return; }
                    if (videoRef.current && canvasRef.current) {
                        videoRef.current.srcObject = stream; videoRef.current.onloadedmetadata = () => { console.log("[Effect Setup] Video metadata loaded."); if (videoRef.current && canvasRef.current && isMounted) { const videoWidth = videoRef.current.videoWidth; const videoHeight = videoRef.current.videoHeight; canvasRef.current.width = videoWidth; canvasRef.current.height = videoHeight; console.log(`[Effect Setup] Canvas drawing size set to: ${videoWidth}x${videoHeight}`); videoRef.current.play().then(() => { if (isMounted) { setIsCameraReady(true); console.log("[Effect Setup] Camera ready and playing."); } }).catch((e: any) => { if (isMounted) { console.error("[Effect Setup] Video play failed:", e); setError("Could not play video stream."); setIsCameraReady(false); } }); } }; videoRef.current.onerror = () => { if (isMounted) { console.error("[Effect Setup] Video element error."); setError("Camera feed error."); setIsCameraReady(false); } }
                    } else { throw new Error("Video/Canvas DOM element not available."); }
                } else { throw new Error("getUserMedia is not supported."); }
            } catch (err: any) { console.error("[Effect Setup] Initialization failed:", err); if (isMounted) { setError(`Initialization Failed: ${err.message || 'Unknown error'}. Gesture input disabled.`); setIsCameraReady(false); createdDetector?.dispose(); setDetector(null); streamReference?.getTracks().forEach(t => t.stop()); } }
        };
        setup(); loadPracticeCards();
        return () => {
            isMounted = false; console.log("[Effect Cleanup] Unmounting PracticeView..."); setIsDetecting(false);
            if (detectionIntervalRef.current) { console.log("[Effect Cleanup] Cancelling animation frame."); cancelAnimationFrame(detectionIntervalRef.current); detectionIntervalRef.current = null; } if (gestureTimeoutRef.current) { console.log("[Effect Cleanup] Clearing gesture stability timeout."); clearTimeout(gestureTimeoutRef.current); gestureTimeoutRef.current = null; }
            console.log("[Effect Cleanup] Stopping camera stream tracks..."); if (streamReference) { streamReference.getTracks().forEach(track => track.stop()); console.log("[Effect Cleanup] Stopped tracks via streamReference."); } else if (videoRef.current?.srcObject) { console.warn("[Effect Cleanup] streamReference lost, attempting cleanup via videoRef.srcObject."); (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop()); } if (videoRef.current) { videoRef.current.srcObject = null; }
            const detectorToDispose = detector; if (detectorToDispose) { console.log("[Effect Cleanup] Disposing HandDetector model..."); try { detectorToDispose.dispose(); console.log("[Effect Cleanup] HandDetector disposed."); } catch (disposeError: any) { console.error("[Effect Cleanup] Error disposing detector:", disposeError); } setDetector(null); } else { console.log("[Effect Cleanup] No detector instance found to dispose."); }
            const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if(ctx && canvas) { ctx.clearRect(0, 0, canvas.width, canvas.height); console.log("[Effect Cleanup] Canvas cleared."); }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadPracticeCards]); // Only loadPracticeCards as dep, setup runs once

    // --- Other UI Callbacks ---
    const handleShowBack = useCallback(() => {
        if (!practiceCards[currentCardIndex] || showBack) return;
        console.log("[handleShowBack] Showing back of card."); // DEBUG
        setShowBack(true); setIsFlipped(true); setHint(null); setHintError(null); setDetectedGesture(null); lastGestureRef.current = null; lastRawGestureRef.current = null;
        if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current); gestureTimeoutRef.current = null;
        console.log(`[handleShowBack] Checking prerequisites to start detection: cameraReady=${isCameraReady}, detectorExists=${!!detector}`); // DEBUG
        if (isCameraReady && detector) { console.log("[handleShowBack] Attempting to enable detection."); setIsDetecting(true); } else { console.log("[handleShowBack] Detection prerequisites not met. Detection will not start."); }
    }, [practiceCards, currentCardIndex, showBack, isCameraReady, detector]);

    const handleNextDay = useCallback(async () => {
        console.log("[handleNextDay] Advancing to next day..."); // DEBUG
        setIsLoading(true); setError(null); setIsDetecting(false); lastRawGestureRef.current = null;
        try {
            await advanceDay(); // **** advanceDay IS USED HERE ****
            await loadPracticeCards();
        } catch (err: any) { console.error("[handleNextDay] Next day failed:", err); setError("Failed to advance to the next day."); setIsLoading(false); }
    }, [loadPracticeCards]); // Depends on loadPracticeCards (which is stable)

    const handleGetHint = useCallback(async () => {
        const currentCard = practiceCards[currentCardIndex];
        if (!currentCard || loadingHint || showBack) return;
        console.log("[handleGetHint] Fetching hint..."); // DEBUG
        // **** setLoadingHint IS USED HERE ****
        setLoadingHint(true); setHintError(null); setHint(null);
        try {
             // **** fetchHint IS USED HERE ****
            const fetchedHint = await fetchHint(currentCard);
            setHint(fetchedHint); console.log("[handleGetHint] Hint loaded:", fetchedHint);
        } catch (err: any) { console.error("[handleGetHint] Hint error:", err); setHintError("Could not load hint."); }
        finally { setLoadingHint(false); }
    }, [practiceCards, currentCardIndex, loadingHint, showBack]); // Depends on state/props

    const handleNewCard = useCallback(async () => {
        console.log("[handleNewCard] Starting new card creation process..."); // DEBUG
        setIsDetecting(false); lastRawGestureRef.current = null;
        try {
            const front = prompt("Enter Front of Card:")?.trim(); if (!front) { console.log("[handleNewCard] Cancelled (no front)."); return; }
            const back = prompt("Enter Back of Card:")?.trim(); if (!back) { console.log("[handleNewCard] Cancelled (no back)."); return; }
            const hintInput = prompt("Enter Hint (optional):")?.trim() ?? "";
            const tagsRaw = prompt("Enter Tags (comma-separated, optional):")?.trim(); const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];
            console.log(`[handleNewCard] Attempting to create card: F='${front}', B='${back}', H='${hintInput}', T='${tags.join(',')}'`); // DEBUG
            setIsLoading(true);
            // **** newCard IS USED HERE ****
            await newCard(front, back, hintInput, tags);
            alert("Card created successfully!"); console.log("[handleNewCard] Card created on backend, reloading practice session...");
            await loadPracticeCards();
        } catch (err: any) { console.error("[handleNewCard] Create card failed:", err); const errorMessage = err.response?.data?.error || err.message || 'Unknown error occurred'; setError(`Create card failed: ${errorMessage}`); alert(`Error creating card: ${errorMessage}`); }
        finally { setIsLoading(false); }
    }, [loadPracticeCards]); // Depends on loadPracticeCards


    // --- Render Logic ---
    if (isLoading && practiceCards.length === 0 && !error) {
        return <div className="container"><p className="loadingText">Loading Session...</p></div>;
    }
    if (error && !error.toLowerCase().includes('initialization failed') && practiceCards.length === 0 && !isLoading) {
        return ( <div className="container"> <div className="cameraContainer" style={{ backgroundColor: '#555' }}> <video ref={videoRef} className="videoFeed" muted playsInline style={{ visibility: 'hidden' }} /><canvas ref={canvasRef} className="landmarkCanvas"/> </div> <p className="errorText">Error loading session: {error}</p> <button onClick={loadPracticeCards} className="practiceButton retryButton">Retry Load</button> <button onClick={handleNewCard} className="practiceButton newCardButton">➕ New Card</button> </div> );
    }
     if (sessionFinished) {
        return ( <div className="container"> <div className="cameraContainer"> <video ref={videoRef} className="videoFeed" autoPlay playsInline muted style={{ visibility: isCameraReady ? 'visible' : 'hidden' }}/><canvas ref={canvasRef} className="landmarkCanvas"/> </div> <p className="sessionCompleteText">🎉 Session Complete! 🎉</p> {error && <p className="errorText">Note during session: {error}</p>} <button onClick={handleNextDay} className="practiceButton nextDayButton">Start Next Day ({day + 1})</button> <button onClick={handleNewCard} className="practiceButton newCardButton">➕ New Card</button> </div> );
     }
    const currentCard = practiceCards[currentCardIndex];
    if (!currentCard && !isLoading && !sessionFinished) {
         return ( <div className="container"> <div className="cameraContainer"> <video ref={videoRef} className="videoFeed" autoPlay playsInline muted style={{ visibility: isCameraReady ? 'visible' : 'hidden' }}/><canvas ref={canvasRef} className="landmarkCanvas"/> </div> <p>No cards due for practice today (Day {day}).</p> {error && <p className="errorText">Note: {error}</p>} <button onClick={handleNextDay} className="practiceButton nextDayButton">Try Next Day ({day + 1})</button> <button onClick={handleNewCard} className="practiceButton newCardButton">➕ New Card</button> </div> );
    }

    return (
        <div className="container">
            {error && !error.toLowerCase().includes('initialization failed') && <p className="errorText">Note: {error}</p>}
            <h2 className="header">📅 Day {day} - Card {currentCard ? currentCardIndex + 1 : '?'} of {practiceCards.length}</h2>
            <div className="cardContainer" onClick={!showBack ? handleShowBack : undefined} title={!showBack ? "Click card to reveal answer" : ""}>
                {currentCard ? ( <div className={`card ${isFlipped ? 'cardFlipped' : ''}`}> <div className="cardFace front">{currentCard.front}</div> <div className="cardFace back">{currentCard.back}</div> </div> ) : (<p className="loadingText">Loading card...</p>)}
            </div>
            {!showBack && ( <button onClick={handleGetHint} disabled={loadingHint || !currentCard} className="practiceButton hintButton"> {loadingHint ? "Loading Hint..." : "Get Hint"} </button> )}
            {hint && !showBack && <p className="hintText">Hint: {hint}</p>}
            {hintError && !showBack && <p className="errorText">{hintError}</p>}
            <div className="cameraContainer">
                <video ref={videoRef} className="videoFeed" autoPlay playsInline muted style={{ visibility: isCameraReady ? 'visible' : 'hidden' }} />
                <canvas ref={canvasRef} className="landmarkCanvas"/>
                 {isCameraReady && isDetecting && <div className="detectionIndicator" title="Gesture detection active"></div>}
            </div>
             <p className="gestureStatus">
                 {isCameraReady ? (isDetecting ? `Detected: ${detectedGesture || 'None'}` : (showBack ? 'Ready for Gesture...' : 'Camera Ready')) : (error && error.toLowerCase().includes('initialization failed') ? <span className="errorText">Gesture Input Disabled</span> : (detector ? "Waiting for Camera..." : "Loading Model..."))}
             </p>
            <div className="controlsArea">
                {!showBack ? ( <button onClick={handleShowBack} disabled={!currentCard} className="practiceButton showAnswerButton"> Show Answer </button>
                ) : ( isCameraReady && detector ? ( <p className="instructionText">Use Gesture: 👍 (Easy), 👎 (Wrong), 🖐️ (Hard)</p>
                    ) : ( <> <p className="instructionText"> {error && error.toLowerCase().includes('initialization failed') ? "Gesture input failed." : "Gesture input unavailable."} Use buttons: </p> <div className="answerButtonsContainer"> <button onClick={() => handleAnswer(AnswerDifficulty.Easy)} className="practiceButton easyButton">Easy 👍</button> <button onClick={() => handleAnswer(AnswerDifficulty.Hard)} className="practiceButton hardButton">Hard 🖐️</button> <button onClick={() => handleAnswer(AnswerDifficulty.Wrong)} className="practiceButton wrongButton">Wrong 👎</button> </div> </> )
                )}
            </div>
            <button onClick={handleNewCard} className="practiceButton newCardButton" style={{ marginTop: '20px' }}> ➕ Create New Card </button>
        </div>
    );
};

export default PracticeView;