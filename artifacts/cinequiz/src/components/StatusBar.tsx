import React from 'react';
import { useStore } from '@/store/useStore';

export const StatusBar: React.FC = () => {
  const isConnected = useStore((state) => state.isConnected);

  return (
    <div className="fixed bottom-0 left-0 right-0 p-2 z-50 pointer-events-none flex justify-center">
      <div className="glass-card px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-mono shadow-lg">
        <div 
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(0,200,83,0.8)]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(213,0,0,0.8)]'}`}
        />
        <span className={isConnected ? 'text-gray-300' : 'text-red-400'}>
          {isConnected ? 'Connected' : 'Reconnecting...'}
        </span>
      </div>
    </div>
  );
};
