import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  XCircle,
  HelpCircle,
  Mic,
  Square,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const InterviewSection = ({ handleFinishInterview }) => {
  const [currentInterview, setCurrentInterview] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const transcriptRef = useRef("");
  const audioRef = useRef(null);

  useEffect(() => {
    const interviewDataString = localStorage.getItem("currentInterview");
    if (interviewDataString) {
      try {
        const data = JSON.parse(interviewDataString);
        setCurrentInterview(data);
      } catch (error) {
        console.error("Failed to load interview", error);
      }
    }
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prevTime) => prevTime + 1);
        transcriptRef.current += " lorem ipsum";
        setCurrentTranscript(transcriptRef.current.trim() + " [speaking...]");
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      if (transcriptRef.current) {
        setCurrentTranscript(transcriptRef.current.trim());
      }
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  useEffect(() => {
    if (currentInterview) {
      setIsRecording(false);
      setElapsedTime(0);
      transcriptRef.current =
        currentInterview.answers?.[currentQuestionIndex] || "";
      setCurrentTranscript(transcriptRef.current);
      setIsProcessing(false);
      generateAndPlayAudio();
    }
  }, [currentQuestionIndex, currentInterview]);

  const generateAndPlayAudio = async () => {
    if (!currentInterview || !currentInterview.questions[currentQuestionIndex])
      return;

    const currentQText = currentInterview.questions[currentQuestionIndex];
    const selectedVoice = currentInterview.setupData.interviewer || "aura-asteria-en";
    const deepgramApiKey = "YOUR_DEEPGRAM_API_KEY"; // Replace with your Deepgram API key
    const deepgramUrl = "https://api.deepgram.com/v1/speak";

    try {
      const response = await fetch(deepgramUrl, {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: currentQText,
          voice: selectedVoice,
        }),
      });

      if (!response.ok) throw new Error("Deepgram API request failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        URL.revokeObjectURL(audioRef.current.src);
      }

      audioRef.current = new Audio(audioUrl);
      audioRef.current.play().catch((error) => {
        console.error("Audio playback failed:", error);
      });
    } catch (error) {
        console.error("Failed to generate audio:", error);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      transcriptRef.current = "";
      setCurrentTranscript("");
      setElapsedTime(0);
      setIsRecording(true);
    } else {
      setIsRecording(false);
    }
  };

  const processAndChangeQuestion = async (newIndex) => {
    if (isProcessing || !currentInterview) return;

    setIsProcessing(true);
    setIsRecording(false);

    const currentAnswer = transcriptRef.current.trim();
    const currentQ = currentInterview.questions[currentQuestionIndex];

    const updatedAnswers = {
      ...currentInterview.answers,
      [currentQuestionIndex]: currentAnswer,
    };
    currentInterview.answers = updatedAnswers;

    try {
      const analysisResult = await simulateAiAnalysis(currentQ, currentAnswer, {
        questionNumber: currentQuestionIndex + 1,
        ...currentInterview,
      });

      const existingAnalyses = currentInterview.questionAnalyses || [];
      const analysisIndex = existingAnalyses.findIndex(
        (a) => a.questionNumber === currentQuestionIndex + 1
      );
      if (analysisIndex > -1) {
        existingAnalyses[analysisIndex] = analysisResult;
      } else {
        existingAnalyses.push(analysisResult);
      }
      currentInterview.questionAnalyses = existingAnalyses.sort(
        (a, b) => a.questionNumber - b.questionNumber
      );

      localStorage.setItem(
        "currentInterview",
        JSON.stringify(currentInterview)
      );
      setCurrentInterview({ ...currentInterview });

      if (newIndex >= 0 && newIndex < currentInterview.questions.length) {
        setCurrentQuestionIndex(newIndex);
      }
    } catch (error) {
      console.error("Error during AI analysis:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndInterviewClick = async () => {
    if (isProcessing) return;

    await processAndChangeQuestion(-1);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      URL.revokeObjectURL(audioRef.current.src);
    }
    handleFinishInterview();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (!currentInterview) {
    return (
      <div className="flex justify-center items-center min-h-screen p-10 text-white">
        Loading Interview...
      </div>
    );
  }

  const questions = currentInterview.questions;
  const currentQText = questions[currentQuestionIndex];

  return (
    <section id="interview" className="min-h-screen p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-white">
          Interview Session
        </h2>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700/30">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <MessageSquare className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="ml-3">
                <p className="text-md font-semibold text-white">
                  AI Interviewer
                </p>
                <p className="text-xs text-gray-400">
                  {currentInterview.setupData.position
                    ? currentInterview.setupData.position
                        .charAt(0)
                        .toUpperCase() +
                      currentInterview.setupData.position.slice(1) +
                      " Specialist"
                    : "Hiring Team"}
                </p>
              </div>
            </div>
            <button
              onClick={handleEndInterviewClick}
              disabled={isProcessing}
              className={`px-3 py-1 rounded-md text-xs transition flex items-center ${
                isProcessing
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-red-500/20 hover:bg-red-500/30 text-red-300"
              }`}
            >
              <XCircle className="h-4 w-4 inline mr-1" />
              End Interview
            </button>
          </div>
          <div className="mb-6">
            <div className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0 mt-1 border border-indigo-500/30">
                <HelpCircle className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
                <h3 className="text-lg font-medium text-white mb-2">
                  {currentQText}
                </h3>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-gray-700/30">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-white">Your Response</h4>
              <div className="flex space-x-2 items-center">
                {isProcessing && (
                  <div className="px-2 py-1 bg-yellow-500/20 rounded text-xs text-yellow-300 flex items-center">
                    <Sparkles className="h-3 w-3 mr-1 animate-spin" />
                    Processing...
                  </div>
                )}
                {isRecording && (
                  <div className="px-2 py-1 bg-green-500/20 rounded text-xs text-green-300 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
                    Recording
                  </div>
                )}
                <span className="text-xs text-gray-400 font-mono">
                  {formatTime(elapsedTime)}
                </span>
              </div>
            </div>
            <div className="flex justify-center mb-6">
              <button
                disabled={isProcessing}
                className={`w-16 h-16 ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                } ${
                  isProcessing ? "opacity-50 cursor-not-allowed" : ""
                } rounded-full flex items-center justify-center text-white focus:outline-none transition transform hover:scale-105 active:scale-95 shadow-lg`}
                onClick={toggleRecording}
              >
                {isRecording ? (
                  <Square className="h-7 w-7" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
            </div>
            <div className="bg-gray-800/70 rounded-lg p-4 mb-3 border border-gray-700/30 min-h-[8rem]">
              {currentTranscript ? (
                <p className="text-gray-300 leading-relaxed">
                  {currentTranscript}
                </p>
              ) : (
                <p className="text-gray-500 italic text-sm">
                  {isRecording
                    ? "Speak now... (simulated transcription)"
                    : "Click the microphone to record your answer."}
                </p>
              )}
              {isRecording && (
                <div className="flex items-center mt-2">
                  <div className="animate-pulse flex">
                    <div className="h-2 w-2 bg-indigo-400 rounded-full mr-1"></div>
                    <div className="h-2 w-2 bg-indigo-400 rounded-full mr-1"></div>
                    <div className="h-2 w-2 bg-indigo-400 rounded-full"></div>
                  </div>
                  <span className="ml-2 text-xs text-gray-400">
                    Listening...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 shadow-lg">
          <h4 className="text-md font-medium text-white mb-4">
            Interview Progress
          </h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>
                  Question {currentQuestionIndex + 1}/{questions.length}
                </span>
                <span>
                  {Math.round(
                    ((currentQuestionIndex + 1) / questions.length) * 100
                  )}
                  % Complete
                </span>
              </div>
              <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${
                      ((currentQuestionIndex + 1) / questions.length) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  disabled={isProcessing}
                  className={`${
                    index === currentQuestionIndex
                      ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                      : "bg-gray-700/50 border-gray-600/30 text-gray-400 hover:bg-gray-700"
                  } ${
                    isProcessing ? "opacity-50 cursor-not-allowed" : ""
                  } p-2 rounded text-center cursor-pointer transition border`}
                  onClick={() => processAndChangeQuestion(index)}
                >
                  <span className="text-xs font-medium">Q{index + 1}</span>
                  <div
                    className={`mt-1 w-full h-1 ${
                      index === currentQuestionIndex
                        ? "bg-indigo-500"
                        : "bg-gray-600"
                    } rounded`}
                  ></div>
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4">
              <button
                disabled={isProcessing}
                className={`px-4 py-2 bg-transparent border border-gray-600 hover:border-gray-500 rounded-md text-sm transition flex items-center ${
                  isProcessing
                    ? "text-gray-500 cursor-not-allowed"
                    : "text-gray-300"
                }`}
                onClick={() => setIsRecording(false)}
              >
                <Square className="h-4 w-4 mr-2" /> Stop Response
              </button>
              <div className="flex space-x-3">
                <button
                  disabled={isProcessing || currentQuestionIndex === 0}
                  className={`px-4 py-2 rounded-md text-sm transition flex items-center ${
                    isProcessing || currentQuestionIndex === 0
                      ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                  onClick={() =>
                    processAndChangeQuestion(currentQuestionIndex - 1)
                  }
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <button
                  disabled={
                    isProcessing ||
                    currentQuestionIndex === questions.length - 1
                  }
                  className={`px-4 py-2 rounded-md text-sm transition flex items-center ${
                    isProcessing ||
                    currentQuestionIndex === questions.length - 1
                      ? "bg-indigo-600/50 text-gray-300 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                  onClick={() =>
                    processAndChangeQuestion(currentQuestionIndex + 1)
                  }
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InterviewSection;