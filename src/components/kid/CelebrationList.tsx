import type { Celebration } from "@/lib/mission-product";

interface Props {
  celebrations: Celebration[];
}

export function CelebrationList({ celebrations }: Props) {
  if (!celebrations.length) return null;

  return (
    <div className="space-y-2" aria-label="Recent celebrations">
      {celebrations.slice(0, 3).map((celebration) => (
        <div
          key={`${celebration.kind}-${celebration.title}`}
          className="rounded-3xl border-4 border-emerald-200 bg-emerald-50 p-4 shadow-[0_4px_0_#a7f3d0]"
        >
          <p className="text-sm font-black text-emerald-800">
            {celebration.title}
          </p>
          <p className="mt-1 text-xs font-bold text-emerald-700">
            {celebration.body}
          </p>
        </div>
      ))}
    </div>
  );
}
