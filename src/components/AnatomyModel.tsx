import React, { useRef, useEffect, Suspense } from 'react';
import { useFrame, useGraph } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useStore } from '../store/useStore';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { SpringSolver } from '../logic/SpringSolver';

// Available models
// Available models configuration
export const AVAILABLE_MODELS = [
    {
        id: 'jeny',
        name: 'Jeny',
        path: '/models/jeny.glb',
        config: { position: [0, -1.0, 0], scale: 1.0, rotation: [0, 0, 0] }
    },
    {
        id: 'noelle',
        name: 'Noelle',
        path: '/models/noelle.glb',
        config: { position: [0, -1.6, 0], scale: 1.0, rotation: [0, 0, 0] }
    },
    {
        id: 'eva',
        name: 'Eva (Base)',
        path: '/models/eva.glb',
        config: { position: [0, -2.5, 0], scale: 1.0, rotation: [0, 0, 0], color: '#f5d1b5' }
    },
    {
        id: 'michelle',
        name: 'Michelle',
        path: '/models/michelle.glb',
        config: { position: [0, -1.6, 0], scale: 1.0, rotation: [0, 0, 0] }
    },
    {
        id: 'seraphina',
        name: 'Seraphina',
        path: '/models/seraphina.glb',
        // Lowered more as requested (-2.0 -> -2.5)
        config: { position: [0, -2.5, 0], scale: 0.015, rotation: [0, 0, 0], color: '#f3c4a1' }
    },
    {
        id: 'isabella',
        name: 'Isabella',
        path: '/models/isabella.glb',
        // Lowered more as requested (-3.5 -> -4.5)
        config: {
            position: [0, -4.5, 0],
            scale: 2.5,
            rotation: [Math.PI, 0, 0],
            invertRotation: true,
            boneOffsets: {
                'breast': { x: 0.1, y: -0.2 } // Lower the pivot point for her breasts
            }
        }
    },
    {
        id: 'amara',
        name: 'Amara',
        path: '/models/amara.glb',
        // Lowered more as requested (-2.7 -> -3.2)
        config: { position: [0, -3.2, 0], scale: 1.0, rotation: [0, 0, 0], color: '#eec1ad' }
    },
];

// Bone analysis result type
interface BoneAnalysis {
    modelName: string;
    hasSpine: boolean;
    hasHips: boolean;
    hasChest: boolean;
    hasBreastL: boolean;
    hasBreastR: boolean;
    hasButtL: boolean;
    hasButtR: boolean;
    allBoneNames: string[];
}

/**
 * Analyze bones in a model and log to console
 */
const analyzeBones = (nodes: Record<string, THREE.Object3D>, modelName: string): BoneAnalysis => {
    const boneNames: string[] = [];

    Object.entries(nodes).forEach(([name, node]) => {
        if (node instanceof THREE.Bone) {
            boneNames.push(name);
        }
    });

    const findBone = (patterns: string[]): boolean => {
        return patterns.some(p =>
            boneNames.some(b => b.toLowerCase().includes(p.toLowerCase()))
        );
    };

    const analysis: BoneAnalysis = {
        modelName,
        hasSpine: findBone(['spine', 'torso']),
        hasHips: findBone(['hips', 'pelvis', 'root']),
        hasChest: findBone(['chest', 'spine2', 'upperchest']),
        hasBreastL: findBone(['breast_l', 'breastl', 'boob_l', 'boobl', 'pectoral_l']),
        hasBreastR: findBone(['breast_r', 'breastr', 'boob_r', 'boobr', 'pectoral_r']),
        hasButtL: findBone(['butt_l', 'buttl', 'glute_l', 'glutel']),
        hasButtR: findBone(['butt_r', 'buttr', 'glute_r', 'gluter']),
        allBoneNames: boneNames
    };

    // Clean log - only important bones for jiggle physics (easy to copy-paste)
    console.log(`
=== ${modelName} BONES ===
Hips: ${boneNames.filter(b => b.toLowerCase().includes('hip') || b.toLowerCase().includes('pelvis')).join(', ') || 'NONE'}
Spine: ${boneNames.filter(b => b.toLowerCase().includes('spine')).join(', ') || 'NONE'}
Chest: ${boneNames.filter(b => b.toLowerCase().includes('chest') || b.toLowerCase().includes('sternum')).join(', ') || 'NONE'}
Breast: ${boneNames.filter(b => b.toLowerCase().includes('breast') || b.toLowerCase().includes('boob') || b.toLowerCase().includes('pectoral')).join(', ') || 'NONE'}
Butt/Glute: ${boneNames.filter(b => b.toLowerCase().includes('butt') || b.toLowerCase().includes('glute')).join(', ') || 'NONE'}
UpperLeg: ${boneNames.filter(b => b.toLowerCase().includes('upleg') || b.toLowerCase().includes('thigh')).join(', ') || 'NONE'}
=========================
`);

    return analysis;
};

