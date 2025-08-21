import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, CheckCircle } from 'lucide-react';

const AIDeviceDetection = ({ onDetectionResult, isOpen, onClose }) => {
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectedDevice, setDetectedDevice] = useState(null);
    const [predictions, setPredictions] = useState([]);
    const [error, setError] = useState(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const modelRef = useRef(null);
    const webcamRef = useRef(null);
    const intervalRef = useRef(null);

    // Teachable Machine model URL
    const MODEL_URL = "https://teachablemachine.withgoogle.com/models/n4lIjJ8Cb/";

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (webcamRef.current) {
            webcamRef.current.stop();
            webcamRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsDetecting(false);
        setPredictions([]);
    }, []);

    const cleanup = useCallback(() => {
        stopCamera();
        setDetectedDevice(null);
        setError(null);
        setPredictions([]);
    }, [stopCamera]);

    const loadScript = useCallback((src) => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }, []);

    const loadModel = useCallback(async () => {
        try {
            setError(null);
            console.log('Loading Teachable Machine model...');
            
            // Load TensorFlow.js and Teachable Machine libraries
            if (!window.tf) {
                await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js');
            }
            if (!window.tmImage) {
                await loadScript('https://cdn.jsdelivr.net/npm/@teachablemachine/image@latest/dist/teachablemachine-image.min.js');
            }

            const modelURL = MODEL_URL + "model.json";
            const metadataURL = MODEL_URL + "metadata.json";

            modelRef.current = await window.tmImage.load(modelURL, metadataURL);
            setIsModelLoaded(true);
            console.log('Model loaded successfully');
        } catch (err) {
            console.error('Error loading model:', err);
            setError('Failed to load AI model. Please check your internet connection.');
        }
    }, [loadScript]);

    useEffect(() => {
        if (isOpen) {
            loadModel();
        } else {
            cleanup();
        }

        return () => cleanup();
    }, [isOpen, loadModel, cleanup]);

    const startPrediction = useCallback(() => {
        if (!modelRef.current || !webcamRef.current) return;

        const predict = async () => {
            try {
                webcamRef.current.update();
                const prediction = await modelRef.current.predict(webcamRef.current.canvas);
                
                // Sort predictions by probability
                const sortedPredictions = prediction
                    .sort((a, b) => b.probability - a.probability)
                    .map(p => ({
                        className: p.className,
                        probability: Math.round(p.probability * 100)
                    }));

                setPredictions(sortedPredictions);

                // Auto-select if confidence is high enough (>70%)
                const topPrediction = sortedPredictions[0];
                if (topPrediction && topPrediction.probability > 70) {
                    setDetectedDevice(topPrediction);
                }
            } catch (err) {
                console.error('Prediction error:', err);
            }
        };

        intervalRef.current = setInterval(predict, 100);
    }, []);

    const startCamera = async () => {
        try {
            setError(null);
            setIsDetecting(true);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            // Setup webcam for Teachable Machine
            const flip = true;
            webcamRef.current = new window.tmImage.Webcam(320, 320, flip);
            await webcamRef.current.setup();
            await webcamRef.current.play();

            // Start prediction loop
            startPrediction();
        } catch (err) {
            console.error('Camera access error:', err);
            setError('Could not access camera. Please check permissions.');
            setIsDetecting(false);
        }
    };

    const confirmDetection = () => {
        if (detectedDevice) {
            // Map detected device class to your device types
            const deviceTypeMapping = {
                'laptop': 'Laptop',
                'desktop': 'Desktop', 
                'monitor': 'Monitor',
                'printer': 'Printer',
                'tablet': 'Tablet',
                'smartphone': 'Smartphone',
                'camera': 'Camera',
                'router': 'Router',
                // Add more mappings based on your Teachable Machine classes
            };

            const mappedDeviceType = deviceTypeMapping[detectedDevice.className.toLowerCase()] || 'Other';
            
            onDetectionResult({
                device_type: mappedDeviceType,
                detected_class: detectedDevice.className,
                confidence: detectedDevice.probability,
                auto_detected: true
            });
            
            onClose();
        }
    };

    const retryDetection = () => {
        setDetectedDevice(null);
        setPredictions([]);
        setError(null);
        if (!isDetecting) {
            startCamera();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">AI Device Detection</h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {!isModelLoaded ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading AI model...</p>
                        </div>
                    ) : (
                        <>
                            {/* Camera View */}
                            <div className="relative mb-4">
                                <video
                                    ref={videoRef}
                                    className="w-full h-64 bg-gray-200 rounded-lg object-cover"
                                    autoPlay
                                    muted
                                    playsInline
                                />
                                
                                {!isDetecting && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 rounded-lg">
                                        <button
                                            onClick={startCamera}
                                            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center gap-2"
                                        >
                                            <Camera size={20} />
                                            Start Detection
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Predictions */}
                            {predictions.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="font-medium text-gray-700 mb-2">Detected Objects:</h4>
                                    <div className="space-y-2">
                                        {predictions.slice(0, 3).map((pred, index) => (
                                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                <span className="text-sm font-medium">{pred.className}</span>
                                                <span className="text-sm text-gray-600">{pred.probability}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Detection Result */}
                            {detectedDevice && (
                                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle size={20} className="text-green-600" />
                                        <span className="font-medium text-green-800">Device Detected!</span>
                                    </div>
                                    <p className="text-sm text-green-700">
                                        <strong>{detectedDevice.className}</strong> ({detectedDevice.probability}% confidence)
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                {detectedDevice ? (
                                    <>
                                        <button
                                            onClick={confirmDetection}
                                            ref={(el) => {
                                                if (el) {
                                                    el.style.setProperty('background-color', '#16A34A', 'important');
                                                    el.style.setProperty('color', '#FFFFFF', 'important');
                                                    el.style.setProperty('border', '2px solid #16A34A', 'important');
                                                    el.style.setProperty('padding', '12px 20px', 'important');
                                                    el.style.setProperty('border-radius', '8px', 'important');
                                                    el.style.setProperty('font-weight', '600', 'important');
                                                    el.style.setProperty('font-size', '14px', 'important');
                                                    el.style.setProperty('box-shadow', '0 4px 12px rgba(22, 163, 74, 0.3)', 'important');
                                                    el.style.setProperty('cursor', 'pointer', 'important');
                                                }
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.setProperty('background-color', '#15803D', 'important');
                                                e.target.style.setProperty('border-color', '#15803D', 'important');
                                                e.target.style.setProperty('transform', 'translateY(-2px)', 'important');
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.setProperty('background-color', '#16A34A', 'important');
                                                e.target.style.setProperty('border-color', '#16A34A', 'important');
                                                e.target.style.setProperty('transform', 'translateY(0px)', 'important');
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={18} style={{color: '#FFFFFF !important'}} />
                                            <span style={{color: '#FFFFFF !important'}}>Use This Detection</span>
                                        </button>
                                        <button
                                            onClick={retryDetection}
                                            ref={(el) => {
                                                if (el) {
                                                    el.style.setProperty('background-color', '#059669', 'important');
                                                    el.style.setProperty('color', '#FFFFFF', 'important');
                                                    el.style.setProperty('border', '2px solid #059669', 'important');
                                                    el.style.setProperty('padding', '12px 20px', 'important');
                                                    el.style.setProperty('border-radius', '8px', 'important');
                                                    el.style.setProperty('font-weight', '600', 'important');
                                                    el.style.setProperty('font-size', '14px', 'important');
                                                    el.style.setProperty('box-shadow', '0 4px 12px rgba(5, 150, 105, 0.3)', 'important');
                                                    el.style.setProperty('cursor', 'pointer', 'important');
                                                }
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.setProperty('background-color', '#047857', 'important');
                                                e.target.style.setProperty('border-color', '#047857', 'important');
                                                e.target.style.setProperty('transform', 'translateY(-2px)', 'important');
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.setProperty('background-color', '#059669', 'important');
                                                e.target.style.setProperty('border-color', '#059669', 'important');
                                                e.target.style.setProperty('transform', 'translateY(0px)', 'important');
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw size={18} style={{color: '#FFFFFF !important'}} />
                                            <span style={{color: '#FFFFFF !important'}}>Try Again</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {isDetecting && (
                                            <button
                                                onClick={stopCamera}
                                                ref={(el) => {
                                                    if (el) {
                                                        el.style.setProperty('background-color', '#DC2626', 'important');
                                                        el.style.setProperty('color', '#FFFFFF', 'important');
                                                        el.style.setProperty('border', '2px solid #DC2626', 'important');
                                                        el.style.setProperty('padding', '12px 20px', 'important');
                                                        el.style.setProperty('border-radius', '8px', 'important');
                                                        el.style.setProperty('font-weight', '600', 'important');
                                                        el.style.setProperty('font-size', '14px', 'important');
                                                        el.style.setProperty('box-shadow', '0 4px 12px rgba(220, 38, 38, 0.3)', 'important');
                                                        el.style.setProperty('cursor', 'pointer', 'important');
                                                    }
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.setProperty('background-color', '#B91C1C', 'important');
                                                    e.target.style.setProperty('border-color', '#B91C1C', 'important');
                                                    e.target.style.setProperty('transform', 'translateY(-2px)', 'important');
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.setProperty('background-color', '#DC2626', 'important');
                                                    e.target.style.setProperty('border-color', '#DC2626', 'important');
                                                    e.target.style.setProperty('transform', 'translateY(0px)', 'important');
                                                }}
                                                className="flex-1"
                                            >
                                                <span style={{color: '#FFFFFF !important'}}>Stop Camera</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={onClose}
                                            ref={(el) => {
                                                if (el) {
                                                    el.style.setProperty('background-color', '#059669', 'important');
                                                    el.style.setProperty('color', '#FFFFFF', 'important');
                                                    el.style.setProperty('border', '2px solid #059669', 'important');
                                                    el.style.setProperty('padding', '12px 20px', 'important');
                                                    el.style.setProperty('border-radius', '8px', 'important');
                                                    el.style.setProperty('font-weight', '600', 'important');
                                                    el.style.setProperty('font-size', '14px', 'important');
                                                    el.style.setProperty('box-shadow', '0 4px 12px rgba(5, 150, 105, 0.3)', 'important');
                                                    el.style.setProperty('cursor', 'pointer', 'important');
                                                }
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.setProperty('background-color', '#047857', 'important');
                                                e.target.style.setProperty('border-color', '#047857', 'important');
                                                e.target.style.setProperty('transform', 'translateY(-2px)', 'important');
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.setProperty('background-color', '#059669', 'important');
                                                e.target.style.setProperty('border-color', '#059669', 'important');
                                                e.target.style.setProperty('transform', 'translateY(0px)', 'important');
                                            }}
                                            className="flex-1"
                                        >
                                            <span style={{color: '#FFFFFF !important'}}>Cancel</span>
                                        </button>
                                    </>
                                )}
                            </div>

                            {isDetecting && (
                                <p className="text-xs text-gray-500 text-center mt-3">
                                    Point your camera at the device. Detection will happen automatically.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIDeviceDetection;