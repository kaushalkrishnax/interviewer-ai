"use client";

import React, { createContext, useContext, useState } from "react";

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [formData, setFormData] = useState({
    instructions: "",
    position: "",
    interviewer: { avatar_id: "Annie_expressive2_public", voice_id: "c8e176c17f814004885fd590e03ff99f" },
    resume: "",
  });
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const resetInterview = () => {
    setCurrentQuestion(null);
    setAnswers([]);
    setProgress(0);
    setIsLoading(false);
  };

  return (
    <AppContext.Provider
      value={{
        formData,
        setFormData,
        questions,
        setQuestions,
        currentQuestion,
        setCurrentQuestion,
        answers,
        setAnswers,
        isLoading,
        setIsLoading,
        progress,
        setProgress,
        resetInterview,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
