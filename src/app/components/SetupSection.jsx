import { useState, useEffect } from "react";
import { PenTool, ChevronDown, Play } from "lucide-react";

const SetupSection = ({ startInterview }) => {
  const [formData, setFormData] = useState({
    instructions: "",
    position: "",
    interviewer: "auto",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

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

  const handleStartInterview = () => {
    setSubmitAttempted(true);
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const positionLabel =
      positions.find((p) => p.id === formData.position)?.label || "AI";

    const interview = {
      title: `${positionLabel} Interview`,
      date: formattedDate,
      duration: "0 min",
      questions: [],
      answers: {},
      questionAnalyses: [],
      setupData: { ...formData },

      summary: "",
      wordUsage: [],
      aiSuggestions: [],
    };
    localStorage.setItem("currentInterview", JSON.stringify(interview));
    startInterview();
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
    { id: "auto", label: "Auto (Default)" },
    { id: "male1", label: "Male 1 - Professional" },
    { id: "male2", label: "Male 2 - Conversational" },
    { id: "female1", label: "Female 1 - Professional" },
    { id: "female2", label: "Female 2 - Conversational" },
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
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleStartInterview}
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition duration-200"
          >
            <Play className="h-5 w-5 mr-2" />
            Start Interview
          </button>
        </div>
      </div>
    </section>
  );
};

export default SetupSection;
