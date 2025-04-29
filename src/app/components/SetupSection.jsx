import { useState, useEffect } from "react";
import { PenTool, ChevronDown, Play, AlertCircle } from "lucide-react";

const SetupSection = ({ startInterview }) => {
  const [formData, setFormData] = useState({
    instructions: "",
    position: "",
    interviewer: "aura-asteria-en",
    resume: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedSetup = localStorage.getItem("interviewSetup");
    if (savedSetup) {
      try {
        setFormData(JSON.parse(savedSetup));
      } catch (error) {
        console.error("Failed to parse setup", error);
        localStorage.removeItem("interviewSetup");
      }
    }
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    const updatedData = { ...formData, [id]: value };
    setFormData(updatedData);
    localStorage.setItem("interviewSetup", JSON.stringify(updatedData));
    if (formErrors[id]) setFormErrors({ ...formErrors, [id]: null });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.instructions.trim())
      errors.instructions = "Instructions are required";
    if (!formData.position) errors.position = "Job position is required";
    return errors;
  };

  const extractTextFromPDF = async (base64DataUrl) => {
    try {
      // Extract base64 content (remove data URL prefix)
      const base64 = base64DataUrl.split(",")[1];
      const apiUrl = "https://v2.convertapi.com/convert/pdf/to/txt";
      const apiKey = "secret_DZhUR7COXGqA3VxR";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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

      if (!response.ok) {
        throw new Error(`ConvertAPI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const text = atob(data.Files[0].FileData); // Decode base64 text
      return text;
    } catch (error) {
      console.error("Failed to extract text from PDF:", error);
      return "";
    }
  };

  const callGeminiAPI = async (prompt) => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const apiUrl = "https://api.gemini.com/v2.5/flash/generate";

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error("Gemini API request failed");
      const data = await response.json();
      return data.questions || [];
    } catch (error) {
      console.error("Gemini API error:", error);
      return [];
    }
  };

  const handleStartInterview = async () => {
    setSubmitAttempted(true);
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      let resumeText = "";
      if (formData.resume) {
        resumeText = await extractTextFromPDF(formData.resume);
      }

      const positionLabel =
        positions.find((p) => p.id === formData.position)?.label || "role";
      if (!formData.instructions && !resumeText) {
        throw new Error(
          "Cannot generate questions: both instructions and resume are missing."
        );
      }

      const prompt = `
        Generate 5 unique and relevant interview questions for a ${positionLabel} role.
        
        Context:
        - Instructions: ${formData.instructions || "None"}
        - Resume: ${resumeText || "None"}
        
        Return only a JSON array of 5 questions.
      `;

      const generatedQuestions = await callGeminiAPI(prompt);

      if (
        !Array.isArray(generatedQuestions) ||
        generatedQuestions.length !== 5
      ) {
        throw new Error(
          "Invalid response from Gemini. Expected an array of 5 questions."
        );
      }

      const now = new Date();
      const formattedDate = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const interview = {
        title: `${positionLabel} Interview`,
        date: formattedDate,
        duration: "0 min",
        questions: generatedQuestions,
        answers: {},
        questionAnalyses: [],
        setupData: { ...formData, resumeText },
        summary: "",
        wordUsage: [],
        aiSuggestions: [],
      };

      localStorage.setItem("currentInterview", JSON.stringify(interview));
      startInterview();
    } catch (error) {
      console.error("Failed to start interview:", error);
      setFormErrors({ general: error.message });
    } finally {
      setIsLoading(false);
    }
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
    { id: "aura-asteria-en", label: "Asteria - Female, Professional" },
    { id: "aura-luna-en", label: "Luna - Female, Conversational" },
    { id: "aura-stella-en", label: "Stella - Female, Warm" },
    { id: "aura-orion-en", label: "Orion - Male, Professional" },
    { id: "aura-apollo-en", label: "Apollo - Male, Conversational" },
  ];

  const applyTemplate = (template) => {
    const updatedData = { ...formData, instructions: template };
    setFormData(updatedData);
    localStorage.setItem("interviewSetup", JSON.stringify(updatedData));
    if (formErrors.instructions)
      setFormErrors({ ...formErrors, instructions: null });
  };

  return (
    <section id="setup" className="min-h-screen p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-white">Interview Setup</h2>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <PenTool className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold ml-3 text-white">
              Customize Your Interview
            </h3>
          </div>
          {formErrors.general && (
            <p className="mb-4 text-sm text-red-400 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {formErrors.general}
            </p>
          )}
          <div className="mb-6">
            <label
              htmlFor="instructions"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Custom Instructions <span className="text-red-400">*</span>
            </label>
            <textarea
              id="instructions"
              rows={4}
              value={formData.instructions}
              onChange={handleChange}
              className={`w-full bg-gray-900 border ${
                submitAttempted && formErrors.instructions
                  ? "border-red-500"
                  : "border-gray-700/50"
              } rounded-lg p-3 text-sm text-gray-200 focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 focus:outline-none transition duration-200`}
              placeholder="E.g., Focus on React hooks and state management. Ask about a time I handled project conflicts. Keep questions concise."
            />
            {submitAttempted && formErrors.instructions && (
              <p className="mt-2 text-sm text-red-400 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {formErrors.instructions}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              Provide context for the AI: job details, desired focus areas,
              interview style.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label
                htmlFor="position"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Job Position <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="position"
                  value={formData.position}
                  onChange={handleChange}
                  className={`w-full bg-gray-900 border ${
                    submitAttempted && formErrors.position
                      ? "border-red-500"
                      : "border-gray-700/50"
                  } rounded-lg p-3 pr-10 text-sm text-gray-200 appearance-none focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 focus:outline-none transition duration-200`}
                >
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              {submitAttempted && formErrors.position && (
                <p className="mt-2 text-sm text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.position}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="interviewer"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
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
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
            <div>
              <label
                htmlFor="resume"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Upload Resume (PDF)
              </label>
              <input
                type="file"
                id="resume"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && file.type === "application/pdf") {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const updatedData = {
                        ...formData,
                        resume: reader.result,
                      };
                      setFormData(updatedData);
                      localStorage.setItem(
                        "interviewSetup",
                        JSON.stringify(updatedData)
                      );
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="block w-full text-sm text-gray-300 file:bg-gray-700 file:border-0 file:py-2 file:px-4 file:rounded-md file:text-sm file:font-semibold file:text-white hover:file:bg-gray-600 cursor-pointer"
              />
              {formData.resume && (
                <p className="mt-2 text-xs text-green-400">
                  Resume uploaded successfully!
                </p>
              )}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quick Instruction Templates
              </label>
              <div className="flex flex-wrap gap-2">
                {["Technical React", "Behavioral Focus", "System Design"].map(
                  (label) => {
                    let template = "";
                    if (label === "Technical React")
                      template =
                        "Technical interview for a developer. Focus on React hooks, state management (Context API, Redux/Zustand), performance optimization, and testing.";
                    if (label === "Behavioral Focus")
                      template =
                        "Behavioral interview. Focus on past projects using STAR method, team collaboration, handling disagreements, and problem-solving approaches.";
                    if (label === "System Design")
                      template =
                        "System design interview. Evaluate architecture knowledge for scalable web apps, database choices, API design, caching, and trade-offs.";
                    return (
                      <button
                        key={label}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-xs text-gray-300 transition duration-200"
                        onClick={() => applyTemplate(template)}
                      >
                        {label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleStartInterview}
            disabled={isLoading}
            className={`inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg shadow-sm transition duration-200 ${
              isLoading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
            }`}
          >
            <Play className="h-5 w-5 mr-2" />
            {isLoading ? "Processing..." : "Start Interview"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default SetupSection;
