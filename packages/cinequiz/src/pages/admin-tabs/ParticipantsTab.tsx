import React, { useState } from 'react';
import { useListParticipants, useOverrideQualification } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

export default function AdminParticipantsTab({ competition }: { competition: any }) {
  const [search, setSearch] = useState('');
  
  const { data: participants, refetch } = useListParticipants(
    { competitionId: competition?.id, search },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!competition?.id } as any }
  );

  const overrideMut = useOverrideQualification();

  const handleOverride = (participantId: string, roundId: string, currentQualified: boolean) => {
    if (window.confirm(`Are you sure you want to manually ${currentQualified ? 'eliminate' : 'qualify'} this participant for this round?`)) {
      overrideMut.mutate({
        data: {
          participantId,
          roundId,
          qualified: !currentQualified
        }
      }, {
        onSuccess: () => {
          toast.success('Qualification overridden');
          refetch();
        },
        onError: (err: any) => toast.error((err as any).data?.error || (err as any).message || 'Failed to override')
      });
    }
  };

  if (!competition) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
        <Input 
          placeholder="Search by Roll Number..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-black/50 font-mono uppercase"
        />
        <div className="text-sm text-muted-foreground">
          Showing {participants?.length || 0} participants
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/50 text-muted-foreground uppercase tracking-wider text-xs border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Roll Number</th>
                <th className="px-6 py-4 font-medium">Status</th>
                {competition.rounds?.map((r: any) => (
                  <th key={r.id} className="px-6 py-4 font-medium text-center">R{r.roundNumber}</th>
                ))}
                <th className="px-6 py-4 font-medium text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {participants?.map((p: any) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-white font-medium">{p.rollNumber}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs uppercase tracking-wider ${
                      p.currentStatus === 'active' ? 'bg-green-500/20 text-green-400' :
                      p.currentStatus === 'eliminated' ? 'bg-red-500/20 text-red-400' :
                      'bg-secondary/20 text-secondary'
                    }`}>
                      {p.currentStatus}
                    </span>
                  </td>
                  
                  {/* Round statuses */}
                  {competition.rounds?.map((r: any, idx: number) => {
                    const statusKey = `round${idx+1}Status`;
                    const status = p[statusKey];
                    const isQualified = status === 'qualified';
                    const isEliminated = status === 'eliminated';
                    
                    return (
                      <td key={r.id} className="px-6 py-4 text-center cursor-pointer hover:bg-white/10" title="Click to override" onClick={() => handleOverride(p.id, r.id, isQualified)}>
                        {isQualified ? <span className="text-green-500">✅</span> : 
                         isEliminated ? <span className="text-red-500">❌</span> : 
                         <span className="text-muted-foreground">-</span>}
                      </td>
                    );
                  })}
                  
                  <td className="px-6 py-4 text-muted-foreground text-right tabular-nums">
                    {new Date(p.registeredAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              
              {!participants?.length && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-muted-foreground">
                    No participants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
