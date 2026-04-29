import {
  LayoutDashboard,
  Folder,
  Database
} from "lucide-react";

import logo from "../../assets/logo.png";

type Props = {
  setActivePage: (page: string) => void;
};

export default function Sidebar({ setActivePage }: Props) {
  return (
    <div className="fixed left-0 top-0 w-72 h-screen bg-[#011b21] text-white flex flex-col">

      {/* ===== HEADER ===== */}
      <div className="p-4 border-b border-cyan-500/30 flex items-center gap-3">

        {/* LOGO */}
        <img
          src={logo}
          alt="logo"
          className="w-10 h-10 object-contain"
        />

        {/* TITLE */}
        <div className="leading-tight">
          <h1 className="text-cyan-400 font-bold text-sm">
            ArcherSim Engine
          </h1>
          <p className="text-[10px] text-cyan-300/60">
            Powered by GRCXperts
          </p>
        </div>
      </div>

      {/* ===== MENU ===== */}
      <div className="p-4 space-y-2 overflow-y-auto flex-1">

        {/* DASHBOARD */}
        <div
          onClick={() => setActivePage("dashboard")}
          className="flex items-center gap-3 p-2 rounded hover:bg-white/10 cursor-pointer transition whitespace-nowrap"
        >
          <LayoutDashboard size={18} />
          <span className="text-sm">Dashboard</span>
        </div>

        {/* SECTION */}
        <div className="text-xs text-cyan-400 mt-4 uppercase tracking-wide">
          Application / Questionnaire
        </div>

        {/* MENU ITEMS */}
        {[
          { label: "Create Application", key: "create-application" },
          { label: "Create Questionnaire", key: "create-questionnaire" },
          { label: "Create Fields", key: "create-fields" },
          { label: "Create DDE's", key: "create-dde" },
          { label: "Simulate Calculation", key: "simulate-calculation" },
          { label: "Advanced Workflow", key: "advanced-workflow" }
        ].map((item) => (
          <div
            key={item.key}
            onClick={() => setActivePage(item.key)}
            className="flex items-center gap-3 p-2 rounded hover:bg-white/10 cursor-pointer text-sm transition whitespace-nowrap"
          >
            <Folder size={16} />
            <span>{item.label}</span>
          </div>
        ))}

        {/* DATA FEED */}
        <div className="text-xs text-cyan-400 mt-4 uppercase tracking-wide">
          Data Feed
        </div>

        <div
          onClick={() => setActivePage("data-feed")}
          className="flex items-center gap-3 p-2 rounded hover:bg-white/10 cursor-pointer text-sm transition whitespace-nowrap"
        >
          <Database size={16} />
          <span>Data Feed</span>
        </div>

      </div>

      {/* ===== FOOTER ===== */}
      <div className="p-3 text-[10px] text-cyan-300/40 border-t border-cyan-500/20">
        v1.0.0
      </div>
    </div>
  );
}