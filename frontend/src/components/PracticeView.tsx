// src/components/PracticeView.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import '@tensorflow/tfjs-backend-webgl'; // Import for side-effects

import { Flashcard, AnswerDifficulty } from "../types";
import { fetchPracticeCards, submitAnswer, advanceDay, fetchHint, newCard } from "../services/api";

// Import the CSS file
import "./PracticeView.css";

const PracticeView: React.FC = () => {
    // --- State ---
    const [practiceCards, setPracticeCards] = useState<Flashcard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showBack, setShowBack] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [day, setDay] = useState(0);
    const [sessionFinished, setSessionFinished] = useState(false);
    const [hint, setHint] = useState<string | null>(null);
    const [loadingHint, setLoadingHint] = useState(false);
    const [hintError, setHintError] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [detector, setDetector] = useState<handPoseDetection.HandDetector | null>(null);
    const [detectedGesture, setDetectedGesture] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);

    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement>(null); // Ref for the video element
    const detectionIntervalRef = useRef<number | null>(null); // requestAnimationFrame ID
    const lastGestureRef = useRef<string | null>(null);
    const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Gesture Classification Logic ---
    // (Keep the classifyGesture function exactly as before - needs tuning)
    const classifyGesture = (landmarks: handPoseDetection.Keypoint[]): string | null => {
        // ... (classification logic remains the same) ...
        if (!landmarks || landmarks.length === 0) return null;
        const getLandmark = (name: string): handPoseDetection.Keypoint | undefined => landmarks.find(p => p.name === name);
        const wrist = getLandmark('wrist'); const thumbTip = getLandmark('thumb_tip'); const thumbIp = getLandmark('thumb_ip'); const thumbMcP = getLandmark('thumb_mcp'); const indexTip = getLandmark('index_finger_tip'); const indexPip = getLandmark('index_finger_pip'); const middleTip = getLandmark('middle_finger_tip'); const middlePip = getLandmark('middle_finger_pip'); const ringTip = getLandmark('ring_finger_tip'); const ringPip = getLandmark('ring_finger_pip'); const pinkyTip = getLandmark('pinky_tip'); const pinkyPip = getLandmark('pinky_pip');
        if (!wrist || !thumbTip || !thumbIp || !thumbMcP || !indexTip || !indexPip || !middleTip || !middlePip || !ringTip || !ringPip || !pinkyTip || !pinkyPip) { return null; }
        const isThumbExtendedUp = thumbTip.y < thumbIp.y && thumbTip.y < thumbMcP.y; const isThumbPointingDown = thumbTip.y > thumbIp.y && thumbTip.y > thumbMcP.y; const areFingersCurled = indexTip.y > indexPip.y && middleTip.y > middlePip.y && ringTip.y > ringPip.y && pinkyTip.y > pinkyPip.y; const areFingersExtended = indexTip.y < indexPip.y && middleTip.y < middlePip.y && ringTip.y < ringPip.y && pinkyTip.y < pinkyPip.y; const areFingersAboveWrist = indexTip.y < wrist.y && middleTip.y < wrist.y && ringTip.y < wrist.y && pinkyTip.y < wrist.y;
        if (isThumbExtendedUp && areFingersCurled && thumbTip.y < indexPip.y) { return "Thumbs Up"; }
        if (isThumbPointingDown && areFingersCurled && thumbTip.y > indexPip.y) { return "Thumbs Down"; }
        const isThumbExtendedPalm = thumbTip.y < thumbMcP.y; if (areFingersExtended && areFingersAboveWrist && isThumbExtendedPalm) { return "Open Palm"; }
        return null;
    };

    // --- Core Practice Logic Callbacks (Stable) ---
    const handleAnswer = useCallback(async (difficulty: AnswerDifficulty) => {
        setIsDetecting(false);
        if (detectionIntervalRef.current) cancelAnimationFrame(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
        if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
        gestureTimeoutRef.current = null;

        const currentCard = practiceCards[currentCardIndex];
        if (!currentCard) return;
        console.log(`Submitting answer for "${currentCard.front}": ${AnswerDifficulty[difficulty]}`);
        try {
            await submitAnswer(currentCard.front, currentCard.back, difficulty);
            const nextIndex = currentCardIndex + 1;
            if (nextIndex < practiceCards.length) {
                setCurrentCardIndex(nextIndex);
                setShowBack(false); setIsFlipped(false); setHint(null); setHintError(null); setDetectedGesture(null); lastGestureRef.current = null;
            } else {
                setSessionFinished(true); setPracticeCards([]); setCurrentCardIndex(0); setShowBack(false); setIsFlipped(false); setHint(null); setHintError(null); setDetectedGesture(null); lastGestureRef.current = null;
            }
        } catch (err) {
            console.error("Failed to submit answer:", err); setError("Failed to save answer. Please try again.");
        } finally {
            setIsDetecting(false);
        }
    }, [practiceCards, currentCardIndex]);

    // --- Gesture Action Trigger ---
    const triggerAnswerFromGesture = useCallback((gesture: string) => {
        if (!showBack || !isDetecting) return;
        let difficulty: AnswerDifficulty | null = null;
        switch (gesture) {
            case "Thumbs Up": difficulty = AnswerDifficulty.Easy; break;
            case "Thumbs Down": difficulty = AnswerDifficulty.Wrong; break;
            case "Open Palm": difficulty = AnswerDifficulty.Hard; break;
        }
        if (difficulty !== null) {
            console.log(`Gesture '${gesture}' detected. Triggering answer: ${AnswerDifficulty[difficulty]}`);
            setIsDetecting(false);
            if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
            if (detectionIntervalRef.current) cancelAnimationFrame(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
            setDetectedGesture(null); lastGestureRef.current = null;
            handleAnswer(difficulty);
        }
    }, [showBack, isDetecting, handleAnswer]);

    // --- Hand Detection Loop ---
    const detectHands = useCallback(async () => {
        if (!isDetecting) { detectionIntervalRef.current = null; return; }
        if (!detector || !videoRef.current || videoRef.current.readyState !== 4) {
            detectionIntervalRef.current = requestAnimationFrame(detectHands); return;
        }
        try {
            const hands = await detector.estimateHands(videoRef.current, { flipHorizontal: false });
            let currentGesture: string | null = null;
            if (hands.length > 0) { currentGesture = classifyGesture(hands[0].keypoints); }
            setDetectedGesture(currentGesture);
            if (currentGesture && currentGesture === lastGestureRef.current) {
                if (!gestureTimeoutRef.current) {
                    gestureTimeoutRef.current = setTimeout(() => {
                        console.log(`Stable gesture confirmed: ${currentGesture}`);
                        triggerAnswerFromGesture(currentGesture!);
                        gestureTimeoutRef.current = null; lastGestureRef.current = null;
                    }, 700);
                }
            } else {
                if (gestureTimeoutRef.current) { clearTimeout(gestureTimeoutRef.current); gestureTimeoutRef.current = null; }
                lastGestureRef.current = currentGesture;
            }
        } catch (error) {
            console.error("Error during hand detection:", error); setError("Hand detection failed."); setIsDetecting(false);
        } finally {
            if (isDetecting) { detectionIntervalRef.current = requestAnimationFrame(detectHands); }
            else { detectionIntervalRef.current = null; }
        }
    }, [detector, isDetecting, triggerAnswerFromGesture]);

    // --- Effect for Detection Loop Start/Stop ---
    useEffect(() => {
        if (isDetecting && detector && isCameraReady) {
            lastGestureRef.current = null;
            if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
            gestureTimeoutRef.current = null;
            if (detectionIntervalRef.current === null) { // Start only if not already running
                console.log("Starting detection loop...");
                detectionIntervalRef.current = requestAnimationFrame(detectHands);
            }
        } else {
            if (detectionIntervalRef.current !== null) { // Stop only if running
                 console.log("Stopping detection loop.");
                 cancelAnimationFrame(detectionIntervalRef.current);
                 detectionIntervalRef.current = null;
                 if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
                 gestureTimeoutRef.current = null;
                 lastGestureRef.current = null;
            }
        }
        // No cleanup function needed here specifically for starting/stopping the loop itself
        // The main unmount cleanup handles the final stop.
    }, [isDetecting, detector, isCameraReady, detectHands]); // Dependencies control when this runs


    // --- Load Practice Cards Callback --- (Stable)
    const loadPracticeCards = useCallback(async () => {
        console.log("Loading practice cards...");
        setIsLoading(true); setError(null); setSessionFinished(false); setIsDetecting(false);
        try {
            const session = await fetchPracticeCards();
            setPracticeCards(session.cards); setDay(session.day);
            const isFinished = session.cards.length === 0;
            setSessionFinished(isFinished); setCurrentCardIndex(0);
            setShowBack(false); setIsFlipped(false); setHint(null); setHintError(null); setDetectedGesture(null); lastGestureRef.current = null;
            console.log(isFinished ? "No cards for today." : `Loaded ${session.cards.length} cards.`);
        } catch (err) {
            console.error("Failed to load practice session:", err); setError("Failed to load practice session."); setPracticeCards([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- Effect for Initial Setup (Camera & Model) ---
    useEffect(() => {
        let isMounted = true; // Flag to prevent state updates after unmount
        let streamReference: MediaStream | null = null; // Keep local ref to stream for cleanup

        const setup = async () => {
            setError(null); // Clear previous errors
            try {
                console.log("Setting up TF.js and Handpose...");
                await tf.setBackend('webgl'); await tf.ready();
                console.log(`Using TF.js backend: ${tf.getBackend()}`);

                const model = handPoseDetection.SupportedModels.MediaPipeHands;
                const detectorConfig = {
                  runtime: 'tfjs' as const,
                  modelType: 'lite' as const,  // Need to be explicit with this value too
                  maxHands: 1
              } as handPoseDetection.MediaPipeHandsTfjsModelConfig;
                const handDetector = await handPoseDetection.createDetector(model, detectorConfig);

                if (!isMounted) { handDetector.dispose(); return; } // Check if unmounted during await
                setDetector(handDetector);
                console.log("Handpose detector loaded.");

                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                     const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 }, audio: false });
                     streamReference = stream; // Store stream locally

                     if (!isMounted) { stream.getTracks().forEach(track => track.stop()); return; } // Check again

                    // *** Use the ref ONLY after getting the stream ***
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.onloadedmetadata = () => {
                             // Check ref again inside async callback
                            if (videoRef.current) {
                                videoRef.current.play().then(() => {
                                    if (isMounted) setIsCameraReady(true); // Check mount status before setting state
                                    console.log("Camera ready and playing.");
                                }).catch(playErr => {
                                    if (isMounted) { console.error("Video play failed:", playErr); setError("Could not play camera video."); setIsCameraReady(false); }
                                });
                            }
                        };
                        videoRef.current.onerror = () => {
                            if (isMounted) { console.error("Video element error"); setError("Camera feed error."); setIsCameraReady(false); }
                        }
                    } else {
                         // This case should now be extremely unlikely if the <video> is always rendered
                         throw new Error("Video element reference unexpectedly null.");
                    }
                } else {
                    throw new Error("getUserMedia not supported.");
                }
            } catch (err: any) {
                console.error("Setup failed:", err);
                if (isMounted) {
                     setError(`Initialization failed: ${err.message || 'Unknown error'}.`);
                     setIsCameraReady(false);
                     // Cleanup detector if it was created before error
                     if (detector) { detector.dispose(); setDetector(null); }
                     // Stop stream if obtained before error
                     if (streamReference) streamReference.getTracks().forEach(track => track.stop());
                }
            }
        };

        setup();
        loadPracticeCards();

        // --- Cleanup on component unmount ---
        return () => {
            isMounted = false; // Set flag on unmount
            console.log("Unmounting PracticeView: Cleaning up...");
            setIsDetecting(false); // Ensure detection stops
            if (detectionIntervalRef.current) cancelAnimationFrame(detectionIntervalRef.current);
            if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);

            // Stop camera stream using the local reference if available
             if (streamReference) {
                  console.log("Stopping camera stream (from setup reference).");
                  streamReference.getTracks().forEach(track => track.stop());
             }
             // Also try stopping via videoRef just in case (belt and suspenders)
            if (videoRef.current?.srcObject) {
                 console.log("Stopping camera stream (from video ref).");
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                // Setting srcObject to null might not be necessary if tracks are stopped
                // videoRef.current.srcObject = null;
            }

            // Dispose detector
            if (detector) {
                 detector.dispose();
                 console.log("Detector disposed.");
            }
             setDetector(null); // Clear state
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadPracticeCards]); // Include loadPracticeCards


    // --- Other UI Callbacks --- (Stable)
    const handleShowBack = useCallback(() => {
        if (!practiceCards[currentCardIndex]) return;
        setShowBack(true); setIsFlipped(true); setHint(null); setHintError(null);
        setDetectedGesture(null); lastGestureRef.current = null;
        if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
        if (isCameraReady && detector) { console.log("Enabling gesture detection."); setIsDetecting(true); }
        else { console.log("Gesture detection prerequisites not met."); }
    }, [practiceCards, currentCardIndex, isCameraReady, detector]);

    const handleNextDay = useCallback(async () => {
        setIsLoading(true); setError(null); setIsDetecting(false);
        try { await advanceDay(); await loadPracticeCards(); }
        catch (err) { console.error("Failed to advance day:", err); setError("Failed to advance day."); setIsLoading(false); }
    }, [loadPracticeCards]);

    const handleGetHint = useCallback(async () => {
        const currentCard = practiceCards[currentCardIndex];
        if (!currentCard || loadingHint || showBack) return;
        setLoadingHint(true); setHintError(null); setHint(null);
        try { const fetchedHint = await fetchHint(currentCard); setHint(fetchedHint); }
        catch (err) { console.error("Hint error:", err); setHintError("Could not load hint."); }
        finally { setLoadingHint(false); }
    }, [practiceCards, currentCardIndex, loadingHint, showBack]);

    const handleNewCard = useCallback(async () => {
        setIsDetecting(false);
        try {
            const front = prompt("Front:")?.trim(); if (!front) return;
            const back = prompt("Back:")?.trim(); if (!back) return;
            const hint = prompt("Hint (optional):")?.trim() ?? "";
            const tagsRaw = prompt("Tags (comma-separated, optional):")?.trim();
            const tags = tagsRaw ? tagsRaw.split(",").map(tag => tag.trim()).filter(Boolean) : [];
            if (!front || !back) { alert("Front/Back required."); return; }
            setIsLoading(true); await newCard(front, back, hint, tags);
            alert("Card created!"); await loadPracticeCards();
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
            setError(`Failed to create card: ${errorMsg}`);
        } finally { setIsLoading(false); }
     }, [loadPracticeCards]);

    // --- Render Logic ---
    if (isLoading && practiceCards.length === 0 && !error) {
        return <div className="container"><p className="loadingText">Loading Session...</p></div>;
    }

     // Display critical error if loading failed completely
    if (error && practiceCards.length === 0 && !isLoading) {
        return (
            <div className="container">
                 {/* Render video element structure even on error so ref is available if retry works */}
                 <div className="cameraContainer" style={{ backgroundColor: '#555' }}> {/* Grey out */}
                     <video ref={videoRef} className="videoFeed" muted playsInline style={{ visibility: 'hidden' }} />
                 </div>
                <p className="errorText">Error: {error}</p>
                <button onClick={loadPracticeCards} className="practiceButton retryButton">Retry Load</button>
            </div>
        );
    }

    if (sessionFinished) {
        return (
            <div className="container">
                 {/* Keep video structure rendered */}
                 <div className="cameraContainer">
                     <video ref={videoRef} className="videoFeed" autoPlay playsInline muted style={{ visibility: isCameraReady ? 'visible' : 'hidden' }}/>
                 </div>
                <p className="sessionCompleteText">🎉 Session complete! Well done! 🎉</p>
                {error && <p className="errorText">Note: {error}</p>}
                <button onClick={handleNextDay} className="practiceButton nextDayButton">Next Day ({day + 1})</button>
                <button onClick={handleNewCard} className="practiceButton newCardButton">➕ Create New Card</button>
            </div>
        );
    }

    const currentCard = practiceCards[currentCardIndex];
    if (!currentCard && !isLoading && !sessionFinished) { // Should be rare if load logic is correct
        return (
             <div className="container">
                 {/* Keep video structure rendered */}
                 <div className="cameraContainer">
                     <video ref={videoRef} className="videoFeed" autoPlay playsInline muted style={{ visibility: isCameraReady ? 'visible' : 'hidden' }}/>
                 </div>
                 <p>No cards available for practice.</p>
                 {error && <p className="errorText">Note: {error}</p>}
                 <button onClick={handleNextDay} className="practiceButton nextDayButton">Try Next Day ({day + 1})</button>
                 <button onClick={handleNewCard} className="practiceButton newCardButton">➕ Create New Card</button>
             </div>
        );
    }

    // --- Main Practice View Render ---
    return (
        <div className="container">
            {error && !error.includes("Initialization failed") && <p className="errorText">Note: {error}</p>} {/* Show non-init errors */}
            <h2 className="header">
                📅 Day {day} - Card {currentCardIndex + 1} of {practiceCards.length}
            </h2>

            {/* Card Display */}
            <div className="cardContainer" onClick={!showBack ? handleShowBack : undefined} title={!showBack ? "Click to show answer" : ""}>
                {currentCard ? (
                    <div className={`card ${isFlipped ? 'cardFlipped' : ''}`}>
                        <div className="cardFace front">{currentCard.front}</div>
                        <div className="cardFace back">{currentCard.back}</div>
                    </div>
                ) : (<p className="loadingText">Loading card...</p>)}
            </div>

            {/* Hint Area */}
            {!showBack && (
                <button onClick={handleGetHint} disabled={loadingHint || !currentCard} className="practiceButton hintButton">
                    {loadingHint ? "..." : "Get Hint"}
                </button>
            )}
            {hint && !showBack && <p className="hintText">Hint: {hint}</p>}
            {hintError && !showBack && <p className="errorText">{hintError}</p>}

            {/* Webcam Feed & Gesture Status - RENDER VIDEO UNCONDITIONALLY */}
            <div className="cameraContainer">
                <video
                    ref={videoRef} // Assign ref
                    className="videoFeed"
                    autoPlay // Important for usability
                    playsInline // Important for mobile
                    muted // Avoid feedback loop
                    // Hide content until camera is confirmed ready and playing
                    style={{ visibility: isCameraReady ? 'visible' : 'hidden' }}
                />
                {/* Show indicator only when actively detecting and camera is ready */}
                {isCameraReady && isDetecting && <div className="detectionIndicator"></div>}
            </div>
            <p className="gestureStatus">
                {isCameraReady ?
                    (isDetecting ? `Detected: ${detectedGesture || 'None'}` : (showBack ? 'Ready for gesture...' : 'Initializing...'))
                    : (error && error.includes("Initialization failed") ?
                        <span className="errorText">Gesture input disabled</span> : // Specific error
                        (detector ? "Waiting for camera..." : "Loading model...") // Status messages
                      )
                }
            </p>

            {/* Controls Area */}
            <div className="controlsArea">
                {!showBack ? (
                    <button onClick={handleShowBack} disabled={!currentCard} className="practiceButton showAnswerButton">
                        Show Answer
                    </button>
                ) : (
                    // Check if gesture input is fully ready (camera AND detector)
                    isCameraReady && detector ? (
                        <p className="instructionText">Show gesture: 👍 (Easy), 👎 (Wrong), 🖐️ (Hard)</p>
                    ) : ( // Fallback buttons
                        <>
                            <p className="instructionText">
                                {error && error.includes("Initialization failed") ? "Gesture input failed." : "Gesture input unavailable."} Use buttons:
                            </p>
                            <div className="answerButtonsContainer">
                                <button onClick={() => handleAnswer(AnswerDifficulty.Easy)} className="practiceButton easyButton">Easy</button>
                                <button onClick={() => handleAnswer(AnswerDifficulty.Hard)} className="practiceButton hardButton">Hard</button>
                                <button onClick={() => handleAnswer(AnswerDifficulty.Wrong)} className="practiceButton wrongButton">Wrong</button>
                            </div>
                        </>
                    )
                )}
            </div>

            {/* Create New Card Button */}
            <button onClick={handleNewCard} className="practiceButton newCardButton">
                ➕ Create New Card
            </button>
        </div>
    );
};

export default PracticeView;