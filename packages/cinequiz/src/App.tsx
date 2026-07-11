import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

import Landing from '@/pages/Landing';
import Waiting from '@/pages/Waiting';
import Round from '@/pages/Round';
import Result from '@/pages/Result';
import Finalist from '@/pages/Finalist';
import Eliminated from '@/pages/Eliminated';
import Projector from '@/pages/Projector';
import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/pages/AdminDashboard';
import { StatusBar } from '@/components/StatusBar';
import NotFound from '@/pages/not-found';
import { useSocket } from '@/hooks/useSocket';

const queryClient = new QueryClient();

function SocketManager() {
  useSocket();
  return null;
}

function Router() {
  const setParticipant = useStore(state => state.setParticipant);
  
  useEffect(() => {
    // Restore session on boot
    const stored = localStorage.getItem('cinequiz_session');
    if (stored) {
      try {
        setParticipant(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('cinequiz_session');
      }
    }
  }, [setParticipant]);

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/waiting" component={Waiting} />
      <Route path="/round" component={Round} />
      <Route path="/result" component={Result} />
      <Route path="/finalist" component={Finalist} />
      <Route path="/eliminated" component={Eliminated} />
      <Route path="/projector" component={Projector} />
      
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <SocketManager />
        <Router />
        {/* Only show StatusBar if we aren't on projector or admin routes */}
        <Switch>
          <Route path="/projector">{null}</Route>
          <Route path="/admin/:any*">{null}</Route>
          <Route path="/:any*"><StatusBar /></Route>
        </Switch>
      </WouterRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#141414',
            color: '#fff',
            border: '1px solid #2A2A2A',
            fontFamily: 'Inter, sans-serif',
            borderRadius: '12px'
          },
          success: {
            iconTheme: {
              primary: '#00C853',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#E50914',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
