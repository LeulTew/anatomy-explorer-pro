import React from 'react';

const GestureGuide: React.FC = () => {
    return (
        <div className="glass-dark animate-fade-in gesture-guide">
            <h3 className="gesture-guide-title">
                Gesture Controls
            </h3>

            <div className="gesture-guide-list">
                {/* Rotate - Fist */}
                <div className="gesture-guide-item">
                    <div className="gesture-guide-icon" style={{ background: '#00f7ff' }}>
                        ✊
                    </div>
                    <div className="gesture-guide-content">
                        <div className="gesture-guide-text">Rotate</div>
                        <div className="gesture-guide-desc">Fist + Left/Right</div>
                    </div>
                </div>

                {/* Left Chest */}
                <div className="gesture-guide-item">
                    <div className="gesture-guide-icon" style={{ background: '#ff6b9d' }}>
                        🤚
                    </div>
                    <div className="gesture-guide-content">
                        <div className="gesture-guide-text">Left</div>
                        <div className="gesture-guide-desc">Left Hand Open</div>
                    </div>
                </div>

                {/* Right Chest */}
                <div className="gesture-guide-item">
                    <div className="gesture-guide-icon" style={{ background: '#ff6b9d' }}>
                        ✋
                    </div>
                    <div className="gesture-guide-content">
                        <div className="gesture-guide-text">Right</div>
                        <div className="gesture-guide-desc">Right Hand Open</div>
                    </div>
                </div>

                {/* Zoom */}
                <div className="gesture-guide-item">
                    <div className="gesture-guide-icon" style={{ background: '#a855f7' }}>
                        👐
                    </div>
                    <div className="gesture-guide-content">
                        <div className="gesture-guide-text">Zoom</div>
                        <div className="gesture-guide-desc">Two Hands</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GestureGuide;
