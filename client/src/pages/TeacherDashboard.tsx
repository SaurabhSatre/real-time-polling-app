import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, Users, MessageCircle, Send } from "lucide-react";
import { usePolls } from "@/hooks/usePolls";
import { useStudents } from "@/hooks/useStudents";
import { useChat } from "@/hooks/useChat";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";

// Remove local interfaces - using API types instead

const TeacherDashboard = () => {
  // API hooks
  const { currentPoll, pollHistory, createPoll, endPoll, isCreatingPoll, isEndingPoll } = usePolls();
  const { students, kickStudent, isKickingStudent } = useStudents();
  const { recentChat, sendMessage, isSendingMessage } = useChat();
  const { socket, isConnected } = useSocket();

  // New poll form state
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [timeLimit, setTimeLimit] = useState(60);
  
  // Chat state
  const [chatMessage, setChatMessage] = useState("");

  const handleAddOption = () => {
    setNewOptions([...newOptions, ""]);
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  const handleCreatePoll = () => {
    if (newQuestion.trim() && newOptions.every(opt => opt.trim())) {
      const pollData = {
        question: newQuestion,
        options: newOptions.filter(opt => opt.trim()),
        timeLimit,
      };
      
      createPoll(pollData, {
        onSuccess: () => {
          toast.success("Poll created successfully!");
          setNewQuestion("");
          setNewOptions(["", ""]);
          setTimeLimit(60);
        },
        onError: (error) => {
          toast.error("Failed to create poll: " + error.message);
        },
      });
    }
  };

  const handleEndPoll = () => {
    if (currentPoll) {
      endPoll(currentPoll._id, {
        onSuccess: () => {
          toast.success("Poll ended successfully!");
        },
        onError: (error) => {
          toast.error("Failed to end poll: " + error.message);
        },
      });
    }
  };

  const handleKickParticipant = (studentId: string) => {
    kickStudent(studentId, {
      onSuccess: () => {
        toast.success("Student kicked successfully!");
      },
      onError: (error) => {
        toast.error("Failed to kick student: " + error.message);
      },
    });
  };

  const handleSendChatMessage = () => {
    if (chatMessage.trim()) {
      sendMessage({ 
        senderId: "teacher",
        senderName: "Teacher",
        senderRole: "teacher",
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✨ Intervue Poll
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <Users size={16} />
              <span>{students.length} participants</span>
            </div>
            <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {!currentPoll ? (
          // Create New Poll
          <div className="max-w-4xl mx-auto">
            <Card className="mb-6 shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-800">Let's Get Started</CardTitle>
                <p className="text-gray-600">
                  You'll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      Enter your question
                    </label>
                    <Textarea
                      placeholder="Type your question here..."
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="min-h-[100px] border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                    <div className="text-right text-sm text-gray-500 mt-1">
                      {newQuestion.length}/200
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-800">
                        Time Limit
                      </label>
                      <Select value={timeLimit.toString()} onValueChange={(value) => setTimeLimit(Number(value))}>
                        <SelectTrigger className="w-32 border-gray-300 focus:border-purple-500 focus:ring-purple-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 seconds</SelectItem>
                          <SelectItem value="60">60 seconds</SelectItem>
                          <SelectItem value="90">90 seconds</SelectItem>
                          <SelectItem value="120">2 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-800">
                      Edit Options
                    </label>
                  </div>
                  
                  <div className="space-y-3">
                    {newOptions.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="flex-1 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleAddOption}
                    className="mt-4 text-purple-600 border-purple-600 hover:bg-purple-50"
                  >
                    <Plus size={16} className="mr-2" />
                    Add More option
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleCreatePoll}
                    disabled={!newQuestion.trim() || !newOptions.every(opt => opt.trim()) || isCreatingPoll}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-3 rounded-full font-medium text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingPoll ? "Creating..." : "Ask Question"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Active Poll
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Poll Results */}
              <div className="lg:col-span-2">
                <Card className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-800">Question</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Clock size={16} className="text-gray-500" />
                        <span className="text-gray-500">Live Poll</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-800 text-white p-6 rounded-lg mb-6">
                      <h3 className="text-lg font-medium">{currentPoll.question}</h3>
                    </div>

                    <div className="space-y-3">
                      {currentPoll.options.map((option, index) => {
                        // Calculate total votes from all options to ensure accurate percentage
                        const totalVotes = currentPoll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
                        const percentage = totalVotes > 0 
                          ? Math.round(((option.votes || 0) / totalVotes) * 100) 
                          : 0;
                        
                        return (
                          <div key={option.id} className="flex items-center space-x-3">
                            <div className="bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-gray-800 font-medium">{option.text}</span>
                                <span className="text-gray-500">{percentage}% ({option.votes || 0} votes)</span>
                              </div>
                              <div className="w-full bg-gray-300 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-center mt-8">
                      <Button
                        onClick={handleEndPoll}
                        disabled={isEndingPoll}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-3 rounded-full font-medium text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} className="mr-2" />
                        {isEndingPoll ? "Ending..." : "Ask a new question"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Participants Panel */}
              <div>
                <Card className="shadow-lg">
                  <CardHeader>
                    <Tabs defaultValue="participants" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                        <TabsTrigger value="chat" className="text-sm data-[state=active]:bg-white data-[state=active]:text-purple-600">Chat</TabsTrigger>
                        <TabsTrigger value="participants" className="text-sm data-[state=active]:bg-white data-[state=active]:text-purple-600">Participants</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="participants" className="mt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Name</span>
                            <span>Action</span>
                          </div>
                          {students.map((student) => (
                            <div key={student._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${student.hasAnswered ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                <span className="text-gray-800 text-sm">{student.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleKickParticipant(student._id)}
                                disabled={isKickingStudent}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                              >
                                {isKickingStudent ? "Kicking..." : "Kick out"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="chat" className="mt-4">
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {recentChat.map((message) => (
                            <div key={message._id} className="bg-gray-50 rounded-lg p-3">
                              <div className="text-sm text-purple-600 font-medium mb-1">{message.senderName}</div>
                              <div className="text-sm text-gray-800">{message.message}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                          {recentChat.length === 0 && (
                            <div className="text-center text-gray-500 text-sm py-4">
                              No messages yet
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2 mt-4">
                          <Input
                            placeholder="Type a message..."
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                            className="flex-1 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                          />
                          <Button
                            onClick={handleSendChatMessage}
                            disabled={!chatMessage.trim() || isSendingMessage}
                            size="sm"
                            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                          >
                            <Send size={16} />
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Poll History */}
        {pollHistory.length > 0 && (
          <div className="max-w-4xl mx-auto mt-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-800">View Poll History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {pollHistory.map((poll, index) => (
                    <div key={poll._id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-3">Question {index + 1}</h4>
                      <p className="text-gray-800 mb-4">{poll.question}</p>
                      
                      <div className="space-y-2">
                        {poll.options.map((option) => {
                          // Calculate total votes from all options to ensure accurate percentage
                          const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
                          const percentage = totalVotes > 0 
                            ? Math.round(((option.votes || 0) / totalVotes) * 100) 
                            : 0;
                          
                          return (
                            <div key={option.id} className="flex items-center justify-between">
                              <span className="text-gray-800">{option.text}</span>
                              <span className="text-gray-500">{percentage}% ({option.votes || 0} votes)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;