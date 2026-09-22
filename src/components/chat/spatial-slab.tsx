"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export function SpatialSlab({
  children,
  className,
  variant = "user",
  isStreaming = false,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "user" | "assistant";
  isStreaming?: boolean;
}) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const rotateX = (centerY - mouseY) / 20; // Adjust sensitivity
    const rotateY = (mouseX - centerX) / 20;

    setRotation({ x: rotateX, y: rotateY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setRotation({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "spatial-slab",
        variant === "assistant" && "neural-shimmer",
        className
      )}
      style={{
        transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateZ(20px)`,
        transition: "transform 0.1s ease-out",
      }}
    >
      {children}
    </div>
  );
}
