
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface UseWebcamOptions {
  active: boolean;
  onError?: (error: string) => void;
}

export const useWebcam = ({ active, onError }: UseWebcamOptions) => {
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const initWebcam = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser doesn't support webcam access");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setWebcamActive(true);
        setWebcamError(null);
        toast.success("Camera Connected", {
          description: "Webcam access successful"
        });
      }
    } catch (error) {
      console.error("Webcam access error:", error);
      const errorMessage = (error as Error).message || "Failed to access webcam";
      setWebcamError(errorMessage);
      setWebcamActive(false);
      
      if (onError) {
        onError(errorMessage);
      }
      
      toast.error("Camera Error", {
        description: errorMessage
      });
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setWebcamActive(false);
  };

  useEffect(() => {
    if (active) {
      initWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [active]);

  return {
    webcamActive,
    webcamError,
    videoRef,
    streamRef
  };
};
