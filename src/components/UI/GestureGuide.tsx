import React from 'react';

const GestureGuide: React.FC = () => {
    return (
        <div className="glass-dark animate-fade-in gesture-guide" style={{
            position: 'absolute',
            top: 100,
            right: 20,
            padding: '15px 20px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            pointerEvents: 'none',
            zIndex: 100,
            maxWidth: 200
        }}>
            <h3 style={{
                margin: '0 0 10px 0',
                fontSize: '0.75rem',
                color: '#888',
                letterSpacing: '1px',
                textTransform: 'uppercase'
            }}>
                Gesture Controls
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Rotate - Fist */}
                <div className="gesture-guide-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="gesture-guide-icon" style={{
                        width: 22, height: 22,
                        background: '#00f7ff',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#000', fontSize: '0.65rem', fontWeight: 'bold',
                        flexShrink: 0
                    }}>
                        ✊
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div className="gesture-guide-text" style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Rotate</div>
                        <div className="gesture-guide-desc" style={{ color: '#aaa', fontSize: '0.7rem' }}>Fist + Left/Right</div>
                    </div>
                </div>

                {/* Left Chest */}
                <div className="gesture-guide-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="gesture-guide-icon" style={{
                        width: 22, height: 22,
                        background: '#ff6b9d',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#000', fontSize: '0.65rem', fontWeight: 'bold',
                        flexShrink: 0
                    }}>
                        🤚
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div className="gesture-guide-text" style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Left</div>
                        <div className="gesture-guide-desc" style={{ color: '#aaa', fontSize: '0.7rem' }}>Left Hand Open</div>
                    </div>
                </div>

                {/* Right Chest */}
                <div className="gesture-guide-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="gesture-guide-icon" style={{
                        width: 22, height: 22,
                        background: '#ff6b9d',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#000', fontSize: '0.65rem', fontWeight: 'bold',
                        flexShrink: 0
                    }}>
                        ✋
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div className="gesture-guide-text" style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Right</div>
                        <div className="gesture-guide-desc" style={{ color: '#aaa', fontSize: '0.7rem' }}>Right Hand Open</div>
                    </div>
                </div>

                {/* Zoom */}
                <div className="gesture-guide-item" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="gesture-guide-icon" style={{
                        width: 22, height: 22,
                        background: '#a855f7',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#000', fontSize: '0.65rem', fontWeight: 'bold',
                        flexShrink: 0
                    }}>
                        👐
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div className="gesture-guide-text" style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>Zoom</div>
                        <div className="gesture-guide-desc" style={{ color: '#aaa', fontSize: '0.7rem' }}>Two Hands</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GestureGuide;
