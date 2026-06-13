// File: src/components/passenger/AnimatedHero.jsx
// Townwize — Clean & Web-Safe Cinematic Hero Animation
// Uses lottie-web directly for maximum stability.

import { useEffect, useRef } from "react";
import lottie from "lottie-web";
import animationData from "../../assets/animations/townwizeHero.json";

// Frame segment definitions
const PICKUP_SEGMENT = [0, 90];
const JOURNEY_SEGMENT = [90, 210];
const REUNION_SEGMENT = [210, 300]; // loops

// Comprehensive fix function for path data
function fixPathData(animationData) {
    function fixPaths(obj, path = '') {
        if (!obj || typeof obj !== 'object') return;
        
        // Check if this is a path object with vertices
        if (obj.v && Array.isArray(obj.v)) {
            // This is a vertices array
            if (!obj.i || !obj.o) {
                // Create empty handles for each vertex
                obj.i = obj.v.map(() => [0, 0]);
                obj.o = obj.v.map(() => [0, 0]);
            }
        }
        
        // Check for nested k object with vertices
        if (obj.k && typeof obj.k === 'object') {
            if (obj.k.v && Array.isArray(obj.k.v)) {
                if (!obj.k.i || !obj.k.o) {
                    obj.k.i = obj.k.v.map(() => [0, 0]);
                    obj.k.o = obj.k.v.map(() => [0, 0]);
                }
            }
        }
        
        // Recursively check nested objects and arrays
        if (Array.isArray(obj)) {
            obj.forEach((item, index) => fixPaths(item, `${path}[${index}]`));
        } else {
            Object.entries(obj).forEach(([key, value]) => {
                if (value && typeof value === 'object') {
                    fixPaths(value, `${path}.${key}`);
                }
            });
        }
    }
    
    fixPaths(animationData);
    return animationData;
}

// Fix the animation data once
const fixedAnimationData = fixPathData(JSON.parse(JSON.stringify(animationData)));

const AnimatedHero = ({ dropoffSelected }) => {
  const containerRef = useRef(null);
  const animRef = useRef(null);

  // Load animation ONCE
  useEffect(() => {
    try {
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: fixedAnimationData // Use the fixed data
      });
      
      // Add error listener
      animRef.current.addEventListener('error', (error) => {
        console.error('Lottie animation error:', error);
      });
    } catch (error) {
      console.error('Error loading Lottie animation:', error);
    }

    return () => {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, []);

  // Play segments based on pickup/dropoff
  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;

    // === PICKUP PHASE ===
    if (!dropoffSelected) {
      anim.loop = false;
      anim.playSegments(PICKUP_SEGMENT, true);
      return;
    }

    // === JOURNEY PHASE ===
    anim.loop = false;
    anim.playSegments(JOURNEY_SEGMENT, true);

    // After Journey → Loop Reunion
    const fps = fixedAnimationData.fr || 60; // Use the fixed data
    const durationMs =
      ((JOURNEY_SEGMENT[1] - JOURNEY_SEGMENT[0]) / fps) * 1000;

    const timer = setTimeout(() => {
      anim.loop = true;
      anim.playSegments(REUNION_SEGMENT, true);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [dropoffSelected]);

  return (
    <div
      className="
        w-full flex items-center justify-center 
        rounded-xl overflow-hidden 
        hero-scale-in
        [height:var(--hero-form-height)]
      "
      style={{ pointerEvents: "none" }}
    >
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default AnimatedHero;