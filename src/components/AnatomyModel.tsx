import React, { useRef, useEffect } from 'react';
import { useFrame, useGraph } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useStore } from '../store/useStore';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { SpringSolver } from '../logic/SpringSolver';

// Path to the model
const MODEL_PATH = '/models/jeny_tpose_riged.glb';

/**
 * Controller component that handles bone-level animations (jiggle physics, breathing)
 */
const RigController: React.FC<{ nodes: Record<string, THREE.Object3D> }> = ({ nodes }) => {
    const chestRef = useRef<THREE.Bone | null>(null);
    const breastLRef = useRef<THREE.Bone | null>(null);
    const breastRRef = useRef<THREE.Bone | null>(null);

    // Physics for Secondary Motion (Jiggle Physics)
    const leftSpring = useRef(new SpringSolver(0, 150, 8));
    const rightSpring = useRef(new SpringSolver(0, 150, 8));

    // Initial pose storage
    const initialRotations = useRef<Record<string, THREE.Euler>>({});

    // Fuzzy find helper
    const findBone = (patterns: string[], exclusion: string[] = []): THREE.Bone | null => {
        const nodeNames = Object.keys(nodes);
        for (const pattern of patterns) {
            const match = nodeNames.find(name => {
                const lower = name.toLowerCase();
                return lower.includes(pattern.toLowerCase()) &&
                    !exclusion.some(ex => lower.includes(ex)) &&
                    nodes[name] instanceof THREE.Bone;
            });
            if (match) return nodes[match] as THREE.Bone;
        }
        return null;
    };

    useEffect(() => {
        chestRef.current = findBone(['Mixamorig_Spine2', 'Chest', 'Spine2', 'UpperChest', 'Sternum']);
        breastLRef.current = findBone(['Breast_L', 'BreastL', 'Pectoral_L', 'BoobL', 'Chest_L']);
        breastRRef.current = findBone(['Breast_R', 'BreastR', 'Pectoral_R', 'BoobR', 'Chest_R']);

        // Store initial rotations
        [chestRef, breastLRef, breastRRef].forEach(ref => {
            if (ref.current) {
                initialRotations.current[ref.current.uuid] = ref.current.rotation.clone();
            }
        });


    }, [nodes]);

    const prevTime = useRef(0);

    useFrame((state) => {
        const {
            gesture,
            leftChestOffset,
            rightChestOffset,
            movementIntensity
        } = useStore.getState();

        const time = state.clock.getElapsedTime();
        const deltaTime = time - prevTime.current;
        prevTime.current = time;

        const physicsMultiplier = movementIntensity;

        // Breathing Animation
        const breathAmount = physicsMultiplier * 0.05;
        const breathCycle = Math.sin(time * 1.5) * breathAmount;

        // Per-Side Chest Physics
        let leftForce = Math.sin(time * 1.0) * 0.02 * physicsMultiplier;
        let rightForce = Math.sin(time * 1.0) * 0.02 * physicsMultiplier;

        if (gesture === 'INTERACT_LEFT') {
            leftForce += Math.abs(leftChestOffset.y) * 20.0 * physicsMultiplier;
        }
        if (gesture === 'INTERACT_RIGHT') {
            rightForce += Math.abs(rightChestOffset.y) * 20.0 * physicsMultiplier;
        }

        leftSpring.current.target = leftForce;
        rightSpring.current.target = rightForce;

        const lValue = leftSpring.current.update(deltaTime);
        const rValue = rightSpring.current.update(deltaTime);

        const bounceAmt = 0.4 * physicsMultiplier;

        // Apply to breast bones (per-side)
        if (breastLRef.current) {
            const base = initialRotations.current[breastLRef.current.uuid];
            let rotation = base.x + (lValue * bounceAmt);
            if (gesture === 'INTERACT_LEFT') {
                rotation += leftChestOffset.y * 3.0;
            }
            breastLRef.current.rotation.x = rotation;
        }

        if (breastRRef.current) {
            const base = initialRotations.current[breastRRef.current.uuid];
            let rotation = base.x + (rValue * bounceAmt);
            if (gesture === 'INTERACT_RIGHT') {
                rotation += rightChestOffset.y * 3.0;
            }
            breastRRef.current.rotation.x = rotation;
        }

        // FALLBACK: If NO breast bones, apply to whole chest
        if (chestRef.current && !breastLRef.current && !breastRRef.current) {
            const base = initialRotations.current[chestRef.current.uuid];
            const physicsOffset = (lValue + rValue) * 0.15 * physicsMultiplier;
            chestRef.current.rotation.x = base.x + physicsOffset - breathCycle;

            if (gesture === 'INTERACT_LEFT') {
                chestRef.current.rotation.x += leftChestOffset.y * 2.0;
            }
            if (gesture === 'INTERACT_RIGHT') {
                chestRef.current.rotation.x += rightChestOffset.y * 2.0;
            }
        } else if (chestRef.current) {
            chestRef.current.rotation.x = initialRotations.current[chestRef.current.uuid].x - breathCycle;
        }
    });

    return <group>{/* Controller - no visual */}</group>;
};

/**
 * Main Model component - handles the whole model rotation
 */
const AnatomyModel: React.FC = () => {
    const groupRef = useRef<THREE.Group>(null);
    const { scene } = useGLTF(MODEL_PATH);
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes } = useGraph(clone);

    // Apply material settings
    useEffect(() => {
        clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    child.material.envMapIntensity = 1;
                    child.material.roughness = 0.6;
                }
            }
        });
    }, [clone]);

    // ROTATE THE ENTIRE MODEL based on accumulated rotation
    useFrame(() => {
        if (!groupRef.current) return;

        const { accumulatedRotation, zoomFactor } = useStore.getState();

        // Apply rotation to the whole model
        // Negate X for correct direction (camera is mirrored), increase multiplier for speed
        const targetY = -accumulatedRotation.x * 1.5; // Horizontal hand movement = Y rotation (negated for correct direction)
        const targetX = accumulatedRotation.y * 0.3; // Vertical hand movement = slight X tilt

        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.1);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.1);

        // Apply zoom
        const targetScale = 1.5 * zoomFactor;
        groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.1));
    });

    return (
        <group ref={groupRef} dispose={null} position={[0, -1, 0]}>
            <primitive object={clone} />
            <RigController nodes={nodes} />
        </group>
    );
};

// Preload to avoid waterfalls
useGLTF.preload(MODEL_PATH);

export default AnatomyModel;
