import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Loader2,
  AlertCircle,
  Power,
  RefreshCw,
  User,
  Bot,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";

const DEEPGRAM_API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak";
const DEEPGRAM_STT_URL =
  "https://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true";
const RECORDING_MIMETYPE = "audio/webm";
const SILENCE_TIMEOUT_MS = 8000;
const NO_RESPONSE_TIMEOUT_MS = 10000;
const MIN_RECORDING_DURATION_MS = 5000;

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
      if (!blob.type.startsWith("audio/"))
        throw new Error("Invalid audio response");

      const audioUrl = URL.createObjectURL(blob);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        startRecording();
      };
      await audioRef.current.play();
    } catch (err) {
      setError(`Audio playback failed: ${err.message}`);
      setIsSpeaking(false);
      startRecording();
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
    }"\nAsk the next relevant question. Return only the question.`;

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

  return (
    <section className="min-h-screen p-4 lg:p-8 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-black text-white animate-gradient-bg">
      <div className="w-full max-w-4xl bg-gray-800/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl p-6 md:p-10 flex flex-col space-y-8 transform transition-all duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-indigo-300 flex items-center animate-fade-in">
            <Bot className="h-6 w-6 mr-3 text-indigo-400 animate-pulse" />
            AI Interview Session
          </h2>
          <button
            onClick={handleEndInterview}
            className="flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400"
            disabled={isProcessing && !isRecording}
            aria-label="End Interview"
          >
            <Power className="h-4 w-4 mr-2" />
            End Interview
          </button>
        </div>

        <div className="text-center text-sm text-gray-300 animate-fade-in">
          <p>
            Question{" "}
            {questions.length > 0 ? questions.indexOf(currentQuestion) + 1 : 1}{" "}
            of {questions.length || 1}
          </p>
        </div>

        <div className="text-center h-10 flex items-center justify-center">
          {isProcessing && !isRecording && (
            <div className="flex items-center text-sm text-gray-200 animate-pulse">
              <Loader2 className="h-5 w-5 mr-2 animate-spin text-indigo-400" />
              Processing...
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center text-sm text-indigo-300 animate-pulse">
              <Bot className="h-5 w-5 mr-2 animate-bounce" />
              Interviewer Speaking...
            </div>
          )}
          {isRecording && (
            <div className="flex items-center text-sm text-green-400 animate-pulse">
              <Mic className="h-5 w-5 mr-2 text-red-500 animate-ping" />
              Recording Your Answer...
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-900/70 border border-indigo-600/40 rounded-xl min-h-[120px] flex items-center shadow-inner transform transition-all duration-300 hover:shadow-xl animate-fade-in">
          <Bot
            size={28}
            className="mr-4 text-indigo-400 flex-shrink-0 animate-spin-slow"
          />
          <p className="text-lg md:text-xl text-gray-100 font-semibold leading-relaxed">
            {currentQuestion || "Initializing interview..."}
          </p>
        </div>

        <div
          className="p-6 bg-gray-800/70 border rounded-xl min-h-[120px] flex items-center shadow-inner transition-all duration-300 hover:shadow-xl animate-fade-in"
          style={{
            borderColor: isRecording
              ? "rgba(74, 222, 128, 0.5)"
              : "rgba(22, 163, 74, 0.4)",
          }}
        >
          <User
            size={28}
            className="mr-4 text-green-400 flex-shrink-0 animate-pulse"
          />
          <p className="text-lg md:text-xl text-gray-200 italic leading-relaxed">
            {transcript ||
              (isRecording ? (
                <span className="text-green-300">Recording...</span>
              ) : (
                <span className="text-gray-400">
                  Your answer will appear here
                </span>
              ))}
          </p>
        </div>

        {error && (
          <div
            className="p-4 bg-red-900/50 border border-red-600/50 rounded-xl text-sm text-red-200 flex items-center shadow-md animate-shake"
            role="alert"
          >
            <AlertCircle className="h-6 w-6 mr-3 text-red-400 flex-shrink-0" />
            {error}
          </div>
        )}

        {showRetry && (
          <div className="flex justify-center animate-fade-in">
            <button
              onClick={retryQuestion}
              className="flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              disabled={isProcessing}
              aria-label="Retry Question"
            >
              <RefreshCw className="h-4 w-4 mr-2 animate-spin-slow" />
              Retry Question
            </button>
          </div>
        )}

        <div className="pt-6 text-center text-xs text-gray-400 animate-fade-in">
          {!isRecording && !isSpeaking && !isProcessing && !showRetry && (
            <p>Ready for your next answer</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default InterviewSection;
