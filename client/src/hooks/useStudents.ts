// Custom hook for student management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, Student, CreateStudentRequest } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { useEffect } from 'react';

export const useStudents = () => {
  const queryClient = useQueryClient();

  // Get all students
  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: () => apiClient.getStudents(),
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: (studentData: CreateStudentRequest) => apiClient.createStudent(studentData),
    onSuccess: (newStudent) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  // Kick student mutation
  const kickStudentMutation = useMutation({
    mutationFn: (studentId: string) => apiClient.kickStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  // Update student activity mutation
  const updateActivityMutation = useMutation({
    mutationFn: (socketId: string) => apiClient.updateStudentActivity(socketId),
  });

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: (socketId: string) => apiClient.deleteStudent(socketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  // Socket event listeners
  useEffect(() => {
    const handleStudentJoined = (student: Student) => {
      queryClient.setQueryData(['students'], (oldData: Student[] = []) => {
        const exists = oldData.find(s => s._id === student._id);
        if (exists) {
          return oldData.map(s => s._id === student._id ? student : s);
        }
        return [...oldData, student];
      });
    };

    const handleStudentLeft = (studentId: string) => {
      queryClient.setQueryData(['students'], (oldData: Student[] = []) => {
        return oldData.filter(s => s._id !== studentId);
      });
    };

    const handleStudentKicked = (studentId: string) => {
      queryClient.setQueryData(['students'], (oldData: Student[] = []) => {
        return oldData.filter(s => s._id !== studentId);
      });
    };

    const handleStudentAnswered = (data: { studentId: string; pollId: string }) => {
      queryClient.setQueryData(['students'], (oldData: Student[] = []) => {
        return oldData.map(student => 
          student._id === data.studentId 
            ? { ...student, hasAnswered: true }
            : student
        );
      });
    };

    socketManager.onStudentJoined(handleStudentJoined);
    socketManager.onStudentLeft(handleStudentLeft);
    socketManager.onStudentKicked(handleStudentKicked);
    socketManager.onStudentAnswered(handleStudentAnswered);

    return () => {
      socketManager.removeListener('student:joined', handleStudentJoined);
      socketManager.removeListener('student:left', handleStudentLeft);
      socketManager.removeListener('student:kicked', handleStudentKicked);
      socketManager.removeListener('student:answered', handleStudentAnswered);
    };
  }, [queryClient]);

  return {
    students: studentsQuery.data || [],
    isLoading: studentsQuery.isLoading,
    isError: studentsQuery.isError,
    createStudent: createStudentMutation.mutate,
    kickStudent: kickStudentMutation.mutate,
    updateActivity: updateActivityMutation.mutate,
    deleteStudent: deleteStudentMutation.mutate,
    isCreatingStudent: createStudentMutation.isPending,
    isKickingStudent: kickStudentMutation.isPending,
    refetch: studentsQuery.refetch,
  };
};

