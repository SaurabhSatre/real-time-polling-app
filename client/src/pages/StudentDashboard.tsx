import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Send } from "lucide-react";
import { usePolls } from "@/hooks/usePolls";
import { useStudents } from "@/hooks/useStudents";
import { useAnswers } from "@/hooks/useAnswers";
import { useChat } from "@/hooks/useChat";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";

// Remove local interfaces - using API types instead

const StudentDashboard = () => {
  // API hooks
  const { currentPoll } = usePolls();
  const { createStudent, students } = useStudents();
  const { submitAnswer, getStudentAnswer, getPollAnswers } = useAnswers();
  const { recentChat, sendMessage } = useChat({ includeStats: false });
  const { socket, isConnected, socketId } = useSocket();

  // Get poll answers for real-time results
  const { data: pollAnswers } = getPollAnswers(currentPoll?._id || '');

  // Local state
  const [studentName, setStudentName] = useState("");
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [chatMessage, setChatMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'participants' | 'chat'>('participants');

  // Check if student has already answered current poll
  const { data: studentAnswer } = getStudentAnswer(
    currentPoll?._id || '',
    studentId || ''
  );

  // Update submission status when student answer is loaded
  useEffect(() => {
    if (studentAnswer) {
      setHasSubmitted(true);
      setSelectedOption(studentAnswer.optionId);
    }
  }, [studentAnswer]);

  // Timer countdown
  useEffect(() => {
    if (currentPoll && !hasSubmitted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setHasSubmitted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentPoll, hasSubmitted, timeRemaining]);

  // Reset timer when new poll starts
  useEffect(() => {
    if (currentPoll) {
      setTimeRemaining(currentPoll.timeLimit);
      setHasSubmitted(false);
      setSelectedOption(null);
    }
  }, [currentPoll]);

  const handleNameSubmit = () => {
    if (studentName.trim() && socketId) {
      createStudent({ name: studentName, socketId }, {
        onSuccess: (newStudent) => {
          setStudentId(newStudent._id);
          setHasEnteredName(true);
          toast.success("Successfully joined the session!");
        },
        onError: (error) => {
          toast.error("Failed to join session: " + error.message);
        },
      });
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (!hasSubmitted) {
      setSelectedOption(optionId);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedOption && currentPoll && studentId) {
      const timeToAnswer = currentPoll.timeLimit - timeRemaining;
      submitAnswer({ 
        pollId: currentPoll._id, 
        studentId: studentId,
        optionId: selectedOption,
        timeToAnswer: timeToAnswer
      }, {
        onSuccess: () => {
          setHasSubmitted(true);
          toast.success("Answer submitted successfully!");
        },
        onError: (error) => {
          toast.error("Failed to submit answer: " + error.message);
        },
      });
    }
  };

  const handleSendChatMessage = () => {
    if (chatMessage.trim() && studentId) {
      sendMessage({ 
        senderId: studentId,
        senderName: studentName,
        senderRole: "student",
        message: chatMessage 
      }, {
        onSuccess: () => {
          setChatMessage("");
        },
        onError: (error) => {
          toast.error("Failed to send message: " + error.message);
        },
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate poll results with percentages
  const calculatePollResults = useCallback(() => {
    if (!currentPoll || !pollAnswers) return currentPoll;

    const optionVotes = currentPoll.options.map(option => {
      const votes = pollAnswers.filter(answer => answer.optionId === option.id).length;
      return {
        ...option,
        votes: votes
      };
    });

    const totalVotes = pollAnswers.length;

    return {
      ...currentPoll,
      options: optionVotes,
      totalVotes: totalVotes
    };
  }, [currentPoll, pollAnswers]);

  const pollResults = useMemo(() => calculatePollResults(), [calculatePollResults]);

  const handleTabSwitch = useCallback((tab: 'participants' | 'chat') => {
    setActiveTab(tab);
  }, []);

  const handleChatToggle = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  if (!hasEnteredName) {
    // Name Entry Screen
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium inline-block mb-6">
              ✨ Intervue Poll
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-6">Let's Get Started</h1>
            <p className="text-gray-600 text-center leading-relaxed">
              If you're a student, you'll be able to <strong>submit your answers</strong>, participate in live polls, and see how your responses compare with your classmates
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-800 text-sm font-medium mb-2">Enter your Name</label>
              <Input
                placeholder="Ex :- Saurabh Satre"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                className="w-full bg-gray-100 border-gray-300"
              />
            </div>
            <Button
              onClick={handleNameSubmit}
              disabled={!studentName.trim() || !isConnected}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-3 rounded-full font-medium text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!isConnected ? "Connecting..." : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPoll) {
    // Waiting for Poll
    return (
      <div className="min-h-screen bg-poll-background">
        <div className="bg-poll-surface border-b border-poll-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-poll-primary to-poll-secondary text-white px-3 py-1 rounded-full text-sm font-medium">
                ✨ Intervue Poll
              </div>
              <h1 className="text-2xl font-bold text-poll-text">Student Dashboard</h1>
            </div>
            <div className="flex items-center space-x-2">
              <User size={16} className="text-poll-text-light" />
              <span className="text-poll-text">{studentName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Card className="w-full max-w-md">
            <CardContent className="text-center py-12">
              <div className="animate-pulse">
                <div className="w-16 h-16 bg-gradient-to-r from-poll-primary to-poll-secondary rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Clock size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-poll-text mb-2">Waiting for Question</h3>
                <p className="text-poll-text-light">Your teacher will start a poll shortly...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Active Poll or Results
  return (
    <div className="min-h-screen bg-white relative">
      {/* Main Content Area */}
      <div className="flex">
        {/* Left Content */}
        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Question 1</h1>
              {!hasSubmitted && (
                <div className="flex items-center space-x-2">
                  <Clock size={16} className="text-red-500" />
                  <span className="text-red-500 font-medium">{formatTime(timeRemaining)}</span>
                </div>
              )}
            </div>

            {/* Question Box */}
            <div className="bg-gray-800 text-white p-6 rounded-lg mb-6">
              <h3 className="text-lg font-medium">{currentPoll.question}</h3>
            </div>

            {!hasSubmitted ? (
              // Answer Selection
              <div className="space-y-3 mb-6">
                {currentPoll.options.map((option, index) => (
                  <div
                    key={option.id}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedOption === option.id
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-300 hover:border-purple-300 hover:bg-gray-50"
                    }`}
                    onClick={() => handleOptionSelect(option.id)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      selectedOption === option.id
                        ? "bg-purple-500 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-gray-800 font-medium flex-1">{option.text}</span>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedOption === option.id
                        ? "border-purple-500 bg-purple-500"
                        : "border-gray-300"
                    }`} />
                  </div>
                ))}
              </div>
            ) : (
              // Results View - Matching the image design
              <div className="space-y-3 mb-6">
                {pollResults?.options.map((option, index) => {
                  const percentage = pollResults.totalVotes > 0 
                    ? Math.round((option.votes / pollResults.totalVotes) * 100) 
                    : 0;
                  
                  const isSelected = selectedOption === option.id;
                  
                  return (
                    <div key={option.id} className="flex items-center space-x-3">
                      <div className="bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className={`flex items-center justify-between p-3 rounded-lg ${
                          isSelected ? 'bg-purple-500' : 'bg-gray-100'
                        }`}>
                          <span className={`font-medium ${
                            isSelected ? 'text-white' : 'text-gray-800'
                          }`}>
                            {option.text}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className={`w-20 h-2 rounded-full ${
                              isSelected ? 'bg-purple-300' : 'bg-gray-300'
                            }`}>
                              <div 
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  isSelected ? 'bg-white' : 'bg-gray-500'
                                }`}
                                style={{ width: `${Math.max(percentage, 5)}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium ${
                              isSelected ? 'text-white' : 'text-gray-800'
                            }`}>
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!hasSubmitted && timeRemaining > 0 && (
              <div className="flex justify-center">
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOption}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-3 rounded-full font-medium text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </Button>
              </div>
            )}

            {hasSubmitted && (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Wait for the teacher to ask a new question..
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Panel - Only show when results are displayed */}
        {hasSubmitted && (
          <div className="w-80 bg-white border-l border-gray-200 shadow-lg z-10">
            {/* Panel Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex space-x-4">
                <button
                  onClick={() => handleTabSwitch('participants')}
                  className={`pb-2 text-sm font-medium ${
                    activeTab === 'participants'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Participants ({students.length})
                </button>
                <button
                  onClick={() => handleTabSwitch('chat')}
                  className={`pb-4 text-sm font-medium relative ${
                    activeTab === 'chat'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Chat
                  {recentChat.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {recentChat.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="p-4">
              {activeTab === 'participants' ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-800 mb-3">Name</h3>
                  <div className="space-y-2">
                    {students.length > 0 ? (
                      students.map((student) => (
                        <div key={student._id} className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm text-gray-800">{student.name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Loading participants...</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
  {/* Chat messages */}
  <div className="space-y-3 max-h-64 overflow-y-auto mb-3 p-2 bg-gray-100 rounded-xl shadow-inner">
    {recentChat.map((message) => (
      <div
        key={message._id}
        className="bg-white shadow-sm border border-gray-200 rounded-xl p-3 text-left hover:shadow-md transition"
      >
        <div className="text-[11px] text-purple-600 font-semibold mb-1">
          {message.senderName}
        </div>
        <div className="text-sm text-gray-800">{message.message}</div>
      </div>
    ))}

    {recentChat.length === 0 && (
      <div className="text-center text-gray-500 text-xs py-6 italic">
        No messages yet
      </div>
    )}
  </div>

  {/* Input section */}
  <div className="flex items-center space-x-2 border-t border-gray-200 pt-2">
    <Input
      placeholder="Type a message..."
      value={chatMessage}
      onChange={(e) => setChatMessage(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
      className="flex-1 text-sm rounded-full px-4 py-2 border-gray-300 focus:ring-2 focus:ring-purple-400 focus:outline-none"
    />
    <Button
      onClick={handleSendChatMessage}
      disabled={!chatMessage.trim()}
      size="icon"
      className="rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-md transition"
    >
      <Send size={16} />
    </Button>
  </div>
</div>

              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Button - Only show when results are displayed */}
      {hasSubmitted && (
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={() => handleTabSwitch('chat')}
            className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full shadow-lg animate-pulse"
          >
            <Send size={20} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;