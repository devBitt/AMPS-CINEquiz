import React, { useEffect, useState } from 'react';
import { useStartRound, useEndRound, useRevealFinalists } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import socket from '@/socket/socket';
import { isImageClue } from '@/lib/utils';

export default function AdminLiveTab({ competition, refetch }: { competition: any, refetch: () => void }) {
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [activeRound, setActiveRound] = useState<any>(null);

  const startMut = useStartRound();
  const endMut = useEndRound();
  const revealMut = useRevealFinalists();

  useEffect(() => {
    const onTimerTick = (data: { remaining: number; total: number }) => {
      setTimerRemaining(data.remaining);
      setTimerTotal(data.total);
    };
    
    const onSubCount = (data: any) => setSubmissionCount(typeof data === 'number' ? data : data.submitted);
    const onPartCount = (count: number) => setParticipantCount(count);
    
    const onState = (data: any) => {
      if (data.currentRound) setActiveRound(data.currentRound);
      if (data.participantCount !== undefined) setParticipantCount(data.participantCount);
      if (data.timerRemaining !== undefined) {
        setTimerRemaining(data.timerRemaining);
        setTimerTotal(data.timerTotal);
      }
    };

    socket.on('timer_tick', onTimerTick);
    socket.on('submission_count', onSubCount);
    socket.on('participant_count', onPartCount);
    socket.on('competition_state', onState);

    return () => {
      socket.off('timer_tick');
      socket.off('submission_count');
      socket.off('participant_count');
      socket.off('competition_state');
    };
  }, []);

  // Use the competition data to determine state if socket is quiet
  useEffect(() => {
    if (competition) {
      setParticipantCount(competition.participantCount || 0);
      const active = competition.rounds?.find((r: any) => r.status === 'active');
      if (active) setActiveRound(active);
    }
  }, [competition]);

  if (!competition) {
    return <div className="text-center p-12 text-muted-foreground">No active competition found. Please create one in the Setup tab.</div>;
  }

  const nextRoundNum = competition.currentRound + 1;
  const nextRound = competition.rounds?.find((r: any) => r.roundNumber === nextRoundNum);
  const currentRoundIsActive = competition.rounds?.some((r: any) => r.status === 'active');
  const isComplete = competition.status === 'completed';

  const handleStart = () => {
    if (!nextRound?.id) return;
    startMut.mutate({ id: nextRound.id }, {
      onSuccess: () => {
        toast.success(`Round ${nextRoundNum} started!`);
        refetch();
      },
      onError: (err: any) => toast.error((err as any).data?.error || (err as any).message || 'Failed to start round')
    });
  };

  const handleForceEnd = () => {
    if (!activeRound?.id) return;
    if (window.confirm("Are you sure you want to end this round early?")) {
      endMut.mutate({ id: activeRound.id }, {
        onSuccess: () => {
          toast.success('Round ended manually');
          refetch();
        },
        onError: (err: any) => toast.error((err as any).data?.error || (err as any).message || 'Failed to end round')
      });
    }
  };

  const handleReveal = () => {
    revealMut.mutate({ data: { competitionId: competition.id } }, {
      onSuccess: () => toast.success('Finalists revealed on projector!'),
      onError: (err: any) => toast.error((err as any).data?.error || (err as any).message || 'Failed to reveal')
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Active State Panel */}
      <div className="glass-card p-8 rounded-2xl border border-border flex flex-col justify-center items-center text-center">
        <h2 className="text-sm font-display tracking-widest text-muted-foreground mb-6">LIVE STATUS</h2>
        
        {currentRoundIsActive ? (
          <div className="space-y-8 w-full">
            <div>
              <div className="text-6xl font-display text-primary tracking-widest mb-4">ROUND {activeRound?.roundNumber || competition.currentRound}</div>
              {activeRound && isImageClue(activeRound.emojiClue) ? (
                <div className="w-56 h-32 mx-auto rounded-xl overflow-hidden border border-white/20 bg-black/40 shadow-inner flex items-center justify-center">
                  <img src={activeRound.emojiClue} alt="Active Clue Frame" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="text-4xl drop-shadow-lg font-sans">{activeRound?.emojiClue}</div>
              )}
            </div>
            
            <div className="bg-black/50 p-6 rounded-xl border border-white/5 relative overflow-hidden">
              <div 
                className="absolute left-0 bottom-0 top-0 bg-primary/20 -z-10 transition-all duration-1000 ease-linear"
                style={{ width: `${timerTotal ? (timerRemaining/timerTotal)*100 : 0}%` }}
              />
              <div className="text-xs uppercase text-muted-foreground tracking-widest mb-1">Time Remaining</div>
              <div className="text-5xl font-mono text-white">{Math.ceil(timerRemaining / 1000)}s</div>
            </div>

            <div className="flex justify-between items-center bg-black/30 p-4 rounded-xl">
              <div className="text-left">
                <div className="text-xs uppercase text-muted-foreground">Submissions</div>
                <div className="text-2xl font-mono text-white">{submissionCount}</div>
              </div>
              <div className="text-2xl text-muted-foreground font-light">/</div>
              <div className="text-right">
                <div className="text-xs uppercase text-muted-foreground">Participants</div>
                <div className="text-2xl font-mono text-white">{participantCount}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12">
            <div className="text-3xl font-display text-muted-foreground tracking-widest mb-2">
              {isComplete ? 'COMPETITION COMPLETE' : 'WAITING FOR NEXT ROUND'}
            </div>
            {!isComplete && (
              <div className="text-sm text-muted-foreground">
                {participantCount} participants connected
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="space-y-6">
        <div className="glass-card p-6 rounded-xl border border-border">
          <h2 className="text-sm font-display tracking-widest text-muted-foreground mb-6">ACTIONS</h2>
          
          <div className="space-y-4">
            {!currentRoundIsActive && !isComplete && nextRound && (
              <Button 
                onClick={handleStart} 
                disabled={startMut.isPending}
                className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-display text-2xl tracking-widest shadow-[0_0_15px_rgba(0,200,83,0.3)]"
              >
                {startMut.isPending ? 'STARTING...' : `START ROUND ${nextRoundNum}`}
              </Button>
            )}

            {currentRoundIsActive && (
              <Button 
                onClick={handleForceEnd} 
                disabled={endMut.isPending}
                className="w-full h-16 bg-yellow-600 hover:bg-yellow-700 text-white font-display text-xl tracking-widest"
              >
                FORCE END ROUND
              </Button>
            )}

            {isComplete && (
              <Button 
                onClick={handleReveal} 
                disabled={revealMut.isPending}
                className="w-full h-16 bg-secondary hover:bg-secondary/90 text-black font-display text-xl tracking-widest shadow-[0_0_15px_rgba(245,197,24,0.3)]"
              >
                REVEAL FINALISTS ON PROJECTOR
              </Button>
            )}
            
            <div className="pt-4 border-t border-white/10 text-xs text-muted-foreground uppercase tracking-widest">
              Projector display updates automatically.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