/**
 * Advanced Rig Controller - View-aware animations
 * Front view: chest movement
 * Back view: glute movement
 */
const RigController: React.FC<{ nodes: Record<string, THREE.Object3D>, modelName: string, modelId: string }> = ({ nodes, modelName, modelId }) => {
    // Core bones
    const hipsRef = useRef<THREE.Bone | null>(null);
    const chestRef = useRef<THREE.Bone | null>(null);

    // Chest bones
    const breastLRef = useRef<THREE.Bone | null>(null);
    const breastRRef = useRef<THREE.Bone | null>(null);

    // Hip/Butt bones
    const buttLRef = useRef<THREE.Bone | null>(null);
    const buttRRef = useRef<THREE.Bone | null>(null);
    const upperLegLRef = useRef<THREE.Bone | null>(null);
    const upperLegRRef = useRef<THREE.Bone | null>(null);

    // Arm bones for A-Pose
    const armLRef = useRef<THREE.Bone | null>(null);
    const armRRef = useRef<THREE.Bone | null>(null);
    const shoulderLRef = useRef<THREE.Bone | null>(null);
    const shoulderRRef = useRef<THREE.Bone | null>(null);

    // Physics Springs
    const leftChestSpring = useRef(new SpringSolver(0, 120, 6));
    const rightChestSpring = useRef(new SpringSolver(0, 120, 6));
    const leftHipSpring = useRef(new SpringSolver(0, 100, 5));
    const rightHipSpring = useRef(new SpringSolver(0, 100, 5));

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
        // Analyze and save bone structure to store
        const analysis = analyzeBones(nodes, modelName);
        useStore.getState().setBoneAnalysis(analysis);

        // Find bones - Updated patterns to match actual bone names
        hipsRef.current = findBone(['hips', 'hip', 'pelvis']);
        chestRef.current = findBone(['spine2', 'spine02', 'chest', 'upperchest', 'sternum']);

        // Breast bones - CC_Base uses L_Breast, Mixamo uses Breast_L
        breastLRef.current = findBone(['l_breast', 'breast_l', 'breastl', 'boob_l', 'pectoral_l', 'leftbreast']);
        breastRRef.current = findBone(['r_breast', 'breast_r', 'breastr', 'boob_r', 'pectoral_r', 'rightbreast']);

        // Butt/Glute bones - rare in standard rigs
        buttLRef.current = findBone(['butt_l', 'buttl', 'glute_l', 'glutel', 'l_butt', 'l_glute']);
        buttRRef.current = findBone(['butt_r', 'buttr', 'glute_r', 'gluter', 'r_butt', 'r_glute']);

        // Upper leg fallback - CC_Base uses L_Thigh, Mixamo uses LeftUpLeg
        upperLegLRef.current = findBone(['l_thigh', 'leftupleg', 'thigh_l', 'upperleg_l', 'left_thigh'], ['twist', 'lower']);
        upperLegRRef.current = findBone(['r_thigh', 'rightupleg', 'thigh_r', 'upperleg_r', 'right_thigh'], ['twist', 'lower']);

        // Arm bones for A-pose lowering
        armLRef.current = findBone(['l_arm', 'leftarm', 'upperarm_l', 'l_upperarm'], ['lower', 'twist', 'forearm']);
        armRRef.current = findBone(['r_arm', 'rightarm', 'upperarm_r', 'r_upperarm'], ['lower', 'twist', 'forearm']);
        shoulderLRef.current = findBone(['l_shoulder', 'leftshoulder', 'clavicle_l', 'l_clavicle']);
        shoulderRRef.current = findBone(['r_shoulder', 'rightshoulder', 'clavicle_r', 'r_clavicle']);

        // Store initial rotations
        [hipsRef, chestRef, breastLRef, breastRRef, buttLRef, buttRRef, upperLegLRef, upperLegRRef, armLRef, armRRef, shoulderLRef, shoulderRRef].forEach(ref => {
            if (ref.current) {
                initialRotations.current[ref.current.uuid] = ref.current.rotation.clone();

                // --- Apply A-Pose (Arms down) ---
                if (ref === armLRef && ref.current) {
                    // For Isabella, we might need to flip these if she's rotated 180
                    ref.current.rotation.z = modelId === 'isabella' ? Math.PI / 3 : -Math.PI / 3;
                }
                if (ref === armRRef && ref.current) {
                    ref.current.rotation.z = modelId === 'isabella' ? -Math.PI / 3 : Math.PI / 3;
                }

                // --- Apply Bone Offsets from Config ---
                const config = AVAILABLE_MODELS.find(m => m.id === modelId)?.config;
                if (config?.boneOffsets) {
                    const boneName = ref.current.name.toLowerCase();
                    Object.entries(config.boneOffsets).forEach(([pattern, offsetVal]) => {
                        const offset = offsetVal as { x?: number; y?: number; z?: number };
                        if (boneName.includes(pattern.toLowerCase())) {
                            if (offset.x !== undefined) ref.current!.position.x += offset.x;
                            if (offset.y !== undefined) ref.current!.position.y += offset.y;
                            if (offset.z !== undefined) ref.current!.position.z += offset.z;
                        }
                    });
                }
            }
        });
    }, [nodes, modelName, modelId]);

    const prevTime = useRef(0);

    useFrame((state) => {
        const {
            gesture,
            leftChestOffset,
            rightChestOffset,
            movementIntensity,
            accumulatedRotation
        } = useStore.getState();

        const time = state.clock.getElapsedTime();
        const deltaTime = Math.min(time - prevTime.current, 0.1);
        prevTime.current = time;

        const physicsMultiplier = movementIntensity;

        // Determine view direction based on accumulated rotation
        // Normalize rotation to [-PI, PI] range
        const normalizedRotation = ((accumulatedRotation.x * 3) % (Math.PI * 2));
        const isFrontView = Math.abs(normalizedRotation) < Math.PI / 2 || Math.abs(normalizedRotation) > Math.PI * 1.5;
        const isBackView = !isFrontView;

        // === BREATHING ANIMATION (always active) ===
        const breathAmount = physicsMultiplier * 0.02;
        const breathCycle = Math.sin(time * 1.2) * breathAmount;

        // Get interaction input
        const isInteracting = gesture === 'INTERACT_LEFT' || gesture === 'INTERACT_RIGHT';
        const interactOffset = gesture === 'INTERACT_LEFT' ? leftChestOffset :
            gesture === 'INTERACT_RIGHT' ? rightChestOffset : { x: 0, y: 0 };

        // === FRONT VIEW: CHEST MOVEMENT ===
        if (isFrontView && isInteracting) {
            let leftChestForce = Math.abs(interactOffset.y) * 20.0 * physicsMultiplier;
            let rightChestForce = Math.abs(interactOffset.y) * 20.0 * physicsMultiplier;

            // Per-side control
            if (gesture === 'INTERACT_LEFT') {
                rightChestForce *= 0.0; // STRICT ISOLATION: 0 crosstalk
            } else {
                leftChestForce *= 0.0;
            }

            leftChestSpring.current.target = leftChestForce;
            rightChestSpring.current.target = rightChestForce;
        } else {
            leftChestSpring.current.target = Math.sin(time * 0.8) * 0.01 * physicsMultiplier;
            rightChestSpring.current.target = Math.sin(time * 0.8 + 0.1) * 0.01 * physicsMultiplier;
        }

        const leftChestValue = leftChestSpring.current.update(deltaTime);
        const rightChestValue = rightChestSpring.current.update(deltaTime);

        // Apply to breast bones (or chest as fallback)
        if (breastLRef.current && initialRotations.current[breastLRef.current.uuid]) {
            const base = initialRotations.current[breastLRef.current.uuid];
            let rotation = base.x + (leftChestValue * 0.5);
            if (isFrontView && gesture === 'INTERACT_LEFT') {
                // Front view: Left user hand -> Screen Left -> Model Right Breast.
                // Wait. We previously established Strict Isolation.
                // If gesture is LEFT, we are acting on Left side of screen (Model Right).
                // So this block (breastLRef = Model Left) should respond to RIGHT gesture?
                // Standard Mirror: Raise Left Hand -> Reflection raises Left Hand (Screen Left).
                // Screen Left is Model's RIGHT.

                // User said: "left hand should only move left and right only right".
                // Just mapping directly to the gesture name avoids confusion.
                // If user raises Left hand (INTERACT_LEFT), and wants "Left Breast" to move...
                // Assuming "Left Breast" means "Breast on Left of Screen" (Model Right).

                // Let's stick to the variables and just INCREASE MAGNITUDE.
                // "increase surface area vertically" -> Increase X rotation (bounce).
                rotation += interactOffset.y * 5.0; // Increased from 3.0 to 5.0
            }
            breastLRef.current.rotation.x = rotation;

            // Add Scale for "surface area" feel?
            // breastLRef.current.scale.y = 1.0 + Math.abs(interactOffset.y) * 0.5;
        }

        if (breastRRef.current && initialRotations.current[breastRRef.current.uuid]) {
            const base = initialRotations.current[breastRRef.current.uuid];
            let rotation = base.x + (rightChestValue * 0.5);
            if (isFrontView && gesture === 'INTERACT_RIGHT') {
                rotation += interactOffset.y * 5.0; // Increased from 3.0 to 5.0
            }
            breastRRef.current.rotation.x = rotation;
        }

        // Chest breathing fallback
        if (chestRef.current && initialRotations.current[chestRef.current.uuid]) {
            const base = initialRotations.current[chestRef.current.uuid];
            if (!breastLRef.current && !breastRRef.current && isFrontView && isInteracting) {
                // No breast bones - use chest (Jeny case)
                // "Jeny not moving breasts, it is moving her whole upper chest area up and down."
                // Fix: Reduce range heavily (0.5) to avoid whole-body look.
                chestRef.current.rotation.x = base.x + interactOffset.y * 0.5;
            } else {
                chestRef.current.rotation.x = base.x - breathCycle;
            }
        }

        // === BACK VIEW: PER-SIDE GLUTE MOVEMENT ===
        // When facing BACK: viewer's left hand = model's RIGHT side (mirrored)
        // So: left hand gesture should control RIGHT leg/butt
        const isLeftInteracting = isBackView && gesture === 'INTERACT_LEFT';
        const isRightInteracting = isBackView && gesture === 'INTERACT_RIGHT';

        const leftHipValue = leftHipSpring.current.update(deltaTime);
        const rightHipValue = rightHipSpring.current.update(deltaTime);

        // Because when facing away, model's right is on viewer's LEFT
        if (hipsRef.current && initialRotations.current[hipsRef.current.uuid]) {
            if (isLeftInteracting) {
                // Left hand controls RIGHT side spring
                const force = Math.abs(leftChestOffset.y) * 25.0 * physicsMultiplier + leftChestOffset.x * 20.0 * physicsMultiplier;
                rightHipSpring.current.target = force; // SWAPPED
            } else {
                rightHipSpring.current.target = Math.sin(time * 2 + 0.2) * 0.01 * physicsMultiplier;
            }

            if (isRightInteracting) {
                // Right hand controls LEFT side spring
                const force = Math.abs(rightChestOffset.y) * 25.0 * physicsMultiplier + rightChestOffset.x * 20.0 * physicsMultiplier;
                leftHipSpring.current.target = force; // SWAPPED
            } else {
                leftHipSpring.current.target = Math.sin(time * 2) * 0.01 * physicsMultiplier;
            }

            // Apply to hip bone for overall movement
            const base = initialRotations.current[hipsRef.current.uuid];
            if (isLeftInteracting) {
                // Left hand → tilt model's RIGHT side (viewer's left)
                // If using fallback (no butt bones), use MORE hip movement to simulate glute movement
                const mult = (!buttLRef.current) ? 2.5 : 1.0; // Strong multiplication for visibility
                const tiltZ = -leftChestOffset.x * 0.8 * mult;
                const tiltX = leftChestOffset.y * 0.5 * mult;

                hipsRef.current.rotation.z = base.z + tiltZ;
                hipsRef.current.rotation.x = base.x + tiltX;

                // COUNTER-ROTATION: Isolate movement by rotating chest and legs opposite direction
                if (!buttLRef.current) {
                    if (chestRef.current && initialRotations.current[chestRef.current.uuid]) {
                        const cBase = initialRotations.current[chestRef.current.uuid];
                        chestRef.current.rotation.z = cBase.z - tiltZ; // Counter logic
                        chestRef.current.rotation.x = cBase.x - tiltX;
                    }
                    if (upperLegLRef.current && initialRotations.current[upperLegLRef.current.uuid]) {
                        const lBase = initialRotations.current[upperLegLRef.current.uuid];
                        upperLegLRef.current.rotation.z = lBase.z - tiltZ; // Legs opposite to Hips to stay vertical
                    }
                    if (upperLegRRef.current && initialRotations.current[upperLegRRef.current.uuid]) {
                        const rBase = initialRotations.current[upperLegRRef.current.uuid];
                        // Stabilize both legs
                        upperLegRRef.current.rotation.z = rBase.z - tiltZ;
                    }
                }
            } else if (isRightInteracting) {
                // Right hand → tilt model's LEFT side (viewer's right)
                const mult = (!buttRRef.current) ? 2.5 : 1.0;
                const tiltZ = rightChestOffset.x * 0.8 * mult;
                const tiltX = rightChestOffset.y * 0.5 * mult;

                hipsRef.current.rotation.z = base.z + tiltZ;
                hipsRef.current.rotation.x = base.x + tiltX;

                // COUNTER-ROTATION
                if (!buttRRef.current) {
                    if (chestRef.current && initialRotations.current[chestRef.current.uuid]) {
                        const cBase = initialRotations.current[chestRef.current.uuid];
                        chestRef.current.rotation.z = cBase.z - tiltZ;
                        chestRef.current.rotation.x = cBase.x - tiltX;
                    }
                    if (upperLegRRef.current && initialRotations.current[upperLegRRef.current.uuid]) {
                        const rBase = initialRotations.current[upperLegRRef.current.uuid];
                        upperLegRRef.current.rotation.z = rBase.z - tiltZ;
                    }
                    if (upperLegLRef.current && initialRotations.current[upperLegLRef.current.uuid]) {
                        const lBase = initialRotations.current[upperLegLRef.current.uuid];
                        upperLegLRef.current.rotation.z = lBase.z - tiltZ;
                    }
                }
            } else {
                hipsRef.current.rotation.z = THREE.MathUtils.lerp(hipsRef.current.rotation.z, base.z, 0.1);
                hipsRef.current.rotation.x = THREE.MathUtils.lerp(hipsRef.current.rotation.x, base.x, 0.1);
            }
        }

        // Model's LEFT butt/leg - controlled by RIGHT hand (SWAPPED)
        if (buttLRef.current && initialRotations.current[buttLRef.current.uuid]) {
            const base = initialRotations.current[buttLRef.current.uuid];
            if (isRightInteracting) {
                buttLRef.current.rotation.x = base.x + leftHipValue * 0.5 + rightChestOffset.y * 1.5;
            } else {
                buttLRef.current.rotation.x = THREE.MathUtils.lerp(buttLRef.current.rotation.x, base.x, 0.1);
            }
        }

        // Model's RIGHT butt/leg - controlled by LEFT hand (SWAPPED)
        if (buttRRef.current && initialRotations.current[buttRRef.current.uuid]) {
            const base = initialRotations.current[buttRRef.current.uuid];
            if (isLeftInteracting) {
                buttRRef.current.rotation.x = base.x + rightHipValue * 0.5 + leftChestOffset.y * 1.5;
            } else {
                buttRRef.current.rotation.x = THREE.MathUtils.lerp(buttRRef.current.rotation.x, base.x, 0.1);
            }
        }

        // Upper leg fallback - Model's LEFT leg - controlled by RIGHT hand (SWAPPED)
        if (!buttLRef.current && upperLegLRef.current && initialRotations.current[upperLegLRef.current.uuid] && isRightInteracting) {
            const base = initialRotations.current[upperLegLRef.current.uuid];
            // REDUCED LEG SWING - User feedback: "legs moving not ass"
            // We use minimal leg swing and rely on the enhanced hip movement above
            upperLegLRef.current.rotation.z = base.z + (leftHipValue * 0.05) + (rightChestOffset.y * 0.08);
            // Add slight twist for better look?
            upperLegLRef.current.rotation.y = base.y - rightChestOffset.x * 0.1;
        } else if (upperLegLRef.current && initialRotations.current[upperLegLRef.current.uuid]) {
            const base = initialRotations.current[upperLegLRef.current.uuid];
            upperLegLRef.current.rotation.z = THREE.MathUtils.lerp(upperLegLRef.current.rotation.z, base.z, 0.1);
        }

        // Upper leg fallback - Model's RIGHT leg - controlled by LEFT hand (SWAPPED)
        if (!buttRRef.current && upperLegRRef.current && initialRotations.current[upperLegRRef.current.uuid] && isLeftInteracting) {
            const base = initialRotations.current[upperLegRRef.current.uuid];
            // REDUCED LEG SWING - User feedback: "legs moving not ass"
            // We use minimal leg swing and rely on the enhanced hip movement above
            upperLegRRef.current.rotation.z = base.z + (rightHipValue * 0.05) + (leftChestOffset.y * 0.08);
            // Add slight twist for better look?
            upperLegRRef.current.rotation.y = base.y + leftChestOffset.x * 0.1;
        } else if (upperLegRRef.current && initialRotations.current[upperLegRRef.current.uuid]) {
            const base = initialRotations.current[upperLegRRef.current.uuid];
            upperLegRRef.current.rotation.z = THREE.MathUtils.lerp(upperLegRRef.current.rotation.z, base.z, 0.1);
        }
    });

    return <group>{/* RigController */}</group>;
};

