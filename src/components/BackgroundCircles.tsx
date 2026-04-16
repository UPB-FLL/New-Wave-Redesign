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
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 10, top: 0, left: 0, right: 0, bottom: 0 }}>
      <div
        className="absolute w-[800px] h-[800px] rounded-full transition-transform duration-300 ease-out"
        style={{
          background: 'radial-gradient(circle, #39CCCC 0%, transparent 70%)',
          opacity: 0.35,
          top: '-200px',
          right: '-200px',
          transform: `translate(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px)`,
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full transition-transform duration-300 ease-out"
        style={{
          background: 'radial-gradient(circle, #5EBC67 0%, transparent 70%)',
          opacity: 0.3,
          bottom: '-100px',
          left: '-150px',
          transform: `translate(${-mousePosition.x * 0.02}px, ${-mousePosition.y * 0.02}px)`,
        }}
      />
      <div
        className="absolute w-[1000px] h-[1000px] rounded-full transition-transform duration-300 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(21,34,50,0.8) 0%, transparent 70%)',
          opacity: 0.2,
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${mousePosition.x * 0.01}px), calc(-50% + ${mousePosition.y * 0.01}px))`,
        }}
      />
    </div>
  );
}
