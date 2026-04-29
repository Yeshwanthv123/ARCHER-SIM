export default function Dashboard() {
  return (
    <div className="space-y-6">

      <div className="bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold">ArcherSim Engine</h1>
        <p className="text-gray-600">Simulation Console</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          "Create Application",
          "Create Questionnaire",
          "Create Fields",
          "Create DDE",
          "Simulate Calculation",
          "Advanced Workflow",
          "Data Feed"
        ].map((item) => (
          <div key={item} className="bg-white p-4 rounded shadow">
            {item}
          </div>
        ))}
      </div>

    </div>
  );
}