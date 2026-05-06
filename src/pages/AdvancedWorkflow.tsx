import { Upload, Workflow, Download } from "lucide-react";
import readXlsxFile from "read-excel-file/browser";
import ExcelJS from "exceljs";
import type { Step } from "./WorkflowBuilder";

type Props = {
  setActivePage: (page: string) => void;
  setWorkflowSteps: (steps: Step[]) => void;
};

export default function AdvancedWorkflow({ setActivePage, setWorkflowSteps }: Props) {

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      alert("Only Excel (.xlsx) files are allowed");
      return;
    }

    try {
      const parsed = await readXlsxFile(file);
      
      // read-excel-file v9 returns an array of sheets: [{ sheet: string, data: any[][] }]
      // or a direct 2D array in some cases. We normalize it here.
      const rows = (parsed[0] && Array.isArray(parsed[0].data)) ? parsed[0].data : parsed;

      console.log("Parsed Excel rows:", rows);

      if (!rows || rows.length <= 1) {
        alert("The Excel file seems to be empty or only contains a header.");
        return;
      }

      // Expected Schema (Header in row 0):
      // Col 0: Step Number
      // Col 1: Action (Start, update, condition, text, layout, notification, launch, useraction, stop)
      // Col 2: Field Type (text, numeric, valueList, user, date)
      // Col 3: Field Name / Condition Field
      // Col 4: Field Value / Condition Value
      // Col 5: Date Option (current, days, specific, blank)
      // Col 6: User Type (user, group)
      // Col 7: Condition Operator (Equals, Contains, etc.)
      // Col 8: True Step (for condition)
      // Col 9: Default Step (for condition)

      const stepMap = new Map<number, Step>();
      let maxStepNum = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const actionRaw = row[1]?.toString() || "";
        const action = actionRaw.trim().toLowerCase();
        
        if (!action) continue;

        const stepNumRaw = row[0];
        // If step number isn't provided, auto-increment from the max step number seen
        const stepNum = stepNumRaw ? Number(stepNumRaw) : maxStepNum + 1;
        maxStepNum = Math.max(maxStepNum, stepNum);

        if (!stepMap.has(stepNum)) {
          stepMap.set(stepNum, {
            action: action === "start" ? "Start" : action,
            fields: [],
            rules: [],
          });
        }
        
        const step = stepMap.get(stepNum)!;
        
        // If the row action differs from the step action, skip or override? We assume action matches.
        if (action === "start") continue;

        const logicRaw = row[2]?.toString().trim() || "";
        const logic = ["AND", "OR"].includes(logicRaw.toUpperCase()) ? logicRaw.toUpperCase() as "AND" | "OR" : "";
        
        const fieldType = row[3]?.toString().trim() || "";
        const fieldName = row[4]?.toString().trim() || "";
        const fieldValue = row[5]?.toString().trim() || "";
        const dateOption = row[6]?.toString().trim() || "";
        const userType = row[7]?.toString().trim() || "";
        const ruleOp = row[8]?.toString().trim() || "";

        const trueStepRaw = row[9];
        const defaultStepRaw = row[10];
        const trueStep = trueStepRaw ? Number(trueStepRaw) : "";
        const defaultStep = defaultStepRaw ? Number(defaultStepRaw) : "";

        if (action === "update") {
          step.fields.push({
            type: fieldType || "text",
            fieldName: fieldName,
            value: fieldValue,
            dateOption: dateOption,
            userType: userType
          });
        } else if (["text", "layout", "notification", "launch", "useraction"].includes(action)) {
          step.fields.push({
            type: action,
            fieldName: fieldName || action,
            value: fieldValue || ""
          });
        } else if (action === "condition") {
          step.rules?.push({
            logic: logic,
            fieldType: fieldType || "text",
            fieldName: fieldName,
            operator: ruleOp || "Equals",
            value: fieldValue,
            dateOption: dateOption,
            trueStep: logic === "" ? trueStep : "" // Only apply trueStep if it's the end of a chain
          });
          if (defaultStep) {
            step.defaultStep = defaultStep;
          }
        }
      }

      // Convert Map to array, ordered by Step Number
      const sortedKeys = Array.from(stepMap.keys()).sort((a, b) => a - b);
      const stepsData: Step[] = sortedKeys.map(k => stepMap.get(k)!);

      if (stepsData.length === 0) {
        stepsData.push({ action: "Start", fields: [] });
      } else if (stepsData[0].action !== "Start") {
        stepsData.unshift({ action: "Start", fields: [] });
      }

      setWorkflowSteps(stepsData);
      setActivePage("workflow-builder");

    } catch (error) {
      console.error("Error parsing excel", error);
      alert("Failed to parse the Excel file. Ensure it matches the schema.");
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Workflow');

    // Add Headers
    sheet.addRow([
      'Step Number', 
      'Action', 
      'Logic (AND/OR)',
      'Field Type', 
      'Field Name', 
      'Value', 
      'Date Option',
      'User Type',
      'Operator', 
      'True Step', 
      'Default Step'
    ]);

    // Add Step 1
    sheet.addRow([1, 'Start', '', '', '', '', '', '', '', '', '']);

    // Style the header row to be bold
    sheet.getRow(1).font = { bold: true };

    // Auto-adjust column widths
    sheet.columns.forEach(column => {
      column.width = 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "Workflow_Template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            <br /><br />
            <strong>Expected Columns:</strong><br />
            A: Step Number | B: Action | C: Logic | D: Field Type | E: Field Name | F: Value | G: Date Option | H: User Type | I: Operator | J: True Step | K: Default Step
          </p>

          <div className="flex gap-4">
            <label className="cursor-pointer flex-1">
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

            <button 
              onClick={downloadTemplate}
              className="flex-1 flex items-center justify-center gap-2 border-2 border-[#1e8ea3] text-[#1e8ea3] py-2 rounded-lg hover:bg-gray-50 transition"
            >
              <Download size={18} />
              Template
            </button>
          </div>
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
            onClick={() => setActivePage("workflow-builder")}
            className="w-full bg-[#0b5f63] text-white py-2 rounded-lg hover:bg-[#094c4f] transition"
          >
            Open Builder
          </button>
        </div>

      </div>
    </div>
  );
}