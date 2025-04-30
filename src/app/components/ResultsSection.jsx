import React, { useState, useEffect } from "react";
import { Download, RotateCcw, Loader2, ArrowLeft } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import jsPDF from "jspdf";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const ResultsSection = ({ goToSetup }) => {
  const { questions, answers, formData } = useAppContext();
  const [results, setResults] = useState({ analyses: [], summary: "", repeatedWords: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCachedResults = () => {
      try {
        const cached = JSON.parse(localStorage.getItem("interviewResults") || "{}");
        if (cached.analyses?.length && cached.summary && cached.repeatedWords) {
          setResults(cached);
          return true;
        }
        return false;
      } catch (err) {
        console.error("Error loading cached results:", err);
        return false;
      }
    };

    if (questions.length > 0 && !loadCachedResults()) {
      analyzeInterview();
    }
  }, [questions, answers, formData]);

  const analyzeInterview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = `
        Analyze the following interview for a ${formData.position || "role"} role.
        Questions and Answers:
        ${questions.map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[q] || "(No answer provided)"}`).join("\n")}
        Instructions: ${formData.instructions || "None"}
        Resume: ${formData.resumeText || "None"}

        Provide:
        1. Analysis for each question (max 2-3 sentences per section):
           - Key strengths in the answer
           - One specific suggestion for improvement (25 words max)
           Return as an array of JSON objects with keys: question, answer, strengths, improvement
        2. Overall summary (50 words max) highlighting one strength and one improvement area.
        3. Repeated words: List the top 5 most frequently used words across all answers (excluding common stop words like "the", "and").

        Return the response as a JSON object with keys: analyses, summary, repeatedWords
        Keep all responses concise.
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
      const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) throw new Error("Invalid response structure");
      const result = JSON.parse(resultText);

      setResults(result);
      localStorage.setItem("interviewResults", JSON.stringify(result));
    } catch (err) {
      setError(`Failed to analyze interview: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const retryAnalysis = () => {
    setResults({ analyses: [], summary: "", repeatedWords: [] });
    localStorage.removeItem("interviewResults");
    analyzeInterview();
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    let y = 20;
    const addText = (text, bold = false, size = 12, spaceAfter = 8) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, 170);
      lines.forEach((line) => {
        if (y + spaceAfter > doc.internal.pageSize.height - 10) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += spaceAfter;
      });
    };

    addText(`Interview Results for ${formData.position || "Role"}`, true, 16, 10);
    addText("Overall Summary", true);
    addText(results.summary || "No summary available.", false, 12, 10);
    addText("Repeated Words", true);
    addText(results.repeatedWords.length ? results.repeatedWords.join(", ") : "None identified.", false, 12, 10);

    results.analyses.forEach((analysis, i) => {
      addText(`Question ${i + 1}`, true);
      addText(`Q: ${analysis.question}`);
      addText(`A: ${analysis.answer}`);
      addText(`Strengths: ${analysis.strengths}`);
      addText(`Improvement: ${analysis.improvement}`, false, 12, 10);
    });

    doc.save(`Interview_Results_${formData.position || "Role"}.pdf`);
  };

  return (
    <section className="min-h-screen p-6 bg-gray-100 flex flex-col items-center">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Interview Insights</h2>
          <div className="flex gap-2">
            <button
              onClick={downloadReport}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              title="Download as PDF"
            >
              <Download className="h-4 w-4 mr-2" /> PDF
            </button>
            <button
              onClick={retryAnalysis}
              className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition"
              disabled={isLoading}
              title="Retry Analysis"
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Retry
            </button>
            <button
              onClick={goToSetup}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
              title="Back to Setup"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-md flex items-center">
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-gray-600">Analyzing responses...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            {results.summary && (
              <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Summary</h3>
                <p className="text-gray-700">{results.summary}</p>
              </div>
            )}

            {/* Repeated Words Card */}
            {results.repeatedWords.length > 0 && (
              <div className="p-4 bg-green-50 rounded-md border border-green-200">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Repeated Words</h3>
                <p className="text-gray-700">Common words: {results.repeatedWords.join(", ")}</p>
                <p className="text-sm text-gray-600 mt-1">Tip: Vary word choice to enhance clarity and impact.</p>
              </div>
            )}

            {/* Question Analysis Cards */}
            <div className="space-y-4">
              {results.analyses.map((analysis, index) => (
                <div key={index} className="p-4 bg-white rounded-md border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Question {index + 1}: {analysis.question}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Your Answer</p>
                      <p className="text-gray-700">{analysis.answer}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 rounded-md">
                        <p className="text-sm font-medium text-green-700">Strengths</p>
                        <p className="text-gray-700">{analysis.strengths}</p>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-md">
                        <p className="text-sm font-medium text-yellow-700">Improvement</p>
                        <p className="text-gray-700">{analysis.improvement}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ResultsSection;