import React, { useState } from 'react';
import { useCreateCompetition } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';

export default function AdminSetupTab({ competition, refetch }: { competition: any, refetch: () => void }) {
  const [name, setName] = useState('CineQuiz 2024');
  const [rounds, setRounds] = useState([
    { emojiClue: '🦇👨🤡', correctAnswers: 'batman,the dark knight,the batman', timeLimitSeconds: 35 },
    { emojiClue: '🚢🧊🥶', correctAnswers: 'titanic', timeLimitSeconds: 30 },
    { emojiClue: '🕷️👨🏙️', correctAnswers: 'spider-man,spiderman', timeLimitSeconds: 25 },
    { emojiClue: '🧙‍♂️💍🌋', correctAnswers: 'lord of the rings,the lord of the rings', timeLimitSeconds: 20 },
  ]);

  const createMut = useCreateCompetition();

  const handleSave = () => {
    createMut.mutate({
      data: {
        name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rounds: rounds.map((r, i) => ({
          competitionId: '',  // ignored by server when creating alongside competition
          roundNumber: i + 1,
          emojiClue: r.emojiClue,
          correctAnswers: r.correctAnswers.split(',').map((s: string) => s.trim().toLowerCase()),
          timeLimitSeconds: r.timeLimitSeconds
        })) as any
      }
    }, {
      onSuccess: () => {
        toast.success('Competition created successfully');
        refetch();
      },
      onError: (err: any) => {
        toast.error((err as any).data?.error || (err as any).message || 'Failed to create');
      }
    });
  };

  const updateRound = (index: number, field: string, value: any) => {
    const newRounds = [...rounds];
    newRounds[index] = { ...newRounds[index], [field]: value };
    setRounds(newRounds);
  };

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}${import.meta.env.BASE_URL}` : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-display tracking-widest mb-4">COMPETITION SETTINGS</h2>
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground">Competition Name</label>
            <Input 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="bg-black/50 font-medium"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-display tracking-widest text-muted-foreground">ROUND CONFIGURATION</h2>
          
          {rounds.map((round, i) => (
            <div key={i} className="glass-card p-5 rounded-xl border border-border flex flex-col md:flex-row gap-4">
              <div className="w-16 flex-shrink-0 flex items-center justify-center bg-black/50 rounded-lg">
                <span className="font-display text-2xl text-muted-foreground">R{i+1}</span>
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted-foreground">Emojis</label>
                    <Input 
                      value={round.emojiClue} 
                      onChange={e => updateRound(i, 'emojiClue', e.target.value)}
                      className="bg-black/50 text-xl py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted-foreground">Time (sec)</label>
                    <Input 
                      type="number"
                      value={round.timeLimitSeconds} 
                      onChange={e => updateRound(i, 'timeLimitSeconds', parseInt(e.target.value))}
                      className="bg-black/50 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground">Correct Answers (comma separated)</label>
                  <Input 
                    value={round.correctAnswers} 
                    onChange={e => updateRound(i, 'correctAnswers', e.target.value)}
                    className="bg-black/50 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button 
          onClick={handleSave} 
          disabled={createMut.isPending}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-display text-xl tracking-widest"
        >
          {createMut.isPending ? 'SAVING...' : 'SAVE & INITIALIZE COMPETITION'}
        </Button>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6 rounded-xl border border-border flex flex-col items-center text-center">
          <h2 className="text-sm font-display tracking-widest text-muted-foreground mb-6">PARTICIPANT JOIN URL</h2>
          <div className="bg-white p-4 rounded-xl mb-4">
            <QRCodeCanvas 
              value={joinUrl} 
              size={200} 
              bgColor={"#ffffff"}
              fgColor={"#0A0A0F"}
              level={"M"}
            />
          </div>
          <a href={joinUrl} target="_blank" rel="noreferrer" className="text-sm font-mono text-primary hover:underline break-all">
            {joinUrl}
          </a>
        </div>
      </div>
    </div>
  );
}
