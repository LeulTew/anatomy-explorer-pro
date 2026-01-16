import { create } from 'zustand';
import type { MuscleGroup, MovementType } from '../data/anatomy';

export type Point = { x: number; y: number; z: number };
export type Hand = {
    keypoints: Point[]; // 21 landmarks from MediaPipe
    handedness: 'Left' | 'Right';
    isPinching: boolean; // Thumb-Index touch
    isGrabbing: boolean; // Fist
    centroid: Point;
};

interface AppState {
    leftHand: Hand | null;
    rightHand: Hand | null;
    gesture: 'IDLE' | 'ROTATE' | 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN';

    // Navigation and View
    rotationDelta: { x: number; y: number };
    zoomFactor: number;

    // Anatomy Control
    activeMuscleGroup: MuscleGroup | null;
    currentMovement: MovementType;
    movementIntensity: number; // 0 to 1
    showSkeleton: boolean;

    // App State
    isCameraActive: boolean;
    isModelLoaded: boolean;
    isInfoPanelOpen: boolean;

    updateHands: (left: Hand | null, right: Hand | null) => void;
    setGesture: (gesture: AppState['gesture']) => void;
    setRotationDelta: (delta: { x: number; y: number }) => void;
    setZoomFactor: (factor: number) => void;

    setActiveMuscleGroup: (group: MuscleGroup | null) => void;
    setCurrentMovement: (movement: MovementType) => void;
    setMovementIntensity: (intensity: number) => void;
    setShowSkeleton: (show: boolean) => void;

    setCameraActive: (active: boolean) => void;
    setModelLoaded: (loaded: boolean) => void;
    setInfoPanelOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    leftHand: null,
    rightHand: null,
    gesture: 'IDLE',
    rotationDelta: { x: 0, y: 0 },
    zoomFactor: 1,

    activeMuscleGroup: null,
    currentMovement: 'Breathing',
    movementIntensity: 0.5,
    showSkeleton: false,

    isCameraActive: true,
    isModelLoaded: false,
    isInfoPanelOpen: false,

    updateHands: (left, right) => set({ leftHand: left, rightHand: right }),
    setGesture: (gesture) => set({ gesture }),
    setRotationDelta: (delta) => set({ rotationDelta: delta }),
    setZoomFactor: (zoomFactor) => set({ zoomFactor }),

    setActiveMuscleGroup: (activeMuscleGroup) => set({ activeMuscleGroup }),
    setCurrentMovement: (currentMovement) => set({ currentMovement }),
    setMovementIntensity: (movementIntensity) => set({ movementIntensity }),
    setShowSkeleton: (showSkeleton) => set({ showSkeleton }),

    setCameraActive: (isCameraActive) => set({ isCameraActive }),
    setModelLoaded: (isModelLoaded) => set({ isModelLoaded }),
    setInfoPanelOpen: (isInfoPanelOpen) => set({ isInfoPanelOpen })
}));
