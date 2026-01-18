import React, { useState } from 'react';

const GestureGuide: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`glass-dark animate-fade-in gesture-guide ${isOpen ? 'is-open' : 'is-collapsed'}`}>
            <div className="gesture-guide-header" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="gesture-guide-title" style={{ margin: 0 }}>
                    Gesture Controls
                </h3>
                <div className="gesture-guide-toggle">
                    {isOpen ? '✕' : '?'}
                </div>
            </div>

            {isOpen && (
                <div className="gesture-guide-list animate-slide-up" style={{ marginTop: 15 }}>
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
            )}
        </div>
    );
};

export default GestureGuide;
