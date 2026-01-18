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

// Extended gesture types for separate chest control
export type GestureType = 'IDLE' | 'ROTATE' | 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN' | 'INTERACT_LEFT' | 'INTERACT_RIGHT';

interface AppState {
    leftHand: Hand | null;
    rightHand: Hand | null;
    gesture: GestureType;

    // Navigation and View
    rotationDelta: { x: number; y: number }; // Per-frame movement
    accumulatedRotation: { x: number; y: number }; // Total accumulated rotation
    zoomFactor: number;

    // Per-Side Chest Offsets (driven by gestures)
    leftChestOffset: { x: number; y: number };
    rightChestOffset: { x: number; y: number };

    // Animation Control
    currentMovement: MovementType;
    movementIntensity: number; // 0 to 1 (Physics/Dynamics slider)

    // App State
    isCameraActive: boolean;
    isModelLoaded: boolean;
    isVerified: boolean;

    updateHands: (left: Hand | null, right: Hand | null) => void;
    setVerified: (verified: boolean) => void;
    setGesture: (gesture: GestureType) => void;
    setRotationDelta: (delta: { x: number; y: number }) => void;
    applyRotationDelta: (delta: { x: number; y: number }) => void; // Accumulates rotation
    setZoomFactor: (factor: number) => void;

    setLeftChestOffset: (offset: { x: number; y: number }) => void;
    setRightChestOffset: (offset: { x: number; y: number }) => void;

    setCurrentMovement: (movement: MovementType) => void;
    setMovementIntensity: (intensity: number) => void;

    setCameraActive: (active: boolean) => void;
    setModelLoaded: (loaded: boolean) => void;

    // Model selection
    selectedModel: string;
    setSelectedModel: (modelId: string) => void;

    resetView: () => void; // Resets accumulated rotation to zero
}

export const useStore = create<AppState>((set) => ({
    leftHand: null,
    rightHand: null,
    gesture: 'IDLE',
    rotationDelta: { x: 0, y: 0 },
    accumulatedRotation: { x: 0, y: 0 },
    zoomFactor: 1,

    leftChestOffset: { x: 0, y: 0 },
    rightChestOffset: { x: 0, y: 0 },

    currentMovement: 'Breathing',
    movementIntensity: 0.5,

    isCameraActive: true,
    isModelLoaded: false,
    isVerified: false,

    updateHands: (left, right) => set({ leftHand: left, rightHand: right }),
    setVerified: (verified) => set({ isVerified: verified }),
    setGesture: (gesture) => set({ gesture }),
    setRotationDelta: (delta) => set({ rotationDelta: delta }),
    applyRotationDelta: (delta) => set((state) => ({
        accumulatedRotation: {
            x: state.accumulatedRotation.x + delta.x,
            y: state.accumulatedRotation.y + delta.y
        }
    })),
    setZoomFactor: (zoomFactor) => set({ zoomFactor }),

    setLeftChestOffset: (offset) => set({ leftChestOffset: offset }),
    setRightChestOffset: (offset) => set({ rightChestOffset: offset }),

    setCurrentMovement: (currentMovement) => set({ currentMovement }),
    setMovementIntensity: (movementIntensity) => set({ movementIntensity }),

    setCameraActive: (isCameraActive) => set({ isCameraActive }),
    setModelLoaded: (isModelLoaded) => set({ isModelLoaded }),

    // Model selection
    selectedModel: 'jeny',
    setSelectedModel: (selectedModel) => set({ selectedModel }),

    resetView: () => set({ accumulatedRotation: { x: 0, y: 0 }, zoomFactor: 1 }),
}));
