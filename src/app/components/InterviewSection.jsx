import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Loader2,
  AlertCircle,
  Power,
  RefreshCw,
  User,
  Bot,
  Square,
  Send
} from "lucide-react";
import { useAppContext } from "../context/AppContext";

const DEEPGRAM_API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak";
const DEEPGRAM_STT_URL =
  "https://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true";
const RECORDING_MIMETYPE = "audio/webm";
const SILENCE_TIMEOUT_MS = 10000;
const NO_RESPONSE_TIMEOUT_MS = 50000;
const MIN_RECORDING_DURATION_MS = 50000;

const InterviewSection = ({ handleFinishInterview }) => {
  const {
    formData,
    questions,
    setQuestions,
    currentQuestion,
    setCurrentQuestion,
    answers,
    setAnswers,
    isLoading,
  } = useAppContext();
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const [showRetry, setShowRetry] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const noResponseTimerRef = useRef(null);
  const lastSpokenQuestionRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  useEffect(() => {
    if (
      currentQuestion &&
      !isLoading &&
      !isSpeaking &&
      currentQuestion !== lastSpokenQuestionRef.current
    ) {
      setError(null);
      setTranscript("");
      setShowRetry(false);
      lastSpokenQuestionRef.current = currentQuestion;
      speakQuestion(currentQuestion);
    }
  }, [currentQuestion, isLoading, isSpeaking]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      clearTimeout(silenceTimerRef.current);
      clearTimeout(noResponseTimerRef.current);
    };
  }, []);

  const speakQuestion = async (text) => {
    if (!text) return;
    setIsProcessing(true);
    setIsSpeaking(true);
    setError(null);

    try {
      const response = await fetch(
        `${DEEPGRAM_TTS_URL}?model=${formData.interviewer}`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${DEEPGRAM_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate audio");
      const blob = await response.blob();

      const audioUrl = URL.createObjectURL(blob);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        // No longer auto-starting recording here
      };
      await audioRef.current.play();
    } catch (err) {
      setError(`Audio playback failed: ${err.message}`);
      setIsSpeaking(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    setShowRetry(false);
    clearTimeout(noResponseTimerRef.current);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: RECORDING_MIMETYPE,
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          clearTimeout(silenceTimerRef.current);
          if (
            Date.now() - recordingStartTimeRef.current >=
            MIN_RECORDING_DURATION_MS
          ) {
            silenceTimerRef.current = setTimeout(
              stopRecording,
              SILENCE_TIMEOUT_MS
            );
          }
        }
      };

      mediaRecorderRef.current.onstart = () => {
        setIsRecording(true);
        recordingStartTimeRef.current = Date.now();
        noResponseTimerRef.current = setTimeout(() => {
          stopRecording();
          setShowRetry(true);
          setError("No response detected. Retry the question?");
          setIsRecording(false);
        }, NO_RESPONSE_TIMEOUT_MS);
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        clearTimeout(silenceTimerRef.current);
        clearTimeout(noResponseTimerRef.current);

        if (!audioChunksRef.current.length) {
          setTranscript("");
          await processResponse("");
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: RECORDING_MIMETYPE,
        });
        audioChunksRef.current = [];
        await transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current.onerror = () => {
        setError("Recording failed. Please check your microphone.");
        setIsRecording(false);
        setIsProcessing(false);
      };

      mediaRecorderRef.current.start(500);
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow access."
          : "Microphone unavailable or access failed."
      );
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    clearTimeout(silenceTimerRef.current);
  };

  const transcribeAudio = async (audioBlob) => {
    if (!audioBlob?.size) {
      setTranscript("");
      await processResponse("");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(DEEPGRAM_STT_URL, {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": audioBlob.type,
        },
        body: audioBlob,
      });

      if (!response.ok) throw new Error("Transcription failed");
      const data = await response.json();
      const text =
        data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      setTranscript(text);
      await processResponse(text);
    } catch (err) {
      setError(`Transcription error: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const processResponse = async (answer) => {
    setIsProcessing(true);
    if (currentQuestion) {
      setAnswers((prev) => ({ ...prev, [currentQuestion]: answer }));
    }

    const history = questions
      .map((q) => `Interviewer: ${q}\nYou: ${answers[q] || "(No answer)"}`)
      .join("\n\n");
    const prompt = `You are an interviewer. History:\n${history}\nPrevious question: "${currentQuestion}"\nAnswer: "${
      answer || "(No answer)"
    }"\nAsk the next relevant question. Return only the question. Question length not more than 20 words.`;

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "text/plain" },
        }),
      });

      if (!response.ok) throw new Error("Failed to generate question");
      const data = await response.json();
      const nextQuestion =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Can you share more about your experience?";
      setQuestions((prev) => [...prev, nextQuestion]);
      setCurrentQuestion(nextQuestion);
    } catch (err) {
      setError("Failed to generate next question");
      setIsProcessing(false);
    }
  };

  const retryQuestion = () => {
    setError(null);
    setShowRetry(false);
    setTranscript("");
    stopRecording();
    clearTimeout(noResponseTimerRef.current);
    clearTimeout(silenceTimerRef.current);
    setIsRecording(false);
    if (currentQuestion) speakQuestion(currentQuestion);
  };

  const handleEndInterview = () => {
    stopRecording();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    clearTimeout(silenceTimerRef.current);
    clearTimeout(noResponseTimerRef.current);
    handleFinishInterview();
  };

  const handleManualSubmit = () => {
    stopRecording();
  };

  return (
    <section className="min-h-screen p-4 lg:p-8 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white animate-gradient-bg">
      <div className="w-full max-w-4xl bg-gray-900/90 backdrop-blur-xl border border-purple-500/40 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col space-y-6 transform transition-all duration-500">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-purple-500/30 pb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-purple-300 flex items-center">
            <Bot className="h-6 w-6 mr-3 text-purple-400" />
            AI Interview Assistant
          </h2>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-purple-900/60 rounded-full text-xs font-medium text-purple-200">
              Question {questions.length > 0 ? questions.indexOf(currentQuestion) + 1 : 1}/{questions.length || 1}
            </div>
            <button
              onClick={handleEndInterview}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
              disabled={isProcessing}
              aria-label="End Interview"
            >
              <Power className="h-4 w-4 mr-2" />
              End Interview
            </button>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="text-center h-8 flex items-center justify-center">
          {isProcessing && (
            <div className="flex items-center text-sm text-purple-200 animate-pulse">
              <Loader2 className="h-5 w-5 mr-2 animate-spin text-purple-400" />
              Processing...
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center text-sm text-blue-300 animate-pulse">
              <Bot className="h-5 w-5 mr-2" />
              Interviewer Speaking...
            </div>
          )}
          {isRecording && (
            <div className="flex items-center text-sm text-red-400 animate-pulse">
              <Mic className="h-5 w-5 mr-2 text-red-500" />
              Recording Your Answer...
            </div>
          )}
        </div>

        {/* Question Display */}
        <div className="p-6 bg-gray-800/80 border border-purple-600/40 rounded-xl shadow-lg transform transition-all duration-300 hover:shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-700/60 flex items-center justify-center flex-shrink-0">
              <Bot size={20} className="text-purple-200" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-purple-300 mb-2">Interviewer Question:</h3>
              <p className="text-lg text-gray-100 font-medium leading-relaxed">
                {currentQuestion || "Initializing interview..."}
              </p>
              {!isSpeaking && currentQuestion && (
                <button 
                  onClick={() => speakQuestion(currentQuestion)}
                  className="mt-3 text-xs flex items-center text-purple-400 hover:text-purple-300"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Replay question
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Answer Display */}
        <div 
          className={`p-6 bg-gray-800/60 border rounded-xl shadow-lg transition-all duration-300 ${
            isRecording ? "border-red-500/50 shadow-red-900/20" : "border-green-600/40"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-700/60 flex items-center justify-center flex-shrink-0">
              <User size={20} className="text-green-200" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-green-300 mb-2">Your Answer:</h3>
              <p className="text-lg text-gray-200 leading-relaxed min-h-[80px]">
                {transcript ? (
                  transcript
                ) : (
                  <span className="text-gray-400 italic">
                    {isRecording ? "Recording your answer..." : "Click 'Record Answer' to start recording"}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex justify-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-40 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-semibold py-3 px-6 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
              disabled={isSpeaking || isProcessing}
            >
              <Mic className="mr-2" size={40} />
              Record Answer
            </button>
          ) : (
            <button
              onClick={handleManualSubmit}
              className="w-40 rounded-full bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white font-semibold py-3 px-6 shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
              type="submit"
            >
              <Square className="mr-2" size={40} />
              Stop & Submit
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div
            className="p-4 bg-red-900/40 border border-red-600/50 rounded-xl text-sm text-red-200 flex items-center shadow-md"
            role="alert"
          >
            <AlertCircle className="h-6 w-6 mr-3 text-red-400 flex-shrink-0" />
            <div>
              {error}
              {showRetry && (
                <button
                  onClick={retryQuestion}
                  className="ml-3 underline text-red-300 hover:text-red-200"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="text-center text-xs text-gray-400 pt-2">
          <p>Click "Record Answer" to start recording and "Stop & Submit" when finished.</p>
        </div>
      </div>
    </section>
  );
};

export default InterviewSection;