import React, { useRef, useEffect, Suspense } from 'react';
import { useFrame, useGraph } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useStore } from '../store/useStore';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { SpringSolver } from '../logic/SpringSolver';

// Available models
export const AVAILABLE_MODELS = [
    { id: 'jeny', name: 'Jeny T-Pose', path: '/models/jeny_tpose_riged.glb' },
    { id: 'christmas', name: 'Christmas Girl', path: '/models/christmas_girl.glb' },
    { id: 'base_mesh', name: 'Base Mesh Female', path: '/models/base_mesh_female_with_rig_and_textures.glb' },
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

    // Log analysis
    console.log(`\n=== BONE ANALYSIS: ${modelName} ===`);
    console.log('Bones found:', boneNames.length);
    console.log('Spine:', analysis.hasSpine ? '✓' : '✗');
    console.log('Hips:', analysis.hasHips ? '✓' : '✗');
    console.log('Chest:', analysis.hasChest ? '✓' : '✗');
    console.log('Breast L:', analysis.hasBreastL ? '✓' : '✗');
    console.log('Breast R:', analysis.hasBreastR ? '✓' : '✗');
    console.log('Butt L:', analysis.hasButtL ? '✓' : '✗');
    console.log('Butt R:', analysis.hasButtR ? '✓' : '✗');
    console.log('All bones:', boneNames.join(', '));

    return analysis;
};

/**
 * Advanced Rig Controller - View-aware animations
 * Front view: chest movement
 * Back view: glute movement
 */
