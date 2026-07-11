import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAdminLogin } from '@workspace/api-client-react';
import { setAdminToken } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { PageTransition } from '@/components/PageTransition';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const loginMut = useAdminLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    loginMut.mutate({
      data: { username, password }
    }, {
      onSuccess: (data) => {
        setAdminToken(data.token);
        toast.success('Logged in successfully');
        navigate('/admin/dashboard');
      },
      onError: (err: any) => {
        toast.error((err as any).data?.error || (err as any).message || 'Invalid credentials');
      }
    });
  };

  return (
    <PageTransition className="p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-display text-primary tracking-widest mb-2">
            ADMIN CONTROL
          </h1>
          <p className="text-muted-foreground uppercase text-sm tracking-wider">
            CineQuiz Live System
          </p>
        </div>

        <div className="glass-card p-8 rounded-2xl border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Username</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-black/50 border-white/10 focus-visible:ring-primary h-12"
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/50 border-white/10 focus-visible:ring-primary h-12"
                autoComplete="current-password"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium tracking-wide uppercase mt-4"
              disabled={loginMut.isPending}
            >
              {loginMut.isPending ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}
