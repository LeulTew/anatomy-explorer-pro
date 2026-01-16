import React, { useEffect, useRef, useState } from 'react';
import Scene3D from './components/Scene3D';
import HandController from './components/HandController';
import { useStore } from './store/useStore';
import { GestureRecognizer } from './logic/GestureRecognizer';
import { ANATOMY_DATA, MOVEMENT_TYPES, type MuscleGroup } from './data/anatomy';

// --- Gesture Logic ---
const GestureManager: React.FC = () => {
    const leftHand = useStore(state => state.leftHand);
    const rightHand = useStore(state => state.rightHand);
    const zoomFactor = useStore(state => state.zoomFactor);
    const setZoomFactor = useStore(state => state.setZoomFactor);
    const setGesture = useStore(state => state.setGesture);
    const setRotationDelta = useStore(state => state.setRotationDelta);

    const prevRightCentroid = useRef<{ x: number, y: number } | null>(null);
    const prevDist = useRef<number | null>(null);

    useEffect(() => {
        let currentGesture: 'IDLE' | 'ROTATE' | 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN' = 'IDLE';

        if (leftHand && rightHand) {
            // Two hands = Zoom
            const dist = GestureRecognizer.calculateDistance(leftHand.centroid, rightHand.centroid);
            if (prevDist.current !== null) {
                const delta = dist - prevDist.current;
                if (Math.abs(delta) > 0.005) {
                    currentGesture = delta > 0 ? 'ZOOM_IN' : 'ZOOM_OUT';
                    let newZoom = zoomFactor * (1 + delta * 2);
                    newZoom = Math.max(0.5, Math.min(newZoom, 5));
                    setZoomFactor(newZoom);
                }
            }
            prevDist.current = dist;
        } else {
            prevDist.current = null;
        }

        if (currentGesture === 'IDLE' && rightHand && rightHand.isGrabbing) {
            // Right Fist = Rotate
            currentGesture = 'ROTATE';
            const current = rightHand.centroid;
            if (prevRightCentroid.current) {
                const deltaX = current.x - prevRightCentroid.current.x;
                const deltaY = current.y - prevRightCentroid.current.y;
                setRotationDelta({ x: deltaX, y: deltaY });
            }
            prevRightCentroid.current = current;
        } else {
            if (rightHand) { prevRightCentroid.current = rightHand.centroid; }
            else { prevRightCentroid.current = null; }

            if (currentGesture === 'IDLE') {
                setRotationDelta({ x: 0, y: 0 });
            }
        }
        setGesture(currentGesture);
    }, [leftHand, rightHand, zoomFactor, setGesture, setRotationDelta, setZoomFactor]);

    // Reset on unmount
    useEffect(() => {
        return () => { setGesture('IDLE'); setRotationDelta({ x: 0, y: 0 }); };
    }, [setGesture, setRotationDelta]);

    return null;
};

