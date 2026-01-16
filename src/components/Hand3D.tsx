import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

// Joint connections (bones)
const CONNECTIONS: readonly [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17] // Palm
] as const;

// Joint sizes for natural hand proportions
const JOINT_SIZES: Record<number, number> = {
    0: 0.18, // Wrist - larger
    5: 0.14, 9: 0.14, 13: 0.14, 17: 0.14, // MCP - medium
    4: 0.08, 8: 0.08, 12: 0.08, 16: 0.08, 20: 0.06 // Tips
};

interface HandData {
    keypoints: { x: number; y: number; z: number }[];
}

interface HandVisualizerProps {
    handData: HandData;
    isLeft: boolean;
}

const HandVisualizer: React.FC<HandVisualizerProps> = React.memo(({ handData, isLeft }) => {
    // Smaller scale to fit screen better
    const SCALE = 8;

    // Memoize all calculated data
    const { points, bones } = useMemo(() => {
        const calculatedPoints = handData.keypoints.map((kp) => {
            // Fix coordinate mapping for mirror effect
            // Invert X to match user's physical left/right
            const x = -(kp.x - 0.5) * SCALE;
            const y = -(kp.y - 0.5) * SCALE; // Flip Y to match screen coords
            const z = kp.z * -SCALE * 0.5;

            return new THREE.Vector3(x, y, z);
        });

        const calculatedBones = CONNECTIONS.map(([startIdx, endIdx]) => {
            const start = calculatedPoints[startIdx];
            const end = calculatedPoints[endIdx];
            const distance = start.distanceTo(end);
            const midPoint = start.clone().add(end).multiplyScalar(0.5);

            const direction = end.clone().sub(start).normalize();
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

            return { midPoint, quaternion, distance };
        });

        return { points: calculatedPoints, bones: calculatedBones };
    }, [handData, isLeft]);

    // Premium Color Palette
    const baseColor = isLeft ? '#00f7ff' : '#ffea00'; // Cyan for Left, Amber for Right
    const coreColor = '#ffffff';
    const accentColor = isLeft ? '#00bbff' : '#ff9900';

    return (
        <group>
            {/* Joints - Glowing Energy Orbs */}
            {points.map((pos, i) => {
                const size = (JOINT_SIZES[i] || 0.12);
                return (
                    <group key={`joint-grp-${i}`} position={pos}>
                        {/* Core solid sphere */}
                        <mesh>
                            <sphereGeometry args={[size * 0.5, 16, 16]} />
                            <meshStandardMaterial color={coreColor} emissive={baseColor} emissiveIntensity={5} />
                        </mesh>
                        {/* Outer translucent shell */}
                        <mesh>
                            <sphereGeometry args={[size, 16, 16]} />
                            <meshPhysicalMaterial
                                color={baseColor}
                                transparent
                                opacity={0.3}
                                transmission={0.5}
                                thickness={1}
                                roughness={0.1}
                            />
                        </mesh>
                    </group>
                );
            })}

            {/* Bones - Detailed Semi-Transparent Tubes */}
            {bones.map((bone, i) => (
                <group key={`bone-grp-${i}`} position={bone.midPoint} quaternion={bone.quaternion}>
                    {/* Main bone pipe */}
                    <mesh scale={[1, bone.distance, 1]}>
                        <cylinderGeometry args={[0.08, 0.08, 1, 16]} />
                        <meshPhysicalMaterial
                            color={baseColor}
                            transparent
                            opacity={0.15}
                            transmission={0.8}
                            roughness={0.2}
                            thickness={1}
                        />
                    </mesh>
                    {/* Inner wire highlight */}
                    <mesh scale={[1, bone.distance, 1]}>
                        <cylinderGeometry args={[0.015, 0.015, 1, 8]} />
                        <meshBasicMaterial color={baseColor} transparent opacity={0.6} />
                    </mesh>
                    {/* Tech-rings on segments */}
                    {bone.distance > 0.4 && (
                        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[0.1, 0.01, 8, 24]} />
                            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={3} />
                        </mesh>
                    )}
                </group>
            ))}
        </group>
    );
});

HandVisualizer.displayName = 'HandVisualizer';

const Hand3D: React.FC = () => {
    const leftHand = useStore(state => state.leftHand);
    const rightHand = useStore(state => state.rightHand);

    return (
        <>
            {leftHand && <HandVisualizer handData={leftHand} isLeft={true} />}
            {rightHand && <HandVisualizer handData={rightHand} isLeft={false} />}
        </>
    );
};

export default Hand3D;
