import { useState } from "react";

import Sidebar from "../components/sidebar/Sidebar";
import Topbar from "../components/topbar/Topbar";

import Dashboard from "../pages/Dashboard";
import AdvancedWorkflow from "../pages/AdvancedWorkflow";
import WorkflowBuilder from "../pages/WorkflowBuilder";

export default function AppLayout() {
  const [activePage, setActivePage] = useState("dashboard");

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ===== SIDEBAR ===== */}
      <Sidebar setActivePage={setActivePage} />

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col ml-72">
        {/* IMPORTANT: ml-72 matches sidebar width */}

        {/* ===== TOPBAR ===== */}
        <Topbar />

        {/* ===== PAGE CONTENT ===== */}
        <main className="p-8 mt-16">

          {/* DASHBOARD */}
          {activePage === "dashboard" && <Dashboard />}

          {/* ADVANCED WORKFLOW LANDING */}
          {activePage === "advanced-workflow" && (
            <AdvancedWorkflow setActivePage={setActivePage} />
          )}

          {/* 🔥 WORKFLOW BUILDER (NEW) */}
          {activePage === "workflow-builder" && (
            <WorkflowBuilder />
          )}

        </main>
      </div>
    </div>
  );
}