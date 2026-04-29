import { useEffect, useState } from "react";

/* ================= ICON IMPORTS ================= */
import startIcon from "../assets/icons/start.png";
import updateIcon from "../assets/icons/update_content.png";
import evaluateIcon from "../assets/icons/evaluate_content.png";
import notificationIcon from "../assets/icons/send_notification.png";
import stopIcon from "../assets/icons/stop.png";

/* ================= TYPES ================= */

type Field = {
  type: string;
  fieldName: string;
  value: string;
  dateOption?: string;
};

type Rule = {
  fieldType: string;
  fieldName: string;
  operator: string;
  value: string;
  dateOption?: string;
  logic?: string;
};

type Step = {
  action: string;
  fields: Field[];
  rules?: Rule[];
};

type Props = {
  steps: Step[];
  onExit: () => void;
};

type SimField = {
  type?: string;
  fieldName?: string;
  value?: string;
  dateOption?: string;
};

/* ================= ICON MAP ================= */

const iconMap: Record<string, string> = {
  start: startIcon,
  update: updateIcon,
  condition: evaluateIcon,
  notification: notificationIcon,
  stop: stopIcon
};

export default function PlaybackEngine({ steps, onExit }: Props) {

  const [currentStep, setCurrentStep] = useState(0);
  const [simFields, setSimFields] = useState<SimField[]>([]);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [phase, setPhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const step = steps[currentStep];
  const action = (step?.action || "").toLowerCase();

  /* ================= AUDIO ================= */

  const playAudio = async (text: string) => {
    if (!isPlaying || !text) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      const data = await res.json();
      const audio = new Audio(`http://127.0.0.1:8000/play/${data.file}`);
      await audio.play();

    } catch (err) {
      console.error(err);
    }
  };

  /* ================= NARRATION ================= */

  const getUpdateNarration = (field: Field, phase: number) => {
    switch (phase) {
      case 0: return "Click Add Field";
      case 1: return `Choose ${field.type}`;
      case 2: return `Choose the field ${field.fieldName}`;
      case 3:
        if (field.type === "date") {
          if (field.dateOption === "current") return "Choose Current Date";
          if (field.dateOption === "days") return "Choose Number of Days from Current Date";
          if (field.dateOption === "specific") return "Choose Specific Date";
          if (field.dateOption === "blank") return "Choose Blank";
        }
        return `Enter the value ${field.value}`;
      case 4:
        return `Enter the value ${field.value}`;
      default:
        return "";
    }
  };

  const getNotificationNarration = (field: Field) => {
    return `Select notification name ${field.value}`;
  };

  const getConditionNarration = (rule: Rule, phase: number, index: number, total: number) => {

  if (phase === 0) {
    if (index > 0) {
      return `${index} ${rule.logic} ${index + 1}`;
    }
    return `Rule ${index + 1}`;
  }

  switch (phase) {
    case 1: return `Choose ${rule.fieldType}`;
    case 2: return `Choose the field ${rule.fieldName}`;
    case 3: return `Choose operator ${rule.operator}`;
    case 4:
      if (rule.fieldType === "date") {
        return `Choose ${rule.dateOption}`;
      }
      return `Enter value ${rule.value}`;
    default:
      return "";
  }
};

  /* ================= MAIN LOGIC ================= */

  useEffect(() => {

    if (!isPlaying || !step) return;

    if (action === "stop") return;

    /* ================= NOTIFICATION ================= */
    if (action === "notification") {

      if (step.fields?.length > 0 && phase === 0) {
        playAudio(getNotificationNarration(step.fields[0]));
        setPhase(1);
      }

      const t = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setPhase(0);
      }, 3000);

      return () => clearTimeout(t);
    }

    /* ================= CONDITION (EVALUATE CONTENT) ================= */
    if (action === "condition") {

      if (!step.rules || step.rules.length === 0) return;

      const rule = step.rules[fieldIndex];

      const timer = setTimeout(() => {

        playAudio(getConditionNarration(rule, phase, fieldIndex, step.rules.length));

        setSimFields(prev => {
          const updated = [...prev];
          if (!updated[fieldIndex]) updated[fieldIndex] = {};

          switch (phase) {
            case 0:
              updated[fieldIndex].type = rule.fieldType;
              break;
            case 1:
              updated[fieldIndex].fieldName = rule.fieldName;
              break;
            case 2:
              updated[fieldIndex].value = rule.operator;
              break;
            case 3:
              if (rule.fieldType === "date") {
                updated[fieldIndex].dateOption = rule.dateOption;
              } else {
                updated[fieldIndex].value = rule.value;
              }
              break;
          }

          return updated;
        });

        if (phase < 3) {
          setPhase(prev => prev + 1);
        } else {
          setPhase(0);
          setFieldIndex(prev => prev + 1);
        }

      }, 1800);

      if (fieldIndex >= step.rules.length) {
        const t = setTimeout(() => {
          setCurrentStep(prev => prev + 1);
          setSimFields([]);
          setFieldIndex(0);
          setPhase(0);
        }, 2000);

        return () => clearTimeout(t);
      }

      return () => clearTimeout(timer);
    }

    /* ================= UPDATE ================= */

    if (action !== "update") {
      const t = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 2000);
      return () => clearTimeout(t);
    }

    if (fieldIndex >= step.fields.length) {
      const t = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setSimFields([]);
        setFieldIndex(0);
        setPhase(0);
      }, 1500);
      return () => clearTimeout(t);
    }

    const field = step.fields[fieldIndex];

    const timer = setTimeout(() => {

      playAudio(getUpdateNarration(field, phase));

      setSimFields(prev => {
        const updated = [...prev];
        if (!updated[fieldIndex]) updated[fieldIndex] = {};

        switch (phase) {
          case 1:
            updated[fieldIndex].type = field.type;
            break;
          case 2:
            updated[fieldIndex].fieldName = field.fieldName;
            break;
          case 3:
            case 3:
              if (field.type === "date") {
                updated[fieldIndex].dateOption = field.dateOption;

                if (field.dateOption === "days") {
                  updated[fieldIndex].value = field.value;
                } else if (field.dateOption === "specific") {
                  updated[fieldIndex].value = field.value;
                } else {
                  updated[fieldIndex].value = "";
                }
              } else {
                updated[fieldIndex].value = "";
              }
            break;
          case 4:
            updated[fieldIndex].value = field.value;
            break;
        }

        return updated;
      });

      if (phase < 4) {
        setPhase(prev => prev + 1);
      } else {
        setPhase(0);
        setFieldIndex(prev => prev + 1);
      }

    }, 1500);

    return () => clearTimeout(timer);

  }, [phase, fieldIndex, step, isPlaying]);

  /* ================= UI ================= */

  return (
    <div className="flex h-screen">

      {/* LEFT FLOW */}
      <div className="w-2/3 p-10 flex items-center gap-16">
        {steps.map((s, i) => {
          const act = (s.action || "").toLowerCase();

          return (
            <div key={i} className="flex items-center gap-10">

              <div className={`flex flex-col items-center ${i === currentStep ? "scale-110" : ""}`}>
                <img
                  src={iconMap[act] || startIcon}
                  className={`w-20 h-20 ${i === currentStep ? "ring-4 ring-blue-500 rounded-full" : ""}`}
                />
                <div className="text-sm mt-2">{act}</div>
              </div>

              {i < steps.length - 1 && <div className="text-2xl">→</div>}
            </div>
          );
        })}
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/3 border-l p-6 bg-white">

        <h3 className="text-xl font-bold mb-4">
          Step {currentStep + 1}
        </h3>

        <div><b>Action:</b> {action}</div>

        {/* UPDATE */}
       {action === "update" && (
  <div className="mt-4 space-y-2">
    {(simFields.length > 0 ? simFields : step.fields).map((f: any, i) => (
      <div key={i} className="grid grid-cols-3 gap-2">

        <input value={f.type || ""} readOnly className="border p-2" />

        <input value={f.fieldName || ""} readOnly className="border p-2" />

        <input
          value={
            f.type === "date"
              ? f.dateOption === "current"
                ? "Current Date"
                : f.dateOption === "days"
                ? `+${f.value} Days`
                : f.dateOption === "specific"
                ? f.value
                : ""
              : f.value || ""
          }
          readOnly
          className="border p-2"
        />

      </div>
    ))}
  </div>
)}

        {/* CONDITION */}
        {action === "condition" && (
  <div className="mt-4 space-y-2">

    {(simFields.length > 0 ? simFields : step.rules).map((r: any, i) => (
      <div key={i} className="grid grid-cols-4 gap-2">

        <input value={r.fieldType || ""} readOnly className="border p-2" />
        <input value={r.fieldName || ""} readOnly className="border p-2" />
        <input value={r.operator || ""} readOnly className="border p-2" />

        <input
          value={
            r.fieldType === "date"
              ? r.dateOption === "current"
                ? "Current"
                : r.dateOption === "days"
                ? `${r.value} Days`
                : r.dateOption === "specific"
                ? r.value
                : ""
              : r.value || ""
          }
          readOnly
          className="border p-2"
        />

      </div>
    ))}

    {/* ✅ SHOW LOGIC AFTER ALL RULES */}
    {fieldIndex >= (step.rules?.length || 0) && step.rules?.length > 1 && (
      <div className="mt-4 font-bold text-blue-600">
        {step.rules.map((_, i) => i + 1).join(` ${step.rules[1]?.logic || "AND"} `)}
      </div>
    )}

  </div>
)}

        {/* NOTIFICATION */}
        {action === "notification" && (
          <input
            value={step.fields?.[0]?.value ?? ""}
            readOnly
            className="border p-2 w-full"
          />
        )}

        {/* CONTROLS */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            onClick={onExit}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Exit
          </button>
        </div>

      </div>
    </div>
  );
}