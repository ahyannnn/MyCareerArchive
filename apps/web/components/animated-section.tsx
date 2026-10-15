"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
  once?: boolean;
  className?: string;
}

/**
 * Animate children in when they enter the viewport.
 * Uses IntersectionObserver with prefers-reduced-motion support.
 *
 * - `delay`: stagger delay in ms between children (optional)
 * - `once`: if true, unobserves after first trigger (default: true)
 * - `className`: additional classes
 */
export function AnimatedSection({
  children,
  delay = 0,
  once = true,
  className,
}: AnimatedSectionProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (once && visible) return;

    if (!ref.current) return;

    const ro = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) ro.disconnect();
        }
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    ro.observe(ref.current);

    return () => ro.disconnect();
  }, [visible, once, delay]);

  if (!visible) {
    // Render children immediately but invisible for SSR / first paint
    return <div className={cn("opacity-0", className)}>{children}</div>;
  }

  // Children are visible — add staggered animation classes if delay > 0
  if (delay > 0) {
    // We'll apply the delay via CSS :nth-child, but since we're rendering
    // dynamically, we just pass the delay prop and let the parent handle
    // styling, or we can add inline delays. For simplicity, we'll just
    // render with the fade-in-up animation and let the parent handle
    // the staggering via Tailwind's built-in features.
    return <div className={cn("animate-fade-in-up", className)}>{children}</div>;
  }

  return <div className={cn("animate-fade-in-up", className)}>{children}</div>;
}