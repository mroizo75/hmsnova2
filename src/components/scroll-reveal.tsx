"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "fade";
}

export function ScrollReveal({ 
  children, 
  className, 
  delay = 0,
  direction = "up" 
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [delay]);

  const getDirectionClasses = () => {
    const base = "transition-all duration-1000 ease-out";
    
    if (!isVisible) {
      switch (direction) {
        case "up":
          return `${base} opacity-0 translate-y-12`;
        case "down":
          return `${base} opacity-0 -translate-y-12`;
        case "left":
          return `${base} opacity-0 translate-x-12`;
        case "right":
          return `${base} opacity-0 -translate-x-12`;
        case "fade":
          return `${base} opacity-0`;
        default:
          return `${base} opacity-0 translate-y-12`;
      }
    }
    
    return `${base} opacity-100 translate-y-0 translate-x-0`;
  };

  return (
    <div ref={ref} className={cn(getDirectionClasses(), className)}>
      {children}
    </div>
  );
}

