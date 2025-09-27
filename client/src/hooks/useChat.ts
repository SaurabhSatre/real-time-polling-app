// Custom hook for chat management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ChatMessage, SendChatRequest } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { useEffect } from 'react';

interface UseChatOptions {
  includeStats?: boolean;
}

export const useChat = (options: UseChatOptions = { includeStats: true }) => {
  const queryClient = useQueryClient();
  const { includeStats = true } = options;

  // Get chat history
  const chatHistoryQuery = useQuery({
    queryKey: ['chat', 'history'],
    queryFn: () => apiClient.getChatHistory(),
  });

  // Get recent chat
  const recentChatQuery = useQuery({
    queryKey: ['chat', 'recent'],
    queryFn: () => apiClient.getRecentChat(),
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
  });

  // Get chat stats (only if includeStats is true)
  const chatStatsQuery = useQuery({
    queryKey: ['chat', 'stats'],
    queryFn: () => apiClient.getChatStats(),
    enabled: includeStats, // Only fetch if includeStats is true
  });

  // Send chat message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: SendChatRequest) => apiClient.sendChatMessage(messageData),
    onSuccess: () => {
      // Only invalidate specific queries, not all chat queries
      queryClient.invalidateQueries({ queryKey: ['chat', 'recent'] });
    },
  });

  // Delete chat message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => apiClient.deleteChatMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });

  // Clear chat mutation
  const clearChatMutation = useMutation({
    mutationFn: () => apiClient.clearChat(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });

  // Socket event listeners
  useEffect(() => {
    const handleChatMessage = (message: ChatMessage) => {
      queryClient.setQueryData(['chat', 'recent'], (oldData: ChatMessage[] = []) => {
        const exists = oldData.find(m => m._id === message._id);
        if (exists) {
          return oldData.map(m => m._id === message._id ? message : m);
        }
        return [...oldData, message];
      });
      
      // Only invalidate history if needed, not on every message
      // queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
      if (includeStats) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'stats'] });
      }
    };

    const handleChatCleared = () => {
      queryClient.setQueryData(['chat', 'recent'], []);
      queryClient.setQueryData(['chat', 'history'], []);
      if (includeStats) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'stats'] });
      }
    };

    socketManager.onChatMessage(handleChatMessage);
    socketManager.onChatCleared(handleChatCleared);

    return () => {
      socketManager.removeListener('chat:message', handleChatMessage);
      socketManager.removeListener('chat:cleared', handleChatCleared);
    };
  }, [queryClient]);

  return {
    chatHistory: chatHistoryQuery.data || [],
    recentChat: recentChatQuery.data || [],
    chatStats: chatStatsQuery.data,
    isLoading: chatHistoryQuery.isLoading || recentChatQuery.isLoading,
    isError: chatHistoryQuery.isError || recentChatQuery.isError,
    sendMessage: sendMessageMutation.mutate,
    deleteMessage: deleteMessageMutation.mutate,
    clearChat: clearChatMutation.mutate,
    isSendingMessage: sendMessageMutation.isPending,
    isDeletingMessage: deleteMessageMutation.isPending,
    isClearingChat: clearChatMutation.isPending,
    refetch: () => {
      chatHistoryQuery.refetch();
      recentChatQuery.refetch();
      if (includeStats) {
        chatStatsQuery.refetch();
      }
    },
  };
};

