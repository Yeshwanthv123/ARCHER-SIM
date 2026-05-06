import { useState, useEffect } from "react";
import PlaybackEngine from "./PlaybackEngine";


export type Field = {
  type: string;
  fieldName: string;
  value: string;
  dateOption?: string;
  userType?: string;
};

export type Rule = {
  fieldType: string;
  fieldName: string;
  operator: string;
  value: string;
  dateOption?: string;
  trueStep?: number | "";
};

export type Step = {
  action: string;
  fields: Field[];
  rules?: Rule[];
  trueStep?: number | "";
  defaultStep?: number | "";
};

type Props = {
  initialSteps?: Step[] | null;
};

export default function WorkflowBuilder({ initialSteps }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [steps, setSteps] = useState<Step[]>(initialSteps || [
    { action: "Start", fields: [] }
  ]);

  useEffect(() => {
    if (initialSteps && initialSteps.length > 0) {
      setSteps(initialSteps);
    }
  }, [initialSteps]);

  // ✅ VERY IMPORTANT: UI SWITCH TO PLAYBACK
  if (isPlaying) {
    return (
      <PlaybackEngine
        steps={steps}
        onExit={() => setIsPlaying(false)}
      />
    );
  }

  const addStep = () => {
    setSteps([...steps, { action: "", fields: [] }]);
  };

  const updateAction = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = {
      action: value,
      fields: [],
      rules: value === "condition" ? [] : undefined,
      trueStep: "",
      defaultStep: ""
    };
    setSteps(updated);
  };

  const addField = (stepIndex: number) => {
    const updated = [...steps];
    updated[stepIndex].fields.push({
      type: "",
      fieldName: "",
      value: ""
    });
    setSteps(updated);
  };

  const updateField = (
    stepIndex: number,
    fieldIndex: number,
    key: string,
    value: string
  ) => {
    const updated = [...steps];
    (updated[stepIndex].fields[fieldIndex] as any)[key] = value;
    setSteps(updated);
  };

  const addRule = (stepIndex: number) => {
  const updated = [...steps];

  if (!updated[stepIndex].rules) {
    updated[stepIndex].rules = [];   // ✅ ensure exists
  }

  updated[stepIndex].rules.push({
    fieldType: "",
    fieldName: "",
    operator: "",
    value: "",
    dateOption: "",
    trueStep: ""
  });

  setSteps(updated);
};

  const updateRule = (
  stepIndex: number,
  ruleIndex: number,
  key: string,
  value: any
) => {
  const updated = [...steps];

  if (!updated[stepIndex].rules) return;

  updated[stepIndex].rules[ruleIndex] = {
    ...updated[stepIndex].rules[ruleIndex],
    [key]: value
  };

  setSteps(updated);
};
  // ✅ FIXED: Archer-style operators ONLY CHANGE HERE
  const getOperators = (type: string) => {
    switch (type) {
      case "text":
      case "valueList":
      case "user":
        return [
          "Contains",
          "Does Not Contain",
          "Equals",
          "Does Not Equal",
          "Changed",
          "Changed To",
          "Changed From"
        ];

      case "numeric":
        return [
          "Equals",
          "Does Not Equal",
          "Greater Than",
          "Less Than",
          "Greater Than or Equal",
          "Less Than or Equal",
          "Changed",
          "Changed To",
          "Changed From"
        ];

      case "date":
        return [
          "Equals",
          "Current",
          "Last",
          "Next",
          "Greater Than",
          "Less Than",
          "Between",
          "After Today",
          "Prior To Today",
          "Does Not Equal",
          "Changed",
          "Changed To",
          "Changed From"
        ];

      default:
        return [];
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div className="bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold">Workflow Builder</h1>
      </div>

      {steps.map((step, stepIndex) => (
        <div key={stepIndex} className="bg-white p-6 rounded-xl shadow space-y-4">

          <h2 className="text-sm text-gray-500">Step {stepIndex + 1}</h2>

          {stepIndex === 0 ? (
            <p className="text-green-600 font-semibold">Start</p>
          ) : (
            <>
              <select
                value={step.action}
                onChange={(e) => updateAction(stepIndex, e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select Action</option>
                <option value="update">Update</option>
                <option value="condition">Condition</option>
                <option value="text">Text</option>
                <option value="layout">Layout</option>
                <option value="notification">Notification</option>
                <option value="launch">Launch Event</option>
                <option value="stop">Stop</option>
              </select>

              {/* ================= UPDATE (UNCHANGED) ================= */}
              {step.action === "update" && (
                <>
                  {step.fields.map((field, i) => (
                    <div key={i} className="grid grid-cols-4 gap-3">

                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateField(stepIndex, i, "type", e.target.value)
                        }
                        className="border px-2 py-2"
                      >
                        <option value="">Type</option>
                        <option value="text">Text</option>
                        <option value="numeric">Numeric</option>
                        <option value="valueList">Value List</option>
                        <option value="user">User/Group</option>
                        <option value="date">Date</option>
                      </select>

                      <input
                        placeholder="Field Name"
                        value={field.fieldName}
                        onChange={(e) =>
                          updateField(stepIndex, i, "fieldName", e.target.value)
                        }
                        className="border px-2 py-2"
                      />

                      {(field.type === "text" || field.type === "valueList") && (
                        <input
                          placeholder="Value"
                          value={field.value}
                          onChange={(e) =>
                            updateField(stepIndex, i, "value", e.target.value)
                          }
                          className="border px-2 py-2"
                        />
                      )}

                      {field.type === "numeric" && (
                        <input
                          type="number"
                          placeholder="Number"
                          value={field.value}
                          onChange={(e) =>
                            updateField(stepIndex, i, "value", e.target.value)
                          }
                          className="border px-2 py-2"
                        />
                      )}

                      {field.type === "user" && (
                        <div className="flex gap-2 col-span-2">
                          <select
                            value={field.userType}
                            onChange={(e) =>
                              updateField(stepIndex, i, "userType", e.target.value)
                            }
                            className="border px-2 py-2 w-1/2"
                          >
                            <option value="">User/Group</option>
                            <option value="user">User</option>
                            <option value="group">Group</option>
                          </select>

                          <input
                            placeholder="User/Group Name"
                            value={field.value}
                            onChange={(e) =>
                              updateField(stepIndex, i, "value", e.target.value)
                            }
                            className="border px-2 py-2 w-1/2"
                          />
                        </div>
                      )}


                  {field.type === "date" && (
                    <div className="flex gap-2 col-span-2">
                      <select
                        value={field.dateOption}
                        onChange={(e) =>
                          updateField(stepIndex, i, "dateOption", e.target.value)
                        }
                        className="border px-2 py-2"
                      >
                        <option value="">Select</option>
                        <option value="current">Current Date</option>
                        <option value="days">Number of Days from Current Date</option>
                        <option value="specific">Specific Date</option>
                        <option value="blank">Blank</option>
                      </select>

                      {field.dateOption === "days" && (
                        <input
                          type="number"
                          placeholder="Enter Days"
                          value={field.value}
                          onChange={(e) =>
                            updateField(stepIndex, i, "value", e.target.value)
                          }
                          className="border px-2 py-2"
                        />
                      )}

                      {field.dateOption === "specific" && (
                        <input
                          type="date"
                          value={field.value}
                          onChange={(e) =>
                            updateField(stepIndex, i, "value", e.target.value)
                          }
                          className="border px-2 py-2"
                        />
                      )}
                    </div>
                  )}
                    </div>
                  ))}

                  <button onClick={() => addField(stepIndex)}>
                    + Add Field
                  </button>
                </>
              )}

              {/* CONDITION BLOCK */}
              {step.action === "condition" && (
                <>
                  {step.rules?.map((rule, rIndex) => (
                    <div key={rIndex} className="space-y-2 p-3 bg-gray-50 rounded border">

                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Condition {rIndex + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-3">

                        <select
                          value={rule.fieldType}
                          onChange={(e) =>
                            updateRule(stepIndex, rIndex, "fieldType", e.target.value)
                          }
                          className="border px-2 py-2"
                        >
                          <option value="">Type</option>
                          <option value="text">Text</option>
                          <option value="numeric">Numeric</option>
                          <option value="valueList">Value List</option>
                          <option value="date">Date</option>
                        </select>

                        <input
                          placeholder="Field"
                          value={rule.fieldName}
                          onChange={(e) =>
                            updateRule(stepIndex, rIndex, "fieldName", e.target.value)
                          }
                          className="border px-2 py-2"
                        />

                        <select
                          value={rule.operator}
                          onChange={(e) =>
                            updateRule(stepIndex, rIndex, "operator", e.target.value)
                          }
                          className="border px-2 py-2"
                        >
                          <option value="">Operator</option>
                          {getOperators(rule.fieldType).map(op => (
                            <option key={op}>{op}</option>
                          ))}
                        </select>

                        {rule.fieldType !== "date" && (
                          <input
                            value={rule.value}
                            placeholder="Value"
                            onChange={(e) =>
                              updateRule(stepIndex, rIndex, "value", e.target.value)
                            }
                            className="border px-2 py-2"
                          />
                        )}

                        {rule.fieldType === "date" && (
                          <select
                            value={rule.dateOption}
                            onChange={(e) =>
                              updateRule(stepIndex, rIndex, "dateOption", e.target.value)
                            }
                            className="border px-2 py-2"
                          >
                            <option value="">Select Option</option>
                            <option value="current">Current</option>
                            <option value="days">Days</option>
                            <option value="specific">Specific</option>
                            <option value="blank">Blank</option>
                          </select>
                        )}

                        <div className="flex gap-2 items-center">
                          <label className="text-sm font-semibold whitespace-nowrap text-green-600">
                            → IF TRUE:
                          </label>
                          <select
                            value={rule.trueStep}
                            onChange={(e) =>
                              updateRule(stepIndex, rIndex, "trueStep", Number(e.target.value) || "")
                            }
                            className="border px-2 py-2 w-full"
                          >
                            <option value="">Step</option>
                            {steps.map((_, i) => (
                              <option key={i} value={i + 1}>{i + 1}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button onClick={() => addRule(stepIndex)} className="text-blue-600 text-sm font-bold">
                    + Add Condition
                  </button>
                  
                  <div className="mt-4 pt-4 border-t">
                    <label className="block text-sm font-medium mb-1">DEFAULT → Step (If all conditions fail)</label>
                    <select
                      className="border px-2 py-2 w-full"
                      value={step.defaultStep || ""}
                      onChange={(e) =>
                        setSteps(prev => {
                          const updated = [...prev];
                          updated[stepIndex].defaultStep = Number(e.target.value);
                          return updated;
                        })
                      }
                    >
                      <option value="">Select</option>
                      {steps.map((_, i) => (
                        <option key={i}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {step.action === "text" && (
                <textarea placeholder="Enter Text" className="border w-full p-2" />
              )}

              {step.action === "layout" && (
                <input placeholder="Layout Name" />
              )}

              {step.action === "notification" && (
  <input
    placeholder="Notification Name"
    value={step.fields?.[0]?.value || ""}
    onChange={(e) => {
      const updated = [...steps];

      // ✅ ensure field exists
      if (!updated[stepIndex].fields) {
        updated[stepIndex].fields = [];
      }

      if (!updated[stepIndex].fields[0]) {
        updated[stepIndex].fields[0] = {
          type: "notification",
          fieldName: "Notification Name",
          value: ""
        };
      }

      // ✅ update value
      updated[stepIndex].fields[0].value = e.target.value;

      setSteps(updated);
    }}
    className="border px-2 py-2 w-full"
  />
)}

              {step.action === "launch" && (
  <input
    placeholder="Launch Event Name"
    value={step.fields?.[0]?.value || ""}
    onChange={(e) => {
      const updated = [...steps];

      if (!updated[stepIndex].fields) {
        updated[stepIndex].fields = [];
      }

      if (!updated[stepIndex].fields[0]) {
        updated[stepIndex].fields[0] = {
          type: "launch",
          fieldName: "Launch Event",
          value: ""
        };
      }

      updated[stepIndex].fields[0].value = e.target.value;

      setSteps(updated);
    }}
    className="border px-2 py-2 w-full"
  />
)}

{step.action === "useraction" && (
  <input
    placeholder="User Action Name"
    value={step.fields?.[0]?.value || ""}
    onChange={(e) => {
      const updated = [...steps];

      if (!updated[stepIndex].fields) {
        updated[stepIndex].fields = [];
      }

      if (!updated[stepIndex].fields[0]) {
        updated[stepIndex].fields[0] = {
          type: "useraction",
          fieldName: "User Action",
          value: ""
        };
      }

      updated[stepIndex].fields[0].value = e.target.value;

      setSteps(updated);
    }}
    className="border px-2 py-2 w-full"
  />
)}
            </>
          )}
        </div>
      ))}

      <button onClick={addStep} className="w-full bg-[#0b3d3b] text-white py-3">
        + Add Step
      </button>

      {/* ✅ ONLY ADDITION */}
     <button
        onClick={() => setIsPlaying(true)}
        className="w-full bg-blue-600 text-white py-3 rounded-lg"
      >
        ▶ Generate Video
      </button>
    </div>
  );
}