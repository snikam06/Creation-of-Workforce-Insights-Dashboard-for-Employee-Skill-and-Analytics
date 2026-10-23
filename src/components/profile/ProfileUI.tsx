"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatTile({
  label, value, sub, icon, accent = "blue", progress,
}: {
  label: string; value: ReactNode; sub?: string; icon?: ReactNode;
  accent?: "blue" | "emerald" | "amber" | "rose" | "violet" | "cyan";
  progress?: number;
}) {
  const map = {
    blue: "from-blue-500/15 to-blue-500/0 text-blue-500",
    emerald: "from-emerald-500/15 to-emerald-500/0 text-emerald-500",
    amber: "from-amber-500/15 to-amber-500/0 text-amber-500",
    rose: "from-rose-500/15 to-rose-500/0 text-rose-500",
    violet: "from-violet-500/15 to-violet-500/0 text-violet-500",
    cyan: "from-cyan-500/15 to-cyan-500/0 text-cyan-500",
  } as const;
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)] font-semibold">{label}</span>
        {icon && <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", map[accent])}>{icon}</div>}
      </div>
      <div className="text-xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-[color:var(--text-muted)] mt-0.5">{sub}</div>}
      {progress !== undefined && (
        <div className="progress-bar mt-2"><div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
      )}
    </div>
  );
}

export function InfoCard({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-soft)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[color:var(--text-muted)] font-semibold mb-1">
        {icon}{label}
      </div>
      <div className="text-sm font-semibold break-words">{value || "—"}</div>
    </div>
  );
}

export function Panel({ title, icon, action, children, subtitle }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; subtitle?: string }) {
  return (
    <section className="section-card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">{icon}{title}</h3>
          {subtitle && <p className="text-xs text-[color:var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SkillBar({ name, level, pct }: { name: string; level: string; pct: number }) {
  const color = pct >= 88 ? "from-emerald-500 to-teal-500" : pct >= 72 ? "from-blue-500 to-cyan-500" : pct >= 52 ? "from-amber-500 to-orange-500" : "from-slate-400 to-slate-500";
  const badge = pct >= 88 ? "badge-success" : pct >= 72 ? "badge-info" : pct >= 52 ? "badge-warning" : "badge-muted";
  return (
    <div className="p-2.5 rounded-lg bg-[color:var(--bg-soft)]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{name}</span>
        <span className={`badge ${badge}`}>{level}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[color:var(--bg)] overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Timeline({ items }: { items: { date: string; title: string; detail: string; kind: string }[] }) {
  const dot: Record<string, string> = {
    join: "bg-blue-500", promotion: "bg-emerald-500", transfer: "bg-cyan-500",
    training: "bg-violet-500", award: "bg-amber-500", cert: "bg-fuchsia-500", manager: "bg-slate-400",
  };
  if (items.length === 0) return <p className="text-sm text-[color:var(--text-muted)]">No history events recorded.</p>;
  return (
    <ol className="relative border-l border-[color:var(--border)] ml-2 space-y-4">
      {items.map((it, i) => (
        <li key={`${it.date}-${i}`} className="ml-5">
          <span className={`absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-[color:var(--bg-elev)] ${dot[it.kind] ?? "bg-blue-500"}`} />
          <div className="text-[11px] text-[color:var(--text-muted)]">{new Date(it.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
          <div className="text-sm font-semibold">{it.title}</div>
          <div className="text-xs text-[color:var(--text-muted)] mt-0.5">{it.detail}</div>
        </li>
      ))}
    </ol>
  );
}

export function CareerLadder({ steps, currentIndex, readiness }: { steps: string[]; currentIndex: number; readiness: number }) {
  return (
    <div>
      <div className="flex items-stretch gap-1.5 overflow-x-auto pb-2">
        {steps.map((s, i) => {
          const state = i < currentIndex ? "past" : i === currentIndex ? "current" : i === currentIndex + 1 ? "next" : "future";
          return (
            <div key={s} className="flex items-center gap-1.5 shrink-0">
              <div className={cn(
                "px-3 py-2.5 rounded-xl border text-xs font-medium min-w-[128px]",
                state === "current" && "bg-blue-500/10 border-blue-500/40 text-blue-500",
                state === "past" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
                state === "next" && "bg-violet-500/10 border-violet-500/35 text-violet-500",
                state === "future" && "bg-[color:var(--bg-soft)] border-[color:var(--border)] text-[color:var(--text-muted)]",
              )}>
                <div className="font-semibold">{s}</div>
                <div className="text-[9px] uppercase tracking-wider mt-0.5 opacity-80">
                  {state === "current" ? "You are here" : state === "past" ? "Achieved" : state === "next" ? "Next step" : "Future"}
                </div>
              </div>
              {i < steps.length - 1 && <span className="text-[color:var(--text-muted)]">→</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[color:var(--text-muted)]">Promotion readiness</span>
          <span className="font-semibold">{readiness}%</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${readiness}%` }} /></div>
        <p className="text-[10px] text-[color:var(--text-muted)] mt-1.5">
          Composite of performance, attendance, engagement and training completion. Recommendation only — final decision rests with authorized HR/management personnel.
        </p>
      </div>
    </div>
  );
}

export function AIInsightCard({ tone, title, body }: { tone: "good" | "warn" | "info"; title: string; body: string }) {
  const map = {
    good: "bg-emerald-500/5 border-emerald-500/25",
    warn: "bg-amber-500/5 border-amber-500/25",
    info: "bg-blue-500/5 border-blue-500/25",
  } as const;
  const dotMap = { good: "bg-emerald-500", warn: "bg-amber-500", info: "bg-blue-500" } as const;
  return (
    <div className={cn("p-3 rounded-xl border", map[tone])}>
      <div className="flex items-center gap-2 mb-1">
        <span className={cn("w-2 h-2 rounded-full", dotMap[tone])} />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-xs text-[color:var(--text-muted)] leading-relaxed">{body}</p>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; icon?: ReactNode }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="section-card !p-1.5 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              "px-3.5 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5",
              active === t.key
                ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-sm"
                : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg-soft)] hover:text-[color:var(--text)]",
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
