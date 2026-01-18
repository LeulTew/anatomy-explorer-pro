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
 * Advanced Rig Controller with Jiggle Physics
 * Handles bone-level animations: breathing, chest physics, hip movement
 */
const RigController: React.FC<{ nodes: Record<string, THREE.Object3D> }> = ({ nodes }) => {
    // Core bones
    const spineRef = useRef<THREE.Bone | null>(null);
    const hipsRef = useRef<THREE.Bone | null>(null);
    const chestRef = useRef<THREE.Bone | null>(null);

    // Secondary motion bones (Chest area)
    const breastLRef = useRef<THREE.Bone | null>(null);
    const breastRRef = useRef<THREE.Bone | null>(null);

    // Hip/Butt bones for jiggle (if available in rig)
    const buttLRef = useRef<THREE.Bone | null>(null);
    const buttRRef = useRef<THREE.Bone | null>(null);

    // Physics Springs
    const leftChestSpring = useRef(new SpringSolver(0, 120, 6));
    const rightChestSpring = useRef(new SpringSolver(0, 120, 6));
    const leftHipSpring = useRef(new SpringSolver(0, 100, 5));
    const rightHipSpring = useRef(new SpringSolver(0, 100, 5));
    const hipSwaySpring = useRef(new SpringSolver(0, 80, 4)); // For side-to-side sway

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
        // Find core bones
        spineRef.current = findBone(['Mixamorig_Spine', 'Spine', 'Torso'], ['Spine1', 'Spine2']);
        hipsRef.current = findBone(['Mixamorig_Hips', 'Hips', 'Pelvis', 'Root']);
        chestRef.current = findBone(['Mixamorig_Spine2', 'Chest', 'Spine2', 'UpperChest']);

        // Find chest bones
        breastLRef.current = findBone(['Breast_L', 'BreastL', 'Pectoral_L', 'BoobL']);
        breastRRef.current = findBone(['Breast_R', 'BreastR', 'Pectoral_R', 'BoobR']);

        // Find butt/hip bones (various naming conventions)
        buttLRef.current = findBone(['Butt_L', 'ButtL', 'Glute_L', 'Hip_L', 'UpperLeg_L']);
        buttRRef.current = findBone(['Butt_R', 'ButtR', 'Glute_R', 'Hip_R', 'UpperLeg_R']);

        // Store initial rotations
        [spineRef, hipsRef, chestRef, breastLRef, breastRRef, buttLRef, buttRRef].forEach(ref => {
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
        const deltaTime = Math.min(time - prevTime.current, 0.1); // Cap delta to prevent jumps
        prevTime.current = time;

        const physicsMultiplier = movementIntensity;

        // === BREATHING ANIMATION ===
        const breathAmount = physicsMultiplier * 0.03;
        const breathCycle = Math.sin(time * 1.2) * breathAmount;

        // === CHEST PHYSICS ===
        let leftChestForce = Math.sin(time * 0.8) * 0.01 * physicsMultiplier;
        let rightChestForce = Math.sin(time * 0.8 + 0.1) * 0.01 * physicsMultiplier;

        if (gesture === 'INTERACT_LEFT') {
            leftChestForce += Math.abs(leftChestOffset.y) * 15.0 * physicsMultiplier;
        }
        if (gesture === 'INTERACT_RIGHT') {
            rightChestForce += Math.abs(rightChestOffset.y) * 15.0 * physicsMultiplier;
        }

        leftChestSpring.current.target = leftChestForce;
        rightChestSpring.current.target = rightChestForce;

        const leftChestValue = leftChestSpring.current.update(deltaTime);
        const rightChestValue = rightChestSpring.current.update(deltaTime);

        // Apply to breast bones
        if (breastLRef.current && initialRotations.current[breastLRef.current.uuid]) {
            const base = initialRotations.current[breastLRef.current.uuid];
            let rotation = base.x + (leftChestValue * 0.5 * physicsMultiplier);
            if (gesture === 'INTERACT_LEFT') {
                rotation += leftChestOffset.y * 2.5;
            }
            breastLRef.current.rotation.x = rotation;
        }

        if (breastRRef.current && initialRotations.current[breastRRef.current.uuid]) {
            const base = initialRotations.current[breastRRef.current.uuid];
            let rotation = base.x + (rightChestValue * 0.5 * physicsMultiplier);
            if (gesture === 'INTERACT_RIGHT') {
                rotation += rightChestOffset.y * 2.5;
            }
            breastRRef.current.rotation.x = rotation;
        }

        // === HIP SWAY (TWERKING) ANIMATION ===
        // When using open hand gesture, move hips side to side
        const interactOffset = gesture === 'INTERACT_LEFT' ? leftChestOffset :
            gesture === 'INTERACT_RIGHT' ? rightChestOffset : { x: 0, y: 0 };

        // Use X movement for side-to-side sway
        const swayInput = (gesture === 'INTERACT_LEFT' || gesture === 'INTERACT_RIGHT')
            ? interactOffset.x * 30.0 * physicsMultiplier
            : 0;

        hipSwaySpring.current.target = swayInput;
        const hipSwayValue = hipSwaySpring.current.update(deltaTime);

        // Apply hip jiggle physics based on movement
        const hipJiggleInput = Math.abs(swayInput) * 0.5;
        leftHipSpring.current.target = hipJiggleInput + Math.sin(time * 2) * 0.02 * physicsMultiplier;
        rightHipSpring.current.target = hipJiggleInput + Math.sin(time * 2 + 0.2) * 0.02 * physicsMultiplier;

        const leftHipValue = leftHipSpring.current.update(deltaTime);
        const rightHipValue = rightHipSpring.current.update(deltaTime);

        // Apply to hips bone (side-to-side rotation)
        if (hipsRef.current && initialRotations.current[hipsRef.current.uuid]) {
            const base = initialRotations.current[hipsRef.current.uuid];
            // Z rotation for side-to-side sway, Y for twist
            hipsRef.current.rotation.z = base.z + hipSwayValue * 0.15;
            hipsRef.current.rotation.y = base.y + hipSwayValue * 0.05; // Subtle twist
        }

        // Apply to butt/upper leg bones for jiggle effect
        if (buttLRef.current && initialRotations.current[buttLRef.current.uuid]) {
            const base = initialRotations.current[buttLRef.current.uuid];
            buttLRef.current.rotation.x = base.x + leftHipValue * 0.3 * physicsMultiplier;
            buttLRef.current.rotation.z = base.z + hipSwayValue * 0.1;
        }

        if (buttRRef.current && initialRotations.current[buttRRef.current.uuid]) {
            const base = initialRotations.current[buttRRef.current.uuid];
            buttRRef.current.rotation.x = base.x + rightHipValue * 0.3 * physicsMultiplier;
            buttRRef.current.rotation.z = base.z - hipSwayValue * 0.1;
        }

        // === SPINE MOVEMENT ===
        if (spineRef.current && initialRotations.current[spineRef.current.uuid]) {
            const base = initialRotations.current[spineRef.current.uuid];
            // Add subtle spine reaction to hip movement
            spineRef.current.rotation.z = base.z - hipSwayValue * 0.08; // Counter-motion
        }

        // === CHEST BREATHING (Fallback if no breast bones) ===
        if (chestRef.current && initialRotations.current[chestRef.current.uuid]) {
            if (!breastLRef.current && !breastRRef.current) {
                const base = initialRotations.current[chestRef.current.uuid];
                const physicsOffset = (leftChestValue + rightChestValue) * 0.2 * physicsMultiplier;
                chestRef.current.rotation.x = base.x + physicsOffset - breathCycle;
            } else {
                const base = initialRotations.current[chestRef.current.uuid];
                chestRef.current.rotation.x = base.x - breathCycle;
            }
        }
    });

    return <group>{/* RigController - no visual */}</group>;
};

/**
 * Main Model component - handles whole model rotation and zoom
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

    // ROTATE THE ENTIRE MODEL - faster, more responsive
    useFrame(() => {
        if (!groupRef.current) return;

        const { accumulatedRotation, zoomFactor } = useStore.getState();

        // Increased multipliers for faster, more responsive rotation
        const targetY = -accumulatedRotation.x * 3.0; // 2x faster than before
        const targetX = accumulatedRotation.y * 0.5;  // Slightly more tilt

        // Faster lerp for more responsive feeling (0.15 instead of 0.1)
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.15);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.15);

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
