
import { useEffect, useRef } from 'react';

export const useAmbientEffects = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCount = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          for (let i = 0; i < 500; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2;
            const alpha = Math.random() * 0.1;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(x, y, size, size);
          }
          
          const scanLinePos = (frameCount.current % 100) / 100 * canvas.height;
          ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
          ctx.fillRect(0, scanLinePos, canvas.width, 2);
          
          frameCount.current++;
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return canvasRef;
};
