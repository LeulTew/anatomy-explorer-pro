import React, { useRef, useEffect, Suspense } from 'react';
import { useFrame, useGraph } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useStore } from '../store/useStore';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { SpringSolver } from '../logic/SpringSolver';

// Available models configuration
export interface ModelConfig {
    position?: [number, number, number];
    scale?: number;
    rotation?: [number, number, number];
    color?: string;
    invertRotation?: boolean;
    boneOffsets?: Record<string, { x?: number; y?: number; z?: number }>;
    armDangle?: { axis: 'x' | 'y' | 'z'; invert: boolean };
}

export interface ModelEntry {
    id: string;
    name: string;
    path: string;
    config: ModelConfig;
}

export const AVAILABLE_MODELS: ModelEntry[] = [
    {
        id: 'jeny',
        name: 'Jeny',
        path: '/models/jeny.glb',
        config: { position: [0, -1.0, 0], scale: 1.0, rotation: [0, 0, 0], armDangle: { axis: 'z', invert: false } }
    },
    {
        id: 'noelle',
        name: 'Noelle',
        path: '/models/noelle.glb',
        config: { position: [0, -1.6, 0], scale: 1.0, rotation: [0, 0, 0], armDangle: { axis: 'z', invert: false } }
    },
    {
        id: 'eva',
        name: 'Eva (Base)',
        path: '/models/eva.glb',
        config: { position: [0, -2.5, 0], scale: 1.0, rotation: [0, 0, 0], color: '#f5d1b5', armDangle: { axis: 'y', invert: false } }
    },
    {
        id: 'michelle',
        name: 'Michelle',
        path: '/models/michelle.glb',
        config: { position: [0, -1.6, 0], scale: 1.0, rotation: [0, 0, 0], armDangle: { axis: 'z', invert: false } }
    },
    {
        id: 'seraphina',
        name: 'Seraphina',
        path: '/models/seraphina.glb',
        config: { position: [0, -2.5, 0], scale: 0.015, rotation: [0, 0, 0], color: '#f3c4a1', armDangle: { axis: 'y', invert: false } }
    },
    {
        id: 'isabella',
        name: 'Isabella',
        path: '/models/isabella.glb',
        config: {
            position: [0, -4.5, 0],
            scale: 2.5,
            rotation: [Math.PI, 0, 0],
            invertRotation: true,
            armDangle: { axis: 'z', invert: true },
            boneOffsets: {
                'breast': { x: 0.1, y: -0.2 }
            }
        }
    },
    {
        id: 'amara',
        name: 'Amara',
        path: '/models/amara.glb',
        config: { position: [0, -3.2, 0], scale: 1.0, rotation: [0, 0, 0], color: '#eec1ad', armDangle: { axis: 'y', invert: false } }
    },
    {
        id: 'jane',
        name: 'Jane',
        path: '/models/jane_-_female_rigged_character.glb',
        config: { position: [0, -1.0, 0], scale: 1.0, rotation: [0, 0, 0], armDangle: { axis: 'z', invert: false } }
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

    const findBoneFunc = (patterns: string[]): boolean => {
        return patterns.some(p =>
            boneNames.some(b => b.toLowerCase().includes(p.toLowerCase()))
        );
    };

    const analysis: BoneAnalysis = {
        modelName,
        hasSpine: findBoneFunc(['spine', 'torso']),
        hasHips: findBoneFunc(['hips', 'pelvis', 'root']),
        hasChest: findBoneFunc(['chest', 'spine2', 'upperchest']),
        hasBreastL: findBoneFunc(['breast_l', 'breastl', 'boob_l', 'boobl', 'pectoral_l']),
        hasBreastR: findBoneFunc(['breast_r', 'breastr', 'boob_r', 'boobr', 'pectoral_r']),
        hasButtL: findBoneFunc(['butt_l', 'buttl', 'glute_l', 'glutel']),
        hasButtR: findBoneFunc(['butt_r', 'buttr', 'glute_r', 'gluter']),
        allBoneNames: boneNames
    };

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
    const armLSpring = useRef(new SpringSolver(0, 80, 4));
    const armRSpring = useRef(new SpringSolver(0, 80, 4));
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
        const analysis = analyzeBones(nodes, modelName);
        useStore.getState().setBoneAnalysis(analysis);

        hipsRef.current = findBone(['hips', 'hip', 'pelvis']);
        chestRef.current = findBone(['spine2', 'spine02', 'chest', 'upperchest', 'sternum']);
        breastLRef.current = findBone(['l_breast', 'breast_l', 'breastl', 'boob_l', 'pectoral_l', 'leftbreast']);
        breastRRef.current = findBone(['r_breast', 'breast_r', 'breastr', 'boob_r', 'pectoral_r', 'rightbreast']);
        buttLRef.current = findBone(['butt_l', 'buttl', 'glute_l', 'glutel', 'l_butt', 'l_glute']);
        buttRRef.current = findBone(['butt_r', 'buttr', 'glute_r', 'gluter', 'r_butt', 'r_glute']);
        upperLegLRef.current = findBone(['l_thigh', 'leftupleg', 'thigh_l', 'upperleg_l', 'left_thigh'], ['twist', 'lower']);
        upperLegRRef.current = findBone(['r_thigh', 'rightupleg', 'thigh_r', 'upperleg_r', 'right_thigh'], ['twist', 'lower']);
        armLRef.current = findBone(['l_arm', 'leftarm', 'upperarm_l', 'l_upperarm'], ['lower', 'twist', 'forearm']);
        armRRef.current = findBone(['r_arm', 'rightarm', 'upperarm_r', 'r_upperarm'], ['lower', 'twist', 'forearm']);
        shoulderLRef.current = findBone(['l_shoulder', 'leftshoulder', 'clavicle_l', 'l_clavicle']);
        shoulderRRef.current = findBone(['r_shoulder', 'rightshoulder', 'clavicle_r', 'r_clavicle']);

        [hipsRef, chestRef, breastLRef, breastRRef, buttLRef, buttRRef, upperLegLRef, upperLegRRef, armLRef, armRRef, shoulderLRef, shoulderRRef].forEach(ref => {
            if (ref.current) {
                initialRotations.current[ref.current.uuid] = ref.current.rotation.clone();
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

        // Determine view direction
        const normalizedRotation = ((accumulatedRotation.x * 3) % (Math.PI * 2));
        const isFrontView = Math.abs(normalizedRotation) < Math.PI / 2 || Math.abs(normalizedRotation) > Math.PI * 1.5;
        const isBackView = !isFrontView;

        const isInteracting = gesture === 'INTERACT_LEFT' || gesture === 'INTERACT_RIGHT';
        const isLeftInteracting = isBackView && gesture === 'INTERACT_LEFT';
        const isRightInteracting = isBackView && gesture === 'INTERACT_RIGHT';

        const interactOffset = gesture === 'INTERACT_LEFT' ? leftChestOffset :
            gesture === 'INTERACT_RIGHT' ? rightChestOffset : { x: 0, y: 0 };

        // === BREATHING ===
        const breathAmount = physicsMultiplier * 0.02;
        const breathCycle = Math.sin(time * 1.2) * breathAmount;

        // === CHEST / BREAST PHYSICS ===
        const breastJiggleMag = modelId === 'jane' ? 18.0 : 12.0;
        let leftChestTarget = Math.sin(time * 0.8) * 0.01 * physicsMultiplier;
        let rightChestTarget = Math.sin(time * 0.8 + 0.1) * 0.01 * physicsMultiplier;

        if (isFrontView && isInteracting) {
            if (gesture === 'INTERACT_LEFT') {
                leftChestTarget = leftChestOffset.y * breastJiggleMag * physicsMultiplier;
            } else {
                rightChestTarget = rightChestOffset.y * breastJiggleMag * physicsMultiplier;
            }
        }

        leftChestSpring.current.target = leftChestTarget;
        rightChestSpring.current.target = rightChestTarget;

        const leftChestValue = leftChestSpring.current.update(deltaTime);
        const rightChestValue = rightChestSpring.current.update(deltaTime);

        // === LOOSE ARMS ===
        const modelConf = AVAILABLE_MODELS.find(m => m.id === modelId)?.config;
        const armConf = modelConf?.armDangle || { axis: 'z', invert: false };
        const armDangleBase = Math.PI / 2.5;
        const armSway = Math.sin(time * 0.8) * 0.08 * movementIntensity;

        armLSpring.current.target = armDangleBase + armSway;
        armRSpring.current.target = armDangleBase + armSway;
        const armLValue = armLSpring.current.update(deltaTime);
        const armRValue = armRSpring.current.update(deltaTime);

        const applyArmRot = (bone: THREE.Bone | null, value: number, isRight: boolean) => {
            if (!bone || !initialRotations.current[bone.uuid]) return;
            const base = initialRotations.current[bone.uuid];
            const finalVal = (armConf.invert ? -value : value) * (isRight ? 1 : -1);
            if (armConf.axis === 'x') bone.rotation.x = base.x + finalVal;
            else if (armConf.axis === 'y') bone.rotation.y = base.y + finalVal;
            else bone.rotation.z = base.z + finalVal;
        };
        applyArmRot(armLRef.current, armLValue, false);
        applyArmRot(armRRef.current, armRValue, true);

        const drop = 0.15;
        const applyShoulderRot = (bone: THREE.Bone | null, isRight: boolean) => {
            if (!bone || !initialRotations.current[bone.uuid]) return;
            const base = initialRotations.current[bone.uuid];
            const finalVal = (armConf.invert ? -drop : drop) * (isRight ? 1 : -1);
            if (armConf.axis === 'x') bone.rotation.x = base.x + finalVal;
            else if (armConf.axis === 'y') bone.rotation.y = base.y + finalVal;
            else bone.rotation.z = base.z + finalVal;
        };
        applyShoulderRot(shoulderLRef.current, false);
        applyShoulderRot(shoulderRRef.current, true);

        // === APPLY BREAST ROTATIONS (Directional X/Z) ===
        const breastSwayMag = modelId === 'jane' ? 6.0 : 4.0;
        if (breastLRef.current && initialRotations.current[breastLRef.current.uuid]) {
            const base = initialRotations.current[breastLRef.current.uuid];
            breastLRef.current.rotation.x = base.x + leftChestValue;
            if (isFrontView && gesture === 'INTERACT_LEFT') {
                breastLRef.current.rotation.z = base.z + leftChestOffset.x * breastSwayMag;
            } else {
                breastLRef.current.rotation.z = THREE.MathUtils.lerp(breastLRef.current.rotation.z, base.z, 0.1);
            }
        }
        if (breastRRef.current && initialRotations.current[breastRRef.current.uuid]) {
            const base = initialRotations.current[breastRRef.current.uuid];
            breastRRef.current.rotation.x = base.x + rightChestValue;
            if (isFrontView && gesture === 'INTERACT_RIGHT') {
                breastRRef.current.rotation.z = base.z + rightChestOffset.x * breastSwayMag;
            } else {
                breastRRef.current.rotation.z = THREE.MathUtils.lerp(breastRRef.current.rotation.z, base.z, 0.1);
            }
        }

        // Breathing fallback
        if (chestRef.current && initialRotations.current[chestRef.current.uuid]) {
            const base = initialRotations.current[chestRef.current.uuid];
            if (!breastLRef.current && !breastRRef.current && isFrontView && isInteracting) {
                chestRef.current.rotation.x = base.x + interactOffset.y * 0.5;
            } else {
                chestRef.current.rotation.x = base.x - breathCycle;
            }
        }

        // === GLUTE PHYSICS ===
        const gluteBounceMag = modelId === 'jane' ? 22.0 : 15.0;
        let leftHipTarget = Math.sin(time * 2) * 0.01 * physicsMultiplier;
        let rightHipTarget = Math.sin(time * 2 + 0.2) * 0.01 * physicsMultiplier;

        if (isLeftInteracting) rightHipTarget = leftChestOffset.y * gluteBounceMag * physicsMultiplier;
        if (isRightInteracting) leftHipTarget = rightChestOffset.y * gluteBounceMag * physicsMultiplier;

        leftHipSpring.current.target = leftHipTarget;
        rightHipSpring.current.target = rightHipTarget;

        const leftHipValue = leftHipSpring.current.update(deltaTime);
        const rightHipValue = rightHipSpring.current.update(deltaTime);

        // Hips (Overall Movement)
        if (hipsRef.current && initialRotations.current[hipsRef.current.uuid]) {
            const base = initialRotations.current[hipsRef.current.uuid];
            if (isLeftInteracting || isRightInteracting) {
                const off = isLeftInteracting ? leftChestOffset : rightChestOffset;
                const sign = isLeftInteracting ? -1 : 1;
                const mult = (!buttLRef.current && modelId !== 'jane') ? 2.5 : 1.2;
                hipsRef.current.rotation.z = base.z + off.x * 0.8 * mult * sign;
                hipsRef.current.rotation.x = base.x + off.y * 0.5 * mult;
            } else {
                hipsRef.current.rotation.z = THREE.MathUtils.lerp(hipsRef.current.rotation.z, base.z, 0.1);
                hipsRef.current.rotation.x = THREE.MathUtils.lerp(hipsRef.current.rotation.x, base.x, 0.1);
            }
        }

        // Glute Bones
        const gluteSwayMag = modelId === 'jane' ? 6.0 : 3.0;
        if (buttLRef.current && initialRotations.current[buttLRef.current.uuid]) {
            const base = initialRotations.current[buttLRef.current.uuid];
            buttLRef.current.rotation.x = base.x + leftHipValue;
            if (isRightInteracting) {
                buttLRef.current.rotation.z = base.z + rightChestOffset.x * gluteSwayMag;
            } else {
                buttLRef.current.rotation.z = THREE.MathUtils.lerp(buttLRef.current.rotation.z, base.z, 0.1);
            }
        }
        if (buttRRef.current && initialRotations.current[buttRRef.current.uuid]) {
            const base = initialRotations.current[buttRRef.current.uuid];
            buttRRef.current.rotation.x = base.x + rightHipValue;
            if (isLeftInteracting) {
                buttRRef.current.rotation.z = base.z + leftChestOffset.x * gluteSwayMag;
            } else {
                buttRRef.current.rotation.z = THREE.MathUtils.lerp(buttRRef.current.rotation.z, base.z, 0.1);
            }
        }

        // Leg Fallback
        const hasButtBones = (buttLRef.current || buttRRef.current);
        const useLegFallback = !hasButtBones && modelId !== 'jane';

        if (useLegFallback) {
            if (upperLegLRef.current && initialRotations.current[upperLegLRef.current.uuid] && isRightInteracting) {
                const base = initialRotations.current[upperLegLRef.current.uuid];
                upperLegLRef.current.rotation.z = base.z + (leftHipValue * 0.05) + (rightChestOffset.y * 0.08);
                upperLegLRef.current.rotation.y = base.y - rightChestOffset.x * 0.1;
            } else if (upperLegLRef.current && initialRotations.current[upperLegLRef.current.uuid]) {
                const base = initialRotations.current[upperLegLRef.current.uuid];
                upperLegLRef.current.rotation.z = THREE.MathUtils.lerp(upperLegLRef.current.rotation.z, base.z, 0.1);
            }

            if (upperLegRRef.current && initialRotations.current[upperLegRRef.current.uuid] && isLeftInteracting) {
                const base = initialRotations.current[upperLegRRef.current.uuid];
                upperLegRRef.current.rotation.z = base.z + (rightHipValue * 0.05) + (leftChestOffset.y * 0.08);
                upperLegRRef.current.rotation.y = base.y + leftChestOffset.x * 0.1;
            } else if (upperLegRRef.current && initialRotations.current[upperLegRRef.current.uuid]) {
                const base = initialRotations.current[upperLegRRef.current.uuid];
                upperLegRRef.current.rotation.z = THREE.MathUtils.lerp(upperLegRRef.current.rotation.z, base.z, 0.1);
            }
        }
    });

    return <group>{/* RigController */}</group>;
};

const ModelLoader: React.FC<{ modelPath: string, modelName: string, modelId: string }> = ({ modelPath, modelName, modelId }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { scene } = useGLTF(modelPath);
    const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { nodes } = useGraph(clone);

    const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId)?.config || { position: [0, -1.6, 0], scale: 1.0, rotation: [0, 0, 0] };

    useEffect(() => {
        clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    const mat = child.material as THREE.MeshStandardMaterial;
                    if (modelConfig.color) {
                        mat.color.set(modelConfig.color);
                    } else if (mat.color) {
                        mat.color.set(0xffffff);
                    }
                    mat.metalness = 0;
                    mat.roughness = 0.55;
                    mat.envMapIntensity = 0.5;
                    mat.needsUpdate = true;
                }
            }
        });
        if (groupRef.current) groupRef.current.rotation.set(0, 0, 0);
    }, [clone, modelId]);

    useFrame(() => {
        if (!groupRef.current) return;
        const { accumulatedRotation, zoomFactor } = useStore.getState();
        const targetY = -accumulatedRotation.x * 3.0;
        const targetX = accumulatedRotation.y * 0.5;
        const baseX = modelConfig.rotation ? modelConfig.rotation[0] : 0;
        const baseY = modelConfig.rotation ? modelConfig.rotation[1] : 0;
        const baseZ = modelConfig.rotation ? modelConfig.rotation[2] : 0;
        const rotMultiplier = modelConfig.invertRotation ? -1.0 : 1.0;
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, (targetY * rotMultiplier) + baseY, 0.15);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX + baseX, 0.15);
        groupRef.current.rotation.z = baseZ;
        const baseScale = (modelConfig.scale || 1.0) * 1.5;
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

const AnatomyModel: React.FC<{ selectedModel?: string }> = ({ selectedModel = 'jeny' }) => {
    const model = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];
    return (
        <Suspense fallback={null}>
            <ModelLoader modelPath={model.path} modelName={model.name} modelId={model.id} />
        </Suspense>
    );
};

useGLTF.preload(AVAILABLE_MODELS[0].path);
export default AnatomyModel;
