import React, { useRef, useEffect } from 'react';
import { useFrame, useGraph } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useStore } from '../store/useStore';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { SpringSolver } from '../logic/SpringSolver';

// Path to the model - assuming user will place it here
const MODEL_PATH = '/models/jeny_tpose_riged.glb';

/**
 * Controller component that attaches to the skeleton and drives bones based on Store state.
 * This separates logic from the view/data loading.
 */
const RigController: React.FC<{ nodes: Record<string, THREE.Object3D> }> = ({ nodes }) => {
    // Refs for bone nodes - we try to find them by common naming conventions
    const spineRef = useRef<THREE.Bone | null>(null);
    const chestRef = useRef<THREE.Bone | null>(null);
    const neckRef = useRef<THREE.Bone | null>(null);
    const leftArmRef = useRef<THREE.Bone | null>(null);
    const rightArmRef = useRef<THREE.Bone | null>(null);
    const leftForeArmRef = useRef<THREE.Bone | null>(null);
    const rightForeArmRef = useRef<THREE.Bone | null>(null);

    // Physics for Secondary Motion (Jiggle Physics)
    // We use independent springs for Left/Right sides for "natural" async movement
    const leftSpring = useRef(new SpringSolver(0, 150, 8));
    const rightSpring = useRef(new SpringSolver(0, 150, 8));

    // Refs for "Breast" or chest bones. adjusting naming based on common "Jeny" rig
    const breastLRef = useRef<THREE.Bone | null>(null);
    const breastRRef = useRef<THREE.Bone | null>(null);

    // Initial pose storage
    const initialRotations = useRef<Record<string, THREE.Euler>>({});

    // State for debug overlay removed

    // Fuzzy find helper
    const findBone = (patterns: string[], exclusion: string[] = []): THREE.Bone | null => {
        const nodeNames = Object.keys(nodes);
        for (const pattern of patterns) {
            const match = nodeNames.find(name => {
                const lower = name.toLowerCase();
                // Must match pattern, not be in exclusion, and be a Bone
                return lower.includes(pattern.toLowerCase()) &&
                    !exclusion.some(ex => lower.includes(ex)) &&
                    nodes[name] instanceof THREE.Bone;
            });
            if (match) return nodes[match] as THREE.Bone;
        }
        return null;
    };

    useEffect(() => {
        // --- Smart Auto-Rigging ---
        // We search for standard names using fuzzy matching

        spineRef.current = findBone(['Mixamorig_Spine', 'Spine', 'Torso'], ['Spine1', 'Spine2']);
        chestRef.current = findBone(['Mixamorig_Spine2', 'Chest', 'Spine2', 'UpperChest', 'Sternum']);
        neckRef.current = findBone(['Mixamorig_Neck', 'Neck', 'Head']); // Be careful not to grab Head as neck

        leftArmRef.current = findBone(['Mixamorig_LeftArm', 'LeftArm', 'Arm_L', 'UpperArm_L']);
        rightArmRef.current = findBone(['Mixamorig_RightArm', 'RightArm', 'Arm_R', 'UpperArm_R']);
        leftForeArmRef.current = findBone(['Mixamorig_LeftForeArm', 'LeftForeArm', 'ForeArm_L', 'Elbow_L']);
        rightForeArmRef.current = findBone(['Mixamorig_RightForeArm', 'RightForeArm', 'ForeArm_R', 'Elbow_R']);

        // Secondary Motion (Priority: Breast -> Pectoral -> Chest Child)
        breastLRef.current = findBone(['Breast_L', 'BreastL', 'Pectoral_L', 'BoobL', 'Chest_L']);
        breastRRef.current = findBone(['Breast_R', 'BreastR', 'Pectoral_R', 'BoobR', 'Chest_R']);

        // Debug: Log Chest Children to find hidden bones
        if (chestRef.current) {
            // console.log('RigController: Chest Children:', chestRef.current.children.map(c => c.name));
        }

        // Debug logic removed

        // console.log('RigController: Auto-Rigged:', found);
        // setDebugInfo(Object.entries(found).map(([k, v]) => `${k}: ${v || 'MISSING'}`));

        // Store initial rotations
        [spineRef, chestRef, neckRef, leftArmRef, rightArmRef, leftForeArmRef, rightForeArmRef, breastLRef, breastRRef].forEach(ref => {
            if (ref.current) {
                initialRotations.current[ref.current.uuid] = ref.current.rotation.clone();
            }
        });
    }, [nodes]);

    const prevTime = useRef(0);

    // Use specific store selectors to avoid re-renders on every frame-ish update
    // We pull values mutable inside useFrame for performance
    useFrame((state) => {
        const {
            rotationDelta,
            currentMovement,
            movementIntensity,
            leftHand,
            rightHand
        } = useStore.getState();

        const time = state.clock.getElapsedTime();
        const deltaTime = time - prevTime.current;
        prevTime.current = time;

        // --- 0. Calculated "Body Velocity" for Physics ---
        // We calculate "Movement Noise" from the rotation delta (Hand Control)
        // High rotation speed = high noise = bigger bounce
        const movementNoise = (Math.abs(rotationDelta.x) + Math.abs(rotationDelta.y)) * 0.5;

        // Update Springs
        // Target is 0 (rest position). We "pull" the spring based ONLY on hand movement (velocity)
        // We add a tiny bit of breathing pulse (very slow) just to keep it alive
        const breathPulse = Math.sin(time * 1.0) * 0.02; // Very subtle life sign

        // Physics Force is now driven by USER HAND MOVEMENT (movementNoise)
        const physicsForce = (movementNoise * 20.0);

        leftSpring.current.target = physicsForce + breathPulse;
        rightSpring.current.target = physicsForce + breathPulse; // In future can offset L/R based on direction

        // Add a slight phase offset/randomness for "natural" asymmetry
        const lValue = leftSpring.current.update(deltaTime);
        const rValue = rightSpring.current.update(deltaTime);

        // Apply to Secondary Bones
        const bounceAmt = 0.3; // Scale effect for specific bones

        // If we have specific breast bones, animate them
        if (breastLRef.current) {
            const base = initialRotations.current[breastLRef.current.uuid];
            breastLRef.current.rotation.x = base.x + (lValue * bounceAmt);
        }

        if (breastRRef.current) {
            const base = initialRotations.current[breastRRef.current.uuid];
            breastRRef.current.rotation.x = base.x + (rValue * bounceAmt);
        }

        // FALLBACK: If NO breast bones, apply physics to the Chest
        // This ensures "Jiggle" / "Secondary Motion" is felt even without specific bones
        if (chestRef.current && !breastLRef.current && !breastRRef.current) {
            const base = initialRotations.current[chestRef.current.uuid];

            // We combine the spring physics with the breathing cycle
            // lValue/rValue contain the physics "bounce"
            const physicsOffset = (lValue + rValue) * 0.15; // Lower intensity for whole chest

            const breathCycle = Math.sin(time * 1.5) * 0.05 * (0.5 + movementIntensity);

            // X-axis rotation mimics heave/bounce
            chestRef.current.rotation.x = base.x + physicsOffset - breathCycle;
        } else if (chestRef.current) {
            // Basic breathing only if we HAVE breast bones doing the physics
            const breathCycle = Math.sin(time * 1.5) * 0.05 * (0.5 + movementIntensity);
            chestRef.current.rotation.x = initialRotations.current[chestRef.current.uuid].x - breathCycle;
        }

        // --- 2. Global Rotation (Torso/Spine) from Gestures ---
        const { gesture } = useStore.getState(); // Get fresh gesture to be sure

        if (spineRef.current) {
            const targetRotY = rotationDelta.x * 0.01;
            const targetRotX = rotationDelta.y * 0.01;

            if (gesture === 'ROTATE') {
                // FIST: Mostly Horizontal (Yaw), dampen Vertical (Pitch)
                spineRef.current.rotation.y = THREE.MathUtils.lerp(spineRef.current.rotation.y, initialRotations.current[spineRef.current.uuid].y + targetRotY, 0.1);
                // Very slight pitch allowed (0.1x)
                spineRef.current.rotation.z = THREE.MathUtils.lerp(spineRef.current.rotation.z, initialRotations.current[spineRef.current.uuid].z - (targetRotX * 0.1), 0.1);
            }
            else if (gesture === 'INTERACT' && chestRef.current) {
                // OPEN HAND: Interact with Chest directly
                // Map hand Y movement (reversed, up is positive Y in screen usually means negative in 3D depending on cam)
                // Hand Y: Up (negative pixel/coord) -> Chest Expand/Up
                // rotationDelta.y is current - prev. Negative = Moved Up.

                // We want 1:1 feel. No "lerp" lag if possible, or very fast lerp.
                // We accumulate delta to the chest rotation? Or just map delta directly to "push"?
                // Let's try adding delta directly to rotation for "dragging" feel

                const dragAmount = -targetRotX * 2.0; // Sensitivity 
                spineRef.current.rotation.z += dragAmount; // Tilt spine
                chestRef.current.rotation.x += dragAmount; // Chest heave
            }
        }

        // --- 3. Interaction / Movement Logic ---

        // "Flex" -> Curl arms
        if (currentMovement === 'Flex') {
            const flexAmt = movementIntensity * 1.5; // Up to ~90 degrees

            if (leftForeArmRef.current && leftArmRef.current) {
                leftForeArmRef.current.rotation.z = THREE.MathUtils.lerp(leftForeArmRef.current.rotation.z, initialRotations.current[leftForeArmRef.current.uuid].z + flexAmt, 0.1);
                // Lift arm slightly
                leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, initialRotations.current[leftArmRef.current.uuid].z + 0.5, 0.1);
            }
            if (rightForeArmRef.current && rightArmRef.current) {
                rightForeArmRef.current.rotation.z = THREE.MathUtils.lerp(rightForeArmRef.current.rotation.z, initialRotations.current[rightForeArmRef.current.uuid].z - flexAmt, 0.1);
                rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, initialRotations.current[rightArmRef.current.uuid].z - 0.5, 0.1);
            }
        }

        // "Twist" -> Rotate Spine
        else if (currentMovement === 'Twist' && spineRef.current) {
            const twistAmt = Math.sin(time * 2) * movementIntensity;
            spineRef.current.rotation.y = initialRotations.current[spineRef.current.uuid].y + twistAmt;
        }

        // Direct Hand Mapping (Advanced)
        // If hands are visible and NO specific movement override, try to IK-ish map arm to hand height
        else if (currentMovement === 'Breathing') { // Idle/Breathing
            // Reset arms
            if (leftForeArmRef.current) leftForeArmRef.current.rotation.z = THREE.MathUtils.lerp(leftForeArmRef.current.rotation.z, initialRotations.current[leftForeArmRef.current.uuid].z, 0.1);
            if (rightForeArmRef.current) rightForeArmRef.current.rotation.z = THREE.MathUtils.lerp(rightForeArmRef.current.rotation.z, initialRotations.current[rightForeArmRef.current.uuid].z, 0.1);

            // Simple interaction: If hand is high, raise arm
            if (leftHand && leftArmRef.current) {
                // Map Y (0 top, 1 bottom) to rotation
                const lift = Math.max(0, (0.5 - leftHand.centroid.y) * 2);
                leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, initialRotations.current[leftArmRef.current.uuid].z + lift, 0.1);
            }
            if (rightHand && rightArmRef.current) {
                const lift = Math.max(0, (0.5 - rightHand.centroid.y) * 2);
                rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, initialRotations.current[rightArmRef.current.uuid].z - lift, 0.1);
            }
        }
    });

    return (
        <group>
            {/* Debug Overlay removed for production */}
        </group>
    );
};

const AnatomyModel: React.FC = () => {
    // Attempt to load the GLTF
    // Note: This will suspend if internal useGLTF is called.
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF(MODEL_PATH);
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes } = useGraph(clone);

    // No extra state needed for now

    // Effect to apply material highlights based on selection
    // Effect to apply material highlights - SIMPLIFIED to just shadows
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

