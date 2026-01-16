import type { Point, Hand } from '../store/useStore';

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const PINCH_THRESHOLD = 0.05;
const REQUIRED_KEYPOINTS = 21;

export class GestureRecognizer {

    static calculateDistance(p1: Point, p2: Point): number {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
    }

    static isPinching(keypoints: Point[]): boolean {
        if (!keypoints || keypoints.length < REQUIRED_KEYPOINTS) return false;
        const thumbTip = keypoints[THUMB_TIP];
        const indexTip = keypoints[INDEX_TIP];
        if (!thumbTip || !indexTip) return false;

        const dist = this.calculateDistance(thumbTip, indexTip);
        return dist < PINCH_THRESHOLD;
    }

    static isGrabbing(keypoints: Point[]): boolean {
        if (!keypoints || keypoints.length < REQUIRED_KEYPOINTS) return false;

        const isCurled = (tipIdx: number, pipIdx: number): boolean => {
            const tip = keypoints[tipIdx];
            const pip = keypoints[pipIdx];
            const wrist = keypoints[WRIST];
            if (!tip || !pip || !wrist) return false;

            const tipDist = this.calculateDistance(tip, wrist);
            const pipDist = this.calculateDistance(pip, wrist);
            return tipDist < pipDist;
        };

        // Check Middle (12), Ring (16), Pinky (20)
        // Indices PIP are: Middle(10), Ring(14), Pinky(18)
        return isCurled(12, 10) && isCurled(16, 14) && isCurled(20, 18);
    }

    static analyzeHand(keypoints: Point[], handedness: 'Left' | 'Right'): Hand | null {
        if (!keypoints || keypoints.length < REQUIRED_KEYPOINTS) {
            console.warn('GestureRecognizer: Invalid keypoints received');
            return null;
        }

        const p0 = keypoints[0];
        const p5 = keypoints[5];
        const p17 = keypoints[17];

        if (!p0 || !p5 || !p17) {
            console.warn('GestureRecognizer: Missing required keypoints for centroid');
            return null;
        }

        const isPinching = this.isPinching(keypoints);
        const isGrabbing = this.isGrabbing(keypoints);

        const centroid = {
            x: (p0.x + p5.x + p17.x) / 3,
            y: (p0.y + p5.y + p17.y) / 3,
            z: (p0.z + p5.z + p17.z) / 3
        };

        return {
            keypoints,
            handedness,
            isPinching,
            isGrabbing,
            centroid
        };
    }
}
