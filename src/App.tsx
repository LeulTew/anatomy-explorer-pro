import Scene3D from './components/Scene3D';
import HandController from './components/HandController';
import { useStore } from './store/useStore';
import OverlayUI from './components/UI/OverlayUI';

const App: React.FC = () => {
    const isModelLoaded = useStore(state => state.isModelLoaded);
    const isCameraActive = useStore(state => state.isCameraActive);
    const setCameraActive = useStore(state => state.setCameraActive);
    const gesture = useStore(state => state.gesture);

    return (
        <>
            <Scene3D />
            <HandController />

            {/* Loading Overlay */}
            {!isModelLoaded && (
                <div className="glass-dark" style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000, color: 'white', background: 'rgba(0,0,0,0.95)', padding: 20 }}>
                    <div style={{ position: 'relative', width: 60, height: 60, marginBottom: 30 }}>
                        <div style={{ position: 'absolute', inset: 0, border: '3px solid #00f7ff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s infinite linear' }} />
                    </div>
                    <h2 style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', letterSpacing: '2px', fontWeight: 300, textAlign: 'center' }}>INITIALIZING SIMULATION</h2>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* Main UI */}
            <div className="animate-slide-up app-container" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                        <h1 className="app-header-title" style={{ margin: 0, fontSize: 'clamp(1.3rem, 5vw, 2.5rem)', fontWeight: 800, letterSpacing: '-1px', background: 'linear-gradient(to right, #ffffff, #00f7ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>
                            ANATOMY EXPLORER <span style={{ fontSize: '0.5em', verticalAlign: 'super', color: '#ffea00', WebkitTextFillColor: '#ffea00' }}>PRO</span>
                        </h1>
                        <div className="app-header-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.65rem', background: '#ff0000', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>16+</span>
                            <span style={{ fontSize: '0.55rem', opacity: 0.6, letterSpacing: '1px' }}>SCIENTIFIC VISUALIZATION</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                        {/* Status Bar */}
                        <div className="glass status-bar" style={{ pointerEvents: 'auto', padding: '8px 16px', borderRadius: '100px', display: 'flex', gap: 15, alignItems: 'center' }}>
                            <div className="gesture-indicator" style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.5rem', opacity: 0.4, letterSpacing: '1px' }}>GESTURE</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: gesture === 'IDLE' ? '#fff' : '#00f7ff' }}>{gesture}</div>
                            </div>
                            <div className="gesture-indicator" style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
                            <button className={`btn-premium ${isCameraActive ? 'btn-active' : ''}`} onClick={() => setCameraActive(!isCameraActive)}>
                                {isCameraActive ? 'CAM ON' : 'CAM OFF'}
                            </button>
                        </div>
                    </div>
                </header>

                <main style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
                    {/* Placeholder for future controls */}
                </main>

                <footer style={{ textAlign: 'right', opacity: 0.3, fontSize: '0.55rem' }}>
                    CONFIDENTIAL // INTERNAL USE
                </footer>
            </div>

            <OverlayUI />

            <style>{`
                .btn-premium {
                    background: rgba(0,0,0,0.6);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    padding: 10px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    transition: all 0.2s;
                    backdrop-filter: blur(10px);
                    font-size: 0.7rem;
                    white-space: nowrap;
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
                
                @media (max-width: 480px) {
                    .gesture-indicator { display: none; }
                }
            `}</style>
        </>
    );
};

export default App;
