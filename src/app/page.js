"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Menu, X, FileText, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import InterviewSection from "@/app/components/InterviewSection";
import SetupSection from "@/app/components/SetupSection";
import ResultsSection from "@/app/components/ResultsSection";
import Sidebar from "@/app/components/Sidebar";
import MobileMenu from "@/app/components/MobileMenu";
import { useAppContext } from "@/app/context/AppContext";

const Home = () => {
  const { formData } = useAppContext();
  const [activeSection, setActiveSection] = useState("setup");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [error, setError] = useState(null);
  const mainRef = useRef(null);

  useEffect(() => {
    const loadInitialState = () => {
      try {
        const interviewResults = localStorage.getItem("interviewResults");
        const currentInterview = localStorage.getItem("currentInterview");
        const sidebarState = localStorage.getItem("sidebarCollapsed");
        if (sidebarState) {
          setIsSidebarCollapsed(JSON.parse(sidebarState));
        }
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
      } catch (err) {
        console.error("Error loading initial state:", err);
        setError("Failed to load interview data. Please reset and try again.");
        setActiveSection("setup");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialState();

    // Add global CSS for animations
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
      .animate-slide-in { animation: slideIn 0.5s ease-out forwards; }
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .animate-gradient-bg {
        background-size: 200% 200%;
        animation: gradientShift 15s ease infinite;
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-10px); }
        40%, 80% { transform: translateX(10px); }
      }
      .animate-shake { animation: shake 0.5s ease-in-out; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    // Update document title dynamically
    const sectionTitles = {
      setup: "Interview Setup",
      interview: "AI Interview",
      results: "Interview Results",
    };
    document.title = `Interviewer AI - ${sectionTitles[activeSection]}${formData.position ? ` for ${formData.position}` : ""}`;
  }, [activeSection, formData.position]);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        setShowResetConfirm(true);
      }
      if (e.ctrlKey && e.key === "m") {
        e.preventDefault();
        setIsMobileMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.addEventListener("keydown", handleKeyDown);
  }, []);

  const startInterview = useCallback(() => {
    setActiveSection("interview");
    setHasResults(false);
    setIsMobileMenuOpen(false);
    setError(null);
    if (mainRef.current) {
      mainRef.current.focus();
    }
  }, []);

  const handleFinishInterview = useCallback(() => {
    try {
      const currentInterviewString = localStorage.getItem("currentInterview");
      if (!currentInterviewString) {
        throw new Error("No current interview data.");
      }
      const finishedInterviewData = JSON.parse(currentInterviewString);

      localStorage.setItem("interviewResults", JSON.stringify(finishedInterviewData));
      localStorage.removeItem("currentInterview");

      setHasResults(true);
      setActiveSection("results");
      setIsMobileMenuOpen(false);
      setError(null);
    } catch (error) {
      console.error("Error finalizing interview:", error);
      setError("Failed to finalize interview. Please try again or reset.");
    }
  }, []);

  const resetInterview = useCallback(() => {
    try {
      localStorage.removeItem("interviewResults");
      localStorage.removeItem("currentInterview");
      localStorage.removeItem("interviewSetup");
      localStorage.removeItem("interviewSetupErrors");
      setHasResults(false);
      setActiveSection("setup");
      setIsMobileMenuOpen(false);
      setShowResetConfirm(false);
      setError(null);
    } catch (error) {
      console.error("Error resetting interview:", error);
      setError("Failed to reset interview. Please try again.");
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
      return newState;
    });
  };

  const renderSection = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-white animate-fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-4" />
          <p className="text-lg font-semibold">Initializing InterviewAI...</p>
        </div>
      );
    }

    const sections = {
      setup: <SetupSection startInterview={startInterview} />,
      interview: <InterviewSection handleFinishInterview={handleFinishInterview} />,
      results: <ResultsSection goToSetup={resetInterview} />,
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {sections[activeSection] || sections.setup}
        </motion.div>
      </AnimatePresence>
    );
  };

  const progressSteps = [
    { id: "setup", label: "Setup", active: activeSection === "setup" },
    { id: "interview", label: "Interview", active: activeSection === "interview" },
    { id: "results", label: "Results", active: activeSection === "results" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-black text-gray-100 flex animate-gradient-bg">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        hasResults={hasResults}
        resetInterview={() => setShowResetConfirm(true)}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <header className="bg-gray-800/70 backdrop-blur-sm p-4 flex items-center justify-between lg:hidden border-b border-indigo-500/30 sticky top-0 z-20">
          <div className="flex items-center">
            <FileText className="h-6 w-6 mr-2 text-indigo-400 animate-pulse" />
            <h1 className="text-xl font-bold text-indigo-300">
              InterviewAI - {progressSteps.find((s) => s.active)?.label}
            </h1>
          </div>
          <button
            className="text-gray-200 hover:text-white focus:outline-none p-1 rounded-full transition-all duration-200"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-controls="mobile-menu"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </header>

        {isMobileMenuOpen && (
          <MobileMenu
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            closeMobileMenu={() => {
              setIsMobileMenuOpen(false);
              if (mainRef.current) mainRef.current.focus();
            }}
            hasResults={hasResults}
            resetInterview={() => setShowResetConfirm(true)}
          />
        )}

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-600/50 rounded-xl text-sm text-red-200 flex items-center shadow-md animate-shake mx-4 mt-4 max-w-4xl" role="alert">
            <AlertCircle className="h-6 w-6 mr-3 text-red-400" />
            {error}
          </div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800/90 backdrop-blur-sm p-6 rounded-xl border border-indigo-500/30 max-w-md w-full animate-fade-in">
              <h3 className="text-lg font-semibold text-indigo-300 mb-4">
                Confirm Reset
              </h3>
              <p className="text-sm text-gray-200 mb-6">
                Are you sure you want to reset the interview? This will clear all
                setup, interview, and results data.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold rounded-lg transition-all duration-300"
                  aria-label="Cancel reset"
                >
                  Cancel
                </button>
                <button
                  onClick={resetInterview}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all duration-300"
                  aria-label="Confirm reset"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        <main
          ref={mainRef}
          tabIndex={-1}
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
};

export default Home;