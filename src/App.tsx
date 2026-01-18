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
                <div className="glass-dark loading-overlay" style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000, color: 'white', background: 'rgba(0,0,0,0.95)', padding: 20 }}>
                    <div className="loading-spinner" />
                    <h2 style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', letterSpacing: '2px', fontWeight: 300, textAlign: 'center' }}>INITIALIZING SIMULATION</h2>
                </div>
            )}

            {/* Main UI */}
            <div className="animate-slide-up app-container">

                {/* Header */}
                <header className="app-header">
                    <div style={{ minWidth: 0 }}>
                        <h1 className="app-header-title">
                            ANATOMY EXPLORER <span style={{ fontSize: '0.5em', verticalAlign: 'super', color: '#ffea00', WebkitTextFillColor: '#ffea00' }}>PRO</span>
                        </h1>
                        <div className="app-header-subtitle">
                            <span style={{ fontSize: '0.65rem', background: '#ff0000', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>16+</span>
                            <span style={{ fontSize: '0.55rem', opacity: 0.6, letterSpacing: '1px' }}>SCIENTIFIC VISUALIZATION</span>
                        </div>
                    </div>

                    <div className="status-bar glass">
                        <div className="gesture-indicator">
                            <div className="gesture-label">GESTURE</div>
                            <div className="gesture-value" style={{ color: gesture === 'IDLE' ? '#fff' : '#00f7ff' }}>{gesture}</div>
                        </div>
                        <div className="gesture-indicator" style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
                        <button className={`btn-premium ${isCameraActive ? 'btn-active' : ''}`} onClick={() => setCameraActive(!isCameraActive)}>
                            {isCameraActive ? 'CAM ON' : 'CAM OFF'}
                        </button>
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
        </>
    );
};

export default App;
