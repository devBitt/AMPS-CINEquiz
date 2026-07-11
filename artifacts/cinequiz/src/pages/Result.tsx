import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '@/store/useStore';
import { PageTransition } from '@/components/PageTransition';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function Result() {
  const [, navigate] = useLocation();
  const { participant, isQualified, participantCount } = useStore();

  useEffect(() => {
    if (!participant) {
      navigate('/');
      return undefined;
    }
    
    if (isQualified === true) {
      // Fire confetti
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults, particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#00C853', '#ffffff', '#F5C518']
        });
        confetti({
          ...defaults, particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#00C853', '#ffffff', '#F5C518']
        });
      }, 250);
      
      return () => clearInterval(interval);
    }
    return undefined;
  }, [participant, isQualified, navigate]);

  if (!participant) return null;

  if (isQualified === null) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center space-y-6">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
          />
          <h2 className="text-xl text-muted-foreground font-mono animate-pulse">Calculating results...</h2>
        </div>
      </PageTransition>
    );
  }

  if (isQualified) {
    return (
      <PageTransition className="bg-gradient-to-b from-[#0A0A0F] to-[#0A1F10]">
        <div className="z-10 flex flex-col items-center text-center p-6 max-w-lg w-full">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(0,200,83,0.5)]">
              <span className="text-5xl text-white">✓</span>
            </div>
          </motion.div>
          
          <h1 className="text-5xl md:text-6xl font-display text-white mb-4 tracking-widest text-shadow-glow">
            YOU QUALIFIED!
          </h1>
          
          <div className="glass-card p-6 rounded-xl mb-12 border-green-500/30 bg-green-500/10 w-full">
            <p className="text-green-100 font-medium text-lg mb-2">Round passed successfully.</p>
            <p className="text-green-100/60 text-sm">Stay on this screen.</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm uppercase tracking-widest">Waiting for next round</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-mono text-white">{participantCount} qualifiers ready</span>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="bg-gradient-to-b from-[#0A0A0F] to-[#1A0505]">
      <div className="z-10 flex flex-col items-center text-center p-6 max-w-lg w-full">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8"
        >
          <div className="w-24 h-24 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto opacity-50">
            <span className="text-4xl text-red-500">✕</span>
          </div>
        </motion.div>
        
        <h1 className="text-5xl font-display text-red-500 mb-4 tracking-widest">
          ELIMINATED
        </h1>
        
        <p className="text-muted-foreground text-lg mb-12">
          Your answer was incorrect or too slow.
        </p>
        
        <div className="glass-card p-6 rounded-xl border-red-500/20 bg-red-500/5 w-full">
          <p className="text-white/80 font-medium mb-1">Thanks for playing!</p>
          <p className="text-white/50 text-sm">Watch the big screen to see who advances.</p>
        </div>
      </div>
    </PageTransition>
  );
}
