import { useState } from "react";

type CalculationAssistantProps = {
  setActivePage: (page: string) => void;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function CalculationAssistant({
  setActivePage,
}: CalculationAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome. Share the calculation scenario, field names, expected result, and any conditions. I will suggest the suitable Archer calculated field type, formula syntax, example, and explanation.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    const trimmed = input.trim();

    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/api/calculation/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: trimmed,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Formula generation failed.");
      }

      const data: { answer: string } = await response.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content:
          "Unable to connect to the calculation engine. Please make sure the backend is running on http://127.0.0.1:8000.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      {/* ===== CHAT AREA ===== */}
      <div className="flex h-[78vh] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <div className="border-b border-[#06434a] bg-[#002b30] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-[#35dce8]">
                Formula Chat Assistant
              </h2>
              <p className="text-xs text-gray-300">
                Describe the calculation or decision logic you want to configure.
                Example: Calculate the days between Start Date and End Date.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActivePage("dashboard")}
              className="rounded-md border border-[#00cfe8] px-3 py-2 text-xs font-semibold text-[#35dce8] transition hover:bg-[#06434a]"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[#f7fafb] p-5">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[82%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === "user"
                    ? "bg-[#00535b] text-white"
                    : "border border-gray-200 bg-white text-gray-800"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                Generating Archer formula...
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Enter calculation scenario, field names, expected output, and conditions..."
              className="min-h-[54px] flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#00cfe8] focus:ring-2 focus:ring-[#00cfe8]/20"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading}
              className="rounded-lg bg-[#00cfe8] px-5 py-3 text-sm font-bold text-[#002b30] shadow-sm transition hover:bg-[#35dce8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow">
        <h3 className="text-base font-bold text-[#002b30]">
          Assistant Output
        </h3>

        <div className="mt-4 space-y-3 text-sm text-gray-700">
          <div className="rounded-md bg-[#e8fbfd] p-3">
            <p className="font-semibold text-[#00535b]">Archer field type</p>
            <p>Recommended calculated field type based on the expected output.</p>
          </div>

          <div className="rounded-md bg-[#e8fbfd] p-3">
            <p className="font-semibold text-[#00535b]">Formula syntax</p>
            <p>Archer-compatible functions, operators, and field references.</p>
          </div>

          <div className="rounded-md bg-[#e8fbfd] p-3">
            <p className="font-semibold text-[#00535b]">Example output</p>
            <p>Sample input values with the expected calculated result.</p>
          </div>

          <div className="rounded-md bg-[#e8fbfd] p-3">
            <p className="font-semibold text-[#00535b]">Explanation</p>
            <p>Clear breakdown of how the formula works and where to use it.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
