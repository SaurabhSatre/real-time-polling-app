// API client for backend communication
import { API_BASE_URL } from './constant';

// Types for API responses
export interface Poll {
  _id: string;
  question: string;
  options: PollOption[];
  timeLimit: number;
  isActive: boolean;
  totalVotes: number;
  createdAt: string;
  endedAt?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Student {
  _id: string;
  name: string;
  socketId: string;
  hasAnswered: boolean;
  joinedAt: string;
}

export interface Answer {
  _id: string;
  pollId: string;
  studentId: string;
  optionId: string;
  submittedAt: string;
}

export interface ChatMessage {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'student';
  message: string;
  timestamp: string;
}

export interface CreatePollRequest {
  question: string;
  options: string[];
  timeLimit: number;
}

export interface SubmitAnswerRequest {
  pollId: string;
  studentId: string;
  optionId: string;
  timeToAnswer?: number;
}

export interface CreateStudentRequest {
  name: string;
  socketId: string;
}

export interface SendChatRequest {
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'student';
  message: string;
}

// API Client class
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        // Don't log 404s for student answer checks as they're expected
        if (response.status !== 404 || !url.includes('/answers/poll/') || !url.includes('/student/')) {
          console.error('API request failed:', error);
        }
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Only log errors that aren't 404s for student answer checks
      if (!(error instanceof Error && error.message.includes('404') && url.includes('/answers/poll/') && url.includes('/student/'))) {
        console.error('API request failed:', error);
      }
      throw error;
    }
  }

  // Poll Management APIs
  async createPoll(pollData: CreatePollRequest): Promise<Poll> {
    const response = await this.request<{ data: Poll }>('/polls', {
      method: 'POST',
      body: JSON.stringify(pollData),
    });
    return response.data;
  }

  async getCurrentPoll(): Promise<Poll | null> {
    try {
      const response = await this.request<{ data: Poll }>('/polls/current');
      return response.data;
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getPollHistory(): Promise<Poll[]> {
    const response = await this.request<{ data: Poll[] }>('/polls/history');
    return response.data;
  }

  async getPollResults(pollId: string): Promise<Poll> {
    const response = await this.request<{ data: Poll }>(`/polls/${pollId}/results`);
    return response.data;
  }

  async endPoll(pollId: string): Promise<Poll> {
    const response = await this.request<{ data: Poll }>(`/polls/${pollId}/end`, {
      method: 'PUT',
    });
    return response.data;
  }

  // Student Management APIs
  async createStudent(studentData: CreateStudentRequest): Promise<Student> {
    const response = await this.request<{ data: Student }>('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
    return response.data;
  }

  async getStudents(): Promise<Student[]> {
    const response = await this.request<{ data: Student[] }>('/students');
    return response.data;
  }

  async kickStudent(studentId: string): Promise<void> {
    return this.request<void>(`/students/${studentId}/kick`, {
      method: 'PUT',
    });
  }

  async updateStudentActivity(socketId: string): Promise<void> {
    return this.request<void>(`/students/activity/${socketId}`, {
      method: 'PUT',
    });
  }

  async deleteStudent(socketId: string): Promise<void> {
    return this.request<void>(`/students/${socketId}`, {
      method: 'DELETE',
    });
  }

  // Answer Submission APIs
  async submitAnswer(answerData: SubmitAnswerRequest): Promise<Answer> {
    const response = await this.request<{ data: { answer: Answer } }>('/answers', {
      method: 'POST',
      body: JSON.stringify(answerData),
    });
    return response.data.answer;
  }

  async getPollAnswers(pollId: string): Promise<Answer[]> {
    const response = await this.request<{ data: Answer[] }>(`/answers/poll/${pollId}`);
    return response.data;
  }

  async getStudentAnswer(pollId: string, studentId: string): Promise<Answer | null> {
    try {
      const response = await this.request<{ data: Answer }>(`/answers/poll/${pollId}/student/${studentId}`);
      return response.data;
    } catch (error: any) {
      if (error.message.includes('404')) {
        // 404 is expected when student hasn't answered yet - return null silently
        return null;
      }
      // For other errors, still throw but don't log 404s
      if (!error.message.includes('404')) {
        console.error('API request failed:', error);
      }
      throw error;
    }
  }

  // Chat System APIs
  async sendChatMessage(messageData: SendChatRequest): Promise<ChatMessage> {
    const response = await this.request<{ data: ChatMessage }>('/chat/send', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
    return response.data;
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    const response = await this.request<{ data: { messages: ChatMessage[] } }>('/chat/history');
    return response.data.messages;
  }

  async getRecentChat(): Promise<ChatMessage[]> {
    const response = await this.request<{ data: ChatMessage[] }>('/chat/recent');
    return response.data;
  }

  async deleteChatMessage(messageId: string): Promise<void> {
    return this.request<void>(`/chat/${messageId}`, {
      method: 'DELETE',
    });
  }

  async clearChat(): Promise<void> {
    return this.request<void>('/chat/clear', {
      method: 'DELETE',
    });
  }

  async getChatStats(): Promise<{ totalMessages: number; activeUsers: number }> {
    const response = await this.request<{ data: { totalMessages: number; totalActiveUsers: number } }>('/chat/stats');
    return {
      totalMessages: response.data.totalMessages,
      activeUsers: response.data.totalActiveUsers
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
