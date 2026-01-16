import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Scene3D from './Scene3D';

// Mock child components
vi.mock('./ModelRenderer', () => ({ default: () => <div data-testid="model-renderer" /> }));
vi.mock('./Hand3D', () => ({ default: () => <div data-testid="hand" /> }));

// Mock Fiber/Drei
vi.mock('@react-three/fiber', () => ({
    Canvas: ({ children }: any) => <div>{children}</div>,
    useThree: () => ({ camera: { position: { set: vi.fn() } } }),
    useFrame: (cb: any) => cb({ clock: { elapsedTime: 1 } }), // Invoke immediately for coverage
}));
vi.mock('@react-three/drei', () => ({
    Float: ({ children }: any) => <div>{children}</div>,
    Environment: () => <div />,
    PerspectiveCamera: () => <div />,
    OrbitControls: () => <div />,
    ContactShadows: () => <div />,
    Stars: () => <div />,
}));
vi.mock('postprocessing', () => ({
    BlendFunction: { SCREEN: 0, NORMAL: 1 }
}));

vi.mock('@react-three/postprocessing', () => ({
    EffectComposer: ({ children }: any) => <div>{children}</div>,
    Bloom: () => <div />,
    Noise: () => <div />,
    ChromaticAberration: () => <div />,
    Vignette: () => <div />,
}));

describe('Scene3D', () => {
    it('renders ModelRenderer', () => {
        const { getByTestId } = render(<Scene3D />);
        expect(getByTestId('model-renderer')).toBeInTheDocument();
    });

    it('renders Hands', () => {
        const { getAllByTestId } = render(<Scene3D />);
        expect(getAllByTestId('hand').length).toBeGreaterThan(0);
    });
});