// --- Info Panel ---
const InfoPanel: React.FC = () => {
    const isOpen = useStore(s => s.isInfoPanelOpen);
    const setOpen = useStore(s => s.setInfoPanelOpen);
    const activeMuscle = useStore(s => s.activeMuscleGroup);

    if (!activeMuscle) return null;

    const info = ANATOMY_DATA[activeMuscle];

    return (
        <div className="glass" style={{ pointerEvents: 'auto', marginTop: 15, borderRadius: '16px', overflow: 'hidden', maxWidth: '320px', borderLeft: '4px solid #00f7ff' }}>
            <div
                onClick={() => setOpen(!isOpen)}
                style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <div style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '1px' }}>{info.name.toUpperCase()}</div>
                <div style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '0.7rem' }}>▼</div>
            </div>

            {isOpen && (
                <div style={{ padding: '0 20px 20px 20px' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: 12, lineHeight: 1.4 }}>{info.description}</div>

                    <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700, marginBottom: 4 }}>ACTION</div>
                    <div style={{ fontSize: '0.8rem', marginBottom: 12 }}>{info.action}</div>

                    <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700, marginBottom: 4 }}>EXERCISES</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {info.exercises.map(ex => (
                            <span key={ex} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>{ex}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
    const {
        isModelLoaded, gesture, isCameraActive, setCameraActive,
        activeMuscleGroup, setActiveMuscleGroup,
        currentMovement, setCurrentMovement,
        movementIntensity, setMovementIntensity,
        showSkeleton, setShowSkeleton
    } = useStore();

    const [muscleMenuOpen, setMuscleMenuOpen] = useState(false);

    return (
        <>
            <GestureManager />
            <Scene3D />
            <HandController />

            {/* Loading Overlay */}
            {!isModelLoaded && (
                <div className="glass-dark" style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000, color: 'white', background: 'rgba(0,0,0,0.95)' }}>
                    <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 40 }}>
                        <div style={{ position: 'absolute', inset: 0, border: '4px solid #00f7ff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s infinite linear' }} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', letterSpacing: '4px', fontWeight: 300 }}>INITIALIZING PRO SIMULATION</h2>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* Main UI */}
            <div className="animate-slide-up" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px', background: 'linear-gradient(to right, #ffffff, #00f7ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            ANATOMY EXPLORER <span style={{ fontSize: '1rem', verticalAlign: 'super', color: '#ffea00', WebkitTextFillColor: '#ffea00' }}>PRO</span>
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5 }}>
                            <span style={{ fontSize: '0.7rem', background: '#ff0000', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>16+</span>
                            <span style={{ fontSize: '0.6rem', opacity: 0.6, letterSpacing: '1px' }}>SCIENTIFIC VISUALIZATION // LICENSED</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        {/* Status Bar */}
                        <div className="glass" style={{ pointerEvents: 'auto', padding: '8px 16px', borderRadius: '100px', display: 'flex', gap: 15, alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.5rem', opacity: 0.4, letterSpacing: '1px' }}>GESTURE</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: gesture === 'IDLE' ? '#fff' : '#00f7ff' }}>{gesture}</div>
                            </div>
                            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
                            <button className={`btn-premium ${isCameraActive ? 'btn-active' : ''}`} onClick={() => setCameraActive(!isCameraActive)}>
                                {isCameraActive ? 'SENSORS ON' : 'SENSORS OFF'}
                            </button>
                        </div>

                        <InfoPanel />
                    </div>
                </header>

                {/* Main Controls - Left Side */}
                <main style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>

                    {/* Muscle Selector */}
                    <div style={{ position: 'relative' }}>
                        <button
                            className="btn-premium"
                            style={{ minWidth: 200, justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
                            onClick={() => setMuscleMenuOpen(!muscleMenuOpen)}
                        >
                            <span>{activeMuscleGroup ? activeMuscleGroup.toUpperCase() : 'SELECT REGION'}</span>
                            <span>▼</span>
                        </button>

                        {muscleMenuOpen && (
                            <div className="glass-vibrant" style={{ position: 'absolute', top: '100%', left: 0, marginTop: 10, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                                <div
                                    className="dropdown-item"
                                    style={{ padding: '12px', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.8 }}
                                    onClick={() => { setActiveMuscleGroup(null); setMuscleMenuOpen(false); }}
                                >
                                    CLEAR SELECTION
                                </div>
                                {Object.keys(ANATOMY_DATA).map(key => (
                                    <div
                                        key={key}
                                        className="dropdown-item"
                                        style={{ padding: '12px', fontSize: '0.8rem', cursor: 'pointer', background: activeMuscleGroup === key ? 'rgba(0,247,255,0.1)' : 'transparent' }}
                                        onClick={() => { setActiveMuscleGroup(key as MuscleGroup); setMuscleMenuOpen(false); useStore.getState().setInfoPanelOpen(true); }}
                                    >
                                        {(key as string).toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Movement Controls */}
                    <div className="glass" style={{ padding: '20px', borderRadius: '16px', width: 250 }}>
                        <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 700, marginBottom: 10, letterSpacing: '1px' }}>DYNAMICS</div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                            {MOVEMENT_TYPES.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setCurrentMovement(type)}
                                    style={{
                                        flex: '1 1 40%',
                                        padding: '8px',
                                        fontSize: '0.7rem',
                                        background: currentMovement === type ? '#00f7ff' : 'rgba(255,255,255,0.05)',
                                        color: currentMovement === type ? '#000' : '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {type.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 700, marginBottom: 8, letterSpacing: '1px' }}>INTENSITY: {(movementIntensity * 100).toFixed(0)}%</div>
                        <input
                            type="range"
                            min="0" max="1" step="0.05"
                            value={movementIntensity}
                            onChange={(e) => setMovementIntensity(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#00f7ff' }}
                        />
                    </div>

                    {/* Toggles */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={() => setShowSkeleton(!showSkeleton)}
                            className="btn-premium"
                            style={{ background: showSkeleton ? 'rgba(0,247,255,0.2)' : 'rgba(0,0,0,0.5)' }}
                        >
                            {showSkeleton ? 'HIDE SKELETON' : 'SHOW SKELETON'}
                        </button>
                    </div>

                </main>

                <footer style={{ textAlign: 'right', opacity: 0.3, fontSize: '0.6rem' }}>
                    CONFIDENTIAL // INTERNAL USE ONLY
                </footer>
            </div>

            <style>{`
                .btn-premium {
                    background: rgba(0,0,0,0.6);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    transition: all 0.2s;
                    backdrop-filter: blur(10px);
                }
                .btn-premium:hover {
                    border-color: #00f7ff;
                    box-shadow: 0 0 15px rgba(0,247,255,0.1);
                }
                .btn-active {
                    background: rgba(0,247,255,0.1);
                    border-color: rgba(0,247,255,0.5);
                    color: #00f7ff;
                }
                .glass {
                    background: rgba(0,0,0,0.5);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .glass-vibrant {
                    background: rgba(10,10,15,0.9);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(0,247,255,0.2);
                }
                .dropdown-item:hover {
                    background: rgba(255,255,255,0.1) !important;
                }
            `}</style>
        </>
    );
};

export default App;
