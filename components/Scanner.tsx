import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { X, Camera, RefreshCw } from 'lucide-react';
import { QRCodePayload } from '../types';

interface ScannerProps {
  onScan: (payload: QRCodePayload) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const requestRef = useRef<number>(0);

  const scan = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          try {
            const payload = JSON.parse(code.data) as QRCodePayload;
            // Simple validation structure
            if (payload.eventId && payload.guestId) {
                onScan(payload);
                return; // Stop scanning on success
            }
          } catch (e) {
            // Not a valid JSON or not our QR
            console.debug("QR detected but invalid format", e);
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(scan);
  }, [onScan]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Required for iOS Safari
          videoRef.current.setAttribute("playsinline", "true"); 
          videoRef.current.play().catch(e => console.error("Play error:", e));
          setHasPermission(true);
          requestRef.current = requestAnimationFrame(scan);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Unable to access camera. Please ensure you have granted permissions.");
        setHasPermission(false);
      }
    };

    startCamera();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 z-10">
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white backdrop-blur-sm">
          <X size={24} />
        </button>
      </div>

      <div className="w-full max-w-md relative aspect-[3/4] bg-black rounded-lg overflow-hidden">
        {hasPermission === false ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
            <Camera size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Camera Access Required</p>
            <p className="text-sm opacity-70">{error}</p>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover" 
              muted 
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay */}
            <div className="absolute inset-0 border-[50px] border-black/50 flex items-center justify-center pointer-events-none">
               <div className="w-64 h-64 border-2 border-green-500 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 -mb-1 -mr-1"></div>
               </div>
            </div>
            <div className="absolute bottom-8 left-0 right-0 text-center text-white/80 text-sm font-medium">
              Align QR Code within the frame
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Scanner;