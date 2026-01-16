import { describe, it, expect } from 'vitest';
import { GestureRecognizer } from './GestureRecognizer';
import type { Point } from '../store/useStore';

describe('GestureRecognizer', () => {
    const createPoint = (x: number, y: number, z: number): Point => ({ x, y, z });

    // Helper to create a basic hand of 21 points
    const createHand = (modifier: (idx: number) => Point = (idx) => createPoint(idx * 0.1, 0, 0)): Point[] => {
        return Array.from({ length: 21 }, (_, i) => modifier(i));
    };

    describe('calculateDistance', () => {
        it('should calculate euclidean distance correctly', () => {
            const p1 = createPoint(0, 0, 0);
            const p2 = createPoint(3, 4, 0);
            expect(GestureRecognizer.calculateDistance(p1, p2)).toBe(5);
        });

        it('should handle 3D distance', () => {
            const p1 = createPoint(0, 0, 0);
            const p2 = createPoint(1, 1, 1);
            expect(GestureRecognizer.calculateDistance(p1, p2)).toBeCloseTo(Math.sqrt(3));
        });
    });

    describe('isPinching', () => {
        it('should return false for missing keypoints', () => {
            expect(GestureRecognizer.isPinching([])).toBe(false);
        });

        it('should detect pinch when thumb and index are close', () => {
            const points = createHand();
            // Thumb tip (4) and Index tip (8) close together
            points[4] = createPoint(0, 0, 0);
            points[8] = createPoint(0.01, 0.01, 0.01);
            expect(GestureRecognizer.isPinching(points)).toBe(true);
        });

        it('should not detect pinch when thumb and index are far', () => {
            const points = createHand();
            points[4] = createPoint(0, 0, 0);
            points[8] = createPoint(0.5, 0.5, 0.5);
            expect(GestureRecognizer.isPinching(points)).toBe(false);
        });
    });

    describe('isGrabbing', () => {
        it('should return false for missing keypoints', () => {
            expect(GestureRecognizer.isGrabbing([])).toBe(false);
        });

        it('should detect wrapping/fist', () => {
            const points = createHand();
            // Wrist at 0,0,0
            points[0] = createPoint(0, 0, 0);

            // Tips closer to wrist than PIPs
            // Middle (12 tip, 10 pip)
            points[10] = createPoint(0, 0.5, 0);
            points[12] = createPoint(0, 0.2, 0);

            // Ring (16 tip, 14 pip)
            points[14] = createPoint(0.2, 0.5, 0);
            points[16] = createPoint(0.2, 0.2, 0);

            // Pinky (20 tip, 18 pip)
            points[18] = createPoint(0.4, 0.5, 0);
            points[20] = createPoint(0.4, 0.2, 0);

            expect(GestureRecognizer.isGrabbing(points)).toBe(true);
        });

        it('should not detect grab if fingers are extended', () => {
            const points = createHand();
            points[0] = createPoint(0, 0, 0);
            // Tips further from wrist than PIPs
            points[10] = createPoint(0, 0.5, 0);
            points[12] = createPoint(0, 0.8, 0);

            expect(GestureRecognizer.isGrabbing(points)).toBe(false);
        });
    });

    describe('analyzeHand', () => {
        it('should return null for invalid inputs', () => {
            expect(GestureRecognizer.analyzeHand([], 'Left')).toBeNull();
        });

        it('should analyze valid hand correctly', () => {
            const points = createHand();
            // Mock grabbing state points
            points[0] = createPoint(0, 0, 0);
            points[10] = createPoint(0, 0.5, 0);
            points[12] = createPoint(0, 0.2, 0);
            points[14] = createPoint(0.2, 0.5, 0);
            points[16] = createPoint(0.2, 0.2, 0);
            points[18] = createPoint(0.4, 0.5, 0);
            points[20] = createPoint(0.4, 0.2, 0);

            const result = GestureRecognizer.analyzeHand(points, 'Right');
            expect(result).not.toBeNull();
            expect(result?.handedness).toBe('Right');
            expect(result?.isGrabbing).toBe(true);
            expect(result?.centroid).toBeDefined();
        });
        it('should handle missing keypoints gracefully', () => {
            const points = createHand();
            // Remove required keypoints
            points[0] = undefined as any;
            const result = GestureRecognizer.analyzeHand(points, 'Left');
            expect(result).toBeNull();
        });
        it('should return false if specific pinch keypoints are missing', () => {
            const points = createHand();
            points[4] = undefined as any; // THUMB_TIP
            expect(GestureRecognizer.isPinching(points)).toBe(false);
        });

        it('should return false if specific grab keypoints are missing', () => {
            const points = createHand();
            // Valid wrist
            points[0] = createPoint(0, 0, 0);
            // Missing tip of middle finger
            points[12] = undefined as any;
            expect(GestureRecognizer.isGrabbing(points)).toBe(false);
        });
    });
});
