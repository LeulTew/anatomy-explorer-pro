// Script to analyze GLB model bone structure
// Run with: npx ts-node --esm scripts/analyze-bones.ts

import { readFileSync } from 'fs';
import { join } from 'path';

// Simple GLTF JSON parser to extract bone names
// (Full parsing would require gltf-transform or similar)

const modelsDir = join(process.cwd(), 'public/models');
const models = [
    'jeny_tpose_riged.glb',
    'christmas_girl.glb',
    'base_mesh_female_with_rig_and_textures.glb'
];

console.log('Analyzing GLB models for bone structure...\n');
console.log('Note: GLB is binary, this script shows file sizes.');
console.log('Full bone analysis requires loading in Three.js.\n');

models.forEach(model => {
    const path = join(modelsDir, model);
    try {
        const stats = readFileSync(path);
        console.log(`${model}: ${(stats.length / 1024 / 1024).toFixed(2)} MB`);
    } catch (e) {
        console.log(`${model}: NOT FOUND`);
    }
});

console.log('\n--- Run the app and check console for bone names ---');