/**
 * Model Loader Component with lazy loading
 */
const ModelLoader: React.FC<{ modelPath: string, modelName: string, modelId: string }> = ({ modelPath, modelName, modelId }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { scene } = useGLTF(modelPath);
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes } = useGraph(clone);

    // Get model config
    const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId)?.config || { position: [0, -1.6, 0], scale: 1.0, rotation: [0, 0, 0] };

    // Apply base rotation logic or other traverse logic
    useEffect(() => {
        clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Texture fix: Use config color if provided, otherwise force white to show embedded textures
                if (child.material) {
                    const mat = child.material as THREE.MeshStandardMaterial;
                    if (modelConfig.color) {
                        mat.color.set(modelConfig.color);
                    } else if (mat.color) {
                        mat.color.set(0xffffff); // Ensure base color is white (un-tinted)
                    }
                    mat.metalness = 0; // Disable metalness to prevent dark/shiny washout
                    mat.roughness = 0.55; // Natural skin roughness
                    mat.envMapIntensity = 0.5;
                    mat.needsUpdate = true;
                }
            }
        });

        if (groupRef.current) {
            // Reset rotation to ensure clean slate if switching models
            groupRef.current.rotation.set(0, 0, 0);
        }
    }, [clone, modelId]);

    // Rotate entire model
    useFrame(() => {
        if (!groupRef.current) return;

        const { accumulatedRotation, zoomFactor } = useStore.getState();

        const targetY = -accumulatedRotation.x * 3.0; // User control Y
        const targetX = accumulatedRotation.y * 0.5; // User control X

        // Apply config rotation + user rotation
        const baseX = modelConfig.rotation ? modelConfig.rotation[0] : 0;
        const baseY = modelConfig.rotation ? modelConfig.rotation[1] : 0;
        const baseZ = modelConfig.rotation ? modelConfig.rotation[2] : 0;

        // Fix Isabella rotation direction (flipped mesh axes)
        const rotMultiplier = modelConfig.invertRotation ? -1.0 : 1.0;

        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, (targetY * rotMultiplier) + baseY, 0.15);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX + baseX, 0.15);
        groupRef.current.rotation.z = baseZ;

        // Apply config scale + zoom
        const baseScale = (modelConfig.scale || 1.0) * 1.5; // Maintain 1.5 global multiplier
        const targetScale = baseScale * zoomFactor;
        groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.1));
    });

    const pos = modelConfig.position || [0, -1.6, 0];

    return (
        <group ref={groupRef} dispose={null} position={[pos[0], pos[1], pos[2]]}>
            <primitive object={clone} />
            <RigController nodes={nodes} modelName={modelName} modelId={modelId} />
        </group>
    );
};

/**
 * Main Model Component with model selection
 */
const AnatomyModel: React.FC<{ selectedModel?: string }> = ({ selectedModel = 'jeny' }) => {
    const model = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

    return (
        <Suspense fallback={null}>
            <ModelLoader modelPath={model.path} modelName={model.name} modelId={model.id} />
        </Suspense>
    );
};

// Preload default model
useGLTF.preload(AVAILABLE_MODELS[0].path);

export default AnatomyModel;
