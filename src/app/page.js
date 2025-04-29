"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  X,
  FileText,
} from "lucide-react";
import InterviewSection from "@/app/components/InterviewSection";
import SetupSection from "@/app/components/SetupSection";
import ResultsSection from "@/app/components/ResultsSecion";
import Sidebar from "@/app/components/Sidebar";
import MobileMenu from "@/app/components/MobileMenu";

export default function Home() {
  const [activeSection, setActiveSection] = useState("setup");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const interviewResults = localStorage.getItem("interviewResults");
      const currentInterview = localStorage.getItem("currentInterview");
      if (interviewResults) {
        setHasResults(true);
        setActiveSection(currentInterview ? "interview" : "results");
      } else if (currentInterview) {
        setActiveSection("interview");
        setHasResults(false);
      } else {
        setActiveSection("setup");
        setHasResults(false);
      }
      setIsLoading(false);
    }

    const style = document.createElement("style");
    style.textContent = `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const startInterview = () => {
    setActiveSection("interview");
    setHasResults(false);
    setIsMobileMenuOpen(false);
  };

  const handleFinishInterview = () => {
    if (typeof window !== "undefined") {
      const currentInterviewString = localStorage.getItem("currentInterview");
      if (!currentInterviewString) {
        console.error("Finish Error: No current interview data.");
        resetInterview();
        return;
      }
      try {
        const finishedInterviewData = JSON.parse(currentInterviewString);

        const finalSummary = `Overall, the interview performance for the ${
          finishedInterviewData.setupData.position || "role"
        } showed promise. Key strengths were observed in areas like [Simulated Strength Area]. Areas for development include [Simulated Weakness Area] and reducing filler word usage. See detailed analysis per question below.`;
        const finalSuggestions = [
          "Review the detailed feedback for each question.",
          "Practice structuring answers using the STAR method, especially for behavioral questions.",
          "Record yourself practicing answers to identify and reduce filler words.",
          "Tailor your examples more directly to the specific job requirements next time.",
        ];

        const totalDuration =
          finishedInterviewData.questionAnalyses.length * 2 +
          Math.floor(Math.random() * 5);

        const aggregatedWordUsage = [
          { word: "React", count: Math.floor(Math.random() * 10) + 5 },
          { word: "project", count: Math.floor(Math.random() * 8) + 4 },
          { word: "experience", count: Math.floor(Math.random() * 7) + 3 },
          { word: "team", count: Math.floor(Math.random() * 6) + 2 },
          { word: "challenge", count: Math.floor(Math.random() * 5) + 4 },
          { word: "solution", count: Math.floor(Math.random() * 4) + 2 },
          { word: "I", count: Math.floor(Math.random() * 15) + 10 },
          { word: "like", count: Math.floor(Math.random() * 8) + 1 },
          { word: "um", count: Math.floor(Math.random() * 5) + 0 },
          { word: "basically", count: Math.floor(Math.random() * 4) + 0 },
        ].filter((w) => w.count > 0);

        const completedInterview = {
          ...finishedInterviewData,
          duration: `${totalDuration} min`,
          summary: finalSummary,
          wordUsage: aggregatedWordUsage,
          aiSuggestions: finalSuggestions,
        };

        localStorage.setItem(
          "interviewResults",
          JSON.stringify(completedInterview)
        );
        localStorage.removeItem("currentInterview");
        setHasResults(true);
        setActiveSection("results");
        setIsMobileMenuOpen(false);
      } catch (error) {
        console.error("Error finalizing interview:", error);
        resetInterview();
      }
    }
  };

  const resetInterview = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("interviewResults");
      localStorage.removeItem("currentInterview");
      localStorage.removeItem("interviewSetup");
      setHasResults(false);
      setActiveSection("setup");
      setIsMobileMenuOpen(false);
    }
  };

  const renderSection = () => {
    if (isLoading)
      return (
        <div className="flex justify-center items-center min-h-screen text-white">
          Initializing InterviewAI...
        </div>
      );
    switch (activeSection) {
      case "setup":
        return <SetupSection startInterview={startInterview} />;
      case "interview":
        return (
          <InterviewSection handleFinishInterview={handleFinishInterview} />
        );
      case "results":
        return <ResultsSection resetInterview={resetInterview} />;
      default:
        return <SetupSection startInterview={startInterview} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-900/30 text-gray-100 flex">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        hasResults={hasResults}
        resetInterview={resetInterview}
      />
      <div className="flex flex-col flex-1 min-w-0">
        {" "}
        {/* Added min-w-0 for flex shrink */}
        <header className="bg-gray-800/70 backdrop-blur-sm p-4 flex items-center justify-between lg:hidden border-b border-gray-700/50 sticky top-0 z-20">
          <div className="flex items-center">
            <FileText className="h-6 w-6 mr-2 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">InterviewAI</h1>
          </div>
          <button
            className="text-gray-200 hover:text-white focus:outline-none p-1"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-controls="mobile-menu"
            aria-expanded={isMobileMenuOpen}
          >
            {!isMobileMenuOpen ? (
              <Menu className="h-6 w-6" />
            ) : (
              <X className="h-6 w-6" />
            )}
          </button>
        </header>
        {isMobileMenuOpen && (
          <MobileMenu
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            closeMobileMenu={() => setIsMobileMenuOpen(false)}
            hasResults={hasResults}
            resetInterview={resetInterview}
          />
        )}
        {/* Added z-index lower than mobile menu */}
        <main
          className={`flex-1 transition-opacity duration-300 ${
            isMobileMenuOpen
              ? "opacity-30 lg:opacity-100 pointer-events-none lg:pointer-events-auto"
              : "opacity-100"
          } relative z-0`}
        >
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
