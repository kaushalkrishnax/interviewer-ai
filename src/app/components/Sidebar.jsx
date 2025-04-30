import { Settings, Mic, Activity, Trash2, PlayCircle } from "lucide-react";
import { useCallback } from "react";

const Sidebar = ({
  activeSection,
  setActiveSection,
  hasResults,
  resetInterview,
}) => {
  const menuItems = [
    { id: "setup", label: "Setup", icon: Settings, ariaLabel: "Configure interview settings" },
    {
      id: "interview",
      label: "Interview",
      icon: Mic,
      disabled: activeSection === "setup" && !hasResults,
      ariaLabel: "Start or continue interview",
    },
    {
      id: "results",
      label: "Results",
      icon: Activity,
      disabled: !hasResults,
      ariaLabel: "View interview results",
    },
  ];

  const handleSectionChange = useCallback(
    (sectionId) => {
      setActiveSection(sectionId);
    },
    [setActiveSection]
  );

  return (
    <aside className="hidden lg:flex w-64 bg-gray-800/80 backdrop-blur-md border-r border-gray-700/50 p-6 flex-shrink-0 flex-col transition-all duration-300">
      {/* Header */}
      <div className="mb-8 flex items-center gap-2">
        <PlayCircle className="h-7 w-7 text-indigo-400 animate-pulse" />
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Interviewer AI
        </h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 flex-grow" role="navigation" aria-label="Main navigation">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && handleSectionChange(item.id)}
            disabled={item.disabled}
            aria-label={item.ariaLabel}
            aria-current={activeSection === item.id ? "page" : undefined}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
              activeSection === item.id
                ? "bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 shadow-lg"
                : item.disabled
                ? "text-gray-600 cursor-not-allowed opacity-60"
                : "text-gray-300 hover:bg-gray-700/60 hover:text-white hover:shadow-md"
            }`}
          >
            <item.icon
              className={`h-5 w-5 mr-3 transition-colors ${
                activeSection === item.id ? "text-indigo-400" : "text-gray-400"
              }`}
              aria-hidden="true"
            />
            <span className="text-sm font-medium">{item.label}</span>
            {item.disabled && (
              <span className="sr-only">(Disabled)</span>
            )}
          </button>
        ))}
      </nav>

      {/* Reset Button */}
      {hasResults && (
        <footer className="mt-auto pt-6 border-t border-gray-700/50">
          <button
            onClick={resetInterview}
            aria-label="Reset and start new interview"
            className="w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-red-400 hover:bg-red-600/20 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <Trash2 className="h-5 w-5 mr-3" aria-hidden="true" />
            <span className="text-sm font-medium">Reset & New Interview</span>
          </button>
        </footer>
      )}
    </aside>
  );
};

export default Sidebar;