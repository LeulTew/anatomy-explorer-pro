import React from 'react';

const GestureGuide: React.FC = () => {
    return (
        <div className="glass-dark animate-fade-in" style={{
            position: 'absolute',
            top: 20,
            right: 20,
            padding: '15px 20px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            pointerEvents: 'none',
            zIndex: 100
        }}>
            <h3 style={{
                margin: '0 0 10px 0',
                fontSize: '0.8rem',
                color: '#888',
                letterSpacing: '1px',
                textTransform: 'uppercase'
            }}>
                Gesture Controls
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Rotate - Fist */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 24, height: 24,
                        background: '#00f7ff',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#000', fontSize: '0.7rem', fontWeight: 'bold'
                    }}>
                        ✊
                    </div>
                    <div>
                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Rotate</div>
                        <div style={{ color: '#aaa', fontSize: '0.75rem' }}>Fist + Move Left/Right</div>
                    </div>
                </div>

                {/* Left Chest - Left Hand Open */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 24, height: 24,
                        background: '#ff6b9d',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#000', fontSize: '0.7rem', fontWeight: 'bold'
                    }}>
                        🤚
                    </div>
                    <div>
                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Left Chest</div>
                        <div style={{ color: '#aaa', fontSize: '0.75rem' }}>Left Hand Open</div>
                    </div>
                </div>

                {/* Right Chest - Right Hand Open */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 24, height: 24,
                        background: '#ff6b9d',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#000', fontSize: '0.7rem', fontWeight: 'bold'
                    }}>
                        ✋
                    </div>
                    <div>
                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Right Chest</div>
                        <div style={{ color: '#aaa', fontSize: '0.75rem' }}>Right Hand Open</div>
                    </div>
                </div>

                {/* Zoom - Two Hands */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 24, height: 24,
                        background: '#a855f7',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#000', fontSize: '0.7rem', fontWeight: 'bold'
                    }}>
                        👐
                    </div>
                    <div>
                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>Zoom</div>
                        <div style={{ color: '#aaa', fontSize: '0.75rem' }}>Two Hands Apart/Together</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GestureGuide;
