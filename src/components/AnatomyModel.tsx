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
 * Controller component that attaches to the skeleton and drives bones based on Store state.
 */
const RigController: React.FC<{ nodes: Record<string, THREE.Object3D> }> = ({ nodes }) => {
    // Refs for bone nodes
    const spineRef = useRef<THREE.Bone | null>(null);
    const chestRef = useRef<THREE.Bone | null>(null);
    const neckRef = useRef<THREE.Bone | null>(null);
    const leftArmRef = useRef<THREE.Bone | null>(null);
    const rightArmRef = useRef<THREE.Bone | null>(null);
    const leftForeArmRef = useRef<THREE.Bone | null>(null);
    const rightForeArmRef = useRef<THREE.Bone | null>(null);

    // Physics for Secondary Motion (Jiggle Physics)
    const leftSpring = useRef(new SpringSolver(0, 150, 8));
    const rightSpring = useRef(new SpringSolver(0, 150, 8));

    // Refs for Breast bones
    const breastLRef = useRef<THREE.Bone | null>(null);
    const breastRRef = useRef<THREE.Bone | null>(null);

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
        // Smart Auto-Rigging
        spineRef.current = findBone(['Mixamorig_Spine', 'Spine', 'Torso'], ['Spine1', 'Spine2']);
        chestRef.current = findBone(['Mixamorig_Spine2', 'Chest', 'Spine2', 'UpperChest', 'Sternum']);
        neckRef.current = findBone(['Mixamorig_Neck', 'Neck', 'Head']);

        leftArmRef.current = findBone(['Mixamorig_LeftArm', 'LeftArm', 'Arm_L', 'UpperArm_L']);
        rightArmRef.current = findBone(['Mixamorig_RightArm', 'RightArm', 'Arm_R', 'UpperArm_R']);
        leftForeArmRef.current = findBone(['Mixamorig_LeftForeArm', 'LeftForeArm', 'ForeArm_L', 'Elbow_L']);
        rightForeArmRef.current = findBone(['Mixamorig_RightForeArm', 'RightForeArm', 'ForeArm_R', 'Elbow_R']);

        // Secondary Motion Bones
        breastLRef.current = findBone(['Breast_L', 'BreastL', 'Pectoral_L', 'BoobL', 'Chest_L']);
        breastRRef.current = findBone(['Breast_R', 'BreastR', 'Pectoral_R', 'BoobR', 'Chest_R']);

        // Store initial rotations
        [spineRef, chestRef, neckRef, leftArmRef, rightArmRef, leftForeArmRef, rightForeArmRef, breastLRef, breastRRef].forEach(ref => {
            if (ref.current) {
                initialRotations.current[ref.current.uuid] = ref.current.rotation.clone();
            }
        });
    }, [nodes]);

    const prevTime = useRef(0);

    useFrame((state) => {
        const {
            accumulatedRotation,
            gesture,
            leftChestOffset,
            rightChestOffset,
            currentMovement,
            movementIntensity,
            leftHand,
            rightHand
        } = useStore.getState();

        const time = state.clock.getElapsedTime();
        const deltaTime = time - prevTime.current;
        prevTime.current = time;

        // --- 1. Physics-Based Secondary Motion ---
        const breathPulse = Math.sin(time * 1.0) * 0.02;

        // Calculate physics force from gesture inputs
        let leftForce = breathPulse;
        let rightForce = breathPulse;

        // Use per-side offsets when interacting
        if (gesture === 'INTERACT_LEFT') {
            leftForce += Math.abs(leftChestOffset.y) * 30.0;
        }
        if (gesture === 'INTERACT_RIGHT') {
            rightForce += Math.abs(rightChestOffset.y) * 30.0;
        }

        leftSpring.current.target = leftForce;
        rightSpring.current.target = rightForce;

        const lValue = leftSpring.current.update(deltaTime);
        const rValue = rightSpring.current.update(deltaTime);

        const bounceAmt = 0.3;

        // Apply to breast bones
        if (breastLRef.current) {
            const base = initialRotations.current[breastLRef.current.uuid];
            breastLRef.current.rotation.x = base.x + (lValue * bounceAmt);
            // Direct push from hand
            if (gesture === 'INTERACT_LEFT') {
                breastLRef.current.rotation.x += leftChestOffset.y * 2.0;
            }
        }

        if (breastRRef.current) {
            const base = initialRotations.current[breastRRef.current.uuid];
            breastRRef.current.rotation.x = base.x + (rValue * bounceAmt);
            // Direct push from hand
            if (gesture === 'INTERACT_RIGHT') {
                breastRRef.current.rotation.x += rightChestOffset.y * 2.0;
            }
        }

        // FALLBACK: If NO breast bones, apply physics to the Chest
        if (chestRef.current && !breastLRef.current && !breastRRef.current) {
            const base = initialRotations.current[chestRef.current.uuid];
            const physicsOffset = (lValue + rValue) * 0.15;
            const breathCycle = Math.sin(time * 1.5) * 0.05 * (0.5 + movementIntensity);
            chestRef.current.rotation.x = base.x + physicsOffset - breathCycle;

            // Per-side interaction for fallback
            if (gesture === 'INTERACT_LEFT' || gesture === 'INTERACT_RIGHT') {
                const offset = gesture === 'INTERACT_LEFT' ? leftChestOffset : rightChestOffset;
                chestRef.current.rotation.x += offset.y * 1.5;
            }
        } else if (chestRef.current) {
            const breathCycle = Math.sin(time * 1.5) * 0.05 * (0.5 + movementIntensity);
            chestRef.current.rotation.x = initialRotations.current[chestRef.current.uuid].x - breathCycle;
        }

        // --- 2. Spine Rotation from ACCUMULATED Rotation ---
        if (spineRef.current) {
            const baseRot = initialRotations.current[spineRef.current.uuid];

            // Apply accumulated rotation (horizontal = yaw, vertical = slight tilt)
            const targetY = baseRot.y + (accumulatedRotation.x * 0.05);
            const targetZ = baseRot.z - (accumulatedRotation.y * 0.01); // Very small vertical

            spineRef.current.rotation.y = THREE.MathUtils.lerp(spineRef.current.rotation.y, targetY, 0.1);
            spineRef.current.rotation.z = THREE.MathUtils.lerp(spineRef.current.rotation.z, targetZ, 0.1);
        }

        // --- 3. Movement Presets ---
        if (currentMovement === 'Flex') {
            const flexAmt = movementIntensity * 1.5;

            if (leftForeArmRef.current && leftArmRef.current) {
                leftForeArmRef.current.rotation.z = THREE.MathUtils.lerp(leftForeArmRef.current.rotation.z, initialRotations.current[leftForeArmRef.current.uuid].z + flexAmt, 0.1);
                leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, initialRotations.current[leftArmRef.current.uuid].z + 0.5, 0.1);
            }
            if (rightForeArmRef.current && rightArmRef.current) {
                rightForeArmRef.current.rotation.z = THREE.MathUtils.lerp(rightForeArmRef.current.rotation.z, initialRotations.current[rightForeArmRef.current.uuid].z - flexAmt, 0.1);
                rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, initialRotations.current[rightArmRef.current.uuid].z - 0.5, 0.1);
            }
        } else if (currentMovement === 'Twist' && spineRef.current) {
            const twistAmt = Math.sin(time * 2) * movementIntensity;
            spineRef.current.rotation.y = initialRotations.current[spineRef.current.uuid].y + twistAmt;
        } else if (currentMovement === 'Breathing') {
            // Reset arms
            if (leftForeArmRef.current) leftForeArmRef.current.rotation.z = THREE.MathUtils.lerp(leftForeArmRef.current.rotation.z, initialRotations.current[leftForeArmRef.current.uuid].z, 0.1);
            if (rightForeArmRef.current) rightForeArmRef.current.rotation.z = THREE.MathUtils.lerp(rightForeArmRef.current.rotation.z, initialRotations.current[rightForeArmRef.current.uuid].z, 0.1);

            // Arm lift based on hand position
            if (leftHand && leftArmRef.current) {
                const lift = Math.max(0, (0.5 - leftHand.centroid.y) * 2);
                leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, initialRotations.current[leftArmRef.current.uuid].z + lift, 0.1);
            }
            if (rightHand && rightArmRef.current) {
                const lift = Math.max(0, (0.5 - rightHand.centroid.y) * 2);
                rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, initialRotations.current[rightArmRef.current.uuid].z - lift, 0.1);
            }
        }
    });

    return <group>{/* Controller - no visual */}</group>;
};

const AnatomyModel: React.FC = () => {
    const group = useRef<THREE.Group>(null);
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

    return (
        <group ref={group} dispose={null} position={[0, -1, 0]}>
            <primitive object={clone} scale={1.5} />
            <RigController nodes={nodes} />
        </group>
    );
};

// Preload to avoid waterfalls
useGLTF.preload(MODEL_PATH);

export default AnatomyModel;
