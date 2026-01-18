import React from 'react';
import { useStore } from '../../store/useStore';
import { AVAILABLE_MODELS } from '../AnatomyModel';
import GestureGuide from './GestureGuide';

// --- Components ---

const SubscriptionOverlay: React.FC = () => {
    const setVerified = useStore(state => state.setVerified);

    return (
        <div className="glass-dark" style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)',
            padding: 20
        }}>
            <div className="age-gate-container" style={{ maxWidth: 500, textAlign: 'center', padding: 30, border: '1px solid #333', borderRadius: 12 }}>
                <h1 className="age-gate-title" style={{ color: '#00f7ff', fontSize: 'clamp(1.3rem, 5vw, 2rem)', marginBottom: 10, letterSpacing: '2px' }}>RESTRICTED ACCESS</h1>
                <p style={{ color: '#aaa', marginBottom: 25, fontSize: 'clamp(0.85rem, 3vw, 1rem)' }}>
                    This application contains high-fidelity anatomical simulations intended for professional and educational use.
                </p>

                <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', padding: 12, marginBottom: 25, borderRadius: 4 }}>
                    <strong style={{ color: '#ff4444', display: 'block', marginBottom: 5, fontSize: '0.9rem' }}>AGE VERIFICATION REQUIRED</strong>
                    <span style={{ fontSize: '0.85rem', color: '#ddd' }}>You must be 16 years or older to access this content.</span>
                </div>

                <div style={{ display: 'flex', gap: 15, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        className="btn-premium"
                        onClick={() => window.location.href = 'https://google.com'}
                        style={{ border: '1px solid #444', background: 'transparent', opacity: 0.7, minWidth: 100 }}
                    >
                        EXIT
                    </button>
                    <button
                        className="btn-premium"
                        onClick={() => setVerified(true)}
                        style={{ background: '#00f7ff', color: '#000', fontWeight: 'bold', border: 'none', minWidth: 140 }}
                    >
                        I AM 16+ / ENTER
                    </button>
                </div>
            </div>
        </div>
    );
};



const ModelSelector: React.FC = () => {
    const selectedModel = useStore(state => state.selectedModel);
    const setSelectedModel = useStore(state => state.setSelectedModel);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10
        }}>
            <span style={{
                fontSize: '0.65rem', color: '#888', letterSpacing: '1.5px', fontWeight: 600,
                textTransform: 'uppercase'
            }}>
                Model
            </span>
            <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: 120
                }}
            >
                {AVAILABLE_MODELS.map(model => (
                    <option key={model.id} value={model.id} style={{ background: '#111' }}>
                        {model.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

const StudioControls: React.FC = () => {
    const movementIntensity = useStore(state => state.movementIntensity);
    const setMovementIntensity = useStore(state => state.setMovementIntensity);
    const resetView = useStore(state => state.resetView);

    return (
        <div className="glass-dark animate-slide-up studio-controls" style={{
            position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
            padding: '12px 25px', borderRadius: '100px', display: 'flex', gap: 20, alignItems: 'center',
            zIndex: 100, border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)',
            maxWidth: 'calc(100vw - 40px)',
            flexWrap: 'wrap',
            justifyContent: 'center'
        }}>

            {/* Model Selector */}
            <ModelSelector />

            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />

            {/* Physics Intensity Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="studio-controls-label" style={{
                    fontSize: '0.65rem', color: '#888', letterSpacing: '1.5px', fontWeight: 600,
                    textTransform: 'uppercase'
                }}>
                    Physics
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.6rem', color: '#555' }}>Off</span>
                    <input
                        type="range" min="0" max="1" step="0.1"
                        value={movementIntensity}
                        onChange={(e) => setMovementIntensity(parseFloat(e.target.value))}
                        style={{ width: 80, accentColor: '#fff', height: 2, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.6rem', color: '#555' }}>Max</span>
                </div>
            </div>

            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />

            {/* Reset View Button */}
            <button
                onClick={() => resetView()}
                style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#ccc',
                    padding: '8px 14px', borderRadius: '100px', fontSize: '0.65rem', cursor: 'pointer',
                    transition: 'all 0.2s', letterSpacing: '0.5px', whiteSpace: 'nowrap'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#fff'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
            >
                RESET
            </button>
        </div>
    );
};

const OverlayUI: React.FC = () => {
    const isVerified = useStore(state => state.isVerified);

    return (
        <>
            {!isVerified && <SubscriptionOverlay />}
            {isVerified && (
                <>
                    <GestureGuide />
                    <StudioControls />
                </>
            )}
        </>
    );
};

export default OverlayUI;
