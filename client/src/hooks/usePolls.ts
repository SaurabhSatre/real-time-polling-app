// Custom hook for poll management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, Poll, CreatePollRequest } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { useEffect } from 'react';

export const usePolls = () => {
  const queryClient = useQueryClient();

  // Get current poll
  const currentPollQuery = useQuery({
    queryKey: ['polls', 'current'],
    queryFn: () => apiClient.getCurrentPoll(),
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
  });

  // Get poll history
  const pollHistoryQuery = useQuery({
    queryKey: ['polls', 'history'],
    queryFn: () => apiClient.getPollHistory(),
  });

  // Create poll mutation
  const createPollMutation = useMutation({
    mutationFn: (pollData: CreatePollRequest) => apiClient.createPoll(pollData),
    onSuccess: (newPoll) => {
      queryClient.setQueryData(['polls', 'current'], newPoll);
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });

  // End poll mutation
  const endPollMutation = useMutation({
    mutationFn: (pollId: string) => apiClient.endPoll(pollId),
    onSuccess: (endedPoll) => {
      queryClient.setQueryData(['polls', 'current'], null);
      queryClient.invalidateQueries({ queryKey: ['polls', 'history'] });
    },
  });

  // Get poll results
  const getPollResults = (pollId: string) => {
    return useQuery({
      queryKey: ['polls', pollId, 'results'],
      queryFn: () => apiClient.getPollResults(pollId),
      enabled: !!pollId,
    });
  };

  // Socket event listeners
  useEffect(() => {
    const handlePollCreated = (poll: Poll) => {
      queryClient.setQueryData(['polls', 'current'], poll);
    };

    const handlePollUpdated = (poll: Poll) => {
      queryClient.setQueryData(['polls', 'current'], poll);
    };

    const handlePollEnded = (poll: Poll) => {
      queryClient.setQueryData(['polls', 'current'], null);
      queryClient.invalidateQueries({ queryKey: ['polls', 'history'] });
    };

    const handlePollResults = (results: any) => {
      queryClient.setQueryData(['polls', 'current'], (oldData: Poll | null) => {
        if (oldData) {
          return { ...oldData, ...results };
        }
        return oldData;
      });
    };

    socketManager.onPollCreated(handlePollCreated);
    socketManager.onPollUpdated(handlePollUpdated);
    socketManager.onPollEnded(handlePollEnded);
    socketManager.onPollResults(handlePollResults);

    return () => {
      socketManager.removeListener('poll:created', handlePollCreated);
      socketManager.removeListener('poll:updated', handlePollUpdated);
      socketManager.removeListener('poll:ended', handlePollEnded);
      socketManager.removeListener('poll:results', handlePollResults);
    };
  }, [queryClient]);

  return {
    currentPoll: currentPollQuery.data,
    pollHistory: pollHistoryQuery.data || [],
    isLoading: currentPollQuery.isLoading || pollHistoryQuery.isLoading,
    isError: currentPollQuery.isError || pollHistoryQuery.isError,
    createPoll: createPollMutation.mutate,
    endPoll: endPollMutation.mutate,
    isCreatingPoll: createPollMutation.isPending,
    isEndingPoll: endPollMutation.isPending,
    getPollResults,
    refetch: () => {
      currentPollQuery.refetch();
      pollHistoryQuery.refetch();
    },
  };
};

