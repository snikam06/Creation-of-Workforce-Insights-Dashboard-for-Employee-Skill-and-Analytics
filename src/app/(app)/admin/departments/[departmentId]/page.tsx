"use client";

import { useMemo, use, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, useCurrentUser } from "@/lib/store";
import { Avatar } from "@/components/Avatar";
import { StatTile, Panel, InfoCard, AIInsightCard } from "@/components/profile/ProfileUI";
import {
  ArrowLeft, Building2, Users, UserCog, ShieldCheck, CalendarCheck, Clock, Timer,
  TrendingUp, Sparkles, AlertTriangle, GraduationCap, Search, Wallet, Gauge,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { departmentStats, classifyPerson } from "@/lib/people";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export default function DepartmentDetailPage({ params }: { params: Promise<{ departmentId: string }> }) {
  const { departmentId } = use(params);
  const router = useRouter();
  const viewer = useCurrentUser();
  const employees = useApp((s) => s.employees);
  const attendance = useApp((s) => s.attendance);
  const leaves = useApp((s) => s.leaves);
  const [query, setQuery] = useState("");

  const dept = decodeURIComponent(departmentId);
  const stats = useMemo(() => departmentStats(dept, employees, attendance, leaves), [dept, employees, attendance, leaves]);

  const canView = viewer?.role === "admin" || viewer?.role === "hr";

  if (!canView) {
    return (
      <div className="section-card text-center py-14 animate-fade-in">
        <ShieldCheck size={28} className="mx-auto text-rose-500 mb-3" />
        <h2 className="text-lg font-bold">Permission denied</h2>
        <p className="text-sm text-[color:var(--text-muted)] mt-1">Department analytics are available to Admin and HR roles only.</p>
        <button onClick={() => router.back()} className="btn btn-secondary mt-4"><ArrowLeft size={14} /> Go back</button>
      </div>
    );
  }

  if (stats.people.length === 0) {
    return (
      <div className="section-card text-center py-14 animate-fade-in">
        <AlertTriangle size={28} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-lg font-bold">Department not found</h2>
        <p className="text-sm text-[color:var(--text-muted)] mt-1">No employees belong to <b>{dept}</b> in the current dataset.</p>
        <button onClick={() => router.push("/admin/employees")} className="btn btn-primary mt-4"><ArrowLeft size={14} /> Back to Employees</button>
      </div>
    );
  }

  const filtered = stats.people.filter((e) =>
    !query || [e.name, e.employeeId, e.designation, e.location, ...e.skills].some((s) => String(s).toLowerCase().includes(query.toLowerCase())),
  );

  const byDesignation = Object.entries(
    stats.people.reduce<Record<string, number>>((acc, e) => { acc[e.designation] = (acc[e.designation] ?? 0) + 1; return acc; }, {}),
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  const byLocation = Object.entries(
    stats.people.reduce<Record<string, number>>((acc, e) => { acc[e.location] = (acc[e.location] ?? 0) + 1; return acc; }, {}),
  ).map(([name, value]) => ({ name, value }));

  const insights: { tone: "good" | "warn" | "info"; title: string; body: string }[] = [];
  if (stats.highRisk > 0) insights.push({ tone: "warn", title: `${stats.highRisk} high attrition-risk employees`, body: `Predicted risk based on engagement, workload and tenure signals. Recommend targeted retention conversations. Predicted risk — not a certainty.` });
  if (stats.gaps.length > 0) insights.push({ tone: "info", title: "Skill gaps detected", body: `Under-represented skills: ${stats.gaps.join(", ")}. Consider training investment or targeted hiring.` });
  if (stats.trainingPct < 70) insights.push({ tone: "warn", title: "Training completion below target", body: `Department training completion is ${stats.trainingPct.toFixed(0)}%. Recommend a focused completion drive this quarter.` });
  if (stats.performance > 80) insights.push({ tone: "good", title: "Strong department performance", body: `Average performance of ${stats.performance.toFixed(0)}% is above the organisation guideline.` });
  if (insights.length === 0) insights.push({ tone: "info", title: "Department operating normally", body: "No significant risk signals detected in the current dataset." });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/admin/employees")} className="btn btn-secondary !text-sm">
          <ArrowLeft size={14} /> Back to Employees
        </button>
        <span className="text-xs text-[color:var(--text-muted)] hidden sm:inline">
          Employees / <span className="text-[color:var(--text)] font-medium">{dept}</span>
        </span>
      </div>

      {/* header */}
      <div className="section-card !p-0 overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-500" />
        <div className="px-5 pb-5 -mt-8">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 text-white flex items-center justify-center ring-4 ring-[color:var(--bg-elev)]">
              <Building2 size={28} />
            </div>
            <div className="flex-1 min-w-0 lg:pb-1">
              <h1 className="text-2xl font-bold tracking-tight">{dept}</h1>
              <p className="text-sm text-[color:var(--text-muted)] mt-0.5">
                {stats.people.length} employees · {stats.managers.length} managers · {stats.hrStaff.length} HR/support
              </p>
              {stats.head && (
                <button onClick={() => router.push(`/admin/employees/${stats.head.employeeId}`)} className="tag mt-2 hover:!border-blue-500 hover:!text-blue-500 transition cursor-pointer">
                  <UserCog size={11} /> Department head: {stats.head.name}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatTile label="Total employees" value={stats.people.length} icon={<Users size={14} />} accent="blue" />
        <StatTile label="Active" value={stats.active} sub={`${stats.onLeave} on leave`} icon={<Users size={14} />} accent="emerald" />
        <StatTile label="Managers" value={stats.managers.length} icon={<UserCog size={14} />} accent="violet" />
        <StatTile label="Attendance" value={`${stats.attendancePct.toFixed(1)}%`} icon={<CalendarCheck size={14} />} accent="cyan" progress={stats.attendancePct} />
        <StatTile label="Avg hours/day" value={stats.avgHours.toFixed(1)} icon={<Clock size={14} />} accent="blue" />
        <StatTile label="Overtime" value={`${stats.overtime}h`} icon={<Timer size={14} />} accent="amber" />
        <StatTile label="Performance" value={`${stats.performance.toFixed(0)}%`} icon={<TrendingUp size={14} />} accent="emerald" progress={stats.performance} />
        <StatTile label="Engagement" value={`${stats.engagement.toFixed(0)}%`} icon={<Sparkles size={14} />} accent="violet" progress={stats.engagement} />
        <StatTile label="Training" value={`${stats.trainingPct.toFixed(0)}%`} icon={<GraduationCap size={14} />} accent="cyan" progress={stats.trainingPct} />
        <StatTile label="Pending leave" value={stats.pendingLeave} icon={<CalendarCheck size={14} />} accent="amber" />
        <StatTile label="High risk" value={stats.highRisk} sub={`${stats.mediumRisk} medium`} icon={<AlertTriangle size={14} />} accent="rose" />
        <StatTile label="Workforce cost" value={formatCurrency(stats.cost, true)} icon={<Wallet size={14} />} accent="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Headcount by designation" icon={<Users size={15} className="text-blue-500" />}>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byDesignation} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="var(--text-muted)" width={110} />
                <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                  {byDesignation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Distribution by location" icon={<Building2 size={15} className="text-cyan-500" />}>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byLocation} dataKey="value" nameKey="name" innerRadius={45} outerRadius={82} paddingAngle={2}>
                  {byLocation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {byLocation.map((l, i) => (
              <div key={l.name} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="truncate">{l.name}</span>
                <span className="ml-auto text-[color:var(--text-muted)]">{l.value}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Department health" icon={<Gauge size={15} className="text-emerald-500" />}>
          <div className="h-64">
            <ResponsiveContainer>
              <RadarChart data={[
                { m: "Performance", v: stats.performance },
                { m: "Attendance", v: stats.attendancePct },
                { m: "Engagement", v: stats.engagement },
                { m: "Training", v: stats.trainingPct },
                { m: "Retention", v: 100 - (stats.highRisk / Math.max(1, stats.people.length)) * 100 },
              ]}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="m" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="var(--text-muted)" />
                <Radar dataKey="v" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="AI recommendations" icon={<Sparkles size={15} className="text-violet-500" />} subtitle="Demo analysis on the current dataset — decision support only.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((i, n) => <AIInsightCard key={n} {...i} />)}
        </div>
      </Panel>

      <Panel
        title="Department employees"
        icon={<Users size={15} className="text-blue-500" />}
        subtitle="Click an employee name to open their individual workforce profile."
        action={
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search in department..." className="input pl-9 !py-1.5 !text-xs" />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Employee</th><th>Type</th><th>Designation</th><th>Location</th><th>Shift</th><th>Attendance</th><th>Performance</th><th>Risk</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const kind = classifyPerson(e, employees);
                return (
                  <tr key={e.id}>
                    <td>
                      <button onClick={() => router.push(`/admin/employees/${e.employeeId}`)} className="flex items-center gap-2.5 text-left group">
                        <Avatar name={e.name} size={30} />
                        <div>
                          <div className="font-medium text-blue-500 group-hover:underline">{e.name}</div>
                          <div className="text-[10px] text-[color:var(--text-muted)] font-mono">{e.employeeId}</div>
                        </div>
                      </button>
                    </td>
                    <td><span className={`badge ${kind === "manager" ? "badge-warning" : kind === "hr" ? "badge-purple" : "badge-info"}`}>{kind === "manager" ? "Manager" : kind === "hr" ? "HR" : "Employee"}</span></td>
                    <td className="text-[color:var(--text-muted)]">{e.designation}</td>
                    <td className="text-[color:var(--text-muted)]">{e.location}</td>
                    <td className="text-[color:var(--text-muted)]">{e.shift}</td>
                    <td>{e.attendancePct}%</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 rounded-full bg-[color:var(--bg-soft)] overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${e.performanceScore}%` }} />
                        </div>
                        <span className="text-xs font-medium">{e.performanceScore}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${e.attritionRisk === "High" ? "badge-danger" : e.attritionRisk === "Medium" ? "badge-warning" : "badge-success"}`}>{e.attritionRisk}</span></td>
                    <td><span className={`badge ${e.status === "Active" ? "badge-success" : "badge-warning"}`}>{e.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-sm text-[color:var(--text-muted)] text-center py-6">No employees match your search.</p>}
      </Panel>
    </div>
  );
}
