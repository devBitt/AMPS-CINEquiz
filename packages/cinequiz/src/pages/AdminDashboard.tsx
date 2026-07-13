import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import {
  useGetCompetition,
  useCreateCompetition,
  useStartRound,
  useEndRound,
  useRevealFinalists,
  useEmergencyStop,
  useListParticipants,
  useGetStats,
  useOverrideQualification,
  useExportSubmissions
} from '@workspace/api-client-react';
import { setAdminToken } from '@/lib/api';
import socket from '@/socket/socket';
import { QRCodeCanvas } from 'qrcode.react';

// Components for different tabs to keep the file manageable
import AdminSetupTab from './admin-tabs/SetupTab';
import AdminLiveTab from './admin-tabs/LiveTab';
import AdminParticipantsTab from './admin-tabs/ParticipantsTab';
import AdminResultsTab from './admin-tabs/ResultsTab';

export default function AdminDashboard() {
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('live');
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('cinequiz_admin_token') : null;

  const { data: competition, refetch: refetchComp } = useGetCompetition();

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    
    // Connect socket for admin live monitoring
    socket.connect();
    socket.emit('admin_join', { token, competitionId: competition?.id });
    
    return () => {
      // Clean up listeners if needed
    };
  }, [token, navigate, competition?.id]);
  
  const emergencyStopMut = useEmergencyStop();

  const handleEmergencyStop = () => {
    if (!competition) return;
    if (window.confirm("🚨 ARE YOU SURE? This will freeze the competition immediately. 🚨")) {
      emergencyStopMut.mutate(
        { id: competition.id },
        {
          onSuccess: () => {
            toast.success("Competition stopped.");
            refetchComp();
          },
          onError: (err: any) => toast.error((err as any).data?.error || (err as any).message || "Failed to stop")
        }
      );
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    navigate('/admin/login');
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-40 bg-card border-b border-border px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-display tracking-widest text-primary">CineQuiz Admin</h1>
          {competition ? (
            <div className="flex items-center gap-3 ml-4 border-l border-white/10 pl-4">
              <span className="font-medium text-white">{competition.name}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${
                competition.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                competition.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {competition.status}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest">
                Round {competition.currentRound}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground ml-4 border-l border-white/10 pl-4">No active competition</span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleEmergencyStop}
            disabled={!competition || competition.status !== 'active'}
            className="font-bold tracking-widest"
          >
            🚨 EMERGENCY STOP
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-white">
            Logout
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8 bg-card border border-border w-full justify-start h-12 p-1">
            <TabsTrigger value="setup" className="flex-1 h-full font-medium tracking-wide uppercase text-xs">Setup</TabsTrigger>
            <TabsTrigger value="live" className="flex-1 h-full font-medium tracking-wide uppercase text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Live Control</TabsTrigger>
            <TabsTrigger value="participants" className="flex-1 h-full font-medium tracking-wide uppercase text-xs">Participants</TabsTrigger>
            <TabsTrigger value="results" className="flex-1 h-full font-medium tracking-wide uppercase text-xs">Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="setup" className="mt-0">
            <AdminSetupTab competition={competition} refetch={refetchComp} />
          </TabsContent>
          
          <TabsContent value="live" className="mt-0">
            <AdminLiveTab competition={competition} refetch={refetchComp} />
          </TabsContent>

          <TabsContent value="participants" className="mt-0">
            <AdminParticipantsTab competition={competition} />
          </TabsContent>

          <TabsContent value="results" className="mt-0">
            <AdminResultsTab competition={competition} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
