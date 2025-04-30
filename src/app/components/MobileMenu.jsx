import React from "react";
import { Trash2, Settings, Mic, Activity } from "lucide-react";

const MobileMenu = ({
  activeSection,
  setActiveSection,
  closeMobileMenu,
  hasResults,
  resetInterview,
}) => {
  const menuItems = [
    { id: "setup", label: "Setup", icon: Settings },
    {
      id: "interview",
      label: "Interview",
      icon: Mic,
      disabled: activeSection === "setup" && !hasResults,
    },
    { id: "results", label: "Results", icon: Activity, disabled: !hasResults },
  ];

  const handleNavigation = (sectionId) => {
    if (menuItems.find((item) => item.id === sectionId && !item.disabled)) {
      setActiveSection(sectionId);
      closeMobileMenu();
    }
  };

  const handleReset = () => {
    resetInterview();
    closeMobileMenu();
  };

  return (
    <div
      id="mobile-menu"
      className="lg:hidden bg-gray-800 p-4 absolute top-16 left-0 right-0 z-30 border-b border-gray-700 shadow-lg"
    >
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.id)}
            disabled={item.disabled}
            className={`w-full flex items-center px-4 py-3 rounded-md transition duration-200 ${
              activeSection === item.id
                ? "bg-indigo-600/30 text-indigo-300"
                : item.disabled
                ? "text-gray-600 cursor-not-allowed"
                : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
            }`}
          >
            <item.icon className="h-5 w-5 mr-3" />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      {hasResults && (
        <div className="mt-4 pt-4 border-t border-gray-700/30">
          <button
            onClick={handleReset}
            className="w-full flex items-center px-4 py-3 rounded-md transition duration-200 text-red-400 hover:bg-red-500/20 hover:text-red-300"
          >
            <Trash2 className="h-5 w-5 mr-3" />
            <span className="text-sm font-medium">Reset & New Interview</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileMenu;