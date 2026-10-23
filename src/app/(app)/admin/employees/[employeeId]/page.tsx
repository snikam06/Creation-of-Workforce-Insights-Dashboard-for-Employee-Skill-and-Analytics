"use client";

import { useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useApp, useCurrentUser } from "@/lib/store";
import { Avatar } from "@/components/Avatar";
import { StatTile, InfoCard, Panel, SkillBar, Timeline, CareerLadder, AIInsightCard, Tabs } from "@/components/profile/ProfileUI";
import {
  ArrowLeft, Mail, Phone, Building2, Briefcase, Calendar, MapPin, Clock, UserCog,
  CalendarCheck, CalendarDays, TrendingUp, Activity, Sparkles, Award, BookOpen,
  GraduationCap, FolderKanban, MessageSquare, History, Users, ShieldCheck, Layers,
  Timer, Target, BadgeCheck, AlertTriangle, IdCard, Gauge,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  LineChart, Line, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area,
} from "recharts";
import { isInRange, todayISO, isoDaysAgo, formatCurrency } from "@/lib/utils";
import {
  classifyPerson, directReports, derivePhone, deriveSkills, deriveSkillGaps,
  deriveCertifications, deriveCourses, recommendedCourses, deriveProjects,
  deriveAchievements, deriveFeedback, deriveCareerPath, deriveHistory,
  deriveProductivity, deriveGoals, derivePerformanceHistory, attendanceSummary,
  attendanceByMonth, deriveOvertime, leaveSummary, deriveAIInsights, hrScope,
} from "@/lib/people";

const PIE = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#06b6d4"];

