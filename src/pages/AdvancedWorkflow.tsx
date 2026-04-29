import { Upload, Workflow } from "lucide-react";

type Props = {
  setActivePage: (page: string) => void;
};

export default function AdvancedWorkflow({ setActivePage }: Props) {

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      alert("Only Excel (.xlsx) files are allowed");
      return;
    }

    console.log("Uploaded file:", file);
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold text-gray-900">
          Archer Workflow Simulation Studio
        </h1>
        <p className="text-gray-600 mt-1">
          Upload Excel or build workflow visually
        </p>
      </div>

      {/* OPTIONS */}
      <div className="grid grid-cols-2 gap-6">

        {/* UPLOAD EXCEL */}
        <div className="bg-white p-6 rounded-xl shadow">

          <div className="flex items-center gap-3 mb-4">
            <Upload className="text-[#0b5f63]" size={22} />
            <h2 className="text-lg font-semibold text-gray-800">
              Upload Excel Workflow
            </h2>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Upload your workflow Excel file to simulate automatically.
          </p>

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="bg-[#1e8ea3] text-white text-center py-2 rounded-lg hover:bg-[#166c7a] transition">
              Upload Excel
            </div>
          </label>
        </div>

        {/* 🔥 BUILD WORKFLOW */}
        <div className="bg-white p-6 rounded-xl shadow">

          <div className="flex items-center gap-3 mb-4">
            <Workflow className="text-[#0b5f63]" size={22} />
            <h2 className="text-lg font-semibold text-gray-800">
              Build Workflow
            </h2>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Design workflow visually using builder.
          </p>

          <button
            onClick={() => setActivePage("workflow-builder")}   // 🔥 THIS IS THE FIX
            className="w-full bg-[#0b5f63] text-white py-2 rounded-lg hover:bg-[#094c4f] transition"
          >
            Open Builder
          </button>
        </div>

      </div>
    </div>
  );
}