import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RotateCcw,
  Loader2,
  Download,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import jsPDF from "jspdf";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const ResultsSection = ({ goToSetup }) => {
  const { questions, answers, formData, setFormData } = useAppContext();
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
            
            Provide:
            1. **Rating**: A score from 1-5 (1=poor, 5=excellent) based on clarity, relevance, and depth. Explain the score briefly.
            2. **Repetitive words**: Identify overused words (e.g., "um," "like") and their counts.
            3. **Improvements**: Suggest specific improvements, focusing on avoiding repetitive words, enhancing structure, or adding detail. It should not more than 50 words per question.
            
            Return the analysis as a JSON object with keys: rating, ratingExplanation, repetitiveWords, improvements.
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
          // Use optional chaining to safely access nested properties
          const analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!analysisText)
            throw new Error("Invalid analysis response structure");
          const analysis = JSON.parse(analysisText);
          return { question, answer, ...analysis };
        })
      );

      const summaryPrompt = `
        Provide a concise overall summary (2-3 sentences) of the interview for a ${
          formData.position || "role"
        } role.
        Highlight strengths, areas for improvement, and general advice based on the following:
        Questions: ${questions.join("\n")}
        Answers: ${Object.entries(answers)
          .map(([q, a]) => `${q}: ${a}`)
          .join("\n")}
        Instructions: ${formData.instructions || "None"}
        Resume: ${formData.resumeText || "None"}
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
      // Use optional chaining for summary response
      const interviewSummary =
        summaryData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!interviewSummary)
        throw new Error("Invalid summary response structure");

      setAnalyses(questionAnalyses);
      setSummary(interviewSummary);

      // Update local storage
      const results = JSON.parse(
        localStorage.getItem("interviewResults") || "{}"
      );
      localStorage.setItem(
        "interviewResults",
        JSON.stringify({
          ...results,
          questionAnalyses,
          summary: interviewSummary,
          aiSuggestions: questionAnalyses.map((a) => a.improvements),
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
    localStorage.setItem(
      "interviewResults",
      JSON.stringify({
        ...JSON.parse(localStorage.getItem("interviewResults") || "{}"),
        questionAnalyses: [],
        summary: "",
        aiSuggestions: [],
      })
    );
    analyzeInterview();
    setIsLoading(true);
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
      addLine(`Rating: ${analysis.rating}/5 - ${analysis.ratingExplanation}`);

      const repetitiveText = analysis.repetitiveWords?.length
        ? analysis.repetitiveWords
            .map((w) => `${w.word}: ${w.count}`)
            .join(", ")
        : "None";
      addLine(`Repetitive Words: ${repetitiveText}`);

      addLine(`Suggested Improvements: ${analysis.improvements}`, false, true);
    });

    doc.save(`Interview_Results_${formData.position || "Role"}.pdf`);
  };

  return (
    <section className="min-h-screen p-6 lg:p-10 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-black text-white animate-gradient-bg">
      <div className="w-full max-w-4xl bg-gray-800/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl p-6 md:p-10 flex flex-col space-y-8 transform transition-all duration-500 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-extrabold text-indigo-300 flex items-center">
            <AlertCircle className="h-6 w-6 mr-3 text-indigo-400 animate-pulse" />
            Interview Results
          </h2>
          <div className="flex gap-4">
            <button
              onClick={retryAnalysis}
              className="flex items-center px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              aria-label="Retry Analysis"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Analysis
            </button>
            <button
              onClick={downloadReport}
              className="flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="Download Report"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </button>
            <button
              onClick={handleBackToSetup}
              className="flex items-center px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Back to Setup"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Back to Setup
            </button>
          </div>
        </div>

        {error && (
          <div
            className="p-4 bg-red-900/50 border border-red-600/50 rounded-xl text-sm text-red-200 flex items-center shadow-md animate-shake"
            role="alert"
          >
            <AlertCircle className="h-6 w-6 mr-3 text-red-400" />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-sm text-gray-200 animate-pulse">
            <Loader2 className="h-8 w-8 mb-2 animate-spin text-indigo-400" />
            <p>Analyzing interview performance...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {summary && (
              <div className="p-6 bg-gray-900/70 border border-indigo-600/40 rounded-xl shadow-inner">
                <h3 className="text-lg font-semibold text-indigo-300 mb-2">
                  Overall Summary
                </h3>
                <p className="text-sm text-gray-200 leading-relaxed">
                  {summary}
                </p>
              </div>
            )}

            {analyses.map((analysis, index) => (
              <div
                key={index}
                className="bg-gray-900/70 border border-indigo-600/40 rounded-xl shadow-inner transition-all duration-300"
              >
                <button
                  onClick={() => toggleSection(index)}
                  className="w-full p-4 flex justify-between items-center text-left focus:outline-none group"
                  aria-expanded={expandedSections[index]}
                  aria-controls={`analysis-${index}`}
                >
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-indigo-300">
                      Question {index + 1}: {analysis.question}
                    </span>
                    <span
                      className={`ml-4 px-2 py-1 w-25 rounded-full text-xs font-semibold relative group-hover:tooltip ${
                        analysis.rating >= 4
                          ? "bg-green-600 text-white"
                          : analysis.rating >= 3
                          ? "bg-yellow-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      Rating: {analysis.rating}/5
                      <span className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-xs text-gray-300 rounded-md shadow-lg z-10 w-48 text-center">
                        {analysis.ratingExplanation}
                      </span>
                    </span>
                  </div>
                  {expandedSections[index] ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {expandedSections[index] && (
                  <div
                    id={`analysis-${index}`}
                    className="p-4 space-y-4 animate-slide-in"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-indigo-300">
                        Answer
                      </h4>
                      <p className="text-sm text-gray-200">{analysis.answer}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-indigo-300">
                        Repetitive Words
                      </h4>
                      {analysis.repetitiveWords?.length > 0 ? (
                        <ul className="text-sm text-gray-200 list-disc pl-5">
                          {analysis.repetitiveWords.map((word, i) => (
                            <li key={i}>
                              <strong>{word?.word}</strong>: {word?.count} times
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-200">
                          No repetitive words detected.
                        </p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-indigo-300">
                        Improvements
                      </h4>
                      <p className="text-sm text-gray-200">
                        {analysis.improvements}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showConfirmBack && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800/90 backdrop-blur-sm p-6 rounded-xl border border-indigo-500/30 max-w-md w-full animate-fade-in">
            <h3 className="text-lg font-semibold text-indigo-300 mb-4">
              Confirm Navigation
            </h3>
            <p className="text-sm text-gray-200 mb-6">
              Are you sure you want to return to setup? This will clear your
              current results.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmBack(false)}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold rounded-lg transition-all duration-300"
                aria-label="Cancel navigation"
              >
                Cancel
              </button>
              <button
                onClick={confirmBackToSetup}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all duration-300"
                aria-label="Confirm navigation"
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
