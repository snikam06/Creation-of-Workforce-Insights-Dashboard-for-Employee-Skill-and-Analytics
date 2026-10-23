"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { SectionHeader, EmptyState } from "@/components/SectionHeader";
import { Avatar } from "@/components/Avatar";
import {
  Users, Search, Download, MapPin, Building2, RotateCcw, ChevronRight,
  UserCog, ShieldCheck, Clock, CalendarCheck, Filter, UserPlus,
} from "lucide-react";
import { todayISO } from "@/lib/utils";
import { classifyPerson } from "@/lib/people";
import { AddEmployeeModal } from "@/components/AddEmployeeModal";

// Re-exported so existing imports (manager/team, search, manager dashboard) keep working.
export { EmployeeProfile } from "@/components/profile/EmployeeProfileCard";

const FILTER_KEY = "wfi-admin-employee-filters";

interface Filters {
  query: string; dept: string; designation: string; status: string;
  manager: string; location: string; shift: string; kind: string; risk: string;
}
const DEFAULTS: Filters = {
  query: "", dept: "all", designation: "all", status: "all",
  manager: "all", location: "all", shift: "all", kind: "all", risk: "all",
};

export default function AdminEmployeesPage() {
  const router = useRouter();
  const employees = useApp((s) => s.employees);
  const attendance = useApp((s) => s.attendance);
  const [f, setF] = useState<Filters>(DEFAULTS);
  const [restored, setRestored] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Restore filters when returning from a details page.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FILTER_KEY);
      if (raw) setF({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(f)); } catch { /* ignore */ }
  }, [f, restored]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((p) => ({ ...p, [k]: v }));

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department))).sort(), [employees]);
  const designations = useMemo(() => Array.from(new Set(employees.map((e) => e.designation))).sort(), [employees]);
  const locations = useMemo(() => Array.from(new Set(employees.map((e) => e.location))).sort(), [employees]);
  const shifts = useMemo(() => Array.from(new Set(employees.map((e) => e.shift))).sort(), [employees]);
  const managers = useMemo(
    () => employees.filter((e) => employees.some((x) => x.managerId === e.employeeId)).sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  );

  const today = todayISO();
  const todayAttendance = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of attendance) if (a.date === today) m[a.employeeId] = a.status;
    return m;
  }, [attendance, today]);

  const kindOf = useMemo(() => {
    const m: Record<string, "employee" | "manager" | "hr"> = {};
    for (const e of employees) m[e.employeeId] = classifyPerson(e, employees);
    return m;
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (f.dept !== "all" && e.department !== f.dept) return false;
      if (f.designation !== "all" && e.designation !== f.designation) return false;
      if (f.status !== "all" && e.status !== f.status) return false;
      if (f.location !== "all" && e.location !== f.location) return false;
      if (f.shift !== "all" && e.shift !== f.shift) return false;
      if (f.risk !== "all" && e.attritionRisk !== f.risk) return false;
      if (f.manager !== "all" && e.managerId !== f.manager) return false;
      if (f.kind !== "all" && kindOf[e.employeeId] !== f.kind) return false;
      if (!f.query) return true;
      const q = f.query.toLowerCase();
      return [e.name, e.employeeId, e.email, e.department, e.designation, e.location, e.manager, e.project, ...e.skills]
        .some((s) => String(s ?? "").toLowerCase().includes(q));
    });
  }, [employees, f, kindOf]);

  const activeFilterCount = Object.entries(f).filter(([k, v]) => k !== "query" && v !== "all").length + (f.query ? 1 : 0);

  const exportCSV = () => {
    const headers = ["Employee ID", "Name", "Type", "Email", "Department", "Designation", "Reporting Manager", "Location", "Shift", "Joining Date", "Employment Status", "Attendance Today", "Performance", "Attendance %", "Attrition Risk"];
    const rows = filtered.map((e) => [
      e.employeeId, e.name, kindOf[e.employeeId], e.email, e.department, e.designation,
      employees.find((m) => m.employeeId === e.managerId)?.name ?? "—",
      e.location, e.shift, e.joiningDate, e.status, todayAttendance[e.employeeId] ?? "Not recorded",
      e.performanceScore, e.attendancePct, e.attritionRisk,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "employees_export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const open = (employeeId: string) => router.push(`/admin/employees/${encodeURIComponent(employeeId)}`);

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader
        title="Employee Management"
        description="Complete workforce directory — employees, managers and HR across every department. Click an employee name to open their full workforce profile."
        icon={<Users size={16} />}
        action={
          <div className="flex gap-2">
            {f.dept !== "all" && (
              <button onClick={() => router.push(`/admin/departments/${encodeURIComponent(f.dept)}`)} className="btn btn-secondary">
                <Building2 size={14} /> {f.dept} overview
              </button>
            )}
            <button onClick={exportCSV} className="btn btn-secondary"><Download size={14} /> Export CSV</button>
            <button onClick={() => setShowAdd(true)} className="btn btn-primary"><UserPlus size={14} /> Add Employee</button>
          </div>
        }
      />

      {/* quick counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CountTile label="Total workforce" value={employees.length} icon={<Users size={14} />} accent="blue" active={f.kind === "all"} onClick={() => set("kind", "all")} />
        <CountTile label="Employees" value={employees.filter((e) => kindOf[e.employeeId] === "employee").length} icon={<Users size={14} />} accent="cyan" active={f.kind === "employee"} onClick={() => set("kind", f.kind === "employee" ? "all" : "employee")} />
        <CountTile label="Managers" value={employees.filter((e) => kindOf[e.employeeId] === "manager").length} icon={<UserCog size={14} />} accent="amber" active={f.kind === "manager"} onClick={() => set("kind", f.kind === "manager" ? "all" : "manager")} />
        <CountTile label="HR" value={employees.filter((e) => kindOf[e.employeeId] === "hr").length} icon={<ShieldCheck size={14} />} accent="violet" active={f.kind === "hr"} onClick={() => set("kind", f.kind === "hr" ? "all" : "hr")} />
      </div>

      {/* filters */}
      <div className="section-card !p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-blue-500" />
          <span className="text-sm font-semibold">Search & filters</span>
          {activeFilterCount > 0 && <span className="badge badge-info">{activeFilterCount} active</span>}
          <button onClick={() => setF(DEFAULTS)} className="btn btn-ghost !py-1 !px-2 !text-xs ml-auto"><RotateCcw size={12} /> Reset</button>
        </div>
        <div className="relative mb-2.5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
          <input value={f.query} onChange={(e) => set("query", e.target.value)} placeholder="Search by name, ID, email, department, designation, project or skill..." className="input pl-9 !py-2 !text-sm" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Select label="Department" value={f.dept} onChange={(v) => set("dept", v)} options={departments} />
          <Select label="Designation" value={f.designation} onChange={(v) => set("designation", v)} options={designations} />
          <Select label="Status" value={f.status} onChange={(v) => set("status", v)} options={["Active", "On Leave", "Inactive"]} />
          <Select label="Location" value={f.location} onChange={(v) => set("location", v)} options={locations} />
          <Select label="Shift" value={f.shift} onChange={(v) => set("shift", v)} options={shifts} />
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)] font-semibold block mb-1">Manager</label>
            <select value={f.manager} onChange={(e) => set("manager", e.target.value)} className="input !py-1.5 !text-xs cursor-pointer">
              <option value="all">All managers</option>
              {managers.map((m) => <option key={m.employeeId} value={m.employeeId}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-[color:var(--text-muted)]">
            Showing <b className="text-[color:var(--text)]">{Math.min(60, filtered.length)}</b> of <b className="text-[color:var(--text)]">{filtered.length}</b> matching records
          </span>
          {f.dept !== "all" && (
            <button onClick={() => router.push(`/admin/departments/${encodeURIComponent(f.dept)}`)} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
              Open {f.dept} department overview <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* table */}
      <div className="section-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Employee Name</th><th>Employee ID</th><th>Type</th><th>Designation</th><th>Department</th>
                <th>Reporting Manager</th><th>Status</th><th>Location</th><th>Joining Date</th><th>Shift</th><th>Attendance Today</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 60).map((e) => {
                const kind = kindOf[e.employeeId];
                const mgr = employees.find((m) => m.employeeId === e.managerId);
                const todayStatus = todayAttendance[e.employeeId];
                return (
                  <tr key={e.id}>
                    {/* ---- ONLY the name is clickable ---- */}
                    <td>
                      <button
                        onClick={() => open(e.employeeId)}
                        className="flex items-center gap-2.5 text-left group cursor-pointer"
                        title={`Open ${e.name}'s profile`}
                      >
                        <Avatar name={e.name} size={34} />
                        <div>
                          <div className="font-semibold text-blue-500 group-hover:underline underline-offset-2">{e.name}</div>
                          <div className="text-[10px] text-[color:var(--text-muted)]">{e.email}</div>
                        </div>
                      </button>
                    </td>
                    <td className="font-mono text-xs text-[color:var(--text-muted)]">{e.employeeId}</td>
                    <td>
                      <span className={`badge ${kind === "manager" ? "badge-warning" : kind === "hr" ? "badge-purple" : "badge-info"}`}>
                        {kind === "manager" ? "Manager" : kind === "hr" ? "HR" : "Employee"}
                      </span>
                    </td>
                    <td className="text-[color:var(--text-muted)]">{e.designation}</td>
                    <td>{e.department}</td>
                    <td className="text-[color:var(--text-muted)]">{mgr?.name ?? "—"}</td>
                    <td><span className={`badge ${e.status === "Active" ? "badge-success" : e.status === "On Leave" ? "badge-warning" : "badge-muted"}`}>{e.status}</span></td>
                    <td><span className="inline-flex items-center gap-1 text-[color:var(--text-muted)]"><MapPin size={12} /> {e.location}</span></td>
                    <td className="text-[color:var(--text-muted)] whitespace-nowrap">{new Date(e.joiningDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</td>
                    <td><span className="inline-flex items-center gap-1 text-[color:var(--text-muted)]"><Clock size={12} /> {e.shift}</span></td>
                    <td>
                      <span className={`badge ${
                        todayStatus === "Present" ? "badge-success"
                        : todayStatus === "Late" ? "badge-warning"
                        : todayStatus === "Absent" ? "badge-danger"
                        : todayStatus === "On Leave" ? "badge-info"
                        : "badge-muted"}`}>
                        <CalendarCheck size={10} /> {todayStatus ?? "Not recorded"}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => open(e.employeeId)} className="p-1.5 rounded-lg hover:bg-blue-500/10 text-[color:var(--text-muted)] hover:text-blue-500 transition" aria-label={`Open ${e.name}`}>
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 60 && (
          <div className="p-3 text-center text-xs text-[color:var(--text-muted)] border-t border-[color:var(--border)]">
            Showing first 60 of {filtered.length}. Refine your search or filters to narrow the list.
          </div>
        )}
        {filtered.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="No employees found"
              message="No workforce records match the current filters. Try resetting them or uploading a new dataset."
              icon={<Search />}
              action={
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setF(DEFAULTS)} className="btn btn-secondary"><RotateCcw size={14} /> Reset filters</button>
                  <button onClick={() => setShowAdd(true)} className="btn btn-primary"><UserPlus size={14} /> Add Employee</button>
                </div>
              }
            />
          </div>
        )}
      </div>

      <AddEmployeeModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)] font-semibold block mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input !py-1.5 !text-xs cursor-pointer">
        <option value="all">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CountTile({ label, value, icon, accent, active, onClick }: {
  label: string; value: number; icon: React.ReactNode;
  accent: "blue" | "cyan" | "amber" | "violet"; active: boolean; onClick: () => void;
}) {
  const map = {
    blue: "from-blue-500/15 to-blue-500/0 text-blue-500",
    cyan: "from-cyan-500/15 to-cyan-500/0 text-cyan-500",
    amber: "from-amber-500/15 to-amber-500/0 text-amber-500",
    violet: "from-violet-500/15 to-violet-500/0 text-violet-500",
  } as const;
  return (
    <button onClick={onClick} className={`kpi-card text-left ${active ? "!border-blue-500" : ""}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)] font-semibold">{label}</span>
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${map[accent]}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </button>
  );
}