export default function PersonDetailPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = use(params);
  const router = useRouter();
  const viewer = useCurrentUser();
  const employees = useApp((s) => s.employees);
  const allAttendance = useApp((s) => s.attendance);
  const allLeaves = useApp((s) => s.leaves);
  const allTimesheets = useApp((s) => s.timesheets);
  const allSalaries = useApp((s) => s.salaries);

  const decoded = decodeURIComponent(employeeId);
  const person = employees.find((e) => e.employeeId === decoded || e.id === decoded);

  // Local date filter for the attendance section (does not touch the global filter).
  const [from, setFrom] = useState(isoDaysAgo(59));
  const [to, setTo] = useState(todayISO());
  const [tab, setTab] = useState("overview");

  const kind = useMemo(() => (person ? classifyPerson(person, employees) : "employee"), [person, employees]);
  const reports = useMemo(() => (person ? directReports(person, employees) : []), [person, employees]);

  const attendance = useMemo(
    () => (person ? allAttendance.filter((a) => a.employeeId === person.employeeId && isInRange(a.date, from, to)) : []),
    [person, allAttendance, from, to],
  );
  const timesheets = useMemo(
    () => (person ? allTimesheets.filter((t) => t.employeeId === person.employeeId) : []),
    [person, allTimesheets],
  );

  if (!person) {
    return (
      <div className="section-card text-center py-14 animate-fade-in">
        <AlertTriangle size={28} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-lg font-bold">Employee not found</h2>
        <p className="text-sm text-[color:var(--text-muted)] mt-1">No record matches <code className="font-mono">{decoded}</code>.</p>
        <button onClick={() => router.push("/admin/employees")} className="btn btn-primary mt-4"><ArrowLeft size={14} /> Back to Employees</button>
      </div>
    );
  }

  // --- Role-based access guard (uses the existing role system) -------------
  const canView =
    viewer?.role === "admin" ||
    viewer?.role === "hr" ||
    (viewer?.role === "manager" && (person.managerId === viewer.employeeId || person.employeeId === viewer.employeeId)) ||
    (viewer?.role === "employee" && person.employeeId === viewer.employeeId);

  if (!canView) {
    return (
      <div className="section-card text-center py-14 animate-fade-in">
        <ShieldCheck size={28} className="mx-auto text-rose-500 mb-3" />
        <h2 className="text-lg font-bold">Permission denied</h2>
        <p className="text-sm text-[color:var(--text-muted)] mt-1">You don&apos;t have permission to view this workforce profile.</p>
        <button onClick={() => router.back()} className="btn btn-secondary mt-4"><ArrowLeft size={14} /> Go back</button>
      </div>
    );
  }

  const showCompensation = viewer?.role === "admin" || viewer?.role === "hr";

  // ----------------------------------------------------------- derived data
  const att = attendanceSummary(attendance);
  const monthly = attendanceByMonth(attendance);
  const leave = leaveSummary(person, allLeaves);
  const ot = deriveOvertime(person, timesheets);
  const goals = deriveGoals(person);
  const perfHistory = derivePerformanceHistory(person);
  const skills = deriveSkills(person);
  const gaps = deriveSkillGaps(person);
  const certs = deriveCertifications(person);
  const courses = deriveCourses(person);
  const recCourses = recommendedCourses(person);
  const projects = deriveProjects(person);
  const achievements = deriveAchievements(person);
  const feedback = deriveFeedback(person, employees);
  const career = deriveCareerPath(person);
  const history = deriveHistory(person);
  const prod = deriveProductivity(person);
  const insights = deriveAIInsights(person, kind, reports);
  const hr = kind === "hr" ? hrScope(person, employees) : null;
  const todayRec = allAttendance.find((a) => a.employeeId === person.employeeId && a.date === todayISO());
  const manager = employees.find((e) => e.employeeId === person.managerId);
  const kpiScore = Math.round(goals.reduce((a, g) => a + (g.achieved * g.weight) / 100, 0));

  const kindLabel = kind === "manager" ? "Manager" : kind === "hr" ? "HR" : "Employee";
  const kindBadge = kind === "manager" ? "badge-warning" : kind === "hr" ? "badge-purple" : "badge-info";

  const TABS = [
    { key: "overview", label: "Overview", icon: <Gauge size={14} /> },
    ...(kind === "manager" ? [{ key: "team", label: "Team", icon: <Users size={14} /> }] : []),
    ...(kind === "hr" ? [{ key: "hrscope", label: "HR Scope", icon: <ShieldCheck size={14} /> }] : []),
    { key: "attendance", label: "Attendance", icon: <CalendarCheck size={14} /> },
    { key: "leave", label: "Leave", icon: <CalendarDays size={14} /> },
    { key: "time", label: "Timesheet & OT", icon: <Timer size={14} /> },
    { key: "performance", label: "Performance", icon: <TrendingUp size={14} /> },
    { key: "skills", label: "Skills & Learning", icon: <BookOpen size={14} /> },
    { key: "career", label: "Career & Growth", icon: <Sparkles size={14} /> },
    { key: "projects", label: "Projects", icon: <FolderKanban size={14} /> },
    { key: "feedback", label: "Feedback", icon: <MessageSquare size={14} /> },
    { key: "history", label: "History", icon: <History size={14} /> },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ---------------------------------------------------------- header */}
      <div className="flex items-center gap-2">
        <button onClick={() => router.push("/admin/employees")} className="btn btn-secondary !text-sm">
          <ArrowLeft size={14} /> Back to Employees
        </button>
        <span className="text-xs text-[color:var(--text-muted)] hidden sm:inline">
          Employees / <span className="text-[color:var(--text)] font-medium">{person.name}</span>
        </span>
      </div>

      <div className="section-card !p-0 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500" />
        <div className="px-5 pb-5 -mt-10">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="ring-4 ring-[color:var(--bg-elev)] rounded-full w-fit">
              <Avatar name={person.name} size={84} />
            </div>
            <div className="flex-1 min-w-0 lg:pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{person.name}</h1>
                <span className={`badge ${kindBadge}`}>{kindLabel}</span>
                <span className={`badge ${person.status === "Active" ? "badge-success" : person.status === "On Leave" ? "badge-warning" : "badge-muted"}`}>{person.status}</span>
                {person.attritionRisk === "High" && <span className="badge badge-danger">High attrition risk</span>}
              </div>
              <p className="text-sm text-[color:var(--text-muted)] mt-1">
                {person.designation} · {person.department} · <span className="font-mono">{person.employeeId}</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="tag"><Mail size={11} /> {person.email}</span>
                <span className="tag"><Phone size={11} /> {derivePhone(person)}</span>
                <span className="tag"><MapPin size={11} /> {person.location}</span>
                <span className="tag"><Clock size={11} /> {person.shift} shift</span>
                <span className="tag"><Calendar size={11} /> Joined {new Date(person.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                {manager && (
                  <button onClick={() => router.push(`/admin/employees/${manager.employeeId}`)} className="tag hover:!border-blue-500 hover:!text-blue-500 transition cursor-pointer">
                    <UserCog size={11} /> Reports to {manager.name}
                  </button>
                )}
              </div>
            </div>
            <button onClick={() => router.push(`/admin/departments/${encodeURIComponent(person.department)}`)} className="btn btn-secondary !text-sm shrink-0">
              <Building2 size={14} /> View department
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------ summary row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Attendance" value={`${att.pct.toFixed(1)}%`} sub={`${att.attended}/${att.counted} days`} icon={<CalendarCheck size={14} />} accent="blue" progress={att.pct} />
        <StatTile label="Leave balance" value={`${leave.remaining}d`} sub={`${leave.used}d used`} icon={<CalendarDays size={14} />} accent="amber" progress={(leave.remaining / Math.max(1, leave.entitlement)) * 100} />
        <StatTile label="Performance" value={`${person.performanceScore}%`} sub={`KPI ${kpiScore}%`} icon={<TrendingUp size={14} />} accent="emerald" progress={person.performanceScore} />
        <StatTile label="Productivity" value={`${prod.productivity}%`} sub={`Tasks ${prod.taskCompletion}%`} icon={<Activity size={14} />} accent="cyan" progress={prod.productivity} />
        <StatTile label="Engagement" value={`${person.engagement}%`} sub={person.engagement > 70 ? "Healthy" : "Needs attention"} icon={<Sparkles size={14} />} accent="violet" progress={person.engagement} />
        <StatTile label="Overtime" value={`${ot.total}h`} sub={`${ot.approved}h approved`} icon={<Timer size={14} />} accent="rose" />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ----------------------------------------------------------- OVERVIEW */}
      {tab === "overview" && (
        <div className="space-y-4">
          <Panel title="Personal & basic information" icon={<IdCard size={15} className="text-blue-500" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <InfoCard label="Employee ID" value={<span className="font-mono">{person.employeeId}</span>} icon={<IdCard size={10} />} />
              <InfoCard label="Full name" value={person.name} />
              <InfoCard label="Email" value={person.email} icon={<Mail size={10} />} />
              <InfoCard label="Phone" value={derivePhone(person)} icon={<Phone size={10} />} />
              <InfoCard label="Department" value={person.department} icon={<Building2 size={10} />} />
              <InfoCard label="Designation" value={person.designation} icon={<Briefcase size={10} />} />
              <InfoCard label="Reporting manager" value={manager?.name ?? person.manager ?? "—"} icon={<UserCog size={10} />} />
              <InfoCard label="Joining date" value={new Date(person.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} icon={<Calendar size={10} />} />
              <InfoCard label="Employment status" value={person.status} />
              <InfoCard label="Work location" value={person.location} icon={<MapPin size={10} />} />
              <InfoCard label="Shift" value={person.shift} icon={<Clock size={10} />} />
              <InfoCard label="Experience" value={`${person.yearsOfExperience} years`} />
              {showCompensation && <InfoCard label="Annual CTC" value={formatCurrency(person.salary)} />}
              <InfoCard label="Current project" value={person.project} icon={<FolderKanban size={10} />} />
            </div>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="AI insights & recommendations" icon={<Sparkles size={15} className="text-violet-500" />} subtitle="Decision-support only — demo model on current dataset.">
              <div className="space-y-2">
                {insights.map((i, n) => <AIInsightCard key={n} {...i} />)}
              </div>
            </Panel>

            <Panel title="Today" icon={<CalendarCheck size={15} className="text-cyan-500" />}>
              <div className="space-y-2 text-sm">
                <Row k="Status" v={<span className={`badge ${todayRec?.status === "Present" ? "badge-success" : todayRec?.status === "Late" ? "badge-warning" : todayRec?.status ? "badge-muted" : "badge-muted"}`}>{todayRec?.status ?? "Not recorded"}</span>} />
                <Row k="Check-in" v={todayRec?.checkIn ?? "—"} />
                <Row k="Check-out" v={todayRec?.checkOut ?? "—"} />
                <Row k="Working hours" v={todayRec?.workingHours !== undefined ? `${todayRec.workingHours}h` : "—"} />
                <Row k="Source" v={todayRec?.source ?? "—"} />
                <Row k="Shift" v={person.shift} />
              </div>
            </Panel>

            <Panel title="Workforce health" icon={<Gauge size={15} className="text-emerald-500" />}>
              <div className="h-52">
                <ResponsiveContainer>
                  <RadarChart data={[
                    { metric: "Performance", v: person.performanceScore },
                    { metric: "Attendance", v: person.attendancePct },
                    { metric: "Engagement", v: person.engagement },
                    { metric: "Training", v: prod.trainingParticipation },
                    { metric: "Tasks", v: prod.taskCompletion },
                  ]}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="var(--text-muted)" />
                    <Radar dataKey="v" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                    <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel title="Achievements & recognition" icon={<Award size={15} className="text-amber-500" />}>
            {achievements.length === 0 ? <Empty text="No achievements recorded yet." /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {achievements.map((a, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/8 to-orange-500/5 border border-amber-500/25">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center"><Award size={15} /></div>
                      <div>
                        <div className="text-sm font-semibold">{a.title}</div>
                        <div className="text-[10px] text-[color:var(--text-muted)]">{a.kind} · {a.year}</div>
                      </div>
                    </div>
                    <p className="text-xs text-[color:var(--text-muted)] mt-1.5">{a.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* --------------------------------------------------------- MANAGER TEAM */}
      {tab === "team" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatTile label="Direct reports" value={reports.length} icon={<Users size={14} />} accent="blue" />
            <StatTile label="Team size" value={reports.length + 1} sub="incl. manager" icon={<Users size={14} />} accent="cyan" />
            <StatTile label="Avg performance" value={`${avgOf(reports, (r) => r.performanceScore).toFixed(0)}%`} icon={<TrendingUp size={14} />} accent="emerald" progress={avgOf(reports, (r) => r.performanceScore)} />
            <StatTile label="Avg attendance" value={`${avgOf(reports, (r) => r.attendancePct).toFixed(0)}%`} icon={<CalendarCheck size={14} />} accent="violet" progress={avgOf(reports, (r) => r.attendancePct)} />
            <StatTile label="Avg engagement" value={`${avgOf(reports, (r) => r.engagement).toFixed(0)}%`} icon={<Sparkles size={14} />} accent="amber" progress={avgOf(reports, (r) => r.engagement)} />
            <StatTile label="High risk" value={reports.filter((r) => r.attritionRisk === "High").length} sub="attrition" icon={<AlertTriangle size={14} />} accent="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Team performance distribution" icon={<TrendingUp size={15} className="text-emerald-500" />}>
              {reports.length === 0 ? <Empty text="No direct reports assigned." /> : (
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={reports.slice(0, 12).map((r) => ({ name: r.name.split(" ")[0], perf: r.performanceScore, att: r.attendancePct }))}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--text-muted)" angle={-20} textAnchor="end" height={55} />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                      <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Bar dataKey="perf" name="Performance" fill="#10b981" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="att" name="Attendance" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Team composition & risk" icon={<Users size={15} className="text-violet-500" />}>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-56">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Low", value: reports.filter((r) => r.attritionRisk === "Low").length },
                          { name: "Medium", value: reports.filter((r) => r.attritionRisk === "Medium").length },
                          { name: "High", value: reports.filter((r) => r.attritionRisk === "High").length },
                        ].filter((d) => d.value > 0)}
                        dataKey="value" nameKey="name" innerRadius={38} outerRadius={70} paddingAngle={2}
                      >
                        {[0, 1, 2].map((i) => <Cell key={i} fill={["#10b981", "#f59e0b", "#ef4444"][i]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 self-center text-sm">
                  <Row k="On leave today" v={reports.filter((r) => r.status === "On Leave").length} />
                  <Row k="Departments" v={new Set(reports.map((r) => r.department)).size} />
                  <Row k="Total overtime" v={`${reports.reduce((a, b) => a + b.overtime, 0)}h`} />
                  <Row k="Training complete" v={`${reports.length ? Math.round((reports.reduce((a, b) => a + b.trainingCompleted, 0) / Math.max(1, reports.reduce((a, b) => a + b.trainingRequired, 0))) * 100) : 0}%`} />
                  <Row k="Promotion ready" v={reports.filter((r) => r.promotionEligible).length} />
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="Team members" icon={<Users size={15} className="text-blue-500" />} subtitle="Click a name to open that person's workforce profile.">
            {reports.length === 0 ? <Empty text="This manager has no direct reports in the current dataset." /> : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Name</th><th>Designation</th><th>Department</th><th>Performance</th><th>Attendance</th><th>Risk</th><th>Status</th></tr></thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <button onClick={() => router.push(`/admin/employees/${r.employeeId}`)} className="flex items-center gap-2.5 text-left group">
                            <Avatar name={r.name} size={30} />
                            <div>
                              <div className="font-medium text-blue-500 group-hover:underline">{r.name}</div>
                              <div className="text-[10px] text-[color:var(--text-muted)] font-mono">{r.employeeId}</div>
                            </div>
                          </button>
                        </td>
                        <td className="text-[color:var(--text-muted)]">{r.designation}</td>
                        <td>{r.department}</td>
                        <td><MiniBar v={r.performanceScore} /></td>
                        <td>{r.attendancePct}%</td>
                        <td><span className={`badge ${r.attritionRisk === "High" ? "badge-danger" : r.attritionRisk === "Medium" ? "badge-warning" : "badge-success"}`}>{r.attritionRisk}</span></td>
                        <td><span className={`badge ${r.status === "Active" ? "badge-success" : "badge-warning"}`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ------------------------------------------------------------ HR SCOPE */}
      {tab === "hrscope" && hr && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatTile label="Employees handled" value={hr.handled.length} icon={<Users size={14} />} accent="blue" />
            <StatTile label="Departments" value={hr.assignedDepartments.length} icon={<Building2 size={14} />} accent="violet" />
            <StatTile label="Pending leave" value={allLeaves.filter((l) => hr.handled.some((h) => h.employeeId === l.employeeId) && l.status === "Pending").length} icon={<CalendarDays size={14} />} accent="amber" />
            <StatTile label="Avg attendance" value={`${avgOf(hr.handled, (h) => h.attendancePct).toFixed(0)}%`} icon={<CalendarCheck size={14} />} accent="cyan" progress={avgOf(hr.handled, (h) => h.attendancePct)} />
            <StatTile label="Avg engagement" value={`${avgOf(hr.handled, (h) => h.engagement).toFixed(0)}%`} icon={<Sparkles size={14} />} accent="emerald" progress={avgOf(hr.handled, (h) => h.engagement)} />
            <StatTile label="High risk" value={hr.handled.filter((h) => h.attritionRisk === "High").length} sub="attrition" icon={<AlertTriangle size={14} />} accent="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Workforce by assigned department" icon={<Building2 size={15} className="text-blue-500" />}>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={hr.assignedDepartments.map((d) => ({ name: d, count: employees.filter((e) => e.department === d).length }))}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--text-muted)" angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                    <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {hr.assignedDepartments.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="HR activity overview" icon={<ShieldCheck size={15} className="text-violet-500" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCard label="Recruitment pipeline" value={`${12 + (hr.handled.length % 7)} open roles`} />
                <InfoCard label="Leave requests reviewed" value={`${allLeaves.filter((l) => hr.handled.some((h) => h.employeeId === l.employeeId) && l.status !== "Pending").length}`} />
                <InfoCard label="Attendance monitoring" value={`${hr.handled.length} employees`} />
                <InfoCard label="Training coordination" value={`${Math.round((hr.handled.reduce((a, b) => a + b.trainingCompleted, 0) / Math.max(1, hr.handled.reduce((a, b) => a + b.trainingRequired, 0))) * 100)}% complete`} />
                <InfoCard label="Engagement programs" value={`${hr.handled.filter((h) => h.engagement > 75).length} highly engaged`} />
                <InfoCard label="Performance cycles" value={`${hr.handled.filter((h) => h.performanceScore > 80).length} above target`} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {hr.assignedDepartments.map((d) => (
                  <button key={d} onClick={() => router.push(`/admin/departments/${encodeURIComponent(d)}`)} className="tag hover:!border-blue-500 hover:!text-blue-500 transition cursor-pointer">
                    <Building2 size={10} /> {d}
                  </button>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="Employees handled" icon={<Users size={15} className="text-blue-500" />} subtitle="Click a name to open that person's workforce profile.">
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="table">
                <thead><tr><th>Name</th><th>Department</th><th>Designation</th><th>Attendance</th><th>Performance</th><th>Status</th></tr></thead>
                <tbody>
                  {hr.handled.slice(0, 40).map((h) => (
                    <tr key={h.id}>
                      <td>
                        <button onClick={() => router.push(`/admin/employees/${h.employeeId}`)} className="flex items-center gap-2.5 text-left group">
                          <Avatar name={h.name} size={28} />
                          <div>
                            <div className="font-medium text-blue-500 group-hover:underline">{h.name}</div>
                            <div className="text-[10px] text-[color:var(--text-muted)] font-mono">{h.employeeId}</div>
                          </div>
                        </button>
                      </td>
                      <td>{h.department}</td>
                      <td className="text-[color:var(--text-muted)]">{h.designation}</td>
                      <td>{h.attendancePct}%</td>
                      <td><MiniBar v={h.performanceScore} /></td>
                      <td><span className={`badge ${h.status === "Active" ? "badge-success" : "badge-warning"}`}>{h.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* ----------------------------------------------------------- ATTENDANCE */}
      {tab === "attendance" && (
        <div className="space-y-4">
          <Panel title="Attendance analysis" icon={<CalendarCheck size={15} className="text-blue-500" />} subtitle="Select a custom date range to recalculate this employee's attendance."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input !w-auto !py-1.5 !text-xs" />
                <span className="text-xs text-[color:var(--text-muted)]">to</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input !w-auto !py-1.5 !text-xs" />
                <button onClick={() => { setFrom(isoDaysAgo(59)); setTo(todayISO()); }} className="btn btn-secondary !py-1.5 !text-xs">Reset</button>
              </div>
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatTile label="Present" value={att.present} accent="emerald" />
              <StatTile label="Late" value={att.late} accent="amber" />
              <StatTile label="Absent" value={att.absent} accent="rose" />
              <StatTile label="On leave" value={att.onLeave} accent="blue" />
              <StatTile label="Half day" value={att.halfDay} accent="cyan" />
              <StatTile label="Early out" value={att.early} accent="violet" />
              <StatTile label="Total hours" value={`${att.hours.toFixed(0)}h`} accent="blue" />
            </div>
            <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-blue-500/8 to-cyan-500/8 border border-blue-500/20 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)] font-semibold">Attendance percentage</div>
                <div className="text-3xl font-bold">{att.pct.toFixed(1)}%</div>
                <div className="text-[11px] text-[color:var(--text-muted)]">{att.attended} attended of {att.counted} working days ({from} → {to})</div>
              </div>
              <div className="w-full sm:w-64">
                <div className="progress-bar !h-2.5"><div className="progress-fill" style={{ width: `${att.pct}%` }} /></div>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Monthly attendance trend" icon={<Activity size={15} className="text-cyan-500" />}>
              {monthly.length === 0 ? <Empty text="No attendance records in this range." /> : (
                <div className="h-64">
                  <ResponsiveContainer>
                    <AreaChart data={monthly}>
                      <defs>
                        <linearGradient id="pG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.5} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                        <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.45} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                      <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Area type="monotone" dataKey="present" stroke="#10b981" fill="url(#pG)" strokeWidth={2} name="Present" />
                      <Area type="monotone" dataKey="late" stroke="#f59e0b" fill="none" strokeWidth={2} name="Late" />
                      <Area type="monotone" dataKey="absent" stroke="#ef4444" fill="url(#aG)" strokeWidth={2} name="Absent" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Present / Absent / Late split" icon={<Gauge size={15} className="text-emerald-500" />}>
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Present", value: att.present + att.halfDay + att.early },
                        { name: "Absent", value: att.absent },
                        { name: "Late", value: att.late },
                        { name: "On leave", value: att.onLeave },
                      ].filter((d) => d.value > 0)}
                      dataKey="value" nameKey="name" innerRadius={45} outerRadius={82} paddingAngle={2}
                    >
                      {PIE.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Recent records" icon={<CalendarCheck size={15} className="text-blue-500" />}>
              <div className="max-h-64 overflow-y-auto">
                {attendance.length === 0 ? <Empty text="No records in this range." /> : (
                  <table className="table">
                    <thead><tr><th>Date</th><th>Status</th><th>In</th><th>Out</th><th>Hrs</th></tr></thead>
                    <tbody>
                      {attendance.slice(0, 30).map((a) => (
                        <tr key={a.id}>
                          <td className="text-[color:var(--text-muted)]">{a.date}</td>
                          <td><span className={`badge ${a.status === "Present" ? "badge-success" : a.status === "Late" ? "badge-warning" : a.status === "Absent" ? "badge-danger" : "badge-muted"}`}>{a.status}</span></td>
                          <td>{a.checkIn ?? "—"}</td>
                          <td>{a.checkOut ?? "—"}</td>
                          <td>{a.workingHours ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- LEAVE */}
      {tab === "leave" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatTile label="Entitlement" value={`${leave.entitlement}d`} icon={<CalendarDays size={14} />} accent="blue" />
            <StatTile label="Used" value={`${leave.used}d`} icon={<CalendarDays size={14} />} accent="amber" progress={(leave.used / Math.max(1, leave.entitlement)) * 100} />
            <StatTile label="Remaining" value={`${leave.remaining}d`} icon={<CalendarDays size={14} />} accent="emerald" progress={(leave.remaining / Math.max(1, leave.entitlement)) * 100} />
            <StatTile label="Approved" value={leave.approved.length} accent="emerald" />
            <StatTile label="Pending" value={leave.pending.length} accent="amber" />
            <StatTile label="Rejected" value={leave.rejected.length} accent="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Leave by type" icon={<CalendarDays size={15} className="text-violet-500" />}>
              {Object.keys(leave.byType).length === 0 ? <Empty text="No approved leave yet." /> : (
                <div className="space-y-2">
                  {Object.entries(leave.byType).map(([t, d]) => (
                    <div key={t}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-[color:var(--text-muted)]">{t}</span><span className="font-semibold">{d} days</span></div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${(d / Math.max(1, leave.used)) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title="Leave history" icon={<History size={15} className="text-blue-500" />} subtitle={`${leave.mine.length} total requests`}>
              <div className="max-h-72 overflow-y-auto">
                {leave.mine.length === 0 ? <Empty text="No leave requests on record." /> : (
                  <table className="table">
                    <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
                    <tbody>
                      {leave.mine.map((l) => (
                        <tr key={l.id}>
                          <td>{l.type}</td>
                          <td className="text-[color:var(--text-muted)]">{l.fromDate}</td>
                          <td className="text-[color:var(--text-muted)]">{l.toDate}</td>
                          <td>{l.days}</td>
                          <td><span className={`badge ${l.status === "Approved" ? "badge-success" : l.status === "Rejected" ? "badge-danger" : "badge-warning"}`}>{l.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Panel>
            <Panel title="Balance utilisation" icon={<Gauge size={15} className="text-emerald-500" />}>
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={[{ name: "Used", value: leave.used }, { name: "Remaining", value: leave.remaining }]} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={3}>
                      <Cell fill="#f59e0b" /><Cell fill="#10b981" />
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-xs text-[color:var(--text-muted)]">{leave.used} used · {leave.remaining} remaining</div>
            </Panel>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- TIMESHEET/OT */}
      {tab === "time" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatTile label="Logged entries" value={timesheets.length} icon={<Timer size={14} />} accent="blue" />
            <StatTile label="Total hours" value={`${timesheets.reduce((a, b) => a + b.hours, 0).toFixed(1)}h`} accent="cyan" />
            <StatTile label="Billable" value={`${timesheets.filter((t) => t.billable).reduce((a, b) => a + b.hours, 0).toFixed(1)}h`} accent="emerald" />
            <StatTile label="Overtime total" value={`${ot.total}h`} accent="amber" />
            <StatTile label="OT approved" value={`${ot.approved}h`} accent="emerald" />
            <StatTile label="OT pending" value={`${ot.pending}h`} accent="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Timesheet entries" icon={<Timer size={15} className="text-blue-500" />}>
              <div className="max-h-80 overflow-y-auto">
                {timesheets.length === 0 ? <Empty text="No timesheet entries recorded." /> : (
                  <table className="table">
                    <thead><tr><th>Date</th><th>Project</th><th>Task</th><th>Hours</th><th>Billable</th><th>Status</th></tr></thead>
                    <tbody>
                      {timesheets.slice(0, 25).map((t) => (
                        <tr key={t.id}>
                          <td className="text-[color:var(--text-muted)]">{t.date}</td>
                          <td>{t.project}</td>
                          <td className="text-[color:var(--text-muted)] text-xs">{t.task}</td>
                          <td className="font-semibold">{t.hours}</td>
                          <td>{t.billable ? <span className="badge badge-success">Yes</span> : <span className="badge badge-muted">No</span>}</td>
                          <td><span className={`badge ${t.status === "Approved" ? "badge-success" : t.status === "Rejected" ? "badge-danger" : "badge-warning"}`}>{t.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Panel>

            <Panel title="Overtime trend" icon={<Timer size={15} className="text-amber-500" />} subtitle={`${ot.total}h total · ${ot.approved}h approved · ${ot.pending}h pending`}>
              {ot.rows.length === 0 ? <Empty text="No overtime recorded." /> : (
                <>
                  <div className="h-52">
                    <ResponsiveContainer>
                      <BarChart data={[...ot.rows].reverse()}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="var(--text-muted)" angle={-25} textAnchor="end" height={55} />
                        <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                        <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
                        <Bar dataKey="hours" radius={[5, 5, 0, 0]}>
                          {[...ot.rows].reverse().map((r, i) => <Cell key={i} fill={r.status === "Approved" ? "#10b981" : "#f59e0b"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="max-h-40 overflow-y-auto mt-3">
                    <table className="table">
                      <thead><tr><th>Date</th><th>Project</th><th>Hours</th><th>Status</th></tr></thead>
                      <tbody>
                        {ot.rows.map((r, i) => (
                          <tr key={i}>
                            <td className="text-[color:var(--text-muted)]">{r.date}</td>
                            <td>{r.project}</td>
                            <td className="font-semibold">{r.hours}h</td>
                            <td><span className={`badge ${r.status === "Approved" ? "badge-success" : "badge-warning"}`}>{r.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- PERFORMANCE */}
      {tab === "performance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatTile label="Performance" value={`${person.performanceScore}%`} accent="emerald" progress={person.performanceScore} />
            <StatTile label="KPI score" value={`${kpiScore}%`} accent="blue" progress={kpiScore} />
            <StatTile label="Goal completion" value={`${prod.goalCompletion}%`} accent="cyan" progress={prod.goalCompletion} />
            <StatTile label="Task completion" value={`${prod.taskCompletion}%`} accent="violet" progress={prod.taskCompletion} />
            <StatTile label="Rating" value={`${(person.performanceScore / 20).toFixed(1)}/5`} accent="amber" />
            <StatTile label="Promotion ready" value={person.promotionEligible ? "Yes" : "Not yet"} accent={person.promotionEligible ? "emerald" : "rose"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Goals & KPIs — target vs achieved" icon={<Target size={15} className="text-emerald-500" />}>
              <div className="space-y-3">
                {goals.map((g) => (
                  <div key={g.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{g.name} <span className="text-[color:var(--text-muted)]">· weight {g.weight}%</span></span>
                      <span className={g.achieved >= g.target ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold"}>{g.achieved}% / {g.target}%</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-[color:var(--bg-soft)] overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${Math.min(100, g.achieved)}%` }} />
                      <div className="absolute inset-y-0 w-0.5 bg-[color:var(--text)] opacity-50" style={{ left: `${Math.min(100, g.target)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Performance history" icon={<TrendingUp size={15} className="text-blue-500" />} subtitle="Last 6 review periods">
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={perfHistory}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
                    <Tooltip contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel title="Productivity & engagement indicators" icon={<Activity size={15} className="text-cyan-500" />}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatTile label="Productivity" value={`${prod.productivity}%`} accent="cyan" progress={prod.productivity} />
              <StatTile label="Task completion" value={`${prod.taskCompletion}%`} accent="blue" progress={prod.taskCompletion} />
              <StatTile label="Goal completion" value={`${prod.goalCompletion}%`} accent="emerald" progress={prod.goalCompletion} />
              <StatTile label="Attendance consistency" value={`${prod.consistency}%`} accent="violet" progress={prod.consistency} />
              <StatTile label="Training participation" value={`${prod.trainingParticipation}%`} accent="amber" progress={prod.trainingParticipation} />
              <StatTile label="Engagement" value={`${prod.engagement}%`} accent="rose" progress={prod.engagement} />
            </div>
          </Panel>
        </div>
      )}

      {/* -------------------------------------------------------- SKILLS/LEARN */}
      {tab === "skills" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Technical skills" icon={<BookOpen size={15} className="text-blue-500" />}>
              <div className="space-y-2">
                {skills.filter((s) => s.kind === "Technical").map((s) => <SkillBar key={s.name} {...s} />)}
                {skills.filter((s) => s.kind === "Technical").length === 0 && <Empty text="No technical skills recorded." />}
              </div>
            </Panel>
            <Panel title="Soft skills" icon={<MessageSquare size={15} className="text-violet-500" />}>
              <div className="space-y-2">
                {skills.filter((s) => s.kind === "Soft").map((s) => <SkillBar key={s.name} {...s} />)}
                {skills.filter((s) => s.kind === "Soft").length === 0 && <Empty text="No soft skills recorded." />}
              </div>
            </Panel>
          </div>

          <Panel title="Skill gaps & recommended development" icon={<AlertTriangle size={15} className="text-amber-500" />}>
            {gaps.length === 0 ? <Empty text="No significant skill gaps identified." /> : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {gaps.map((g) => (
                  <div key={g.skill} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                    <div className="text-sm font-semibold">{g.skill}</div>
                    <div className="text-xs text-[color:var(--text-muted)] mt-1">Current: <b>{g.current}</b> · Required: <b>{g.required}</b></div>
                    <div className="mt-2"><span className="badge badge-warning">{g.training}</span></div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Certifications" icon={<BadgeCheck size={15} className="text-fuchsia-500" />}>
              {certs.length === 0 ? <Empty text="No certifications on record." /> : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>Certification</th><th>Provider</th><th>Issued</th><th>Expires</th><th>Status</th></tr></thead>
                    <tbody>
                      {certs.map((c) => (
                        <tr key={c.name}>
                          <td className="font-medium">{c.name}</td>
                          <td className="text-[color:var(--text-muted)]">{c.provider}</td>
                          <td className="text-[color:var(--text-muted)]">{c.issued}</td>
                          <td className="text-[color:var(--text-muted)]">{c.expires}</td>
                          <td><span className={`badge ${c.status === "Active" ? "badge-success" : c.status === "Expiring soon" ? "badge-warning" : "badge-danger"}`}>{c.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Learning & training" icon={<GraduationCap size={15} className="text-emerald-500" />}
              subtitle={`${person.trainingCompleted}/${person.trainingRequired} modules complete · ${courses.reduce((a, b) => a + b.hours, 0)} training hours`}
            >
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {courses.map((c) => (
                  <div key={c.name} className="p-2.5 rounded-lg bg-[color:var(--bg-soft)]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className={`badge ${c.status === "Completed" ? "badge-success" : c.status === "In progress" ? "badge-info" : "badge-muted"}`}>{c.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 progress-bar"><div className="progress-fill" style={{ width: `${c.progress}%` }} /></div>
                      <span className="text-[10px] text-[color:var(--text-muted)] w-16 text-right">{c.progress}% · {c.hours}h</span>
                    </div>
                  </div>
                ))}
              </div>
              {recCourses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[color:var(--border)]">
                  <div className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)] font-semibold mb-1.5">AI recommended next</div>
                  <div className="flex flex-wrap gap-1.5">
                    {recCourses.map((r) => <span key={r} className="tag"><Sparkles size={10} className="text-violet-500" /> {r}</span>)}
                  </div>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------- CAREER */}
      {tab === "career" && (
        <div className="space-y-4">
          <Panel title="Career progression path" icon={<Sparkles size={15} className="text-violet-500" />} subtitle={`Current: ${person.designation}${career.nextRole ? ` · Next: ${career.nextRole}` : ""}`}>
            <CareerLadder steps={career.steps} currentIndex={career.currentIndex} readiness={career.readiness} />
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Required for next role" icon={<Target size={15} className="text-blue-500" />}>
              {gaps.length === 0 ? <Empty text="All core requirements met." /> : (
                <div className="space-y-2">
                  {gaps.map((g) => (
                    <div key={g.skill} className="flex items-center justify-between p-2.5 rounded-lg bg-[color:var(--bg-soft)]">
                      <div>
                        <div className="text-sm font-medium">{g.skill}</div>
                        <div className="text-[10px] text-[color:var(--text-muted)]">Need {g.required}</div>
                      </div>
                      <span className="badge badge-warning">Gap</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title="Recommended training" icon={<GraduationCap size={15} className="text-emerald-500" />}>
              <div className="space-y-2">
                {recCourses.map((r) => (
                  <div key={r} className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-sm">{r}</div>
                ))}
                {recCourses.length === 0 && <Empty text="No additional training recommended." />}
              </div>
            </Panel>
            <Panel title="Development summary" icon={<Gauge size={15} className="text-cyan-500" />}>
              <div className="space-y-2 text-sm">
                <Row k="Current role" v={person.designation} />
                <Row k="Next potential role" v={career.nextRole ?? "Top of ladder"} />
                <Row k="Promotion readiness" v={`${career.readiness}%`} />
                <Row k="Experience" v={`${person.yearsOfExperience} years`} />
                <Row k="Training complete" v={`${prod.trainingParticipation}%`} />
                <Row k="Eligible flag" v={person.promotionEligible ? <span className="badge badge-success">Eligible</span> : <span className="badge badge-muted">Developing</span>} />
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- PROJECTS */}
      {tab === "projects" && (
        <Panel title="Projects" icon={<FolderKanban size={15} className="text-blue-500" />} subtitle={`${projects.filter((p) => p.status === "Active").length} active · ${projects.filter((p) => p.status === "Completed").length} completed`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((p) => (
              <div key={p.name} className="p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-[10px] text-[color:var(--text-muted)]">{p.role}</div>
                  </div>
                  <span className={`badge ${p.status === "Active" ? "badge-info" : p.status === "Completed" ? "badge-success" : "badge-warning"}`}>{p.status}</span>
                </div>
                <div className="text-[11px] text-[color:var(--text-muted)] mb-2">
                  {new Date(p.start).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} → {p.end ? new Date(p.end).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Ongoing"}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 progress-bar"><div className="progress-fill" style={{ width: `${p.contribution}%` }} /></div>
                  <span className="text-[10px] font-semibold">{p.contribution}%</span>
                </div>
                <div className="text-[10px] text-[color:var(--text-muted)] mt-1">Contribution</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ------------------------------------------------------------- FEEDBACK */}
      {tab === "feedback" && (
        <Panel title="Feedback" icon={<MessageSquare size={15} className="text-violet-500" />} subtitle="Manager, HR and peer feedback history">
          <div className="space-y-3">
            {feedback.map((f, i) => (
              <div key={i} className="p-4 rounded-xl border border-[color:var(--border)]">
                <div className="flex items-center gap-2.5 mb-2">
                  <Avatar name={f.from} size={32} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{f.from}</div>
                    <div className="text-[10px] text-[color:var(--text-muted)]">{f.role} · {new Date(f.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n <= f.rating ? "text-amber-500" : "text-[color:var(--border-strong)]"}>★</span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold mb-1">Positive areas</div>
                    <p className="text-xs">{f.positives}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="text-[10px] uppercase tracking-wider text-amber-500 font-semibold mb-1">Improvement areas</div>
                    <p className="text-xs">{f.improvements}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* -------------------------------------------------------------- HISTORY */}
      {tab === "history" && (
        <Panel title="Employee history" icon={<History size={15} className="text-blue-500" />} subtitle="Joining, promotions, transfers, certifications and recognitions">
          <Timeline items={history} />
        </Panel>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ helpers
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[color:var(--border)] last:border-0">
      <span className="text-[color:var(--text-muted)]">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}

function MiniBar({ v }: { v: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-[color:var(--bg-soft)] overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs font-medium">{v}%</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-[color:var(--text-muted)] text-center py-6">{text}</p>;
}

function avgOf<T>(arr: T[], fn: (x: T) => number) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + fn(b), 0) / arr.length;
}
