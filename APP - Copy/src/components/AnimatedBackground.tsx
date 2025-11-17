import React, { useEffect, useRef } from 'react';

const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particlesRef.current = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 10000);
      
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw particles
      particlesRef.current.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Wrap around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${particle.opacity})`;
        ctx.fill();
        
        // Draw connections
        particlesRef.current.slice(index + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });
      
      requestAnimationFrame(animate);
    };

    resizeCanvas();
    createParticles();
    animate();

    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <>
      {/* Animated Background */}
      <div className="fixed inset-0 animated-bg opacity-20"></div>
      
      {/* Cyber Grid */}
      <div className="fixed inset-0 cyber-grid opacity-30"></div>
      
      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: -1 }}
      />
      
      {/* Matrix Rain Effect */}
      <div className="matrix-rain">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-green-400 text-xs font-mono opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          >
            {Array.from({ length: 20 }).map((_, j) => (
              <div key={j} className="opacity-0 animate-pulse">
                {String.fromCharCode(0x30A0 + Math.random() * 96)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

export default AnimatedBackground;

