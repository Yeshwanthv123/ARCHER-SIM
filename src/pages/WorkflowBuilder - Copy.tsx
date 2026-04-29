import { useState } from "react";

type Field = {
  type: string;
  fieldName: string;
  value: string;
  dateOption?: string;
  userType?: string;
};

type Step = {
  action: string;
  fields: Field[];
};

export default function WorkflowBuilder() {
  const [steps, setSteps] = useState<Step[]>([
    {
      action: "Start",
      fields: [],
    },
  ]);

  // ADD STEP
  const addStep = () => {
    setSteps([
      ...steps,
      {
        action: "",
        fields: [],
      },
    ]);
  };

  // UPDATE ACTION
  const updateAction = (index: number, value: string) => {
    const updated = [...steps];
    updated[index].action = value;

    // Reset fields when action changes
    updated[index].fields = [];
    setSteps(updated);
  };

  // ADD FIELD
  const addField = (stepIndex: number) => {
    const updated = [...steps];
    updated[stepIndex].fields.push({
      type: "",
      fieldName: "",
      value: "",
    });
    setSteps(updated);
  };

  // UPDATE FIELD
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold text-gray-900">
          Workflow Builder
        </h1>
        <p className="text-gray-600 text-sm">
          Design workflow step-by-step (GRCXperts Engine)
        </p>
      </div>

      {/* STEPS */}
      {steps.map((step, stepIndex) => (
        <div key={stepIndex} className="bg-white p-6 rounded-xl shadow space-y-4">

          <h2 className="text-sm text-gray-500">Step {stepIndex + 1}</h2>

          {/* START */}
          {stepIndex === 0 ? (
            <p className="text-green-600 font-semibold">Start</p>
          ) : (
            <>
              {/* ACTION */}
              <select
                value={step.action}
                onChange={(e) =>
                  updateAction(stepIndex, e.target.value)
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select Action</option>
                <option value="update">Update</option>
                <option value="condition">Condition</option>
                <option value="layout">Layout</option>
                <option value="notification">Notification</option>
                <option value="launch">Launch Event</option>
                <option value="stop">Stop</option>
              </select>

              {/* ===== UPDATE UI ===== */}
              {step.action === "update" && (
                <div className="space-y-3">

                  {step.fields.map((field, fieldIndex) => (
                    <div
                      key={fieldIndex}
                      className="grid grid-cols-4 gap-3"
                    >
                      {/* TYPE */}
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateField(stepIndex, fieldIndex, "type", e.target.value)
                        }
                        className="border rounded-lg px-2 py-2"
                      >
                        <option value="">Type</option>
                        <option value="text">Text</option>
                        <option value="numeric">Numeric</option>
                        <option value="user">User/Group</option>
                        <option value="date">Date</option>
                      </select>

                      {/* FIELD NAME */}
                      <input
                        placeholder="Field Name"
                        value={field.fieldName}
                        onChange={(e) =>
                          updateField(stepIndex, fieldIndex, "fieldName", e.target.value)
                        }
                        className="border rounded-lg px-2 py-2"
                      />

                      {/* DYNAMIC VALUE */}
                      {field.type === "numeric" && (
                        <input
                          type="number"
                          placeholder="Number"
                          value={field.value}
                          onChange={(e) =>
                            updateField(stepIndex, fieldIndex, "value", e.target.value)
                          }
                          className="border rounded-lg px-2 py-2"
                        />
                      )}

                      {field.type === "text" && (
                        <input
                          placeholder="Text Value"
                          value={field.value}
                          onChange={(e) =>
                            updateField(stepIndex, fieldIndex, "value", e.target.value)
                          }
                          className="border rounded-lg px-2 py-2"
                        />
                      )}

                      {/* USER/GROUP */}
                      {field.type === "user" && (
                        <div className="flex gap-2">
                          <select
                            value={field.userType}
                            onChange={(e) =>
                              updateField(stepIndex, fieldIndex, "userType", e.target.value)
                            }
                            className="border rounded-lg px-2 py-2"
                          >
                            <option value="">User/Group</option>
                            <option value="user">User</option>
                            <option value="group">Group</option>
                          </select>

                          <input
                            placeholder="Name"
                            value={field.value}
                            onChange={(e) =>
                              updateField(stepIndex, fieldIndex, "value", e.target.value)
                            }
                            className="border rounded-lg px-2 py-2"
                          />
                        </div>
                      )}

                      {/* DATE */}
                      {field.type === "date" && (
                        <div className="flex gap-2">
                          <select
                            value={field.dateOption}
                            onChange={(e) =>
                              updateField(stepIndex, fieldIndex, "dateOption", e.target.value)
                            }
                            className="border rounded-lg px-2 py-2"
                          >
                            <option value="">Select</option>
                            <option value="current">Current Date</option>
                            <option value="days">Days from Today</option>
                            <option value="specific">Specific Date</option>
                            <option value="blank">Blank</option>
                          </select>

                          {field.dateOption === "days" && (
                            <input
                              type="number"
                              placeholder="Days"
                              value={field.value}
                              onChange={(e) =>
                                updateField(stepIndex, fieldIndex, "value", e.target.value)
                              }
                              className="border rounded-lg px-2 py-2"
                            />
                          )}

                          {field.dateOption === "specific" && (
                            <input
                              type="date"
                              value={field.value}
                              onChange={(e) =>
                                updateField(stepIndex, fieldIndex, "value", e.target.value)
                              }
                              className="border rounded-lg px-2 py-2"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* ADD FIELD BUTTON */}
                  <button
                    onClick={() => addField(stepIndex)}
                    className="text-cyan-700 text-sm"
                  >
                    + Add Field
                  </button>
                </div>
              )}

              {/* SIMPLE INPUTS */}
              {step.action === "layout" && (
                <input
                  placeholder="Layout Name"
                  className="border rounded-lg px-3 py-2 w-full"
                />
              )}

              {step.action === "notification" && (
                <input
                  placeholder="Notification Name"
                  className="border rounded-lg px-3 py-2 w-full"
                />
              )}

              {step.action === "launch" && (
                <input
                  placeholder="Data Feed Name"
                  className="border rounded-lg px-3 py-2 w-full"
                />
              )}
            </>
          )}
        </div>
      ))}

      {/* ADD STEP BUTTON */}
      <button
        onClick={addStep}
        className="w-full bg-[#0b3d3b] text-white py-3 rounded-xl hover:bg-[#0e4a48]"
      >
        + Add Step
      </button>
    </div>
  );
}