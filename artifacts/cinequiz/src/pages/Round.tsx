import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '@/store/useStore';
import { PageTransition } from '@/components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import socket from '@/socket/socket';

export default function Round() {
  const [, navigate] = useLocation();
  const { participant, currentRound, timerRemaining, timerTotal, hasSubmitted, submittedAnswer, setSubmitted } = useStore();
  const [answer, setAnswer] = useState('');
  
  useEffect(() => {
    if (!participant) {
      navigate('/');
    }
  }, [participant, navigate]);

  if (!currentRound || !participant) return null;

  const isTimeUp = timerRemaining <= 0;
  const isInputDisabled = hasSubmitted || isTimeUp;
  
  // Timer visual math
  const progress = timerTotal > 0 ? (timerRemaining / timerTotal) : 0;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;
  
  // Color shifting logic
  let timerColor = '#00C853'; // Success green
  let glowColor = 'rgba(0, 200, 83, 0.5)';
  
  if (progress <= 0.25) {
    timerColor = '#D50000'; // Danger red
    glowColor = 'rgba(213, 0, 0, 0.8)';
  } else if (progress <= 0.5) {
    timerColor = '#F5C518'; // IMDb gold
    glowColor = 'rgba(245, 197, 24, 0.5)';
  }

  const isPulsing = progress > 0 && timerRemaining <= 5000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInputDisabled || !answer.trim()) return;
    
    setSubmitted(answer.trim());
    
    socket.emit('submit_answer', {
      sessionToken: participant.sessionToken,
      roundId: currentRound.id,
      answer: answer.trim(),
      clientTimestamp: Date.now()
    });
  };

  // Splitting emojis for staggered animation
  const emojis = Array.from(new Intl.Segmenter().segment(currentRound.emojiClue)).map(x => x.segment);

  return (
    <PageTransition>
      <div className="w-full h-full flex flex-col p-4 md:p-8 max-w-2xl mx-auto">
        
        <div className="flex-1 flex flex-col items-center pt-8">
          <h2 className="text-2xl font-display text-muted-foreground tracking-widest mb-8">
            ROUND {currentRound.roundNumber}
          </h2>

          {/* Circular Timer */}
          <div className="relative mb-12">
            <div className={`relative ${isPulsing ? 'animate-pulse' : ''}`} style={{ filter: `drop-shadow(0 0 10px ${glowColor})` }}>
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke={timerColor}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-linear"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-mono font-bold" style={{ color: timerColor }}>
                {Math.ceil(timerRemaining / 1000)}
              </span>
            </div>
          </div>

          {/* Emoji Clue */}
          <div className="flex justify-center flex-wrap gap-2 mb-16 min-h-[120px]">
            <AnimatePresence>
              {emojis.map((emoji, i) => (
                <motion.span
                  key={`${currentRound.id}-${i}`}
                  initial={{ scale: 0, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: i * 0.15
                  }}
                  className="text-7xl md:text-8xl drop-shadow-xl"
                >
                  {emoji}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {/* Answer Form */}
          <div className="w-full mt-auto mb-8">
            <AnimatePresence mode="wait">
              {hasSubmitted ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card border-green-500/30 p-6 rounded-xl text-center space-y-2 bg-green-500/10"
                >
                  <div className="text-green-400 font-bold text-xl flex items-center justify-center gap-2">
                    <span className="text-2xl">✓</span> Answer submitted!
                  </div>
                  <p className="text-muted-foreground font-mono text-sm break-all">
                    "{submittedAnswer}"
                  </p>
                </motion.div>
              ) : isTimeUp ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card border-red-500/30 p-6 rounded-xl text-center space-y-2 bg-red-500/10"
                >
                  <div className="text-red-400 font-display tracking-widest text-2xl">
                    TIME'S UP
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Waiting for results...
                  </p>
                </motion.div>
              ) : (
                <motion.form 
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <Input
                    type="text"
                    placeholder="Type the movie name..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="h-16 text-lg text-center bg-card/80 border-white/10 focus-visible:ring-primary focus-visible:border-primary rounded-xl font-medium"
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  <Button 
                    type="submit" 
                    disabled={!answer.trim()}
                    className="w-full h-14 text-lg font-display tracking-widest bg-white text-black hover:bg-gray-200 rounded-xl"
                  >
                    SUBMIT ANSWER
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