const RigController: React.FC<{ nodes: Record<string, THREE.Object3D>, modelName: string }> = ({ nodes, modelName }) => {
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

        // Find bones
        hipsRef.current = findBone(['hips', 'pelvis', 'root']);
        chestRef.current = findBone(['chest', 'spine2', 'upperchest', 'sternum']);

        breastLRef.current = findBone(['breast_l', 'breastl', 'boob_l', 'boobl', 'pectoral_l']);
        breastRRef.current = findBone(['breast_r', 'breastr', 'boob_r', 'boobr', 'pectoral_r']);

        buttLRef.current = findBone(['butt_l', 'buttl', 'glute_l', 'glutel']);
        buttRRef.current = findBone(['butt_r', 'buttr', 'glute_r', 'gluter']);
        upperLegLRef.current = findBone(['leftupleg', 'upperleg_l', 'thigh_l', 'leg_l'], ['lower']);
        upperLegRRef.current = findBone(['rightupleg', 'upperleg_r', 'thigh_r', 'leg_r'], ['lower']);

        // Store initial rotations
        [hipsRef, chestRef, breastLRef, breastRRef, buttLRef, buttRRef, upperLegLRef, upperLegRRef].forEach(ref => {
            if (ref.current) {
                initialRotations.current[ref.current.uuid] = ref.current.rotation.clone();
            }
        });
    }, [nodes, modelName]);

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
                rightChestForce *= 0.3; // Reduce opposite side
            } else {
                leftChestForce *= 0.3;
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
                rotation += interactOffset.y * 3.0;
            }
            breastLRef.current.rotation.x = rotation;
        }

        if (breastRRef.current && initialRotations.current[breastRRef.current.uuid]) {
            const base = initialRotations.current[breastRRef.current.uuid];
            let rotation = base.x + (rightChestValue * 0.5);
            if (isFrontView && gesture === 'INTERACT_RIGHT') {
                rotation += interactOffset.y * 3.0;
            }
            breastRRef.current.rotation.x = rotation;
        }

        // Chest breathing fallback
        if (chestRef.current && initialRotations.current[chestRef.current.uuid]) {
            const base = initialRotations.current[chestRef.current.uuid];
            if (!breastLRef.current && !breastRRef.current && isFrontView && isInteracting) {
                // No breast bones - use chest
                chestRef.current.rotation.x = base.x + interactOffset.y * 2.0;
            } else {
                chestRef.current.rotation.x = base.x - breathCycle;
            }
        }

        // === BACK VIEW: GLUTE MOVEMENT (TWERK) ===
        if (isBackView && isInteracting) {
            const swayForce = interactOffset.x * 25.0 * physicsMultiplier;
            const jiggleForce = Math.abs(interactOffset.y) * 20.0 * physicsMultiplier;

            leftHipSpring.current.target = swayForce + jiggleForce;
            rightHipSpring.current.target = -swayForce + jiggleForce;
        } else {
            leftHipSpring.current.target = Math.sin(time * 2) * 0.01 * physicsMultiplier;
            rightHipSpring.current.target = Math.sin(time * 2 + 0.2) * 0.01 * physicsMultiplier;
        }

        const leftHipValue = leftHipSpring.current.update(deltaTime);
        const rightHipValue = rightHipSpring.current.update(deltaTime);

        // Apply to hip/butt bones
        if (hipsRef.current && initialRotations.current[hipsRef.current.uuid] && isBackView && isInteracting) {
            const base = initialRotations.current[hipsRef.current.uuid];
            hipsRef.current.rotation.z = base.z + interactOffset.x * 0.3;
            hipsRef.current.rotation.y = base.y + interactOffset.x * 0.1;
        } else if (hipsRef.current && initialRotations.current[hipsRef.current.uuid]) {
            const base = initialRotations.current[hipsRef.current.uuid];
            hipsRef.current.rotation.z = THREE.MathUtils.lerp(hipsRef.current.rotation.z, base.z, 0.1);
            hipsRef.current.rotation.y = THREE.MathUtils.lerp(hipsRef.current.rotation.y, base.y, 0.1);
        }

        // Butt bones jiggle
        if (buttLRef.current && initialRotations.current[buttLRef.current.uuid]) {
            const base = initialRotations.current[buttLRef.current.uuid];
            buttLRef.current.rotation.x = base.x + leftHipValue * 0.4;
        }

        if (buttRRef.current && initialRotations.current[buttRRef.current.uuid]) {
            const base = initialRotations.current[buttRRef.current.uuid];
            buttRRef.current.rotation.x = base.x + rightHipValue * 0.4;
        }

        // Upper leg as fallback for butt movement
        if (!buttLRef.current && upperLegLRef.current && initialRotations.current[upperLegLRef.current.uuid] && isBackView && isInteracting) {
            const base = initialRotations.current[upperLegLRef.current.uuid];
            upperLegLRef.current.rotation.z = base.z + leftHipValue * 0.15;
        }

        if (!buttRRef.current && upperLegRRef.current && initialRotations.current[upperLegRRef.current.uuid] && isBackView && isInteracting) {
            const base = initialRotations.current[upperLegRRef.current.uuid];
            upperLegRRef.current.rotation.z = base.z + rightHipValue * 0.15;
        }
    });

    return <group>{/* RigController */}</group>;
};

/**
 * Model Loader Component with lazy loading
 */
const ModelLoader: React.FC<{ modelPath: string, modelName: string }> = ({ modelPath, modelName }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { scene } = useGLTF(modelPath);
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes } = useGraph(clone);

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

    // Rotate entire model
    useFrame(() => {
        if (!groupRef.current) return;

        const { accumulatedRotation, zoomFactor } = useStore.getState();

        const targetY = -accumulatedRotation.x * 3.0;
        const targetX = accumulatedRotation.y * 0.5;

        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.15);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.15);

        const targetScale = 1.5 * zoomFactor;
        groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.1));
    });

    return (
        <group ref={groupRef} dispose={null} position={[0, -1, 0]}>
            <primitive object={clone} />
            <RigController nodes={nodes} modelName={modelName} />
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
            <ModelLoader modelPath={model.path} modelName={model.name} />
        </Suspense>
    );
};

// Preload default model
useGLTF.preload(AVAILABLE_MODELS[0].path);

export default AnatomyModel;
