'use client';

import React, { useRef, useState, useCallback } from 'react';

interface TactileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTilt?: number; // max tilt degrees (default 4deg for subtle tactile feel)
  className?: string;
  enableGlow?: boolean;
}

export function TactileCard({
  children,
  maxTilt = 3.5,
  className = '',
  enableGlow = true,
  ...props
}: TactileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>('');
  const [glowPosition, setGlowPosition] = useState<{ x: number; y: number; opacity: number }>({
    x: 0,
    y: 0,
    opacity: 0,
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Subtle tilt: rotateX and rotateY within maxTilt
      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      setTransformStyle(
        `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(2px)`
      );

      if (enableGlow) {
        setGlowPosition({ x, y, opacity: 1 });
      }
    },
    [maxTilt, enableGlow]
  );

  const handleMouseLeave = useCallback(() => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
    setGlowPosition((prev) => ({ ...prev, opacity: 0 }));
  }, []);

  return (
    <div
      ref={cardRef}
      className={`tactile-card-wrapper ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: transformStyle ? 'transform 120ms cubic-bezier(0.2, 0, 0, 1)' : 'transform 350ms ease',
      }}
      {...props}
    >
      {enableGlow && (
        <div
          className="tactile-cursor-reflection"
          style={{
            transform: `translate3d(${glowPosition.x - 120}px, ${glowPosition.y - 120}px, 0)`,
            opacity: glowPosition.opacity,
          }}
          aria-hidden="true"
        />
      )}
      <div className="tactile-card-inner">{children}</div>
    </div>
  );
}

export function TactileBadge({
  children,
  className = '',
  variant = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'accent' | 'mono';
}) {
  return (
    <span className={`tactile-badge tactile-badge-${variant} ${className}`}>
      {children}
    </span>
  );
}
