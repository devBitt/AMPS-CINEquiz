import React, { useState } from 'react';
import { useCreateCompetition } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import { isImageClue } from '@/lib/utils';
import { Trash2 as TrashIcon, Upload as UploadIcon, Film as FilmIcon, Plus as PlusIcon } from 'lucide-react';

export default function AdminSetupTab({ competition, refetch }: { competition: any, refetch: () => void }) {
  const [name, setName] = useState('CineQuiz 2024');
  const [rounds, setRounds] = useState([
    { emojiClue: '', correctAnswers: 'batman,the dark knight,the batman', timeLimitSeconds: 35 },
    { emojiClue: '', correctAnswers: 'titanic', timeLimitSeconds: 30 },
    { emojiClue: '', correctAnswers: 'spider-man,spiderman', timeLimitSeconds: 25 },
    { emojiClue: '', correctAnswers: 'lord of the rings,the lord of the rings', timeLimitSeconds: 20 },
  ]);

  const createMut = useCreateCompetition();

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Competition name is required');
      return;
    }
    if (rounds.length === 0) {
      toast.error('At least one round is required');
      return;
    }
    for (let i = 0; i < rounds.length; i++) {
      if (!rounds[i].emojiClue.trim()) {
        toast.error(`Round ${i + 1} clue image is required`);
        return;
      }
      if (!rounds[i].correctAnswers.trim()) {
        toast.error(`Round ${i + 1} correct answers are required`);
        return;
      }
    }

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

  const addRound = () => {
    setRounds([...rounds, { emojiClue: '', correctAnswers: '', timeLimitSeconds: 30 }]);
  };

  const removeRound = (index: number) => {
    if (rounds.length <= 1) {
      toast.error('At least one round is required');
      return;
    }
    const newRounds = rounds.filter((_, i) => i !== index);
    setRounds(newRounds);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (PNG, JPG, etc.)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        updateRound(index, 'emojiClue', base64);
      };
      reader.readAsDataURL(file);
    }
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
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-display tracking-widest text-muted-foreground">ROUND CONFIGURATION</h2>
            <Button 
              type="button" 
              onClick={addRound}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-display text-xs tracking-widest flex items-center px-4 py-2 h-auto"
            >
              <PlusIcon className="w-3.5 h-3.5 mr-1" />
              ADD ROUND
            </Button>
          </div>
          
          {rounds.map((round, i) => (
            <div key={i} className="glass-card p-5 rounded-xl border border-border flex flex-col md:flex-row gap-5 relative group/round">
              <div className="w-16 flex-shrink-0 flex flex-col items-center justify-between bg-black/50 rounded-lg p-2 h-20 md:h-auto">
                <span className="font-display text-2xl text-muted-foreground">R{i+1}</span>
                {rounds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRound(i)}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                    title="Delete Round"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Image Upload Zone */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Frame Clue (Image)</label>
                  <div className="relative h-32 rounded-xl border border-dashed border-white/10 hover:border-white/20 bg-black/20 overflow-hidden transition-colors flex items-center justify-center group/upload">
                    {round.emojiClue ? (
                      <>
                        <img src={round.emojiClue} alt={`Round ${i+1} Frame`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/upload:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="flex items-center justify-center p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg cursor-pointer text-xs text-white font-display tracking-widest transition-all">
                            <UploadIcon className="w-4 h-4 mr-1.5" />
                            REPLACE
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={e => handleFileChange(e, i)}
                              className="hidden" 
                            />
                          </label>
                          <button 
                            type="button"
                            onClick={() => updateRound(i, 'emojiClue', '')}
                            className="flex items-center justify-center p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-xs text-red-400 font-display tracking-widest transition-all"
                          >
                            <TrashIcon className="w-4 h-4 mr-1.5" />
                            DELETE
                          </button>
                        </div>
                      </>
                    ) : (
                      <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-4 text-center hover:bg-white/5 transition-colors">
                        <UploadIcon className="w-8 h-8 text-muted-foreground opacity-60 mb-2 group-hover/upload:text-white transition-colors" />
                        <span className="text-xs text-muted-foreground font-display tracking-widest group-hover/upload:text-white transition-colors">UPLOAD FRAME</span>
                        <span className="text-[9px] text-muted-foreground/60 font-mono mt-1">PNG, JPG, WEBP</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={e => handleFileChange(e, i)}
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Round Settings */}
                <div className="flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Time Limit (seconds)</label>
                    <Input 
                      type="number"
                      value={round.timeLimitSeconds} 
                      onChange={e => updateRound(i, 'timeLimitSeconds', parseInt(e.target.value) || 0)}
                      className="bg-black/50 font-mono h-12"
                      placeholder="e.g. 30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-muted-foreground tracking-wider font-semibold">Correct Answers (comma separated)</label>
                    <Input 
                      value={round.correctAnswers} 
                      onChange={e => updateRound(i, 'correctAnswers', e.target.value)}
                      className="bg-black/50 font-mono text-sm h-12"
                      placeholder="e.g. titanic, titanic movie"
                    />
                  </div>
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
