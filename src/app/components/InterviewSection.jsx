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
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

const apiKey = "Y2YyYzE1ZjE0OGMyNDBkMjhjMWEyNmRkNjZjZjEyMjQtMTc0NjI4MTAzMg==";
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const SILENCE_TIMEOUT_MS = 10000;
const NO_RESPONSE_TIMEOUT_MS = 50000;
const MAX_POLL_RETRIES = 20;
const POLL_INTERVAL_MS = 30000;

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showRetry, setShowRetry] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoStatus, setVideoStatus] = useState("idle");
  const noResponseTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastSpokenQuestionRef = useRef(null);
  const videoRef = useRef(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const generateVideo = async (text) => {
    try {
      const res = await fetch("https://api.heygen.com/v2/video/generate", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          caption: false,
          callback_id: "interview_video_" + Date.now(),
          dimension: { width: 640, height: 480 },
          video_inputs: [
            {
              character: {
                type: "avatar",
                avatar_id: formData?.interviewer?.avatar_id,
                offset: { x: 0, y: 0 },
                talking_style: "stable",
                expression: "default",
              },
              voice: {
                type: "text",
                voice_id: formData?.interviewer?.voice_id,
                input_text: text,
                speed: 1.0,
                pitch: 0,
                emotion: "Friendly",
                locale: "en-US",
              },
              background: {
                type: "color",
                value: "#101828",
              },
            },
          ],
          folder_id: "default",
          callback_url: "https://example.com/heygen-callback",
        }),
      });

      const data = await res.json();
      if (!data.data?.video_id)
        throw new Error("Video creation failed: No video ID returned");
      return data.data.video_id;
    } catch (err) {
      console.error("Video generation error:", err);
      throw new Error(`Failed to generate video: ${err.message}`);
    }
  };

  const pollVideoStatus = async (videoId) => {
    let retries = 0;
    while (retries < MAX_POLL_RETRIES) {
      try {
        const res = await fetch(
          `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
          {
            headers: {
              accept: "application/json",
              "x-api-key": apiKey,
            },
          }
        );

        const json = await res.json();
        const status = json.data?.status;

        if (status === "completed") {
          if (!json.data.video_url) throw new Error("Video URL not available");
          return json.data.video_url;
        }
        if (status === "failed") throw new Error("Video generation failed");
        if (status === "waiting") {
          console.log(
            `Video status: waiting, retrying in ${
              POLL_INTERVAL_MS / 1000
            } seconds...`
          );
        } else {
          console.log(
            `Video status: ${status}, retrying in ${
              POLL_INTERVAL_MS / 1000
            } seconds...`
          );
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        retries++;
      } catch (err) {
        console.error("Video status polling error:", err);
        throw new Error(`Failed to poll video status: ${err.message}`);
      }
    }
    throw new Error("Maximum polling retries exceeded");
  };

  useEffect(() => {
    if (
      currentQuestion &&
      !isLoading &&
      !isProcessing &&
      currentQuestion !== lastSpokenQuestionRef.current
    ) {
      setError(null);
      resetTranscript();
      setShowRetry(false);
      lastSpokenQuestionRef.current = currentQuestion;
      generateAndPlayVideo(currentQuestion);
    }
  }, [currentQuestion, isLoading, isProcessing, resetTranscript]);

  useEffect(() => {
    return () => {
      stopRecording();
      clearTimeout(silenceTimerRef.current);
      clearTimeout(noResponseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.onended = () => {
        setVideoStatus("ready");
      };

      videoRef.current.onplay = () => {
        setVideoStatus("playing");
      };

      videoRef.current.onerror = () => {
        setVideoStatus("error");
        setError("Error playing video");
      };
    }
  }, [videoUrl]);

  const generateAndPlayVideo = async (text) => {
    if (!text) return;
    setIsProcessing(true);
    setError(null);
    setVideoStatus("generating");

    try {
      const videoId = await generateVideo(text);
      console.log("Video ID generated:", videoId);

      const url = await pollVideoStatus(videoId);
      console.log("Video URL ready:", url);

      setVideoUrl(url);
      setVideoStatus("ready");
    } catch (err) {
      console.error("Video generation process failed:", err);
      setError(`Video generation failed: ${err.message}`);
      setVideoStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = () => {
    if (!browserSupportsSpeechRecognition) {
      setError("Speech recognition not supported in this browser.");
      return;
    }

    setError(null);
    setShowRetry(false);
    clearTimeout(noResponseTimerRef.current);
    resetTranscript();

    SpeechRecognition.startListening({
      continuous: true,
      interimResults: true,
      language: "en-US",
    });

    noResponseTimerRef.current = setTimeout(() => {
      stopRecording();
      setShowRetry(true);
      setError("No response detected. Retry the question?");
      setIsRecording(false);
    }, NO_RESPONSE_TIMEOUT_MS);
  };

  const stopRecording = () => {
    SpeechRecognition.stopListening();
    clearTimeout(silenceTimerRef.current);
    clearTimeout(noResponseTimerRef.current);

    if (transcript && transcript.trim().length > 0) {
      processResponse(transcript);
    }
  };

  useEffect(() => {
    setIsRecording(listening);

    if (listening) {
      if (transcript) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopRecording();
        }, SILENCE_TIMEOUT_MS);
      }
    } else {
      clearTimeout(silenceTimerRef.current);
    }
  }, [listening, transcript]);

  const processResponse = async (answer) => {
    if (!answer || answer.trim().length === 0) return;

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
    } finally {
      setIsProcessing(false);
    }
  };

  const retryQuestion = () => {
    setError(null);
    setShowRetry(false);
    resetTranscript();
    stopRecording();
    clearTimeout(noResponseTimerRef.current);
    clearTimeout(silenceTimerRef.current);
    setIsRecording(false);
    if (currentQuestion) generateAndPlayVideo(currentQuestion);
  };

  const handleEndInterview = () => {
    stopRecording();
    clearTimeout(silenceTimerRef.current);
    clearTimeout(noResponseTimerRef.current);
    setVideoUrl(null);
    handleFinishInterview();
  };

  const handleManualSubmit = () => {
    stopRecording();
  };

  return (
    <section className="min-h-screen p-4 lg:p-10 flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 text-white">
      <div className="w-full max-w-6xl bg-gray-800/90 backdrop-blur-xl border border-indigo-600/30 rounded-3xl shadow-2xl p-6 md:p-10 space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-indigo-500/40 pb-4">
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-300 flex items-center">
            <Bot className="h-8 w-8 mr-3 text-indigo-400" />
            AI Interview Assistant
          </h2>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-indigo-900/60 rounded-full text-sm font-medium text-indigo-200">
              Question{" "}
              {questions.length > 0
                ? questions.indexOf(currentQuestion) + 1
                : 1}
              /{questions.length || 1}
            </div>
            <button
              onClick={handleEndInterview}
              className="flex items-center px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <Power className="h-5 w-5 mr-2" />
              End Interview
            </button>
          </div>
        </div>

        {/* Main Interview Body */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Video or Loader */}
          <div className="relative w-full md:w-1/2 aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                autoPlay
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                {videoStatus === "generating" || isProcessing ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-3" />
                    <p className="text-indigo-300 text-sm">
                      Generating interview video...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Bot className="h-16 w-16 text-indigo-500/50 mb-3" />
                    <p className="text-gray-500">
                      Interviewer will appear here
                    </p>
                  </div>
                )}
              </div>
            )}

            {videoUrl && videoStatus === "ready" && (
              <button
                onClick={() => videoRef.current?.play()}
                className="absolute bottom-4 right-4 p-2 bg-indigo-600/80 hover:bg-indigo-700 rounded-full shadow-lg"
              >
                <RefreshCw className="h-5 w-5 text-white" />
              </button>
            )}
          </div>

          {/* Question & Answer */}
          <div className="flex flex-col gap-6 w-full md:w-1/2">
            {/* Interviewer Question */}
            <div className="p-6 bg-gray-800/80 border border-indigo-600/40 rounded-2xl shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-700/60 rounded-full flex items-center justify-center">
                  <Bot className="text-indigo-200" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-indigo-300 mb-1">
                    Interviewer Question:
                  </h3>
                  <p className="text-lg text-gray-100 font-medium">
                    {currentQuestion || "Initializing interview..."}
                  </p>
                  {!isProcessing && currentQuestion && (
                    <button
                      onClick={() => generateAndPlayVideo(currentQuestion)}
                      className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 flex items-center"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" /> Replay question
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* User Answer */}
            <div
              className={`p-6 border rounded-2xl shadow-lg transition ${
                isRecording
                  ? "border-red-500/50 shadow-red-900/20"
                  : "border-green-600/50"
              } bg-gray-800/80`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-700/60 rounded-full flex items-center justify-center">
                  <User className="text-green-200" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-green-300 mb-1">
                    Your Answer:
                  </h3>
                  <p className="text-lg text-gray-200 min-h-[80px] leading-relaxed">
                    {transcript ? (
                      transcript
                    ) : (
                      <span className="text-gray-400 italic">
                        {isRecording
                          ? "Recording your answer..."
                          : "Click 'Record Answer' to start."}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={
                    isProcessing ||
                    videoStatus !== "ready"
                  }
                  className="w-48 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md transition transform hover:scale-105 disabled:opacity-50 flex items-center justify-center"
                >
                  <Mic className="mr-2" size={20} />
                  Record Answer
                </button>
              ) : (
                <button
                  onClick={handleManualSubmit}
                  className="w-48 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md transition transform hover:scale-105 flex items-center justify-center"
                >
                  <Square className="mr-2" size={20} />
                  Stop & Submit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recording Controls */}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-600/60 rounded-2xl text-sm text-red-200 flex items-center shadow-md">
            <AlertCircle className="h-5 w-5 mr-3 text-red-400" />
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

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-400 pt-4">
          Click "Record Answer" to start recording. The system auto-submits
          after silence.
        </p>
      </div>
    </section>
  );
};

export default InterviewSection;
