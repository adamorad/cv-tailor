function Bar({ className = "" }: { className?: string }) {
  return <div className={`h-3 rounded-full bg-fill-secondary ${className}`} />;
}

export function CvSkeleton() {
  return (
    <div className="flex flex-col gap-7 animate-pulse" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <Bar className="h-6 w-48" />
        <Bar className="w-32" />
        <Bar className="w-56 mt-1" />
      </div>
      <div className="flex flex-col gap-2">
        <Bar className="w-20" />
        <Bar className="w-full" />
        <Bar className="w-5/6" />
      </div>
      <div className="flex flex-col gap-2">
        <Bar className="w-16" />
        <div className="flex flex-wrap gap-1.5 mt-1">
          {[16, 20, 14, 24, 18].map((w, i) => (
            <div
              key={i}
              className="h-6 rounded-full bg-fill-secondary"
              style={{ width: `${w * 4}px` }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Bar className="w-24" />
        <div className="flex flex-col gap-1.5">
          <Bar className="w-2/3" />
          <Bar className="w-full" />
          <Bar className="w-4/5" />
        </div>
      </div>
    </div>
  );
}
