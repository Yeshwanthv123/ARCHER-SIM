export default function Topbar() {
  return (
    <div className="fixed top-0 left-72 right-0 h-16 bg-[#022c33] text-white flex items-center justify-between px-6 shadow z-10">

      {/* LEFT TITLE */}
      <div className="text-lg font-semibold text-cyan-300">
        Archer Configuration Simulation Console
      </div>

      {/* RIGHT USER */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-cyan-200">Welcome</span>
        <span className="font-semibold text-white">grcx-primus</span>
      </div>

    </div>
  );
}