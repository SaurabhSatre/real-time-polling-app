// Custom hook for answer management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, Answer, SubmitAnswerRequest } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { useEffect } from 'react';

export const useAnswers = () => {
  const queryClient = useQueryClient();

  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: (answerData: SubmitAnswerRequest) => apiClient.submitAnswer(answerData),
    onSuccess: (newAnswer) => {
      queryClient.invalidateQueries({ queryKey: ['answers'] });
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });

  // Get poll answers
  const getPollAnswers = (pollId: string) => {
    return useQuery({
      queryKey: ['answers', 'poll', pollId],
      queryFn: () => apiClient.getPollAnswers(pollId),
      enabled: !!pollId,
    });
  };

  // Get student answer for a specific poll
  const getStudentAnswer = (pollId: string, studentId: string) => {
    return useQuery({
      queryKey: ['answers', 'poll', pollId, 'student', studentId],
      queryFn: () => apiClient.getStudentAnswer(pollId, studentId),
      enabled: !!pollId && !!studentId,
      retry: false, // Don't retry 404s
      staleTime: 30000, // Cache for 30 seconds
      retryOnMount: false, // Don't retry on mount
      refetchOnWindowFocus: false, // Don't refetch on window focus
    });
  };

  // Socket event listeners
  useEffect(() => {
    const handleAnswerSubmitted = (answer: Answer) => {
      queryClient.invalidateQueries({ queryKey: ['answers'] });
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    };

    socketManager.onAnswerSubmitted(handleAnswerSubmitted);

    return () => {
      socketManager.removeListener('answer:submitted', handleAnswerSubmitted);
    };
  }, [queryClient]);

  return {
    submitAnswer: submitAnswerMutation.mutate,
    isSubmittingAnswer: submitAnswerMutation.isPending,
    getPollAnswers,
    getStudentAnswer,
  };
};

