export function StepCard({ number, text }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-lg font-black text-white">
        {number}
      </span>
      <span className="text-base font-black text-blue-950">{text}</span>
    </div>
  );
}

