export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        {/* A simple bouncing loading text that matches your theme */}
        <h1 className="text-2xl font-black tracking-tighter animate-pulse">
          <span className="text-gray-900">ATP</span>
          <span className="text-[#00D68F]">NABUNTURAN</span>
        </h1>
        <p className="text-gray-400 text-xs font-bold tracking-widest uppercase">
          Loading Data...
        </p>
      </div>
    </div>
  );
}