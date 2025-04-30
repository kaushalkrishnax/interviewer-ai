import React, { useState, useEffect, useRef } from "react";
import { PenTool, ChevronDown, Play, AlertCircle, RotateCcw, Loader2 } from "lucide-react";
import { useAppContext } from "../context/AppContext";

const GEMINI_API_KEY = "AIzaSyC7RpKgmdi9oKB18-tFJOtaZubzkzWw_Uw";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const CONVERT_API_URL = "https://v2.convertapi.com/convert/pdf/to/txt";
const CONVERT_API_KEY = "secret_DZhUR7COXGqA3VxR";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const SetupSection = ({ startInterview }) => {
  const { setQuestions, setCurrentQuestion, isLoading, setIsLoading, formData, setFormData } = useAppContext();
  const [formErrors, setFormErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedSetup = localStorage.getItem("interviewSetup");
    const savedErrors = localStorage.getItem("interviewSetupErrors");
    if (savedSetup) {
      try {
        const data = JSON.parse(savedSetup);
        // Ensure interviewer has a default value
        if (!data.interviewer) {
          data.interviewer = "aura-2-asteria-en";
        }
        setFormData(data);
      } catch (error) {
        console.error("Failed to parse setup", error);
        localStorage.removeItem("interviewSetup");
      }
    }
    if (savedErrors) {
      try {
        setFormErrors(JSON.parse(savedErrors));
      } catch (error) {
        console.error("Failed to parse errors", error);
        localStorage.removeItem("interviewSetupErrors");
      }
    }
  }, [setFormData]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    const updatedData = { ...formData, [id]: value };
    setFormData(updatedData);
    localStorage.setItem("interviewSetup", JSON.stringify(updatedData));
    // Real-time validation
    const errors = validateField(id, value);
    const newErrors = { ...formErrors, [id]: errors[id] };
    setFormErrors(newErrors);
    localStorage.setItem("interviewSetupErrors", JSON.stringify(newErrors));
  };

  const validateField = (id, value) => {
    const errors = {};
    if (id === "instructions" && !value.trim()) {
      errors.instructions = "Instructions are required";
    }
    if (id === "position" && !value) {
      errors.position = "Job position is required";
    }
    return errors;
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.instructions.trim()) errors.instructions = "Instructions are required";
    if (!formData.position) errors.position = "Job position is required";
    return errors;
  };

  const extractTextFromPDF = async (base64DataUrl) => {
    setIsUploading(true);
    setFormErrors({ ...formErrors, resume: null });
    try {
      const base64 = base64DataUrl.split(",")[1];
      const response = await fetch(CONVERT_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CONVERT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Parameters: [
            {
              Name: "File",
              FileValue: {
                Name: "resume.pdf",
                Data: base64,
              },
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed to extract text from PDF");
      const data = await response.json();
      if (!data.Files?.[0]?.FileData) throw new Error("Invalid PDF response");
      const text = atob(data.Files[0].FileData);
      setFormData((prev) => ({ ...prev, resume: text }));
      return text;
    } catch (error) {
      console.error("PDF extraction error:", error);
      setFormErrors({ ...formErrors, resume: "Failed to process PDF. Please try another file." });
      return "";
    } finally {
      setIsUploading(false);
    }
  };

  const callGeminiAPI = async (prompt) => {
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "text/plain" },
        }),
      });

      if (!response.ok) throw new Error("Gemini API request failed");
      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Tell me about your experience related to this position?";
    } catch (error) {
      console.error("Gemini API error:", error);
      return "Tell me about your experience related to this position?";
    }
  };

  const handleStartInterview = async () => {
    setSubmitAttempted(true);
    const errors = validateForm();
    setFormErrors(errors);
    localStorage.setItem("interviewSetupErrors", JSON.stringify(errors));
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      let resumeText = "";
      if (formData.resume && formData.resume.startsWith("data:application/pdf")) {
        resumeText = await extractTextFromPDF(formData.resume);
      }

      const prompt = `
        Generate only the FIRST question for an interactive interview for a ${formData.position || "role"} role.
        Context:
        - This is for an interactive interview simulation where the AI acts as the interviewer.
        - Generate only the opening question to start the conversation.
        - Instructions: ${formData.instructions || "None"}. This is not Kaushal, any stranger can be here.
        - Resume: ${resumeText || "None"}
        Return a single, well-crafted opening question as plain text.
      `;

      const firstQuestion = await callGeminiAPI(prompt);
      const generatedQuestions = [firstQuestion];

      if (!firstQuestion || typeof firstQuestion !== "string") {
        throw new Error("Invalid response from Gemini. Expected a single question.");
      }

      setCurrentQuestion(firstQuestion);
      setQuestions(generatedQuestions);

      const now = new Date();
      const formattedDate = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const interview = {
        title: `${formData.position || "role"} Interview`,
        date: formattedDate,
        duration: "0 min",
        currentQuestion: firstQuestion,
        questions: generatedQuestions,
        answers: {},
        questionAnalyses: [],
        setupData: { ...formData, resumeText },
        summary: "",
        wordUsage: [],
        aiSuggestions: [],
      };

      localStorage.setItem("currentInterview", JSON.stringify(interview));
      if (typeof startInterview === "function") {
        startInterview();
      } else {
        console.warn("startInterview is not a function. Cannot proceed.");
        setFormErrors({ general: "Failed to start interview. Please try again." });
      }
    } catch (error) {
      console.error("Failed to start interview:", error);
      setFormErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearForm = () => {
    const defaultData = {
      instructions: "",
      position: "",
      interviewer: "aura-2-asteria-en",
      resume: "",
    };
    setFormData(defaultData);
    setFormErrors({});
    setSubmitAttempted(false);
    localStorage.setItem("interviewSetup", JSON.stringify(defaultData));
    localStorage.setItem("interviewSetupErrors", JSON.stringify({}));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const positions = [
    { id: "", label: "Select a position..." },
    { id: "frontend", label: "Frontend Developer" },
    { id: "backend", label: "Backend Developer" },
    { id: "fullstack", label: "Full Stack Developer" },
    { id: "design", label: "UI/UX Designer" },
    { id: "product", label: "Product Manager" },
    { id: "data", label: "Data Scientist" },
    { id: "general", label: "General / Behavioral" },
  ];

  const interviewers = [
    { id: "aura-2-asteria-en", label: "Asteria - Female, Professional" },
    { id: "aura-2-luna-en", label: "Luna - Female, Conversational" },
    { id: "aura-2-stella-en", label: "Stella - Female, Warm" },
    { id: "aura-2-orion-en", label: "Orion - Male, Professional" },
    { id: "aura-2-apollo-en", label: "Apollo - Male, Conversational" },
  ];

  const templates = [
    {
      label: "Technical React",
      description: "Focus on React hooks, state management, performance, and testing.",
      value: "Technical interview for a developer. Focus on React hooks, state management (Context API, Redux/Zustand), performance optimization, and testing.",
    },
    {
      label: "Behavioral Focus",
      description: "Emphasize STAR method, collaboration, and problem-solving.",
      value: "Behavioral interview. Focus on past projects using STAR method, team collaboration, handling disagreements, and problem-solving approaches.",
    },
    {
      label: "System Design",
      description: "Evaluate scalable architecture, APIs, and trade-offs.",
      value: "System design interview. Evaluate architecture knowledge for scalable web apps, database choices, API design, caching, and trade-offs.",
    },
  ];

  const applyTemplate = (template) => {
    const updatedData = { ...formData, instructions: template };
    setFormData(updatedData);
    localStorage.setItem("interviewSetup", JSON.stringify(updatedData));
    setFormErrors({ ...formErrors, instructions: null });
    localStorage.setItem("interviewSetupErrors", JSON.stringify({ ...formErrors, instructions: null }));
  };

  return (
    <section id="setup" className="min-h-screen p-6 lg:p-10 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-black text-white animate-gradient-bg">
      <div className="w-full max-w-4xl bg-gray-800/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl p-6 md:p-10 flex flex-col space-y-8 transform transition-all duration-500 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-extrabold text-indigo-300 flex items-center">
            <PenTool className="h-6 w-6 mr-3 text-indigo-400 animate-pulse" />
            Interview Setup
          </h2>
          <button
            onClick={handleClearForm}
            className="flex items-center px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Clear Form"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </button>
        </div>

        {formErrors.general && (
          <div className="p-4 bg-red-900/50 border border-red-600/50 rounded-xl text-sm text-red-200 flex items-center shadow-md animate-shake" role="alert">
            <AlertCircle className="h-6 w-6 mr-3 text-red-400" />
            {formErrors.general}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="instructions" className="block text-sm font-medium text-gray-300 mb-2">
              Custom Instructions <span className="text-red-400">*</span>
            </label>
            <textarea
              id="instructions"
              rows={4}
              value={formData.instructions}
              onChange={handleChange}
              className={`w-full bg-gray-900 border ${formErrors.instructions ? "border-red-500" : "border-gray-700/50"} rounded-lg p-3 text-sm text-gray-200 focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 focus:outline-none transition duration-200`}
              placeholder="E.g., Focus on React hooks and state management. Ask about handling project conflicts."
              aria-describedby="instructions-error"
            />
            {formErrors.instructions && (
              <p id="instructions-error" className="mt-2 text-sm text-red-400 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {formErrors.instructions}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400">Provide context for the AI: job details, focus areas, or interview style.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-300 mb-2">
                Job Position <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="position"
                  value={formData.position}
                  onChange={handleChange}
                  className={`w-full bg-gray-900 border ${formErrors.position ? "border-red-500" : "border-gray-700/50"} rounded-lg p-3 pr-10 text-sm text-gray-200 appearance-none focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 focus:outline-none transition duration-200`}
                  aria-describedby="position-error"
                >
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              {formErrors.position && (
                <p id="position-error" className="mt-2 text-sm text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.position}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="interviewer" className="block text-sm font-medium text-gray-300 mb-2">
                Interviewer Voice
              </label>
              <div className="relative">
                <select
                  id="interviewer"
                  value={formData.interviewer}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700/50 rounded-lg p-3 pr-10 text-sm text-gray-200 appearance-none focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 focus:outline-none transition duration-200"
                >
                  {interviewers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="resume" className="block text-sm font-medium text-gray-300 mb-2">
                Upload Resume (PDF, max 5MB)
              </label>
              <input
                type="file"
                id="resume"
                accept="application/pdf"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.type !== "application/pdf") {
                    setFormErrors({ ...formErrors, resume: "Please upload a PDF file." });
                    return;
                  }
                  if (file.size > MAX_FILE_SIZE) {
                    setFormErrors({ ...formErrors, resume: "File size exceeds 5MB limit." });
                    return;
                  }
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const updatedData = { ...formData, resume: reader.result };
                    setFormData(updatedData);
                    localStorage.setItem("interviewSetup", JSON.stringify(updatedData));
                    setFormErrors({ ...formErrors, resume: null });
                  };
                  reader.readAsDataURL(file);
                }}
                className="block w-full text-sm text-gray-300 file:bg-gray-700 file:border-0 file:py-2 file:px-4 file:rounded-md file:text-sm file:font-semibold file:text-white hover:file:bg-gray-600 cursor-pointer"
                disabled={isUploading}
                aria-describedby="resume-error"
              />
              {isUploading && (
                <p className="mt-2 text-sm text-indigo-400 flex items-center">
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Processing PDF...
                </p>
              )}
              {formErrors.resume && (
                <p id="resume-error" className="mt-2 text-sm text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.resume}
                </p>
              )}
              {formData.resume && !isUploading && !formErrors.resume && (
                <p className="mt-2 text-sm text-green-400">Resume uploaded successfully!</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quick Instruction Templates
              </label>
              <div className="flex flex-wrap gap-2">
                {templates.map(({ label, description, value }) => (
                  <button
                    key={label}
                    onClick={() => applyTemplate(value)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-xs text-gray-200 font-semibold transition duration-200 relative group"
                    aria-label={`Apply ${label} template: ${description}`}
                  >
                    {label}
                    <span className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-xs text-gray-300 rounded-md shadow-lg z-10 w-48 text-center">
                      {description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={handleStartInterview}
            disabled={isLoading || isUploading}
            className={`flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400`}
            aria-label="Start Interview"
          >
            <Play className="h-4 w-4 mr-2" />
            {isLoading ? "Processing..." : "Start Interview"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default SetupSection;