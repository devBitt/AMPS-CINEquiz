import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '@/store/useStore';
import { PageTransition } from '@/components/PageTransition';
import { motion } from 'framer-motion';

function OdometerCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  
  useEffect(() => {
    if (value !== display) {
      // simple animation loop
      const diff = value - display;
      const step = Math.max(1, Math.floor(Math.abs(diff) / 10));
      const direction = diff > 0 ? 1 : -1;
      
      const timer = setTimeout(() => {
        setDisplay(prev => {
          const next = prev + (step * direction);
          if ((direction > 0 && next >= value) || (direction < 0 && next <= value)) {
            return value;
          }
          return next;
        });
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [value, display]);

  return <span className="font-mono tabular-nums">{display}</span>;
}

export default function Waiting() {
  const [, navigate] = useLocation();
  const { participant, participantCount, currentRound } = useStore();

  useEffect(() => {
    if (!participant) {
      navigate('/');
      return;
    }

    if (currentRound) {
      navigate('/round');
      return;
    }

    // Prevent back navigation
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [participant, currentRound, navigate]);

  if (!participant) return null;

  return (
    <PageTransition>
      <div className="z-10 flex flex-col items-center justify-center text-center p-6 w-full max-w-lg">
        <h1 className="text-4xl md:text-5xl font-display text-secondary text-shadow-gold mb-8 tracking-wide">
          YOU'RE IN! 🎬
        </h1>
        
        <div className="glass-card px-8 py-4 rounded-xl mb-12 flex flex-col items-center shadow-lg border-primary/20">
          <span className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Roll Number</span>
          <span className="text-2xl font-mono font-bold tracking-widest text-white">{participant.rollNumber}</span>
        </div>

        <div className="flex space-x-2 mb-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-primary rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
        
        <p className="text-lg text-gray-300 font-medium mb-12">
          Waiting for the host to start...
        </p>

        <div className="flex flex-col items-center justify-center">
          <div className="text-6xl font-display text-white mb-2">
            <OdometerCount value={participantCount} />
          </div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">
            Participants Ready
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
