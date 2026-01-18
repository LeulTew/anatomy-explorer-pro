import React, { useEffect, useRef } from 'react';
import { Hands, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { useStore, type Hand, type GestureType } from '../store/useStore';
import { GestureRecognizer } from '../logic/GestureRecognizer';

// Module-level singleton to prevent React Strict Mode from creating multiple WASM instances
let globalHandsInstance: Hands | null = null;
let isInitializing = false;
let initializationPromise: Promise<Hands | null> | null = null;

async function getOrCreateHands(): Promise<Hands | null> {
    // If already initialized, return existing instance
    if (globalHandsInstance) {
        return globalHandsInstance;
    }

    // If initialization is in progress, wait for it
    if (isInitializing && initializationPromise) {
        return initializationPromise;
    }

    // Start new initialization
    isInitializing = true;
    initializationPromise = (async () => {
        try {
            const hands = new Hands({
                locateFile: (file) => `/mediapipe/${file}`
            });

            // Race initialization against a timeout to detect hangs
            const initPromise = hands.initialize();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('MediaPipe initialization timed out (10s)')), 10000)
            );

            await Promise.race([initPromise, timeoutPromise]);

            hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 0,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            globalHandsInstance = hands;
            return hands;
        } catch {
            return null;
        } finally {
            isInitializing = false;
        }
    })();

    return initializationPromise;
}

