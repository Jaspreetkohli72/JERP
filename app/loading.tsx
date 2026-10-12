import React from "react";

export default function Loading() {
  return (
    <div className="w-full flex flex-col gap-4 animate-pulse">
      {/* TopBar Skeleton */}
      <div className="h-12 w-full flex items-center justify-between px-3">
        <div className="h-6 w-48 bg-white/5 rounded-xl" />
        <div className="h-8 w-32 bg-white/5 rounded-full" />
      </div>

      {/* Main Grid Skeleton */}
      <section className="px-3.5 pb-24 mt-2 md:mt-0 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-3.5 items-start w-full">
        <div className="flex flex-col gap-3.5">
          <div className="h-44 glass rounded-3xl bg-white/[0.03] border border-white/5" />
          <div className="h-64 glass rounded-3xl bg-white/[0.03] border border-white/5" />
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="h-44 glass rounded-3xl bg-white/[0.03] border border-white/5" />
          <div className="h-64 glass rounded-3xl bg-white/[0.03] border border-white/5" />
        </div>
      </section>
    </div>
  );
}
