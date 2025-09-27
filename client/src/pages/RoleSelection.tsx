import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const RoleSelection = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>("student");
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedRole === "student") {
      navigate("/student");
    } else if (selectedRole === "teacher") {
      navigate("/teacher");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
            ✨ Intervue Poll
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-4">
          Welcome to the Live Polling System
        </h1>
        
        <p className="text-gray-600 text-center max-w-md mx-auto">
          Please select the role that best describes you to begin using the live polling system
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="flex gap-6 w-full max-w-2xl mb-8">
        <Card 
          className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
            selectedRole === "student" 
              ? "border-2 border-purple-500 bg-white" 
              : "border border-gray-300 bg-white hover:bg-gray-50"
          }`}
          onClick={() => setSelectedRole("student")}
        >
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">
              I'm a Student
            </CardTitle>
            <CardDescription className="text-gray-600">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
            selectedRole === "teacher" 
              ? "border-2 border-purple-500 bg-white" 
              : "border border-gray-300 bg-white hover:bg-gray-50"
          }`}
          onClick={() => setSelectedRole("teacher")}
        >
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800">
              I'm a Teacher
            </CardTitle>
            <CardDescription className="text-gray-600">
              Create and manage polls, ask questions, and monitor responses.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Continue Button */}
      <Button 
        onClick={handleContinue}
        disabled={!selectedRole}
        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-3 rounded-full font-medium text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </Button>
    </div>
  );
};

export default RoleSelection;