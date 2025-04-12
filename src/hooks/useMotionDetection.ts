
import { useState, useRef, useEffect } from 'react';
import { Target, detectMotion } from '@/utils/motionDetection';
import { toast } from 'sonner';

interface UseMotionDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  sensitivity: number;
  active: boolean;
  webcamActive: boolean;
  onMotionDetected: (targets: Target[]) => void;
}

export const useMotionDetection = ({
  videoRef,
  sensitivity, 
  active,
  webcamActive,
  onMotionDetected
}: UseMotionDetectionProps) => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [timestamp, setTimestamp] = useState(new Date());
  const [targetLocked, setTargetLocked] = useState(false);
  const [currentCoordinates, setCurrentCoordinates] = useState({ x: 50, y: 50 });
  const [detectionActive, setDetectionActive] = useState(false);
  
  const detectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const processVideoFrames = () => {
    const video = videoRef.current;
    const canvas = detectionCanvasRef.current;
    
    if (!video || !canvas || !webcamActive) return;
    
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setTimeout(processVideoFrames, 100);
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const analyzeFrame = () => {
      setTimestamp(new Date());
      
      if (video.videoWidth === 0 || video.videoHeight === 0 || !webcamActive) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height);
        
        if (prevFrameRef.current) {
          const motionTargets = detectMotion(prevFrameRef.current, currentFrame, sensitivity);
          
          if (motionTargets.length > 0) {
            setTargets(motionTargets);
            onMotionDetected(motionTargets);
            
            const shouldLock = Math.random() < (sensitivity / 200);
            
            if (shouldLock && motionTargets.length > 0 && !targetLocked) {
              const targetIndex = Math.floor(Math.random() * motionTargets.length);
              const target = motionTargets[targetIndex];
              
              setTargetLocked(true);
              setCurrentCoordinates({ x: target.x, y: target.y });
              
              motionTargets[targetIndex] = { ...target, locked: true };
              setTargets(motionTargets);
            }
          }
        }
        
        prevFrameRef.current = currentFrame;
      } catch (error) {
        console.error("Error processing video frame:", error);
      }
      
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    };
    
    analyzeFrame();
  };

  useEffect(() => {
    if (webcamActive && active) {
      setDetectionActive(true);
      
      const processingTimer = setTimeout(() => {
        processVideoFrames();
        
        toast.success("Detection Active", {
          description: `Sensitivity set to ${sensitivity}%`
        });
      }, 1000); // 1 second delay to ensure video loads
      
      return () => clearTimeout(processingTimer);
    } else {
      setDetectionActive(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [webcamActive, active, sensitivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  return {
    targets,
    timestamp,
    targetLocked,
    currentCoordinates,
    detectionActive,
    detectionCanvasRef,
    setTargets,
    setTimestamp,
    setTargetLocked,
    setCurrentCoordinates
  };
};
