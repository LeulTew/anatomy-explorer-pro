import React, { useRef, useEffect } from 'react';
import { useFrame, useGraph } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useStore } from '../store/useStore';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

// Path to the model - assuming user will place it here
const MODEL_PATH = '/models/base_mesh_female_with_rig_and_textures.glb';

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

    // Initial pose storage
    const initialRotations = useRef<Record<string, THREE.Euler>>({});

    useEffect(() => {
        // Map common bone names from Mixamo/standard rigs
        // Adjust these names if the specific GLB uses different conventions
        spineRef.current = (nodes.Mixamorig_Spine || nodes.Spine || nodes.spine) as THREE.Bone;
        chestRef.current = (nodes.Mixamorig_Spine2 || nodes.Chest || nodes.chest) as THREE.Bone;
        neckRef.current = (nodes.Mixamorig_Neck || nodes.Neck || nodes.neck) as THREE.Bone;

        leftArmRef.current = (nodes.Mixamorig_LeftArm || nodes.LeftArm || nodes.upper_arm_L) as THREE.Bone;
        rightArmRef.current = (nodes.Mixamorig_RightArm || nodes.RightArm || nodes.upper_arm_R) as THREE.Bone;
        leftForeArmRef.current = (nodes.Mixamorig_LeftForeArm || nodes.LeftForeArm || nodes.forearm_L) as THREE.Bone;
        rightForeArmRef.current = (nodes.Mixamorig_RightForeArm || nodes.RightForeArm || nodes.forearm_R) as THREE.Bone;

        // Store initial rotations to lerp back to
        [spineRef, chestRef, neckRef, leftArmRef, rightArmRef, leftForeArmRef, rightForeArmRef].forEach(ref => {
            if (ref.current) {
                initialRotations.current[ref.current.uuid] = ref.current.rotation.clone();
            }
        });
    }, [nodes]);

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

        // --- 1. Breathing Simulation ---
        // Animate chest expansion (Scale or slight rotation)
        if (chestRef.current) {
            const breathCycle = Math.sin(time * 1.5) * 0.05 * (0.5 + movementIntensity);
            // We gently rotate the chest back and forth to simulate heave
            chestRef.current.rotation.x = initialRotations.current[chestRef.current.uuid].x - breathCycle;
        }

        // --- 2. Global Rotation (Torso/Spine) from Gestures ---
        // If "Grab" gesture is active on left/right hand, we rotate the spine
        if (spineRef.current) {
            // Apply gesture delta with damping
            const targetRotY = rotationDelta.x * 0.01;
            const targetRotX = rotationDelta.y * 0.01;

            // Accumulate or set? Let's add to current for "orbit" feel or set for "direct control"
            // For anatomy, direct control feels better + spring back
            spineRef.current.rotation.y = THREE.MathUtils.lerp(spineRef.current.rotation.y, initialRotations.current[spineRef.current.uuid].y + targetRotY, 0.1);
            spineRef.current.rotation.z = THREE.MathUtils.lerp(spineRef.current.rotation.z, initialRotations.current[spineRef.current.uuid].z - targetRotX, 0.1);

            // Decay rotationDelta logic is handled in store or we reset it here?
            // The store logic in previous file handled damping. We assume store updates delta.
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
        else if (currentMovement === 'Twist') {
            if (spineRef.current) {
                const twistAmt = Math.sin(time * 2) * movementIntensity;
                spineRef.current.rotation.y = initialRotations.current[spineRef.current.uuid].y + twistAmt;
            }
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

    return null;
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

