import { useState, useEffect } from "react";
import { Trash2, Lightbulb, Brain, BarChart, ChevronDown } from "lucide-react";

const ResultsSection = ({ resetInterview }) => {
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  useEffect(() => {
    const loadData = () => {
      try {
        const storedData = localStorage.getItem("interviewResults");
        if (storedData) setInterviewData(JSON.parse(storedData));
        else console.warn("No results found.");
      } catch (error) {
        console.error("Error loading results:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const simulateAiAnalysis = (question, answer, context) => {
    console.log("Simulating AI Analysis for:", question);

    const relevance =
      answer.length > 10 ? (Math.random() > 0.2 ? "High" : "Medium") : "Low";
    const clarityScore = Math.random();
    const clarityConciseness =
      clarityScore > 0.7
        ? "Clear and concise"
        : clarityScore > 0.4
        ? "Generally clear, could be more concise"
        : "Needs improvement in clarity";
    const fillerWordsDetected = ["um", "like", "basically"].filter(
      () => Math.random() > 0.6
    );
    const suggestions = [
      "Consider using the STAR method for behavioral questions.",
      "Try to quantify your achievements with specific examples.",
      "Pause briefly instead of using filler words like 'um' or 'like'.",
      "Ensure your answer directly addresses all parts of the question.",
      "Add more technical details specific to the role requirements.",
    ];

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          questionNumber: context.questionNumber,
          questionText: question,
          analysis: {
            relevance: relevance,
            clarityConciseness: clarityConciseness,
            contentQuality: {
              assessment:
                answer.length > 50
                  ? "Provided some detail, could be more specific."
                  : "Answer seems brief, consider elaborating.",
              strengths:
                Math.random() > 0.5
                  ? ["Used relevant terminology."]
                  : ["Showed enthusiasm."],
              weaknesses:
                Math.random() > 0.5
                  ? ["Lacked specific examples."]
                  : ["Could be more structured."],
            },
            languageDelivery: {
              fillerWords: fillerWordsDetected.map(
                (fw) => `'${fw}' (${Math.floor(Math.random() * 3) + 1} times)`
              ),
              confidence: Math.random() > 0.5 ? "Confident" : "Moderate",
              professionalism: "Appropriate",
            },
            keywords: {
              used: ["example", "project"].filter(() => Math.random() > 0.5),
              suggested: [
                "specific metric",
                "collaboration",
                context?.setupData?.position || "relevant skill",
              ].filter(() => Math.random() > 0.4),
            },
            improvementSuggestions: suggestions
              .sort(() => 0.5 - Math.random())
              .slice(0, Math.floor(Math.random() * 2) + 1),
          },
        });
      }, 700 + Math.random() * 500);
    });
  };

  const toggleQuestionAnalysis = (qNumber) => {
    setExpandedQuestion(expandedQuestion === qNumber ? null : qNumber);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen p-10 text-white">
        Loading results...
      </div>
    );
  if (!interviewData)
    return (
      <section
        id="results"
        className="min-h-screen p-6 lg:p-10 flex items-center justify-center"
      >
        <div className="text-center text-gray-400">
          <Activity size={48} className="mx-auto mb-4 text-indigo-500" />
          <h2 className="text-xl font-semibold mb-2 text-white">
            No Results Yet
          </h2>
          <p className="mb-4">Complete an interview to see your analysis.</p>
          <button
            onClick={resetInterview}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition duration-200"
          >
            <Settings className="h-4 w-4 mr-2" /> Go to Setup
          </button>
        </div>
      </section>
    );

  const maxCount = Math.max(
    1,
    ...(interviewData.wordUsage || []).map((item) => item.count)
  );
  const fillerWordsList = [
    "um",
    "like",
    "actually",
    "basically",
    "you know",
    "sort of",
    "i mean",
    "uh",
  ];
  const fillerWords = (interviewData.wordUsage || []).filter((item) =>
    fillerWordsList.includes(item.word.toLowerCase())
  );
  const domainWords = (interviewData.wordUsage || [])
    .filter(
      (item) =>
        !fillerWordsList.includes(item.word.toLowerCase()) &&
        item.word.toLowerCase() !== "i"
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <section id="results" className="min-h-screen p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-white">
          Interview Results
        </h2>
        {/* Overall Summary Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 pb-6 border-b border-gray-700/30">
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">
                {interviewData.title}
              </h3>
              <p className="text-gray-400 text-sm">
                Completed: {interviewData.date} • Duration:{" "}
                {interviewData.duration}
              </p>
            </div>
            <button
              onClick={resetInterview}
              className="mt-4 md:mt-0 inline-flex items-center px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-md text-xs text-red-300 transition"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              New Interview
            </button>
          </div>
          <div className="bg-indigo-600/10 p-5 rounded-lg border border-indigo-500/20 mb-6">
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0 mt-1 border border-indigo-500/30">
                <Lightbulb className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="ml-4">
                <h4 className="text-md font-medium text-white mb-2">
                  Overall AI Summary
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {interviewData.summary || "No overall summary available."}
                </p>
              </div>
            </div>
          </div>
          {/* Overall Suggestions */}
          <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-700/30 mb-8">
            <h4 className="text-md font-medium text-white mb-3 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-indigo-400" />
              Overall Improvement Tips
            </h4>
            {interviewData.aiSuggestions &&
            interviewData.aiSuggestions.length > 0 ? (
              <ul className="space-y-2">
                {interviewData.aiSuggestions.map((s, i) => (
                  <li key={i} className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/30 mr-3">
                      <span className="text-xs text-indigo-400 font-bold">
                        {i + 1}
                      </span>
                    </div>
                    <span className="text-gray-300 text-sm">{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No overall suggestions generated.
              </p>
            )}
          </div>
          {/* Word Usage */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">
              Overall Word Usage
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-700/30">
                <h4 className="text-md font-medium text-white mb-3">
                  Top Domain Words
                </h4>
                {domainWords.length > 0 ? (
                  <div className="space-y-3">
                    {domainWords.map((item, index) => (
                      <div key={`domain-${index}`}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300 truncate pr-2">
                            {item.word}
                          </span>
                          <span className="text-gray-400 shrink-0">
                            {item.count} times
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{
                              width: `${Math.max(
                                1,
                                (item.count / maxCount) * 100
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No domain words tracked.
                  </p>
                )}
              </div>
              <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-700/30">
                <h4 className="text-md font-medium text-white mb-3">
                  Filler Words
                </h4>
                {fillerWords.length > 0 ? (
                  <div className="space-y-3">
                    {fillerWords.map((item, index) => (
                      <div key={`filler-${index}`}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">"{item.word}"</span>
                          <span className="text-gray-400">
                            {item.count} times
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-yellow-500 h-full rounded-full"
                            style={{
                              width: `${Math.max(
                                1,
                                (item.count / maxCount) * 100
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No filler words tracked.
                  </p>
                )}
              </div>
            </div>
          </div>
          {/* Word Cloud (Optional) */}
          {interviewData.wordUsage && interviewData.wordUsage.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 shadow-lg mt-8">
              <div className="flex items-center mb-4">
                <BarChart className="h-5 w-5 text-indigo-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Word Cloud</h3>
              </div>
              <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700/30 flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5">
                {interviewData.wordUsage.map((item, index) => (
                  <span
                    key={`cloud-${index}`}
                    className="px-2 py-0.5 rounded bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 transition-all duration-300 hover:bg-indigo-600/40"
                    style={{
                      fontSize: `${Math.max(
                        0.75,
                        Math.min(1.8, (item.count / maxCount) * 1.4)
                      )}rem`,
                      opacity: Math.max(0.6, item.count / maxCount),
                      lineHeight: "1.2",
                    }}
                  >
                    {item.word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Question Analysis Section */}
        <h2 className="text-xl font-bold mb-6 text-white">
          Detailed Analysis per Question
        </h2>
        <div className="space-y-4">
          {interviewData.questionAnalyses &&
          interviewData.questionAnalyses.length > 0 ? (
            interviewData.questionAnalyses.map((qAnalysis, index) => (
              <div
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-xl shadow-lg overflow-hidden"
              >
                <button
                  onClick={() =>
                    toggleQuestionAnalysis(qAnalysis.questionNumber)
                  }
                  className="w-full flex justify-between items-center p-4 bg-gray-700/30 hover:bg-gray-700/50 transition duration-200"
                >
                  <span className="font-medium text-white text-left">
                    Question {qAnalysis.questionNumber}:{" "}
                    {qAnalysis.questionText}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transform transition-transform duration-300 ${
                      expandedQuestion === qAnalysis.questionNumber
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>
                {expandedQuestion === qAnalysis.questionNumber && (
                  <div className="p-5 border-t border-gray-700/30 bg-gray-900/20 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      <div className="space-y-3">
                        <h4 className="text-md font-semibold text-indigo-300 mb-2">
                          Content & Relevance
                        </h4>
                        <p>
                          <strong className="text-gray-400">Relevance:</strong>{" "}
                          <span
                            className={
                              qAnalysis.analysis.relevance === "High"
                                ? "text-green-400"
                                : qAnalysis.analysis.relevance === "Medium"
                                ? "text-yellow-400"
                                : "text-red-400"
                            }
                          >
                            {qAnalysis.analysis.relevance}
                          </span>
                        </p>
                        <p>
                          <strong className="text-gray-400">Assessment:</strong>{" "}
                          {qAnalysis.analysis.contentQuality?.assessment ||
                            "N/A"}
                        </p>
                        {qAnalysis.analysis.contentQuality?.strengths?.length >
                          0 && (
                          <p>
                            <strong className="text-gray-400">
                              Strengths:
                            </strong>{" "}
                            {qAnalysis.analysis.contentQuality.strengths.join(
                              ", "
                            )}
                          </p>
                        )}
                        {qAnalysis.analysis.contentQuality?.weaknesses?.length >
                          0 && (
                          <p>
                            <strong className="text-gray-400">
                              Weaknesses:
                            </strong>{" "}
                            {qAnalysis.analysis.contentQuality.weaknesses.join(
                              ", "
                            )}
                          </p>
                        )}
                        {qAnalysis.analysis.keywords?.used?.length > 0 && (
                          <p>
                            <strong className="text-gray-400">
                              Keywords Used:
                            </strong>{" "}
                            {qAnalysis.analysis.keywords.used
                              .map((k) => `"${k}"`)
                              .join(", ")}
                          </p>
                        )}
                        {qAnalysis.analysis.keywords?.suggested?.length > 0 && (
                          <p>
                            <strong className="text-gray-400">
                              Suggested Keywords:
                            </strong>{" "}
                            {qAnalysis.analysis.keywords.suggested
                              .map((k) => `"${k}"`)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-md font-semibold text-indigo-300 mb-2">
                          Clarity & Delivery
                        </h4>
                        <p>
                          <strong className="text-gray-400">
                            Clarity/Conciseness:
                          </strong>{" "}
                          {qAnalysis.analysis.clarityConciseness || "N/A"}
                        </p>
                        <p>
                          <strong className="text-gray-400">Confidence:</strong>{" "}
                          {qAnalysis.analysis.languageDelivery?.confidence ||
                            "N/A"}
                        </p>
                        <p>
                          <strong className="text-gray-400">
                            Professionalism:
                          </strong>{" "}
                          {qAnalysis.analysis.languageDelivery
                            ?.professionalism || "N/A"}
                        </p>
                        {qAnalysis.analysis.languageDelivery?.fillerWords
                          ?.length > 0 && (
                          <p>
                            <strong className="text-gray-400">
                              Filler Words:
                            </strong>{" "}
                            <span className="text-yellow-400">
                              {qAnalysis.analysis.languageDelivery.fillerWords.join(
                                ", "
                              )}
                            </span>
                          </p>
                        )}
                        <div className="pt-2">
                          <h5 className="text-md font-semibold text-indigo-300 mb-2">
                            Improvement Tips
                          </h5>
                          {qAnalysis.analysis.improvementSuggestions &&
                          qAnalysis.analysis.improvementSuggestions.length >
                            0 ? (
                            <ul className="list-disc list-inside space-y-1 text-gray-300">
                              {qAnalysis.analysis.improvementSuggestions.map(
                                (tip, idx) => (
                                  <li key={idx}>{tip}</li>
                                )
                              )}
                            </ul>
                          ) : (
                            <p className="text-gray-500 italic">
                              No specific tips for this question.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 italic p-6 bg-gray-800/30 rounded-lg">
              No detailed question analysis available.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ResultsSection;
