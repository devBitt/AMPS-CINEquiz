import React from 'react';
import { useGetStats } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { toast } from 'react-hot-toast';

export default function AdminResultsTab({ competition }: { competition: any }) {
  const { data: stats } = useGetStats(
    { competitionId: competition?.id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!competition?.id, refetchInterval: 5000 } as any }
  );

  const handleExport = () => {
    if (!competition?.id) {
      toast.error('No competition selected');
      return;
    }
    // Direct URL navigation triggers CSV download from the backend
    const base = import.meta.env.BASE_URL || '/';
    const url = `${base}api/submissions/export?competitionId=${encodeURIComponent(competition.id)}`;
    window.open(url, '_blank');
  };

  const chartData = stats?.roundStats?.map((r: any) => ({
    name: `Round ${r.roundNumber}`,
    Correct: r.correctSubmissions,
    Eliminated: r.eliminatedCount,
    Qualified: r.qualifiedCount,
  })) ?? [];

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-3xl font-display text-primary">{stats?.totalParticipants ?? '—'}</div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Total Players</p>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-3xl font-display text-secondary">{stats?.roundStats?.length ?? '—'}</div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Rounds Played</p>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-3xl font-display text-green-500">{stats?.finalists?.length ?? '—'}</div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Finalists</p>
        </div>
        <div className="glass-card p-4 rounded-xl text-center col-span-2 md:col-span-1 flex items-center justify-center">
          <Button onClick={handleExport} variant="outline" className="border-secondary/30 text-secondary hover:bg-secondary/10 w-full">
            ↓ Export CSV
          </Button>
        </div>
      </div>

      {/* Per-round chart */}
      {chartData.length > 0 && (
        <div className="glass-card p-6 rounded-xl">
          <h3 className="font-display text-primary tracking-widest mb-4">ROUND BREAKDOWN</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis dataKey="name" tick={{ fill: '#999', fontSize: 12 }} />
              <YAxis tick={{ fill: '#999', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="Correct" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Qualified" fill="#F5C518" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Eliminated" fill="#E50914" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Finalists */}
      {stats?.finalists && stats.finalists.length > 0 && (
        <div className="glass-card p-6 rounded-xl">
          <h3 className="font-display text-secondary tracking-widest mb-4">FINALISTS</h3>
          <div className="flex flex-wrap gap-3">
            {stats.finalists.map((f: any) => (
              <span key={f.id} className="bg-secondary/10 text-secondary border border-secondary/30 px-4 py-2 rounded font-mono text-sm">
                {f.rollNumber}
              </span>
            ))}
          </div>
        </div>
      )}

      {!stats && (
        <div className="text-center text-muted-foreground py-16">
          <p className="text-4xl mb-4">📊</p>
          <p>Results will appear here as rounds complete.</p>
        </div>
      )}
    </div>
  );
}
