import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Hand3D from './Hand3D';

// Mock Drei/Fiber
vi.mock('@react-three/drei', () => ({
    Sphere: ({ children }: any) => <mesh data-testid="joint">{children}</mesh>,
    Line: () => <mesh data-testid="bone" />,
}));
vi.mock('@react-three/fiber', () => ({
    useFrame: vi.fn(),
}));

import { useStore } from '../store/useStore';

describe('Hand3D', () => {
    it('renders null when no hand data', () => {
        useStore.setState({ leftHand: null, rightHand: null });
        const { container } = render(<Hand3D />);
        expect(container.firstChild).toBeNull();
    });

    it('renders joints and bones when hand data exists', () => {
        // Mock hand data
        const mockHand: any = {
            keypoints: Array(21).fill({ x: 0, y: 0, z: 0 }),
            handedness: 'Left',
            isPinching: false,
            isGrabbing: false,
            centroid: { x: 0, y: 0, z: 0 }
        };
        useStore.setState({ leftHand: mockHand });

        const { container } = render(<Hand3D />);
        // 21 joints + bones. Each joint has sphereGeometry
        // We look for spheregeometry tag which JSDOM renders for custom elements
        expect(container.querySelectorAll('spheregeometry').length).toBeGreaterThan(0);
    });
});
