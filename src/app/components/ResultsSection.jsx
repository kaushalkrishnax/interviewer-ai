import React, { useState, useEffect } from "react";
import { Download, RotateCcw, Loader2, ArrowLeft, Share2 } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import jsPDF from "jspdf";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const ResultsSection = ({ goToSetup }) => {
  const { questions, answers, formData } = useAppContext();
  const [results, setResults] = useState({ analyses: [], summary: "", repeatedWords: [], scores: { overall: 0, technical: 0, communication: 0 } });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCachedResults = () => {
      try {
        const cached = JSON.parse(localStorage.getItem("interviewResults") || "{}");
        if (cached.analyses?.length && cached.summary && cached.repeatedWords && cached.scores) {
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
        1. Analysis for each question (max 3-4 sentences per section):
           - Key strengths in the answer
           - Specific weaknesses or gaps
           - One actionable suggestion for improvement (25 words max)
           Return as an array of JSON objects with keys: question, answer, strengths, weaknesses, suggestion
        2. Scores (0-100):
           - Overall score with brief justification
           - Technical skills score with brief justification
           - Communication score with brief justification
           Return as a JSON object with keys: overall, technical, communication
        3. Overall summary (70 words max) with one strength and one improvement area.
        4. Repeated words: List the top 5 most frequently used words (excluding stop words like "the", "and").

        Return the response as a JSON object with keys: analyses, scores, summary, repeatedWords
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
    setResults({ analyses: [], summary: "", repeatedWords: [], scores: { overall: 0, technical: 0, communication: 0 } });
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
    addText(`Completed on ${new Date().toLocaleDateString()}`, false, 10, 10);
    addText("Scores", true);
    addText(`Overall: ${results.scores.overall}/100`, false, 12, 10);
    addText(`Technical: ${results.scores.technical}/100`, false, 12, 10);
    addText(`Communication: ${results.scores.communication}/100`, false, 12, 10);
    addText("Summary", true);
    addText(results.summary || "No summary available.", false, 12, 10);
    addText("Repeated Words", true);
    addText(results.repeatedWords.length ? results.repeatedWords.join(", ") : "None identified.", false, 12, 10);

    results.analyses.forEach((analysis, i) => {
      addText(`Question ${i + 1}`, true);
      addText(`Q: ${analysis.question}`);
      addText(`A: ${analysis.answer}`);
      addText(`Strengths: ${analysis.strengths}`);
      addText(`Weaknesses: ${analysis.weaknesses}`);
      addText(`Suggestion: ${analysis.suggestion}`, false, 12, 10);
    });

    doc.save(`Interview_Results_${formData.position || "Role"}.pdf`);
  };

  return (
    <section className="min-h-screen p-6 bg-gray-900 text-gray-100 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-gray-800 rounded-xl shadow-2xl p-6 space-y-6 border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center flex-col md:flex-row gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-400">Interview Results</h1>
            <h2 className="text-lg text-gray-300">{formData.position || "Role"} Interview</h2>
            <p className="text-sm text-gray-400">Completed on {new Date().toLocaleDateString()} · {32} min</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadReport}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
              title="Download Report"
            >
              <Download className="h-5 w-5 mr-2" /> Download Report
            </button>
            <button
              onClick={() => alert("Share functionality not implemented")}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-lg hover:shadow-gray-500/50"
              title="Share"
            >
              <Share2 className="h-5 w-5 mr-2" /> Share
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900/50 text-red-200 rounded-lg flex items-center border border-red-700">
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
            <p className="mt-4 text-gray-300">Analyzing responses...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Scores Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold text-purple-300">Overall Score</h3>
                <div className="w-full bg-gray-600 rounded-full h-4 mt-2">
                  <div
                    className="bg-purple-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${results.scores.overall}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-300 mt-1">{results.scores.overall}/100</p>
                <p className="text-xs text-gray-400">Your performance is above average.</p>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold text-green-300">Technical Skills</h3>
                <div className="w-full bg-gray-600 rounded-full h-4 mt-2">
                  <div
                    className="bg-green-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${results.scores.technical}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-300 mt-1">{results.scores.technical}/100</p>
                <p className="text-xs text-gray-400">Excellent technical knowledge.</p>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold text-yellow-300">Communication</h3>
                <div className="w-full bg-gray-600 rounded-full h-4 mt-2">
                  <div
                    className="bg-yellow-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${results.scores.communication}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-300 mt-1">{results.scores.communication}/100</p>
                <p className="text-xs text-gray-400">Good clarity, could improve conciseness.</p>
              </div>
            </div>

            {/* Key Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold text-purple-300 flex items-center">
                  <span className="mr-2">🔑</span> Key Insights
                </h3>
                <ul className="mt-2 space-y-1 text-gray-300">
                  {results.analyses.map((a, i) => (
                    <li key={i} className="text-sm">✔ {a.strengths}</li>
                  )).slice(0, 3)}
                </ul>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold text-yellow-300 flex items-center">
                  <span className="mr-2">⚠️</span> Areas for Improvement
                </h3>
                <ul className="mt-2 space-y-1 text-gray-300">
                  {results.analyses.map((a, i) => (
                    <li key={i} className="text-sm">➜ {a.weaknesses}</li>
                  )).slice(0, 3)}
                </ul>
              </div>
            </div>

            {/* AI Summary */}
            {results.summary && (
              <div className="p-4 bg-gradient-to-r from-purple-900 to-gray-800 rounded-lg border border-purple-700">
                <h3 className="text-lg font-semibold text-purple-300 flex items-center">
                  <span className="mr-2">⚡</span> AI Summary Feedback
                </h3>
                <p className="mt-2 text-gray-200 text-sm">{results.summary}</p>
              </div>
            )}

            {/* Repeated Words */}
            {results.repeatedWords.length > 0 && (
              <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold text-green-300">Repeated Words</h3>
                <p className="mt-2 text-gray-300">Common words: {results.repeatedWords.join(", ")}</p>
                <p className="text-xs text-gray-400 mt-1">Tip: Vary word choice for clarity.</p>
              </div>
            )}

            {/* Question Analysis */}
            <div className="space-y-4">
              {results.analyses.map((analysis, index) => (
                <div key={index} className="p-4 bg-gray-700 rounded-lg border border-gray-600 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <h3 className="text-lg font-semibold text-gray-100 mb-2">Question {index + 1}: {analysis.question}</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-400">Your Answer</p>
                      <p className="text-gray-200">{analysis.answer}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-green-900/50 rounded-lg">
                        <p className="text-sm font-medium text-green-300">Strengths</p>
                        <p className="text-gray-200">{analysis.strengths}</p>
                      </div>
                      <div className="p-3 bg-yellow-900/50 rounded-lg">
                        <p className="text-sm font-medium text-yellow-300">Weaknesses</p>
                        <p className="text-gray-200">{analysis.weaknesses}</p>
                      </div>
                      <div className="p-3 bg-purple-900/50 rounded-lg">
                        <p className="text-sm font-medium text-purple-300">Suggestion</p>
                        <p className="text-gray-200">{analysis.suggestion}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center gap-2">
          <button
            onClick={retryAnalysis}
            className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all duration-200 shadow-lg hover:shadow-yellow-500/50 disabled:opacity-50"
            disabled={isLoading}
            title="Retry Analysis"
          >
            <RotateCcw className="h-5 w-5 mr-2" /> Retry
          </button>
          <button
            onClick={goToSetup}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-lg hover:shadow-gray-500/50"
            title="Back to Setup"
          >
            <ArrowLeft className="h-5 w-5 mr-2" /> Back
          </button>
        </div>
      </div>
    </section>
  );
};

export default ResultsSection;