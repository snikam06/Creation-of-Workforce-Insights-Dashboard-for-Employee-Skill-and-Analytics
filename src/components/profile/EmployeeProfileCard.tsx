"use client";

import { useApp } from "@/lib/store";
import { Avatar } from "@/components/Avatar";
import { MapPin, Briefcase, Calendar, Mail, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Employee } from "@/lib/types";

export function EmployeeProfile({ employee: e }: { employee: Employee }) {
  const attendance = useApp((s) => s.attendance.filter((a) => a.employeeId === e.employeeId));
  const leaves = useApp((s) => s.leaves.filter((l) => l.employeeId === e.employeeId));
  const timesheets = useApp((s) => s.timesheets.filter((t) => t.employeeId === e.employeeId));
  const presentCount = attendance.filter((a) => a.status === "Present" || a.status === "Late").length;
  const absentCount = attendance.filter((a) => a.status === "Absent").length;
  const lateCount = attendance.filter((a) => a.status === "Late").length;
  const totalHours = timesheets.reduce((a, b) => a + b.hours, 0);
  const billableHours = timesheets.filter((t) => t.billable).reduce((a, b) => a + b.hours, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-[color:var(--border)]">
        <Avatar name={e.name} size={64} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-lg font-bold">{e.name}</h3>
            <span className="badge badge-info">{e.employeeId}</span>
          </div>
          <p className="text-sm text-[color:var(--text-muted)]">{e.designation} · {e.department}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="tag"><Mail size={11} /> {e.email}</span>
            <span className="tag"><MapPin size={11} /> {e.location}</span>
            <span className="tag"><Briefcase size={11} /> {e.yearsOfExperience}y exp</span>
            <span className="tag"><Calendar size={11} /> Joined {new Date(e.joiningDate).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[color:var(--text-muted)]">Status</div>
          <span className={`badge ${e.status === "Active" ? "badge-success" : "badge-warning"}`}>{e.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ProfileStat label="Performance" value={`${e.performanceScore}%`} icon={<TrendingUp size={14} />} accent="emerald" />
        <ProfileStat label="Attendance" value={`${e.attendancePct}%`} icon={<Calendar size={14} />} accent="blue" />
        <ProfileStat label="Engagement" value={`${e.engagement}%`} icon={<Sparkles size={14} />} accent="violet" />
        <ProfileStat label="Attrition Risk" value={e.attritionRisk} icon={<AlertTriangle size={14} />} accent={e.attritionRisk === "High" ? "rose" : e.attritionRisk === "Medium" ? "amber" : "emerald"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[color:var(--border)] p-4">
          <h4 className="text-sm font-semibold mb-3">Personal information</h4>
          <dl className="text-sm space-y-2">
            <Row k="Gender" v={e.gender ?? "—"} />
            <Row k="Age" v={e.age ?? "—"} />
            <Row k="Manager" v={e.manager ?? "—"} />
            <Row k="Employee Type" v="Full-time" />
          </dl>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] p-4">
          <h4 className="text-sm font-semibold mb-3">Employment</h4>
          <dl className="text-sm space-y-2">
            <Row k="Department" v={e.department} />
            <Row k="Designation" v={e.designation} />
            <Row k="Shift" v={e.shift} />
            <Row k="Project" v={e.project} />
            <Row k="CTC" v={formatCurrency(e.salary)} />
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--border)] p-4">
        <h4 className="text-sm font-semibold mb-3">Skills & training</h4>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {e.skills.map((s) => <span key={s} className="tag">{s}</span>)}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[color:var(--text-muted)]">Training:</span>
          <div className="flex-1 progress-bar"><div className="progress-fill" style={{ width: `${(e.trainingCompleted / Math.max(1, e.trainingRequired)) * 100}%` }} /></div>
          <span className="font-medium">{e.trainingCompleted}/{e.trainingRequired}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ProfileStat label="Present (recent)" value={presentCount} accent="emerald" />
        <ProfileStat label="Absent (recent)" value={absentCount} accent="rose" />
        <ProfileStat label="Late (recent)" value={lateCount} accent="amber" />
        <ProfileStat label="Total hours" value={totalHours.toFixed(0)} accent="blue" />
      </div>

      <div className="rounded-xl border border-[color:var(--border)] p-4">
        <h4 className="text-sm font-semibold mb-3">Recent leave history</h4>
        {leaves.length === 0 ? <p className="text-sm text-[color:var(--text-muted)]">No leave records found.</p> : (
          <div className="space-y-2">
            {leaves.slice(0, 4).map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-[color:var(--bg-soft)]">
                <div>
                  <div className="font-medium">{l.type} · {l.days}d</div>
                  <div className="text-xs text-[color:var(--text-muted)]">{l.fromDate} → {l.toDate}</div>
                </div>
                <span className={`badge ${l.status === "Approved" ? "badge-success" : l.status === "Rejected" ? "badge-danger" : "badge-warning"}`}>{l.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[color:var(--border)] p-4 bg-gradient-to-br from-violet-500/5 to-blue-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-violet-500" />
          <h4 className="text-sm font-semibold">AI Career & Reward Insight</h4>
        </div>
        <p className="text-sm text-[color:var(--text-muted)]">
          {(() => {
            if (e.performanceScore > 85 && e.attendancePct > 90 && e.yearsOfExperience > 3) {
              return `${e.name} demonstrates strong and consistent performance with high attendance and meaningful tenure. Recommendation: consider for performance review or additional recognition. Final decision should be made by authorized HR/management.`;
            }
            if (e.performanceScore > 70) {
              return `${e.name} shows steady performance. Consider targeted skill development to unlock further growth opportunities.`;
            }
            return `${e.name} would benefit from focused training and mentoring to improve performance outcomes.`;
          })()}
        </p>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[color:var(--text-muted)]">{k}</dt>
      <dd className="font-medium text-right">{v}</dd>
    </div>
  );
}

function ProfileStat({ label, value, icon, accent }: { label: string; value: React.ReactNode; icon?: React.ReactNode; accent: "blue" | "emerald" | "amber" | "rose" | "violet" }) {
  const map = {
    blue: "from-blue-500/10 text-blue-500",
    emerald: "from-emerald-500/10 text-emerald-500",
    amber: "from-amber-500/10 text-amber-500",
    rose: "from-rose-500/10 text-rose-500",
    violet: "from-violet-500/10 text-violet-500",
  } as const;
  return (
    <div className="rounded-xl border border-[color:var(--border)] p-3">
      <div className="flex items-center gap-2 text-xs text-[color:var(--text-muted)] mb-1">
        {icon && <span className={`p-1 rounded-md bg-gradient-to-br ${map[accent]}`}>{icon}</span>}
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
