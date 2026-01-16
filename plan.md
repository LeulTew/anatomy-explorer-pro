# Project Plan: Anatomy Explorer Pro

## 1. Executive Summary
Build an interactive 3D human anatomy visualization tool where users manipulate anatomical models using hand gestures via webcam. The goal is to provide a high-fidelity, "mature" educational platform for biology students and professionals (16+).

**Core Technology:**
- **Runtime:** Bun (for speed)
- **Framework:** React + Vite
- **3D Engine:** Three.js + @react-three/fiber + @react-three/drei
- **Hand Tracking:** MediaPipe Hands (Google)
- **State Management:** Zustand (for high-frequency interactions)

---

## 2. Technical Architecture

### 2.1 File Structure
```
anatomy-explorer-pro/
├── .github/
├── public/
│   ├── models/ (GLTF/GLB files)
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── HandController.tsx  (MediaPipe logic)
│   │   ├── Scene3D.tsx         (Three.js Canvas)
│   │   ├── AnatomyModel.tsx    (Rigged Human Body)
│   │   └── UI/                 (Overlay interface)
│   ├── logic/
│   │   ├── GestureRecognizer.ts
│   │   └── CameraControl.ts
│   ├── store/
│   │   └── useStore.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 2.2 Core Components

#### `AnatomyModel.tsx`
- Loads the rigged female 3D model.
- Implements physics-based animations (breathing, muscle flex).
- Handles specific body part highlighting and interaction.

#### `HandController.tsx` & `GestureRecognizer.ts`
- Tracks hands for navigation (Rotate, Zoom).
- Maps specific gestures to toggling layers (Skin, Muscle, Skeleton).

#### `OverlayUI.tsx`
- Controls for animation speed, instructional overlays, and "Mature Content" warning/acceptance.

---

## 3. Features & UX

### 3.1 Interaction Model
| User Action | Hand Gesture | System Response |
| :--- | :--- | :--- |
| **Rotate View** | Closed Fist + Move | Rotates the anatomy model |
| **Zoom** | Pinch (Two Hands) + Move Apart | Zooms camera |
| **Breathe Anim** | Open Palm + Up/Down | Controls breathing intensity |
| **Layer Toggle** | Index Point + Tap | Toggles visualisation layers |

### 3.2 Visuals
- **High-Fidelity Rendering:** Realistic skin shaders, subsurface scattering.
- **Dynamic Lighting:** Studio setup to emphasize muscle definition.

---

## 4. Implementation Steps

1.  **Refactor:** Rename project and clean up chemistry assets.
2.  **Model:** Integrate placeholder or real rigged anatomy mesh.
3.  **Animation:** Implement procedural breathing animation using morph targets or bone manipulation.
4.  **UI:** Add subscription/age-gate UI components.
5.  **Polish:** Tune hand tracking for subtle control.

---

## 5. Risks & Mitigations
- **Issue:** High polygon count performance.
  - *Fix:* Use LOD (Level of Detail) models and Draco compression.
- **Issue:** Privacy concerns with webcam.
  - *Fix:* Explicit permissions and purely client-side processing.
