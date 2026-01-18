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
            movementIntensity
        } = useStore.getState();

        const time = state.clock.getElapsedTime();
        const deltaTime = time - prevTime.current;
        prevTime.current = time;

        // --- Physics Slider effect: Controls jiggle amount and breathing intensity ---
        const physicsMultiplier = movementIntensity; // 0 to 1

        // --- 1. Breathing Animation (affected by Physics slider) ---
        const breathAmount = physicsMultiplier * 0.05;
        const breathCycle = Math.sin(time * 1.5) * breathAmount;

        // --- 2. Per-Side Chest Physics ---
        let leftForce = Math.sin(time * 1.0) * 0.02 * physicsMultiplier;
        let rightForce = Math.sin(time * 1.0) * 0.02 * physicsMultiplier;

        // Apply direct hand control to specific side
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

        const bounceAmt = 0.4 * physicsMultiplier; // Physics slider affects bounce

        // Apply to breast bones (per-side)
        if (breastLRef.current) {
            const base = initialRotations.current[breastLRef.current.uuid];
            let rotation = base.x + (lValue * bounceAmt);

            // Direct push from hand for left side only
            if (gesture === 'INTERACT_LEFT') {
                rotation += leftChestOffset.y * 3.0;
            }
            breastLRef.current.rotation.x = rotation;
        }

        if (breastRRef.current) {
            const base = initialRotations.current[breastRRef.current.uuid];
            let rotation = base.x + (rValue * bounceAmt);

            // Direct push from hand for right side only
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

            // Per-side interaction for fallback (still affects whole chest)
            if (gesture === 'INTERACT_LEFT') {
                chestRef.current.rotation.x += leftChestOffset.y * 2.0;
            }
            if (gesture === 'INTERACT_RIGHT') {
                chestRef.current.rotation.x += rightChestOffset.y * 2.0;
            }
        } else if (chestRef.current) {
            // Apply breathing to chest even when we have breast bones
            chestRef.current.rotation.x = initialRotations.current[chestRef.current.uuid].x - breathCycle;
        }

        // --- 3. Spine Rotation from ACCUMULATED Rotation (FIST gesture) ---
        if (spineRef.current) {
            const baseRot = initialRotations.current[spineRef.current.uuid];

            // Apply accumulated rotation (horizontal = yaw, vertical = slight tilt)
            // Increase multiplier for more visible effect
            const targetY = baseRot.y + (accumulatedRotation.x * 0.1);
            const targetZ = baseRot.z - (accumulatedRotation.y * 0.02);

            spineRef.current.rotation.y = THREE.MathUtils.lerp(spineRef.current.rotation.y, targetY, 0.15);
            spineRef.current.rotation.z = THREE.MathUtils.lerp(spineRef.current.rotation.z, targetZ, 0.15);
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
