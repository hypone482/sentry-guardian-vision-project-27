
import { toast } from 'sonner';

export interface Target {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  locked?: boolean;
}

export const detectMotion = (prevFrame: ImageData, currentFrame: ImageData, sensitivity: number): Target[] => {
  try {
    if (!prevFrame || !currentFrame || 
        prevFrame.width !== currentFrame.width || 
        prevFrame.height !== currentFrame.height) {
      return [];
    }

    const width = prevFrame.width;
    const height = prevFrame.height;
    const threshold = 30 * (sensitivity / 100);
    const blocks: { x: number, y: number, diff: number }[] = [];
    const blockSize = 10;

    // Sample pixels at intervals to reduce processing
    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        let totalDiff = 0;
        const idx = (y * width + x) * 4;
        
        // Calculate difference for RGB values at this pixel
        const rDiff = Math.abs(prevFrame.data[idx] - currentFrame.data[idx]);
        const gDiff = Math.abs(prevFrame.data[idx + 1] - currentFrame.data[idx + 1]);
        const bDiff = Math.abs(prevFrame.data[idx + 2] - currentFrame.data[idx + 2]);
        
        totalDiff = (rDiff + gDiff + bDiff) / 3;
        
        if (totalDiff > threshold) {
          blocks.push({
            x: (x / width) * 100,
            y: (y / height) * 100,
            diff: totalDiff
          });
        }
      }
    }

    return groupIntoTargets(blocks, width, height);
  } catch (error) {
    console.error("Motion detection error:", error);
    return [];
  }
};

export const groupIntoTargets = (blocks: { x: number, y: number, diff: number }[], width: number, height: number): Target[] => {
  if (blocks.length === 0) return [];
  
  // Group nearby motion blocks into targets
  const targets: Target[] = [];
  const visited = new Set<number>();
  
  for (let i = 0; i < blocks.length; i++) {
    if (visited.has(i)) continue;
    
    const current = blocks[i];
    const cluster: typeof blocks = [current];
    visited.add(i);
    
    // Find all blocks close to this one
    for (let j = 0; j < blocks.length; j++) {
      if (i === j || visited.has(j)) continue;
      
      const other = blocks[j];
      const distance = Math.sqrt(
        Math.pow(current.x - other.x, 2) + 
        Math.pow(current.y - other.y, 2)
      );
      
      if (distance < 15) {
        cluster.push(other);
        visited.add(j);
      }
    }
    
    if (cluster.length >= 2) {
      // Calculate bounding box
      let minX = 100, minY = 100, maxX = 0, maxY = 0;
      let totalConfidence = 0;
      
      cluster.forEach(block => {
        minX = Math.min(minX, block.x);
        minY = Math.min(minY, block.y);
        maxX = Math.max(maxX, block.x);
        maxY = Math.max(maxY, block.y);
        totalConfidence += block.diff;
      });
      
      const avgConfidence = (totalConfidence / cluster.length) * (cluster.length / 10);
      
      // Add some padding
      const targetWidth = Math.max(5, maxX - minX + 5);
      const targetHeight = Math.max(5, maxY - minY + 5);
      
      targets.push({
        id: Date.now() + targets.length,
        x: minX + targetWidth / 2,
        y: minY + targetHeight / 2,
        width: targetWidth,
        height: targetHeight,
        confidence: Math.min(100, avgConfidence)
      });
    }
  }
  
  // Sort by confidence (highest first)
  return targets.sort((a, b) => b.confidence - a.confidence);
};

export const simulateMotionDetection = (
  active: boolean,
  sensitivity: number,
  setTimestamp: (date: Date) => void,
  setTargets: (targets: Target[]) => void,
  setTargetLocked: (locked: boolean) => void,
  setCurrentCoordinates: (coords: {x: number, y: number}) => void,
  onMotionDetected: (targets: Target[]) => void
) => {
  if (!active) return;
  
  const interval = setInterval(() => {
    setTimestamp(new Date());
    
    if (Math.random() < sensitivity / 100) {
      const newTargets: Target[] = [];
      const targetCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < targetCount; i++) {
        const x = Math.random() * 80 + 10;
        const y = Math.random() * 80 + 10;
        const locked = i === 0 && Math.random() > 0.7;
        
        if (locked) {
          setTargetLocked(true);
          setCurrentCoordinates({ x, y });
        }
        
        newTargets.push({
          id: Date.now() + i,
          x,
          y,
          width: Math.random() * 20 + 5,
          height: Math.random() * 20 + 5,
          confidence: Math.random() * 50 + 50,
          locked
        });
      }
      
      setTargets(newTargets);
      onMotionDetected(newTargets);
    } else if (Math.random() > 0.7) {
      setTargets([]);
      setTargetLocked(false);
    }
  }, 500);

  return () => clearInterval(interval);
};
