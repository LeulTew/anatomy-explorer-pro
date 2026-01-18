import React from 'react';
import { useStore } from '../../store/useStore';
import { AVAILABLE_MODELS } from '../AnatomyModel';
import GestureGuide from './GestureGuide';

// --- Components ---

const SubscriptionOverlay: React.FC = () => {
    const setVerified = useStore(state => state.setVerified);

    return (
        <div className="age-gate-overlay">
            <div className="age-gate-container">
                <h1 className="age-gate-title">RESTRICTED ACCESS</h1>
                <p style={{ color: '#aaa', marginBottom: 25, fontSize: 'clamp(0.85rem, 3vw, 1rem)' }}>
                    This application contains high-fidelity anatomical simulations intended for professional and educational use.
                </p>

                <div className="age-gate-warning">
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
                className="custom-select"
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
        <div className="studio-controls animate-slide-up">
            {/* Model Selector */}
            <ModelSelector />

            <div className="studio-controls-divider" style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />

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
