import React from 'react';
import { useStore } from '@/store/useStore';
import { PageTransition } from '@/components/PageTransition';

export default function Eliminated() {
  const { finalists } = useStore();

  return (
    <PageTransition className="border-x-[16px] border-primary/20">
      <div className="z-10 flex flex-col items-center text-center p-6 max-w-lg w-full">
        <div className="text-5xl mb-6 opacity-50">🎬</div>
        
        <h1 className="text-4xl md:text-5xl font-display text-white mb-4 tracking-widest">
          Thanks for playing!
        </h1>
        
        <p className="text-muted-foreground text-lg mb-12">
          The competition continues on the big screen.
        </p>
        
        {finalists && finalists.length > 0 && (
          <div className="w-full glass-card p-6 rounded-xl border-secondary/20">
            <h3 className="text-secondary font-display tracking-widest text-xl mb-4">THE FINALISTS</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {finalists.map((f) => (
                <span key={f.id} className="bg-secondary/10 text-secondary border border-secondary/30 px-3 py-1 rounded font-mono text-sm">
                  {f.rollNumber}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
