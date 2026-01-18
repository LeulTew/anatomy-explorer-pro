import { create } from 'zustand';
import type { MovementType } from '../data/anatomy';

export type Point = { x: number; y: number; z: number };
export type Hand = {
    keypoints: Point[]; // 21 landmarks from MediaPipe
    handedness: 'Left' | 'Right';
    isPinching: boolean; // Thumb-Index touch
    isGrabbing: boolean; // Fist
    isOpen: boolean; // All fingers extended
    centroid: Point;
};

interface AppState {
    leftHand: Hand | null;
    rightHand: Hand | null;
    gesture: 'IDLE' | 'ROTATE' | 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN' | 'INTERACT';

    // Navigation and View
    rotationDelta: { x: number; y: number };
    zoomFactor: number;

    // Anatomy Control
    // Animation Control
    currentMovement: MovementType;
    movementIntensity: number; // 0 to 1

    // App State
    isCameraActive: boolean;
    isModelLoaded: boolean;
    isVerified: boolean;

    updateHands: (left: Hand | null, right: Hand | null) => void;
    setVerified: (verified: boolean) => void;
    setGesture: (gesture: AppState['gesture']) => void;
    setRotationDelta: (delta: { x: number; y: number }) => void;
    setZoomFactor: (factor: number) => void;

    setCurrentMovement: (movement: MovementType) => void;
    setMovementIntensity: (intensity: number) => void;

    setCameraActive: (active: boolean) => void;
    setModelLoaded: (loaded: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    leftHand: null,
    rightHand: null,
    gesture: 'IDLE',
    rotationDelta: { x: 0, y: 0 },
    zoomFactor: 1,

    currentMovement: 'Breathing',
    movementIntensity: 0.5,

    isCameraActive: true,
    isModelLoaded: false,
    isVerified: false,

    updateHands: (left, right) => set({ leftHand: left, rightHand: right }),
    setVerified: (verified) => set({ isVerified: verified }),
    setGesture: (gesture) => set({ gesture }),
    setRotationDelta: (delta) => set({ rotationDelta: delta }),
    setZoomFactor: (zoomFactor) => set({ zoomFactor }),

    setCurrentMovement: (currentMovement) => set({ currentMovement }),
    setMovementIntensity: (movementIntensity) => set({ movementIntensity }),

    setCameraActive: (isCameraActive) => set({ isCameraActive }),
    setModelLoaded: (isModelLoaded) => set({ isModelLoaded }),
    // Info panel removed
}));
