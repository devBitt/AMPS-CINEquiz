import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '@/store/useStore';
import { QRCodeCanvas } from 'qrcode.react';
import { useRegisterParticipant, useGetCompetition } from '@workspace/api-client-react';
import { toast } from 'react-hot-toast';
import { PageTransition } from '@/components/PageTransition';
import socket from '@/socket/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Landing() {
  const [, navigate] = useLocation();
  const setParticipant = useStore((state) => state.setParticipant);
  const [rollNumber, setRollNumber] = useState('');
  const [showQR, setShowQR] = useState(false);
  
  const { data: competition } = useGetCompetition();
  const registerMut = useRegisterParticipant();

  useEffect(() => {
    socket.connect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rollNumber.trim()) {
      toast.error("Please enter a roll number");
      return;
    }

    if (!competition?.id) {
      toast.error("No active competition");
      return;
    }

    registerMut.mutate({
      data: {
        rollNumber: rollNumber.trim().toUpperCase(),
        competitionId: competition.id
      }
    }, {
      onSuccess: (data) => {
        const p = {
          id: data.participantId,
          rollNumber: data.rollNumber,
          sessionToken: data.sessionToken,
          competitionId: data.competitionId
        };
        setParticipant(p);
        localStorage.setItem('cinequiz_session', JSON.stringify(p));
        
        socket.emit('join_competition', {
          sessionToken: p.sessionToken,
          competitionId: p.competitionId,
        });
        
        navigate('/waiting');
      },
      onError: (err: any) => {
        toast.error((err as any).data?.error || (err as any).message || "Failed to register");
      }
    });
  };

  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}${import.meta.env.BASE_URL}` : '';

  return (
    <PageTransition className="p-4 md:p-8">
      {/* Animated radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(229,9,20,0.1),transparent_50%)] animate-pulse" style={{ animationDuration: '4s' }} />
      
      <div className="z-10 w-full max-w-md flex flex-col items-center">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-display text-primary text-shadow-glow mb-2 text-center tracking-wider">
          🎬 CineQuiz Live
        </h1>
        <p className="text-muted-foreground text-center mb-12 uppercase tracking-widest text-sm font-medium">
          Guess the movie. Beat the clock.
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="YOUR ROLL NUMBER"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value.replace(/\s/g, '').toUpperCase())}
              maxLength={20}
              className="h-16 text-center text-xl font-mono bg-card/50 border-card-border focus-visible:ring-primary focus-visible:border-primary uppercase tracking-widest rounded-xl"
              disabled={registerMut.isPending || !competition}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-16 text-xl font-display tracking-widest bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)] transition-all rounded-xl relative overflow-hidden group"
            disabled={registerMut.isPending || !competition}
          >
            <span className="relative z-10">{registerMut.isPending ? "JOINING..." : "JOIN COMPETITION"}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </Button>
        </form>

        <div className="mt-12 w-full flex flex-col items-center">
          <button 
            onClick={() => setShowQR(!showQR)}
            className="text-xs text-muted-foreground hover:text-white transition-colors uppercase tracking-wider mb-4 border-b border-transparent hover:border-white/20 pb-1"
          >
            {showQR ? "Hide QR Code" : "Share with others"}
          </button>
          
          {showQR && (
            <div className="glass-card p-6 rounded-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="bg-white p-2 rounded-lg">
                <QRCodeCanvas 
                  value={currentUrl} 
                  size={150} 
                  bgColor={"#ffffff"}
                  fgColor={"#0A0A0F"}
                  level={"M"}
                />
              </div>
              <p className="mt-4 text-xs font-mono text-muted-foreground text-center break-all max-w-[200px]">
                {currentUrl}
              </p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
