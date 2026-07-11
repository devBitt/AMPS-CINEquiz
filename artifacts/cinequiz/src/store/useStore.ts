import { create } from 'zustand';

interface AppStore {
  // Participant
  participant: { id: string; rollNumber: string; sessionToken: string; competitionId: string } | null;
  setParticipant: (p: AppStore['participant']) => void;

  // Competition & round
  competition: { id: string; name: string; status: string; currentRound: number } | null;
  setCompetition: (c: AppStore['competition']) => void;
  currentRound: { id: string; roundNumber: number; emojiClue: string; timeLimitSeconds: number } | null;
  setCurrentRound: (r: AppStore['currentRound']) => void;

  // Timer (server-synced — ms)
  timerRemaining: number;
  timerTotal: number;
  setTimer: (remaining: number, total: number) => void;

  // Submission
  hasSubmitted: boolean;
  submittedAnswer: string;
  setSubmitted: (answer: string) => void;

  // Qualification
  isQualified: boolean | null;
  setQualified: (q: boolean | null) => void;

  // Counts
  participantCount: number;
  setParticipantCount: (n: number) => void;
  submissionCount: number;
  setSubmissionCount: (n: number) => void;

  // Connection
  isConnected: boolean;
  setConnected: (v: boolean) => void;

  // Finalists (projector)
  finalists: Array<{ id: string; rollNumber: string }>;
  setFinalists: (f: AppStore['finalists']) => void;

  // Reset per round
  resetForRound: () => void;
}

export const useStore = create<AppStore>((set) => ({
  participant: null,
  setParticipant: (participant) => set({ participant }),
  
  competition: null,
  setCompetition: (competition) => set({ competition }),
  
  currentRound: null,
  setCurrentRound: (currentRound) => set({ currentRound }),
  
  timerRemaining: 0,
  timerTotal: 0,
  setTimer: (timerRemaining, timerTotal) => set({ timerRemaining, timerTotal }),
  
  hasSubmitted: false,
  submittedAnswer: '',
  setSubmitted: (submittedAnswer) => set({ hasSubmitted: true, submittedAnswer }),
  
  isQualified: null,
  setQualified: (isQualified) => set({ isQualified }),
  
  participantCount: 0,
  setParticipantCount: (participantCount) => set({ participantCount }),
  
  submissionCount: 0,
  setSubmissionCount: (submissionCount) => set({ submissionCount }),
  
  isConnected: false,
  setConnected: (isConnected) => set({ isConnected }),
  
  finalists: [],
  setFinalists: (finalists) => set({ finalists }),
  
  resetForRound: () => set({
    hasSubmitted: false,
    submittedAnswer: '',
    isQualified: null,
  }),
}));
