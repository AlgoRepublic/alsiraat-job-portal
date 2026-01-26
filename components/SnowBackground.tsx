
import React, { useEffect, useRef } from 'react';

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  opacity: number;
}

export const SnowBackground: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let snowflakes: Snowflake[] = [];

    const createSnowflakes = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      // Density: Reduced to ~1 flake per 15000 square pixels (fewer particles)
      const count = Math.floor((width * height) / 15000);
      snowflakes = [];

      for (let i = 0; i < count; i++) {
        snowflakes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          // Size: Smaller radius (0.5px to 2px)
          radius: Math.random() * 2.5 + 1.5,
          // Speed: Slightly slower for smaller particles
          speed: Math.random() * 0.8 + 0.2,
          drift: Math.random() * 2 - 1,
          // Opacity: Slightly lower for subtlety
          opacity: Math.random() * (isDarkMode ? 0.5 : 0.3) + 0.1
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Black particles in Light Mode, White in Dark Mode
      const color = isDarkMode ? '255, 255, 255' : '0, 0, 0';
      
      snowflakes.forEach((flake) => {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${flake.opacity})`;
        ctx.fill();

        // Update position
        flake.y += flake.speed;
        flake.x += Math.sin(flake.y / 50) * flake.drift;

        // Reset if off screen
        if (flake.y > canvas.height) {
          flake.y = -5;
          flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width) flake.x = 0;
        if (flake.x < 0) flake.x = canvas.width;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    createSnowflakes();
    animate();

    const handleResize = () => {
      createSnowflakes();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }} // Reduced global opacity slightly for better blend
    />
  );
};
