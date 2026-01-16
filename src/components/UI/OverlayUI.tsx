import React from 'react';
import { useStore } from '../../store/useStore';
import { MOVEMENT_TYPES } from '../../data/anatomy';

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

const ControlPanel: React.FC = () => {
    const {
        currentMovement, setCurrentMovement,
        movementIntensity, setMovementIntensity,
        setRotationDelta
    } = useStore();

    return (
        <div className="glass" style={{
            position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
            padding: '20px 30px', borderRadius: '24px', display: 'flex', gap: 40, alignItems: 'center',
            zIndex: 100
        }}>
            {/* Animation Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '1px', fontWeight: 700 }}>ANIMATION CONTROL</div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {MOVEMENT_TYPES.map(type => (
                        <button
                            key={type}
                            onClick={() => setCurrentMovement(type)}
                            style={{
                                background: currentMovement === type ? '#00f7ff' : 'rgba(255,255,255,0.1)',
                                color: currentMovement === type ? '#000' : '#fff',
                                border: 'none', padding: '8px 16px', borderRadius: '100px',
                                fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700,
                                transition: 'all 0.2s'
                            }}
                        >
                            {type.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} />

            {/* View Angle / Intensity */}
            <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '1px', fontWeight: 700 }}>INTENSITY</div>
                    <input
                        type="range" min="0" max="1" step="0.1"
                        value={movementIntensity}
                        onChange={(e) => setMovementIntensity(parseFloat(e.target.value))}
                        style={{ width: 100, accentColor: '#00f7ff' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '1px', fontWeight: 700 }}>VIEW ANGLE</div>
                    <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => setRotationDelta({ x: -100, y: 0 })} className="mini-btn">L</button>
                        <button onClick={() => setRotationDelta({ x: 0, y: 0 })} className="mini-btn">C</button>
                        <button onClick={() => setRotationDelta({ x: 100, y: 0 })} className="mini-btn">R</button>
                    </div>
                </div>
            </div>

            <style>{`
                .mini-btn {
                    background: rgba(255,255,255,0.1); border: none; color: white;
                    width: 24px; height: 24px; borderRadius: 4px; cursor: pointer;
                    font-size: 0.6rem;
                }
                .mini-btn:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </div>
    );
};

const OverlayUI: React.FC = () => {
    const isVerified = useStore(state => state.isVerified);

    return (
        <>
            {!isVerified && <SubscriptionOverlay />}
            {isVerified && <ControlPanel />}
        </>
    );
};

export default OverlayUI;
