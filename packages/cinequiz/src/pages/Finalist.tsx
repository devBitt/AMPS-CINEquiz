import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '@/store/useStore';
import { PageTransition } from '@/components/PageTransition';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function Finalist() {
  const [, navigate] = useLocation();
  const { participant } = useStore();

  useEffect(() => {
    if (!participant) {
      navigate('/');
      return;
    }

    // Huge confetti explosion
    const duration = 15 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 40, spread: 360, ticks: 100, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 100 * (timeLeft / duration);
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
        colors: ['#F5C518', '#E50914', '#ffffff']
      });
    }, 250);
    
    return () => clearInterval(interval);
  }, [participant, navigate]);

  if (!participant) return null;

  return (
    <PageTransition className="bg-gradient-to-br from-[#F5C518]/20 via-[#0A0A0F] to-[#E50914]/20">
      {/* Rotating spotlight effect */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(245, 197, 24, 0.2) 60deg, transparent 120deg)'
        }}
      />

      <div className="z-10 flex flex-col items-center justify-center text-center p-6 h-full w-full max-w-lg">
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-8xl md:text-9xl mb-8 drop-shadow-[0_0_30px_rgba(245,197,24,0.8)]"
        >
          🏆
        </motion.div>
        
        <h1 className="text-6xl md:text-7xl font-display text-secondary text-shadow-gold mb-4 tracking-widest leading-none">
          YOU ARE A FINALIST!
        </h1>
        
        <div className="bg-white/10 backdrop-blur-md border border-secondary/30 py-6 px-10 rounded-2xl mb-8 mt-6">
          <span className="block text-sm text-secondary/80 uppercase tracking-widest mb-2 font-semibold">
            Roll Number
          </span>
          <span className="text-4xl md:text-5xl font-mono font-bold text-white tracking-wider">
            {participant.rollNumber}
          </span>
        </div>
        
        <p className="text-xl text-white font-medium bg-primary/20 border border-primary/50 py-4 px-8 rounded-full shadow-[0_0_20px_rgba(229,9,20,0.3)]">
          Proceed to the stage for Round 5
        </p>
      </div>
    </PageTransition>
  );
}
