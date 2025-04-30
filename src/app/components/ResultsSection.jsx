import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RotateCcw,
  Loader2,
  Download,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import jsPDF from "jspdf";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const ResultsSection = ({ goToSetup }) => {
  const { questions, answers, formData } = useAppContext();
  const [analyses, setAnalyses] = useState([]);
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [showConfirmBack, setShowConfirmBack] = useState(false);

  useEffect(() => {
    const loadCachedResults = () => {
      try {
        const results = JSON.parse(
          localStorage.getItem("interviewResults") || "{}"
        );
        if (results.questionAnalyses && results.summary) {
          setAnalyses(results.questionAnalyses);
          setSummary(results.summary);
          return true;
        }
        return false;
      } catch (err) {
        console.error("Error loading cached results:", err);
        return false;
      }
    };
    if (questions.length > 0) {
      if (!loadCachedResults()) {
        analyzeInterview();
      }
    }
  }, [questions, answers, formData]);

  const analyzeInterview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const questionAnalyses = await Promise.all(
        questions.map(async (question, index) => {
          const answer = answers[question] || "(No answer provided)";
          const prompt = `
            Analyze the following interview question and answer for a ${
              formData.position || "role"
            } role.
            Question: "${question}"
            Answer: "${answer}"
            Instructions: ${formData.instructions || "None"}
            Resume: ${formData.resumeText || "None"}
            
            Provide a VERY BRIEF analysis (max 2-3 sentences per section):
            1. Key strengths in this answer
            2. One specific suggestion for improvement (25 words max)
            
            Return the analysis as a JSON object with keys: strengths, improvement
            Keep responses extremely concise - brevity is critical.
          `;

          const response = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          });

          if (!response.ok) throw new Error("Gemini API request failed");
          const data = await response.json();
          const analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!analysisText)
            throw new Error("Invalid analysis response structure");
          const analysis = JSON.parse(analysisText);
          return { question, answer, ...analysis };
        })
      );

      const summaryPrompt = `
        Provide a VERY CONCISE overall summary (max 2 sentences) of the interview for a ${
          formData.position || "role"
        } role.
        Focus on just one strength and one improvement area based on the following:
        Questions: ${questions.join("\n")}
        Answers: ${Object.entries(answers)
          .map(([q, a]) => `${q}: ${a}`)
          .join("\n")}
        Instructions: ${formData.instructions || "None"}
        Resume: ${formData.resumeText || "None"}
        
        Keep your response extremely brief - no more than 30 words total.
      `;

      const summaryResponse = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: summaryPrompt }] }],
          generationConfig: { responseMimeType: "text/plain" },
        }),
      });

      if (!summaryResponse.ok)
        throw new Error("Gemini API summary request failed");
      const summaryData = await summaryResponse.json();
      const interviewSummary =
        summaryData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!interviewSummary)
        throw new Error("Invalid summary response structure");

      setAnalyses(questionAnalyses);
      setSummary(interviewSummary);

      // Update local storage
      localStorage.setItem(
        "interviewResults",
        JSON.stringify({
          questionAnalyses,
          summary: interviewSummary,
        })
      );
    } catch (err) {
      setError(`Failed to analyze interview: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (index) => {
    setExpandedSections((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleBackToSetup = () => {
    setShowConfirmBack(true);
  };

  const confirmBackToSetup = () => {
    if (typeof goToSetup === "function") {
      goToSetup();
      setShowConfirmBack(false);
    } else {
      console.warn("goToSetup is not a function.");
      setError("Failed to return to setup. Please try again.");
      setShowConfirmBack(false);
    }
  };

  const retryAnalysis = () => {
    setAnalyses([]);
    setSummary("");
    localStorage.removeItem("interviewResults");
    analyzeInterview();
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const lineSpacing = 8;
    const sectionSpacing = 12;
    const maxWidth = 160;
    let y = 20;

    const addLine = (text, bold = false, extraSpace = false) => {
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line) => {
        if (y + lineSpacing > pageHeight - 10) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.text(line, 20, y);
        y += lineSpacing;
      });
      if (extraSpace) y += sectionSpacing;
    };

    doc.setFontSize(16);
    addLine(`Interview Results for ${formData.position || "Role"}`, true, true);

    doc.setFontSize(12);
    addLine("Overall Summary", true);
    addLine(summary || "No summary available.", false, true);

    analyses.forEach((analysis, index) => {
      addLine(`Question ${index + 1}`, true);
      addLine(`Q: ${analysis.question}`);
      addLine(`A: ${analysis.answer}`);
      addLine(`Strengths: ${analysis.strengths}`);
      addLine(`Improvement: ${analysis.improvement}`, false, true);
    });

    doc.save(`Interview_Results_${formData.position || "Role"}.pdf`);
  };

  return (
    <section className="min-h-screen p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-950 to-black text-white">
      <div className="w-full max-w-4xl bg-gray-900/80 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-2xl p-5 md:p-8 flex flex-col space-y-6 transform transition-all duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-purple-300 flex items-center">
            <Sparkles className="h-6 w-6 mr-3 text-purple-400" />
            Interview Insights
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadReport}
              className="flex items-center px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              aria-label="Download Report"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </button>
            <button
              onClick={retryAnalysis}
              className="flex items-center px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              aria-label="Retry Analysis"
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </button>
            <button
              onClick={handleBackToSetup}
              className="flex items-center px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              aria-label="Back to Setup"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
          </div>
        </div>

        {error && (
          <div
            className="p-4 bg-red-900/50 border-l-4 border-red-500 rounded-lg text-sm text-red-200 flex items-center shadow-md"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 mr-3 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-300">
            <Loader2 className="h-10 w-10 mb-4 animate-spin text-purple-400" />
            <p className="text-center">Analyzing your interview responses<br />Just a moment...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {summary && (
              <div className="p-5 bg-indigo-900/30 backdrop-blur-sm border border-purple-500/30 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-purple-400" />
                  Overall Summary
                </h3>
                <p className="text-gray-200 leading-relaxed">
                  {summary}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {analyses.map((analysis, index) => (
                <div
                  key={index}
                  className="bg-gray-900/70 border border-purple-500/20 rounded-lg overflow-hidden shadow-lg hover:shadow-purple-900/20 transition-all duration-300"
                >
                  <button
                    onClick={() => toggleSection(index)}
                    className="w-full px-5 py-4 flex justify-between items-center text-left focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:ring-inset"
                    aria-expanded={expandedSections[index]}
                    aria-controls={`analysis-${index}`}
                  >
                    <div className="flex-1 truncate pr-4">
                      <span className="font-medium text-purple-200">
                        Q{index + 1}: {analysis.question.length > 70 
                          ? analysis.question.substring(0, 70) + "..." 
                          : analysis.question}
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-gray-400">
                      {expandedSections[index] ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </button>
                  
                  {expandedSections[index] && (
                    <div
                      id={`analysis-${index}`}
                      className="px-5 pb-5 pt-1 space-y-4 animate-fade-in border-t border-purple-500/20"
                    >
                      <div>
                        <h4 className="text-sm font-medium text-purple-300 mb-1">
                          Your Answer
                        </h4>
                        <p className="text-sm text-gray-300 bg-black/20 p-3 rounded-md">
                          {analysis.answer}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-emerald-900/20 p-4 rounded-lg border border-emerald-500/20">
                          <h4 className="text-sm font-medium text-emerald-300 mb-2">
                            Strengths
                          </h4>
                          <p className="text-sm text-gray-300">
                            {analysis.strengths}
                          </p>
                        </div>
                        
                        <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-500/20">
                          <h4 className="text-sm font-medium text-amber-300 mb-2">
                            Improvement
                          </h4>
                          <p className="text-sm text-gray-300">
                            {analysis.improvement}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showConfirmBack && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 rounded-xl border border-purple-500/30 max-w-md w-full shadow-2xl animate-fade-in">
            <h3 className="text-xl font-semibold text-purple-300 mb-4">
              Confirm Navigation
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to return to setup? Your current results will not be lost, but you'll need to reanalyze if you make changes.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmBack(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmBackToSetup}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition-all duration-300"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ResultsSection;