import React, { useEffect, useRef } from 'react';
import { Hands, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { useStore } from '../store/useStore';
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
            console.log('Creating new Hands instance (Local)...');
            const hands = new Hands({
                locateFile: (file) => `/mediapipe/${file}`
            });

            // Race initialization against a timeout to detect hangs
            const initPromise = hands.initialize();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('MediaPipe initialization timed out (10s)')), 10000)
            );

            await Promise.race([initPromise, timeoutPromise]);
            console.log('MediaPipe Hands initialized successfully');

            hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 0,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            globalHandsInstance = hands;
            return hands;
        } catch (error) {
            console.error('Failed to initialize MediaPipe:', error);
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

    // Subscribe to store changes for camera state
    const isCameraActive = useStore(state => state.isCameraActive);

    // Initialize MediaPipe
    useEffect(() => {
        let isActive = true;
        let loadingTimeout: ReturnType<typeof setTimeout>;

        const initializeMediaPipe = async () => {
            console.log('HandController: Starting initialization...');

            // Long timeout - just a safety net, not expected to fire normally
            loadingTimeout = setTimeout(() => {
                if (isActive) {
                    console.warn('Loading timeout reached (15s) - dismissing loading screen as fallback');
                    useStore.getState().setModelLoaded(true);
                }
            }, 15000);

            try {
                // Use singleton to prevent WASM corruption from Strict Mode
                console.log('Waiting for MediaPipe singleton...');
                const hands = await getOrCreateHands();
                console.log('Got hands:', !!hands);

                clearTimeout(loadingTimeout);

                if (!hands) {
                    console.error('Failed to get Hands instance');
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

                    let leftHand = null;
                    let rightHand = null;

                    if (results.multiHandLandmarks && results.multiHandedness) {
                        results.multiHandLandmarks.forEach((landmarks, index) => {
                            if (!results.multiHandedness[index]) return;

                            const label = results.multiHandedness[index].label;
                            const keypoints = landmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z }));
                            const handData = GestureRecognizer.analyzeHand(keypoints, label as 'Left' | 'Right');

                            if (label === 'Left') leftHand = handData;
                            else rightHand = handData;
                        });
                    }

                    updateHandsRef.current(leftHand, rightHand);
                });

                handsRef.current = hands;

                // 4. Start Camera only after hands is ready
                if (videoRef.current) {
                    console.log('Starting camera...');
                    const camera = new Camera(videoRef.current, {
                        onFrame: async () => {
                            // Only send if active and hands instance exists
                            if (isActive && videoRef.current && handsRef.current) {
                                try {
                                    await handsRef.current.send({ image: videoRef.current });
                                } catch (e) {
                                    console.error('MediaPipe send error:', e);
                                }
                            }
                        },
                        width: 640,
                        height: 480
                    });

                    cameraRef.current = camera;
                    await camera.start();
                    console.log('Camera started successfully');
                }

            } catch (error) {
                console.error('Initialization error:', error);
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
            cameraRef.current.start().catch(console.error);
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
