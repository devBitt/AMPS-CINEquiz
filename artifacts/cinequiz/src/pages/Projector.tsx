import React, { useEffect, useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import socket from '@/socket/socket';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

type ProjectorPhase = 'lobby' | 'round_intro' | 'countdown' | 'question' | 'results' | 'finalist_reveal';

export default function Projector() {
  const [phase, setPhase] = useState<ProjectorPhase>('lobby');
  const [participantCount, setParticipantCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [round, setRound] = useState<any>(null);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [finalists, setFinalists] = useState<Array<{id: string, rollNumber: string}>>([]);
  const [qualifierCount, setQualifierCount] = useState<number | null>(null);
  const [eliminatedCount, setEliminatedCount] = useState<number | null>(null);
  const [qualifiedRolls, setQualifiedRolls] = useState<string[]>([]);
  const [eliminatedRolls, setEliminatedRolls] = useState<string[]>([]);

  useEffect(() => {
    socket.connect();
    
    socket.emit('admin_join', { token: 'projector_display_only' }); // Using a dummy token for projector, server should allow read-only based on role or ignore

    const onCompetitionState = (data: any) => {
      setParticipantCount(data.participantCount || 0);
      if (data.currentRound) setRound(data.currentRound);
      
      if (data.phase === 'waiting') setPhase('lobby');
      else if (data.phase === 'round_active') setPhase('question');
      else if (data.phase === 'round_ended') {
        setPhase('results');
        if (data.stats) {
          setQualifierCount(data.stats.qualifiedCount);
          setEliminatedCount(data.stats.eliminatedCount);
          setQualifiedRolls(data.stats.qualifiedRolls || []);
          setEliminatedRolls(data.stats.eliminatedRolls || []);
        }
      }
    };

    const onParticipantCount = (count: number) => setParticipantCount(count);
    
    const onRoundStarted = (data: any) => {
      setRound(data.round);
      setPhase('round_intro');
      setSubmissionCount(0);
      setQualifierCount(null);
      setEliminatedCount(null);
      setQualifiedRolls([]);
      setEliminatedRolls([]);
      
      // Intro -> Countdown -> Question sequence
      setTimeout(() => setCountdown(3), 2000);
    };

    const onTimerTick = (data: { remaining: number; total: number }) => {
      setTimerRemaining(data.remaining);
      setTimerTotal(data.total);
    };

    const onSubmissionCount = (data: any) => setSubmissionCount(typeof data === 'number' ? data : data.submitted);
    
    const onRoundEnded = (data: any) => {
      setPhase('results');
      if (data && data.stats) {
        setQualifierCount(data.stats.qualifiedCount);
        setEliminatedCount(data.stats.eliminatedCount);
        setQualifiedRolls(data.stats.qualifiedRolls || []);
        setEliminatedRolls(data.stats.eliminatedRolls || []);
      }
    };

    const onQualificationSummary = (data: any) => {
      setQualifierCount(data.qualifiedCount);
      setEliminatedCount(data.eliminatedCount);
      setQualifiedRolls(data.qualifiedRolls || []);
      setEliminatedRolls(data.eliminatedRolls || []);
      setPhase('results');
    };
    
    const onFinalistReveal = (data: { finalists: Array<{id: string, rollNumber: string}> }) => {
      setFinalists(data.finalists);
      setPhase('finalist_reveal');
      
      // Big confetti for projector
      const duration = 15 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 60, spread: 360, ticks: 100, zIndex: 0 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 150 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 }, colors: ['#F5C518', '#E50914', '#ffffff'] });
      }, 250);
    };

    socket.on('competition_state', onCompetitionState);
    socket.on('participant_count', onParticipantCount);
    socket.on('round_started', onRoundStarted);
    socket.on('timer_tick', onTimerTick);
    socket.on('submission_count', onSubmissionCount);
    socket.on('round_ended', onRoundEnded);
    socket.on('qualification_summary', onQualificationSummary);
    socket.on('finalist_reveal', onFinalistReveal);

    return () => {
      socket.off('competition_state');
      socket.off('participant_count');
      socket.off('round_started');
      socket.off('timer_tick');
      socket.off('submission_count');
      socket.off('round_ended');
      socket.off('qualification_summary');
      socket.off('finalist_reveal');
    };
  }, []);


  // Handle countdown effect
  useEffect(() => {
    if (countdown !== null) {
      if (countdown > 0) {
        const t = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(t);
      } else {
        setPhase('question');
        setCountdown(null);
        return undefined;
      }
    }
    return undefined;
  }, [countdown]);

  const renderContent = () => {
    switch (phase) {
      case 'lobby':
        return (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <h1 className="font-display text-[120px] text-primary text-shadow-glow mb-12 tracking-wider">
              CineQuiz Live 🎬
            </h1>
            <div className="flex flex-col items-center bg-card/40 backdrop-blur-md p-12 rounded-3xl border border-white/10">
              <span className="text-[100px] font-mono font-bold text-secondary text-shadow-gold leading-none mb-4 tabular-nums">
                {participantCount}
              </span>
              <span className="text-3xl text-muted-foreground uppercase tracking-widest">
                Participants Connected
              </span>
            </div>
            <p className="absolute bottom-12 text-2xl text-muted-foreground animate-pulse">
              Waiting for host to start...
            </p>
          </motion.div>
        );

      case 'round_intro':
      case 'countdown':
        return (
          <div className="flex items-center justify-center h-full">
            <AnimatePresence mode="wait">
              {countdown === null ? (
                <motion.div
                  key="intro"
                  initial={{ y: -1000, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 100 }}
                  className="text-center"
                >
                  <h2 className="text-[150px] font-display text-white tracking-widest leading-none">
                    ROUND {round?.roundNumber}
                  </h2>
                  <p className="text-[60px] font-display text-primary tracking-widest mt-8 animate-pulse">
                    GET READY...
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`count-${countdown}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-[300px] font-display text-primary text-shadow-glow"
                >
                  {countdown === 0 ? "GO!" : countdown}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case 'question':
        const progress = timerTotal > 0 ? (timerRemaining / timerTotal) * 100 : 0;
        const emojis = round ? Array.from(new Intl.Segmenter().segment(round.emojiClue)).map(x => x.segment) : [];
        
        return (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="w-full h-full flex flex-col relative"
          >
            {/* Top Bar */}
            <div className="absolute top-12 left-12 right-12 flex justify-between items-center z-10">
              <div className="bg-card/50 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10">
                <span className="text-4xl font-display tracking-widest text-muted-foreground">ROUND {round?.roundNumber}</span>
              </div>
              <div className="bg-red-500/20 backdrop-blur-md px-8 py-4 rounded-2xl border border-red-500/50 flex items-center gap-4">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(229,9,20,0.8)]" />
                <span className="text-4xl font-display tracking-widest text-red-500">LIVE</span>
              </div>
            </div>

            {/* Center Clue */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex justify-center flex-wrap gap-8 max-w-[80vw]">
                <AnimatePresence>
                  {emojis.map((emoji, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", bounce: 0.5, delay: i * 0.2 }}
                      className="text-[15vw] drop-shadow-2xl leading-none"
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom Bar: Timer + Count */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-white/10">
              <motion.div 
                className="h-full bg-primary shadow-[0_0_20px_rgba(229,9,20,0.8)]"
                style={{ width: `${progress}%` }}
                animate={{ backgroundColor: progress < 25 ? '#D50000' : progress < 50 ? '#F5C518' : '#00C853' }}
              />
            </div>
            
            <div className="absolute bottom-12 right-12 text-right">
              <div className="text-[60px] font-mono font-bold text-white tabular-nums leading-none">
                {Math.ceil(timerRemaining / 1000)}s
              </div>
            </div>
            
            <div className="absolute bottom-12 left-12">
              <div className="bg-card/50 backdrop-blur-md px-6 py-3 rounded-xl border border-white/10 flex items-baseline gap-3">
                <span className="text-5xl font-mono text-white tabular-nums">{submissionCount}</span>
                <span className="text-2xl text-muted-foreground uppercase tracking-widest">/ {participantCount} ANSWERED</span>
              </div>
            </div>
          </motion.div>
        );

      case 'results':
        const isComputing = qualifierCount === null && eliminatedCount === null;

        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full flex flex-col p-12 overflow-hidden text-center justify-between"
          >
            <div>
              <motion.h2 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-[80px] font-display text-primary text-shadow-glow tracking-widest leading-none mb-2"
              >
                ROUND {round?.roundNumber} RESULTS
              </motion.h2>
              <p className="text-2xl text-muted-foreground uppercase tracking-widest">
                Qualification status for this round
              </p>
            </div>

            {isComputing ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-20 h-20 border-t-4 border-r-4 border-primary rounded-full animate-spin mb-8" />
                <span className="text-4xl text-white font-display tracking-wider animate-pulse">
                  CALCULATING RESULTS...
                </span>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-2 gap-12 my-8 overflow-hidden max-h-[60vh]">
                {/* Qualified */}
                <motion.div 
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  className="flex flex-col bg-green-500/5 border border-green-500/20 rounded-3xl p-8 overflow-hidden"
                >
                  <div className="flex justify-between items-center mb-6 border-b border-green-500/10 pb-4">
                    <span className="text-3xl font-display text-green-400 tracking-wider">SELECTED</span>
                    <span className="bg-green-500/20 text-green-400 font-mono text-2xl font-bold px-4 py-1 rounded-full">
                      {qualifierCount}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-4 gap-4">
                      {qualifiedRolls.map((roll, idx) => (
                        <motion.div
                          key={roll}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-green-500/10 border border-green-500/20 rounded-xl py-3 px-4 text-center"
                        >
                          <span className="font-mono text-2xl font-bold text-white tracking-wide">{roll}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Eliminated */}
                <motion.div 
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  className="flex flex-col bg-red-500/5 border border-red-500/20 rounded-3xl p-8 overflow-hidden"
                >
                  <div className="flex justify-between items-center mb-6 border-b border-red-500/10 pb-4">
                    <span className="text-3xl font-display text-red-400 tracking-wider">ELIMINATED</span>
                    <span className="bg-red-500/20 text-red-400 font-mono text-2xl font-bold px-4 py-1 rounded-full">
                      {eliminatedCount}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-4 gap-4">
                      {eliminatedRolls.map((roll, idx) => (
                        <motion.div
                          key={roll}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-red-500/10 border border-red-500/20 rounded-xl py-3 px-4 text-center opacity-70"
                        >
                          <span className="font-mono text-2xl font-bold text-muted-foreground tracking-wide">{roll}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            <div className="text-muted-foreground text-xl">
              Projector Display Only • Waiting for host to advance
            </div>
          </motion.div>
        );


      case 'finalist_reveal':
        return (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
            className="flex flex-col items-center justify-center h-full relative"
          >
            {/* Spotlight bg */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(245,197,24,0.15),transparent_60%)] pointer-events-none" />
            
            <h1 className="text-[150px] font-display text-secondary text-shadow-gold tracking-widest mb-16 z-10">
              FINALISTS
            </h1>
            
            <div className="flex gap-12 z-10 flex-wrap justify-center max-w-[90vw]">
              {finalists.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: i * 0.5 }}
                  className="bg-white/10 backdrop-blur-xl border-2 border-secondary/50 p-12 rounded-3xl shadow-[0_0_50px_rgba(245,197,24,0.2)]"
                >
                  <span className="block text-2xl text-secondary/80 uppercase tracking-widest mb-4 font-semibold text-center">
                    Roll Number
                  </span>
                  <span className="text-[80px] font-mono font-bold text-white tracking-wider tabular-nums leading-none">
                    {f.rollNumber}
                  </span>
                </motion.div>
              ))}
            </div>
            
            <motion.p 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: finalists.length * 0.5 + 1 }}
              className="mt-20 text-4xl text-white font-medium bg-primary/30 border border-primary/50 py-6 px-12 rounded-full z-10"
            >
              Proceeding to Round 5 — Live on Stage!
            </motion.p>
          </motion.div>
        );
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0A0A0F] text-foreground select-none cursor-default">
      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-50 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
      {renderContent()}
    </div>
  );
}
