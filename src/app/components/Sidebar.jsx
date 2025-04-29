import { Settings, Mic, Activity, Trash2, PlayCircle } from "lucide-react";

const Sidebar = ({
  activeSection,
  setActiveSection,
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

  return (
    <aside className="hidden lg:flex w-64 bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/30 p-6 flex-shrink-0 flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <PlayCircle className="h-6 w-6 mr-2 text-indigo-400" /> Interviewer AI
        </h1>
      </div>
      <nav className="space-y-2 flex-grow">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && setActiveSection(item.id)}
            disabled={item.disabled}
            className={`w-full flex items-center px-4 py-2.5 rounded-lg transition duration-200 ${
              activeSection === item.id
                ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shadow-sm"
                : item.disabled
                ? "text-gray-600 cursor-not-allowed"
                : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
            }`}
          >
            <item.icon
              className={`h-5 w-5 mr-3 ${
                activeSection === item.id ? "text-indigo-400" : ""
              }`}
            />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
        {hasResults && (
          <div className="mt-auto pt-6 border-t border-gray-700/30">
            <button
              onClick={resetInterview}
              className="w-full flex items-center px-4 py-2.5 rounded-lg transition duration-200 text-red-400 hover:bg-red-500/20 hover:text-red-300"
            >
              <Trash2 className="h-5 w-5 mr-3" />
              <span className="text-sm font-medium">Reset & New Interview</span>
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
