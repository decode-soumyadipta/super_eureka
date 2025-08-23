import { useState, useRef } from "react";
// No import for tesseract.js; use CDN and window.Tesseract
import { X, Camera, RefreshCw } from "lucide-react";
// Use window.Tesseract only

const BarcodeOCRModal = ({ isOpen, onClose, onOCRResult }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [ocrText, setOcrText] = useState("");
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const startCamera = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (err) {
            setError("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const loadTesseract = async () => {
        if (window.Tesseract) return;
        await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/tesseract.min.js";
            script.onload = resolve;
            script.onerror = () => {
                setError("Failed to load OCR engine. Please check your internet connection.");
                reject();
            };
            document.head.appendChild(script);
        });
    };

    const captureAndProcess = async () => {
        setIsProcessing(true);
        setError(null);
        if (!videoRef.current || !canvasRef.current) {
            setError("Camera not ready.");
            setIsProcessing(false);
            return;
        }
        const ctx = canvasRef.current.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const imageData = canvasRef.current.toDataURL("image/png");
        try {
            await loadTesseract();
            if (!window.Tesseract) throw new Error("OCR engine not loaded");
            const result = await window.Tesseract.recognize(imageData, "eng", { logger: m => {} });
            let text = result.data && result.data.text ? result.data.text : "";
            setOcrText(text);
            if (onOCRResult) {
                onOCRResult(text);
            }
        } catch (err) {
            setError("OCR failed. Try again or retake the image. " + (err.message || ""));
        }
        setIsProcessing(false);
        stopCamera();
    };

    const handleClose = () => {
        stopCamera();
        setOcrText("");
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Scan Device Label/Barcode</h3>
                        <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                    {error && <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">{error}</div>}
                    <div className="mb-4">
                        <video ref={videoRef} width={320} height={240} className="w-full bg-gray-200 rounded-lg object-cover" autoPlay muted playsInline />
                        <canvas ref={canvasRef} width={320} height={240} style={{ display: "none" }} />
                    </div>
                    <div className="flex gap-3 mb-4">
                        <button onClick={startCamera} className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center gap-2">
                            <Camera size={20} /> Start Camera
                        </button>
                        <button onClick={captureAndProcess} disabled={isProcessing} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center gap-2">
                            <RefreshCw size={20} /> {isProcessing ? "Processing..." : "Scan & Extract"}
                        </button>
                    </div>
                    {ocrText && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">Extracted Text: <strong>{ocrText}</strong></div>}
                </div>
            </div>
        </div>
    );
};

export default BarcodeOCRModal;
