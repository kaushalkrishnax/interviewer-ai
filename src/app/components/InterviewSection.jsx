import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Loader2,
  AlertCircle,
  Power,
  RefreshCw,
  User,
  Bot,
  Send,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";

const DEEPGRAM_API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak";
const DEEPGRAM_STT_URL =
  "https://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true";
const RECORDING_MIMETYPE = "audio/webm";
const NO_RESPONSE_TIMEOUT_MS = 10000;

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
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const noResponseTimerRef = useRef(null);
  const lastSpokenQuestionRef = useRef(null);

  useEffect(() => {
    if (
      currentQuestion &&
      !isLoading &&
      !isSpeaking &&
      currentQuestion !== lastSpokenQuestionRef.current
    ) {
      setError(null);
      setTranscript("");
      lastSpokenQuestionRef.current = currentQuestion;
      speakQuestion(currentQuestion);
    }
  }, [currentQuestion, isLoading, isSpeaking]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRefBeamRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
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
            " Ditent-Type": "application/json",
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
        }
      };

      mediaRecorderRef.current.onstart = () => {
        setIsRecording(true);
        noResponseTimerRef.current = setTimeout(() => {
          stopRecording();
          setError("No response detected. Please try again.");
          setIsRecording(false);
        }, NO_RESPONSE_TIMEOUT_MS);
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);
        clearTimeout(noResponseTimerRef.current);
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
  };

  const submitRecording = async () => {
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
    clearTimeout(noResponseTimerRef.current);
    handleFinishInterview();
  };

  return (
    <section className="min-h-screen p-6 flex flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Bot className="h-8 w-8 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-800">AI Interview</h2>
          </div>
          <button
            onClick={handleEndInterview}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            disabled={isProcessing}
          >
            <Power className="h-5 w-5 mr-2" />
            End Interview
          </button>
        </div>

        <div className="text-center text-gray-600">
          <p>
            Question{" "}
            {questions.length > 0 ? questions.indexOf(currentQuestion) + 1 : 1} of{" "}
            {questions.length || 1}
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          {isProcessing && !isRecording && (
            <div className="flex items-center text-gray-600">
              <Loader2 className="h-5 w-5 mr-2 animate-spin text-blue-500" />
              Processing...
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center text-gray-600">
              <Bot className="h-5 w-5 mr-2 text-blue-500" />
              Speaking...
            </div>
          )}
          {isRecording && (
            <div className="flex items-center text-green-600">
              <Mic className="h-5 w-5 mr-2 animate-pulse text-red-500" />
              Recording...
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start space-x-3">
            <Bot className="h-6 w-6 text-blue-500 flex-shrink-0" />
            <p className="text-lg text-gray-800">
              {currentQuestion || "Initializing interview..."}
            </p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-green-200">
          <div className="flex items-start space-x-3">
            <User className="h-6 w-6 text-green-500 flex-shrink-0" />
            <p className="text-lg text-gray-700">
              {transcript || (
                <span className="text-gray-500">Your answer will appear here</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={startRecording}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            disabled={isRecording || isSpeaking || isProcessing}
          >
            <Mic className="h-5 w-5 mr-2" />
            Start Recording
          </button>
          <button
            onClick={stopRecording}
            className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            disabled={!isRecording}
          >
            <Mic className="h-5 w-5 mr-2" />
            Stop Recording
          </button>
          <button
            onClick={submitRecording}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            disabled={isRecording || isSpeaking || isProcessing}
          >
            <Send className="h-5 w-5 mr-2" />
            Submit Answer
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex items-center text-red-700">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
      </div>
    </section>
  );
};

export default InterviewSection;