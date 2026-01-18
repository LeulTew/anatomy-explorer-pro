import React, { useEffect, useRef } from 'react';
import { Hands, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { useStore, type Hand } from '../store/useStore';
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
    // Start new initialization
    isInitializing = true;
    initializationPromise = (async () => {
        try {
            // console.log('Creating new Hands instance (Local)...');
            const hands = new Hands({
                locateFile: (file) => `/mediapipe/${file}`
            });

            // Race initialization against a timeout to detect hangs
            const initPromise = hands.initialize();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('MediaPipe initialization timed out (10s)')), 10000)
            );

            await Promise.race([initPromise, timeoutPromise]);
            // console.log('MediaPipe Hands initialized successfully');

            hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 0,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            globalHandsInstance = hands;
            return hands;
        } catch (error) {
            // console.error('Failed to initialize MediaPipe:', error);
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

    // Refs for gesture tracking (moved from GestureManager)
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
            // console.log('HandController: Starting initialization...');

            // Long timeout - just a safety net, not expected to fire normally
            loadingTimeout = setTimeout(() => {
                if (isActive) {
                    // console.warn('Loading timeout reached (15s) - dismissing loading screen as fallback');
                    useStore.getState().setModelLoaded(true);
                }
            }, 15000);

            try {
                // Use singleton to prevent WASM corruption from Strict Mode
                // console.log('Waiting for MediaPipe singleton...');
                const hands = await getOrCreateHands();
                // console.log('Got hands:', !!hands);

                clearTimeout(loadingTimeout);

                if (!hands) {
                    // console.error('Failed to get Hands instance');
                    useStore.getState().setModelLoaded(true);
                    return;
                }

                if (!isActive) return;

                // Setup callbacks (safe to call multiple times)
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

                    // --- Integrated Gesture Logic (Prevents Update Depth Loops) ---
                    // Instead of a separate component reacting to store changes, we process inputs here
                    // and apply a single batched update to the store.

                    const state = useStore.getState();
                    let currentGesture: 'IDLE' | 'ROTATE' | 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN' | 'INTERACT' = 'IDLE';
                    let newZoom = state.zoomFactor;
                    let rotationDelta = { x: 0, y: 0 };

                    if (leftHand && rightHand) {
                        // Two hands = Zoom
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
                    } else {
                        prevDist.current = null;
                    }

                    const activeHand = rightHand || leftHand;

                    if (currentGesture === 'IDLE' && activeHand) {
                        const current = activeHand.centroid;

                        if (activeHand.isGrabbing) {
                            // Fist = Rotate (Either Hand)
                            currentGesture = 'ROTATE';
                            if (prevRightCentroid.current) {
                                const deltaX = current.x - prevRightCentroid.current.x;
                                const deltaY = current.y - prevRightCentroid.current.y;
                                rotationDelta = { x: deltaX, y: deltaY };
                            }
                        } else if (activeHand.isOpen) {
                            // Open Hand = Interact (Chest Move)
                            currentGesture = 'INTERACT';
                            if (prevRightCentroid.current) {
                                const deltaX = current.x - prevRightCentroid.current.x;
                                const deltaY = current.y - prevRightCentroid.current.y;
                                rotationDelta = { x: deltaX, y: deltaY };
                            }
                        }

                        prevRightCentroid.current = current;
                    } else {
                        // Reset if no active hand
                        prevRightCentroid.current = null;
                    }

                    // Direct store update (Throttled to ~30fps to prevent React loop)
                    const now = performance.now();
                    // Use a static ref for timing if possible, but here we can use a closure variable if defined outside
                    // Actually, we can just use a simple frame skip or check relative change?
                    // Better: just check if we really need to update.

                    // Ideally we should use a ref for lastUpdate time.
                    // Let's add that to the component scope refs.

                    // For now, let's just use requestAnimationFrame batching? No, setState is already batched.
                    // The issue is likely the sheer frequency.
                    // Let's modify the onResults callback to use a ref for throttling.

                    // See 'lastUpdateRef' added to component below.
                    if (now - lastUpdateRef.current > 32) { // ~30fps
                        lastUpdateRef.current = now;
                        useStore.setState({
                            leftHand,
                            rightHand,
                            gesture: currentGesture,
                            zoomFactor: newZoom,
                            rotationDelta: rotationDelta
                        });
                    }
                });

                handsRef.current = hands;

                // 4. Start Camera only after hands is ready
                if (videoRef.current) {
                    // ... continues as before
                    // console.log('Starting camera...');
                    const camera = new Camera(videoRef.current, {
                        onFrame: async () => {
                            // Only send if active and hands instance exists
                            if (isActive && videoRef.current && handsRef.current) {
                                try {
                                    await handsRef.current.send({ image: videoRef.current });
                                } catch (e) {
                                    // console.error('MediaPipe send error:', e);
                                }
                            }
                        },
                        width: 640,
                        height: 480
                    });

                    cameraRef.current = camera;
                    await camera.start();
                    // console.log('Camera started successfully');
                }

            } catch (error) {
                // console.error('Initialization error:', error);
                // Dismiss loading screen on error so app is usable (just without hands)
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
            // Clear hands when camera is off
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
