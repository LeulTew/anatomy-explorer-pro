import React from 'react';
import { useStore } from '../../store/useStore';


// --- Components ---

const SubscriptionOverlay: React.FC = () => {
    const setVerified = useStore(state => state.setVerified);

    return (
        <div className="glass-dark" style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)'
        }}>
            <div style={{ maxWidth: 500, textAlign: 'center', padding: 40, border: '1px solid #333' }}>
                <h1 style={{ color: '#00f7ff', fontSize: '2rem', marginBottom: 10, letterSpacing: '2px' }}>RESTRICTED ACCESS</h1>
                <p style={{ color: '#aaa', marginBottom: 30 }}>
                    This application contains high-fidelity anatomical simulations intended for professional and educational use.
                    Viewer discretion is advised.
                </p>

                <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', padding: 15, marginBottom: 30, borderRadius: 4 }}>
                    <strong style={{ color: '#ff4444', display: 'block', marginBottom: 5 }}>AGE VERIFICATION REQUIRED</strong>
                    <span style={{ fontSize: '0.9rem', color: '#ddd' }}>You must be 16 years or older to access this content.</span>
                </div>

                <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
                    <button
                        className="btn-premium"
                        onClick={() => window.location.href = 'https://google.com'} // Exit
                        style={{ border: '1px solid #444', background: 'transparent', opacity: 0.7 }}
                    >
                        EXIT
                    </button>
                    <button
                        className="btn-premium"
                        onClick={() => setVerified(true)}
                        style={{ background: '#00f7ff', color: '#000', fontWeight: 'bold', border: 'none' }}
                    >
                        I AM 16+ / ENTER
                    </button>
                </div>
            </div>
        </div>
    );
};

const StudioControls: React.FC = () => {
    const movementIntensity = useStore(state => state.movementIntensity);
    const setMovementIntensity = useStore(state => state.setMovementIntensity);
    const setRotationDelta = useStore(state => state.setRotationDelta);

    return (
        <div className="glass-dark animate-slide-up" style={{
            position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
            padding: '15px 30px', borderRadius: '100px', display: 'flex', gap: 30, alignItems: 'center',
            zIndex: 100, border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)'
        }}>

            {/* Dynamics / Physics Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <span style={{
                    fontSize: '0.7rem', color: '#888', letterSpacing: '1.5px', fontWeight: 600,
                    textTransform: 'uppercase'
                }}>
                    Dynamics
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.7rem', color: '#555' }}>Off</span>
                    <input
                        type="range" min="0" max="1" step="0.1"
                        value={movementIntensity}
                        onChange={(e) => setMovementIntensity(parseFloat(e.target.value))}
                        style={{ width: 100, accentColor: '#fff', height: 2, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#555' }}>Max</span>
                </div>
            </div>

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

            {/* System Actions */}
            <button
                onClick={() => setRotationDelta({ x: 0, y: 0 })}
                style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#ccc',
                    padding: '8px 16px', borderRadius: '100px', fontSize: '0.7rem', cursor: 'pointer',
                    transition: 'all 0.2s', letterSpacing: '0.5px'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#fff'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
            >
                RESET VIEW
            </button>
        </div>
    );
};

import GestureGuide from './GestureGuide';

// ... (existing code)

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
