import React from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import AnatomyModel from './AnatomyModel';
import { useStore } from '../store/useStore';

const CameraController: React.FC = () => {
    const zoomFactor = useStore(state => state.zoomFactor);
    return <PerspectiveCamera makeDefault position={[0, 0, 12 / Math.max(0.1, zoomFactor)]} />;
};

import * as THREE from 'three';
import Hand3D from './Hand3D';
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Stars, Environment, ContactShadows, Float } from '@react-three/drei';

const Scene3D: React.FC = () => {
    const selectedModel = useStore(state => state.selectedModel);

    return (
        <div style={{ width: '100vw', height: '100vh', background: 'radial-gradient(circle at center, #111111 0%, #000000 100%)' }}>
            <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
                <CameraController />

                {/* Environment & Lighting */}
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Environment preset="city" />

                <ambientLight intensity={1.5} />
                <pointLight position={[10, 10, 10]} intensity={2} />
                <pointLight position={[-10, -10, -10]} intensity={1} />

                {/* Environment fill */}
                <color attach="background" args={['#000000']} />
                <spotLight
                    position={[0, 20, 0]}
                    angle={0.3}
                    penumbra={1}
                    intensity={2}
                    castShadow
                    color="#ffffff"
                />

                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <React.Suspense fallback={null}>
                        <AnatomyModel selectedModel={selectedModel} />
                    </React.Suspense>
                </Float>

                <Hand3D />

                {/* Futuristic Grid */}
                <group position={[0, -5, 0]}>
                    <gridHelper args={[100, 50, '#111111', '#050505']} />
                    <ContactShadows scale={40} blur={2} far={4.5} opacity={0.5} />
                </group>

                {/* Post Processing */}
                <EffectComposer>
                    <Bloom
                        intensity={1.2}
                        luminanceThreshold={0.4}
                        luminanceSmoothing={0.9}
                        blendFunction={BlendFunction.SCREEN}
                    />
                    <Noise opacity={0.05} />
                    <ChromaticAberration
                        blendFunction={BlendFunction.NORMAL}
                        offset={new THREE.Vector2(0.0005, 0.0005)}
                    />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>
            </Canvas>
        </div>
    );
};
export default Scene3D;
