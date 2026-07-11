import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useStore } from '@/store/useStore';
import socket from '@/socket/socket';

export function useSocket() {
  const [, navigate] = useLocation();
  const {
    participant,
    setConnected,
    setCompetition,
    setParticipantCount,
    setCurrentRound,
    setTimer,
    setQualified,
    setSubmissionCount,
    setFinalists,
    resetForRound,
  } = useStore();

  // Helper: only navigate if we're on an active participant page (not landing, admin, or projector)
  const isParticipantPage = () => {
    const path = window.location.pathname;
    return path !== '/' && !path.startsWith('/admin') && !path.startsWith('/projector');
  };

  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      setConnected(true);
      if (participant) {
        socket.emit('join_competition', {
          sessionToken: participant.sessionToken,
          competitionId: participant.competitionId,
        });
      }
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onCompetitionState = (data: any) => {
      if (data.competition) {
        setCompetition(data.competition);
      }
      if (typeof data.participantCount === 'number') {
        setParticipantCount(data.participantCount);
      }
      if (data.currentRound) {
        setCurrentRound(data.currentRound);
      }
      if (typeof data.timerRemaining === 'number' && typeof data.timerTotal === 'number') {
        setTimer(data.timerRemaining, data.timerTotal);
      }

      // Only auto-navigate if this is a participant session (not admin/projector)
      if (participant && isParticipantPage()) {
        if (data.phase === 'waiting') {
          navigate('/waiting');
        } else if (data.phase === 'round_active') {
          navigate('/round');
        } else if (data.phase === 'round_ended') {
          navigate('/result');
        }
      }
    };

    const onParticipantCount = (count: number) => {
      setParticipantCount(count);
    };

    const onRoundStarted = (data: any) => {
      if (data.round) {
        setCurrentRound(data.round);
        resetForRound();
        setTimer(data.round.timeLimitSeconds * 1000, data.round.timeLimitSeconds * 1000);
        if (participant && isParticipantPage()) navigate('/round');
      }
    };

    const onTimerTick = (data: { remaining: number; total: number }) => {
      setTimer(data.remaining, data.total);
    };

    const onRoundEnded = () => {
      setTimer(0, useStore.getState().timerTotal);
    };

    const onQualificationResult = (data: { qualified: boolean }) => {
      setQualified(data.qualified);
      if (participant && isParticipantPage()) navigate('/result');
    };

    const onFinalistConfirmed = () => {
      if (participant && isParticipantPage()) navigate('/finalist');
    };

    const onEliminatedFinal = () => {
      if (participant && isParticipantPage()) navigate('/eliminated');
    };

    const onSubmissionCount = (data: any) => {
      setSubmissionCount(typeof data === 'number' ? data : data.submitted);
    };

    const onFinalistReveal = (data: { finalists: Array<{id: string, rollNumber: string}> }) => {
      setFinalists(data.finalists);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('competition_state', onCompetitionState);
    socket.on('participant_count', onParticipantCount);
    socket.on('round_started', onRoundStarted);
    socket.on('timer_tick', onTimerTick);
    socket.on('round_ended', onRoundEnded);
    socket.on('qualification_result', onQualificationResult);
    socket.on('finalist_confirmed', onFinalistConfirmed);
    socket.on('eliminated_final', onEliminatedFinal);
    socket.on('submission_count', onSubmissionCount);
    socket.on('finalist_reveal', onFinalistReveal);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('competition_state', onCompetitionState);
      socket.off('participant_count', onParticipantCount);
      socket.off('round_started', onRoundStarted);
      socket.off('timer_tick', onTimerTick);
      socket.off('round_ended', onRoundEnded);
      socket.off('qualification_result', onQualificationResult);
      socket.off('finalist_confirmed', onFinalistConfirmed);
      socket.off('eliminated_final', onEliminatedFinal);
      socket.off('submission_count', onSubmissionCount);
      socket.off('finalist_reveal', onFinalistReveal);
    };
  }, [
    participant,
    navigate,
    setConnected,
    setCompetition,
    setParticipantCount,
    setCurrentRound,
    setTimer,
    setQualified,
    setSubmissionCount,
    setFinalists,
    resetForRound
  ]);
}