const HandController: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const handsRef = useRef<Hands | null>(null);
    const cameraRef = useRef<Camera | null>(null);

    // Use refs for callbacks to avoid stale closures
    const updateHandsRef = useRef(useStore.getState().updateHands);
    const setModelLoadedRef = useRef(useStore.getState().setModelLoaded);

    // Refs for gesture tracking
    const prevLeftCentroid = useRef<{ x: number, y: number } | null>(null);
    const prevRightCentroid = useRef<{ x: number, y: number } | null>(null);
    const prevDist = useRef<number | null>(null);
    const lastUpdateRef = useRef<number>(0);

    // Subscribe to store changes for camera state
    const isCameraActive = useStore(state => state.isCameraActive);

    // Initialize MediaPipe
    useEffect(() => {
        let isActive = true;
        let loadingTimeout: ReturnType<typeof setTimeout>;

        const initializeMediaPipe = async () => {
            // Long timeout - just a safety net
            loadingTimeout = setTimeout(() => {
                if (isActive) {
                    useStore.getState().setModelLoaded(true);
                }
            }, 15000);

            try {
                const hands = await getOrCreateHands();

                clearTimeout(loadingTimeout);

                if (!hands) {
                    useStore.getState().setModelLoaded(true);
                    return;
                }

                if (!isActive) return;

                // Setup callbacks
                let hasReportedReady = false;
                hands.onResults((results: Results) => {
                    if (!hasReportedReady) {
                        clearTimeout(loadingTimeout);
                        useStore.getState().setModelLoaded(true);
                        hasReportedReady = true;
                    }

                    if (!isActive) return;

                    let leftHand: Hand | null = null;
                    let rightHand: Hand | null = null;

                    if (results.multiHandLandmarks && results.multiHandedness) {
                        for (let index = 0; index < results.multiHandLandmarks.length; index++) {
                            const landmarks = results.multiHandLandmarks[index];
                            if (!results.multiHandedness[index]) continue;

                            const label = results.multiHandedness[index].label;
                            const keypoints = landmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z }));
                            const handData = GestureRecognizer.analyzeHand(keypoints, label as 'Left' | 'Right');

                            if (label === 'Left') leftHand = handData;
                            else rightHand = handData;
                        }
                    }

                    // --- Gesture Processing Logic ---
                    const state = useStore.getState();
                    let currentGesture: GestureType = 'IDLE';
                    let newZoom = state.zoomFactor;
                    let rotationDelta = { x: 0, y: 0 };
                    let leftChestDelta = { x: 0, y: 0 };
                    let rightChestDelta = { x: 0, y: 0 };

                    // PRIORITY 1: Two Hands = Zoom
                    if (leftHand && rightHand) {
                        const dist = GestureRecognizer.calculateDistance(leftHand.centroid, rightHand.centroid);
                        if (prevDist.current !== null) {
                            const delta = dist - prevDist.current;
                            if (Math.abs(delta) > 0.005) {
                                currentGesture = delta > 0 ? 'ZOOM_IN' : 'ZOOM_OUT';
                                newZoom = state.zoomFactor * (1 + delta * 2);
                                newZoom = Math.max(0.5, Math.min(newZoom, 5));
                            }
                        }
                        prevDist.current = dist;
                        // Reset single-hand centroids when zooming
                        prevLeftCentroid.current = null;
                        prevRightCentroid.current = null;
                    } else {
                        prevDist.current = null;
                    }

                    // PRIORITY 2: Single Hand Gestures (if not zooming)
                    if (currentGesture === 'IDLE') {

                        // RIGHT HAND ONLY
                        if (rightHand && !leftHand) {
                            const current = rightHand.centroid;

                            if (rightHand.isGrabbing) {
                                // FIST = ROTATE
                                currentGesture = 'ROTATE';
                                if (prevRightCentroid.current) {
                                    const deltaX = current.x - prevRightCentroid.current.x;
                                    const deltaY = current.y - prevRightCentroid.current.y;
                                    // Horizontal = full, Vertical = 20% (slight tilt)
                                    rotationDelta = { x: deltaX, y: deltaY * 0.2 };
                                }
                            } else if (rightHand.isOpen) {
                                // OPEN HAND = INTERACT RIGHT CHEST
                                currentGesture = 'INTERACT_RIGHT';
                                if (prevRightCentroid.current) {
                                    const deltaX = current.x - prevRightCentroid.current.x;
                                    const deltaY = current.y - prevRightCentroid.current.y;
                                    rightChestDelta = { x: deltaX, y: deltaY };
                                }
                            }
                            prevRightCentroid.current = current;
                        } else {
                            prevRightCentroid.current = null;
                        }

                        // LEFT HAND ONLY
                        if (leftHand && !rightHand) {
                            const current = leftHand.centroid;

                            if (leftHand.isGrabbing) {
                                // FIST = ROTATE (also works with left hand)
                                currentGesture = 'ROTATE';
                                if (prevLeftCentroid.current) {
                                    const deltaX = current.x - prevLeftCentroid.current.x;
                                    const deltaY = current.y - prevLeftCentroid.current.y;
                                    rotationDelta = { x: deltaX, y: deltaY * 0.2 };
                                }
                            } else if (leftHand.isOpen) {
                                // OPEN HAND = INTERACT LEFT CHEST
                                currentGesture = 'INTERACT_LEFT';
                                if (prevLeftCentroid.current) {
                                    const deltaX = current.x - prevLeftCentroid.current.x;
                                    const deltaY = current.y - prevLeftCentroid.current.y;
                                    leftChestDelta = { x: deltaX, y: deltaY };
                                }
                            }
                            prevLeftCentroid.current = current;
                        } else {
                            prevLeftCentroid.current = null;
                        }
                    }

                    // Throttle store updates (~30fps)
                    const now = performance.now();
                    if (now - lastUpdateRef.current > 32) {
                        lastUpdateRef.current = now;

                        // Apply rotation delta to accumulator if rotating
                        if (currentGesture === 'ROTATE') {
                            useStore.getState().applyRotationDelta(rotationDelta);
                        }

                        useStore.setState({
                            leftHand,
                            rightHand,
                            gesture: currentGesture,
                            zoomFactor: newZoom,
                            rotationDelta: rotationDelta,
                            leftChestOffset: currentGesture === 'INTERACT_LEFT' ? leftChestDelta : { x: 0, y: 0 },
                            rightChestOffset: currentGesture === 'INTERACT_RIGHT' ? rightChestDelta : { x: 0, y: 0 }
                        });
                    }
                });

                handsRef.current = hands;

                // Start Camera after hands is ready
                if (videoRef.current) {
                    const camera = new Camera(videoRef.current, {
                        onFrame: async () => {
                            if (isActive && videoRef.current && handsRef.current) {
                                try {
                                    await handsRef.current.send({ image: videoRef.current });
                                } catch {
                                    // Silently ignore send errors
                                }
                            }
                        },
                        width: 640,
                        height: 480
                    });

                    cameraRef.current = camera;
                    await camera.start();
                }

            } catch {
                useStore.getState().setModelLoaded(true);
            }
        };

        initializeMediaPipe();

        return () => {
            isActive = false;
            handsRef.current?.close();
            cameraRef.current?.stop();
            handsRef.current = null;
            cameraRef.current = null;
        };
    }, []);

    // Handle camera start/stop separately from initialization
    useEffect(() => {
        if (!cameraRef.current) return;

        if (isCameraActive) {
            cameraRef.current.start().catch(() => { });
        } else {
            cameraRef.current.stop();
            updateHandsRef.current(null, null);
        }
    }, [isCameraActive]);

    // Keep refs up to date
    useEffect(() => {
        updateHandsRef.current = useStore.getState().updateHands;
        setModelLoadedRef.current = useStore.getState().setModelLoaded;
    });

    return (
        <div style={{
            position: 'fixed', bottom: 10, right: 10,
            width: 160, height: 120, zIndex: 1000,
            pointerEvents: 'none', opacity: isCameraActive ? 0.7 : 0.3,
            borderRadius: 8, overflow: 'hidden',
            transition: 'opacity 0.3s'
        }}>
            <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', transform: 'scaleX(-1)', objectFit: 'cover' }}
                autoPlay
                muted
                playsInline
            />
        </div>
    );
};

export default HandController;
