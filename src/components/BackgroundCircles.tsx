import { useState, useEffect } from 'react';

export default function BackgroundCircles() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div
        className="absolute w-[700px] h-[700px] rounded-full transition-transform duration-300 ease-out"
        style={{
          background: '#39CCCC',
          opacity: 0.2,
          top: '-160px',
          right: '-160px',
          transform: `translate(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px)`,
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full transition-transform duration-300 ease-out"
        style={{
          background: '#5EBC67',
          opacity: 0.15,
          bottom: '0px',
          left: '-128px',
          transform: `translate(${-mousePosition.x * 0.02}px, ${-mousePosition.y * 0.02}px)`,
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute w-[900px] h-[900px] rounded-full transition-transform duration-300 ease-out"
        style={{
          background: '#152232',
          opacity: 0.1,
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${mousePosition.x * 0.01}px), calc(-50% + ${mousePosition.y * 0.01}px))`,
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}
