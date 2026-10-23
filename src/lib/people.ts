// Derives rich, deterministic profile data from the central Employee record.
// Nothing here is random at render time — the same employee always produces the
// same profile, so the UI is stable and can later be swapped for real API data.

import type { Employee, AttendanceRecord, LeaveRequest, TimesheetEntry } from "./types";

export type PersonKind = "employee" | "manager" | "hr";

/** Classify a workforce record so we can render the right profile variant. */
export function classifyPerson(e: Employee, all: Employee[]): PersonKind {
  const dept = (e.department ?? "").toLowerCase();
  const desig = (e.designation ?? "").toLowerCase();
  if (dept.includes("human resource") || dept === "hr" || desig.includes("hr ") || desig.includes("recruiter") || desig.includes("hr business")) {
    return "hr";
  }
  const hasReports = all.some((x) => x.managerId === e.employeeId);
  if (hasReports || desig.includes("manager") || desig.includes("lead") || desig.includes("head")) {
    return "manager";
  }
  return "employee";
}

export function directReports(e: Employee, all: Employee[]): Employee[] {
  return all.filter((x) => x.managerId === e.employeeId && x.employeeId !== e.employeeId);
}

/** Stable hash so derived values never flicker between renders. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function pick<T>(arr: readonly T[], seed: string, salt = 0): T {
  return arr[(hash(seed) + salt * 7919) % arr.length];
}
function range(seed: string, min: number, max: number, salt = 0): number {
  return min + ((hash(seed) + salt * 104729) % (max - min + 1));
}

// ---------------------------------------------------------------- phone
export function derivePhone(e: Employee): string {
  const n = 600000000 + (hash(e.employeeId) % 399999999);
  const s = String(n);
  return `+91 ${s.slice(0, 5)} ${s.slice(5, 10)}`;
}

// ------------------------------------------------------- skill proficiency
export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";
export interface SkillRow { name: string; level: SkillLevel; pct: number; kind: "Technical" | "Soft" }

const SOFT = new Set(["Agile", "Mentoring", "Stakeholder Management", "Conflict Resolution", "Product Strategy", "Customer Research", "Recruitment"]);

export function deriveSkills(e: Employee): SkillRow[] {
  return e.skills.map((name, i) => {
    const score = range(e.employeeId + name, 35, 97, i);
    const level: SkillLevel = score >= 88 ? "Expert" : score >= 72 ? "Advanced" : score >= 52 ? "Intermediate" : "Beginner";
    return { name, level, pct: score, kind: SOFT.has(name) ? "Soft" : "Technical" };
  });
}

const DEMAND_SKILLS = ["Cloud (AWS)", "Data Analysis", "Advanced SQL", "Leadership", "System Design", "Power BI", "Machine Learning", "Stakeholder Management"];

export interface SkillGapRow { skill: string; current: SkillLevel | "—"; required: SkillLevel; training: string }

export function deriveSkillGaps(e: Employee): SkillGapRow[] {
  const owned = new Set(e.skills);
  const gaps = DEMAND_SKILLS.filter((s) => !owned.has(s)).slice(0, 3);
  const levels: SkillLevel[] = ["Intermediate", "Advanced", "Expert"];
  return gaps.map((skill, i) => ({
    skill,
    current: i === 0 ? "Beginner" : "—",
    required: levels[(hash(e.employeeId + skill) + i) % levels.length],
    training: `${skill} certification path`,
  }));
}

// ------------------------------------------------------------ certifications
export interface CertRow { name: string; provider: string; issued: string; expires: string; status: "Active" | "Expiring soon" | "Expired" }

const CERTS = [
  { name: "AWS Certified Solutions Architect", provider: "Amazon Web Services" },
  { name: "Professional Scrum Master I", provider: "Scrum.org" },
  { name: "Google Data Analytics", provider: "Google" },
  { name: "Microsoft Power BI Data Analyst", provider: "Microsoft" },
  { name: "Certified Kubernetes Administrator", provider: "CNCF" },
  { name: "SHRM Certified Professional", provider: "SHRM" },
  { name: "PMP", provider: "PMI" },
];

export function deriveCertifications(e: Employee): CertRow[] {
  const count = range(e.employeeId, 1, 3, 3);
  const out: CertRow[] = [];
  for (let i = 0; i < count; i++) {
    const c = pick(CERTS, e.employeeId, i + 1);
    if (out.some((x) => x.name === c.name)) continue;
    const issuedYear = 2021 + ((hash(e.employeeId + c.name) + i) % 4);
    const issuedMonth = 1 + ((hash(c.name + e.employeeId) + i) % 12);
    const expYear = issuedYear + 3;
    const now = new Date();
    const exp = new Date(expYear, issuedMonth - 1, 1);
    const monthsLeft = (exp.getFullYear() - now.getFullYear()) * 12 + (exp.getMonth() - now.getMonth());
    out.push({
      name: c.name,
      provider: c.provider,
      issued: `${issuedYear}-${String(issuedMonth).padStart(2, "0")}-01`,
      expires: `${expYear}-${String(issuedMonth).padStart(2, "0")}-01`,
      status: monthsLeft < 0 ? "Expired" : monthsLeft <= 6 ? "Expiring soon" : "Active",
    });
  }
  return out;
}

// ------------------------------------------------------------------ courses
export interface CourseRow { name: string; hours: number; progress: number; status: "Completed" | "In progress" | "Enrolled" }

const COURSES = [
  "Advanced React Patterns", "Cloud Architecture Fundamentals", "Effective Communication",
  "Data-Driven Decision Making", "Leadership Foundations", "System Design Interview",
  "Security Best Practices", "Agile Delivery Essentials", "Public Speaking & Storytelling",
];

export function deriveCourses(e: Employee): CourseRow[] {
  const total = Math.max(3, e.trainingRequired);
  const done = Math.min(total, e.trainingCompleted);
  const out: CourseRow[] = [];
  for (let i = 0; i < total; i++) {
    const name = COURSES[(hash(e.employeeId) + i * 3) % COURSES.length];
    if (out.some((x) => x.name === name)) continue;
    const completed = i < done;
    const progress = completed ? 100 : range(e.employeeId + name, 10, 85, i);
    out.push({
      name,
      hours: range(e.employeeId + name, 4, 24, i),
      progress,
      status: completed ? "Completed" : progress > 15 ? "In progress" : "Enrolled",
    });
  }
  return out;
}

export function recommendedCourses(e: Employee): string[] {
  return deriveSkillGaps(e).map((g) => `${g.skill} — ${g.training}`).slice(0, 3);
}

// ----------------------------------------------------------------- projects
export interface ProjectRow { name: string; role: string; status: "Active" | "Completed" | "On hold"; start: string; end?: string; contribution: number }

const PROJECT_ROLES = ["Contributor", "Owner", "Reviewer", "Tech Lead", "Coordinator", "Analyst"];
const EXTRA_PROJECTS = ["Helios CRM", "Atlas Migration", "Nova Analytics", "Orion Mobile", "Phoenix AI", "Aegis Security", "Lighthouse Reporting"];

export function deriveProjects(e: Employee): ProjectRow[] {
  const count = range(e.employeeId, 2, 4, 11);
  const out: ProjectRow[] = [];
  for (let i = 0; i < count; i++) {
    const name = i === 0 ? e.project : EXTRA_PROJECTS[(hash(e.employeeId) + i * 5) % EXTRA_PROJECTS.length];
    if (out.some((x) => x.name === name)) continue;
    const active = i === 0;
    const startYear = 2023 + ((hash(e.employeeId + name) + i) % 3);
    const startMonth = 1 + ((hash(name + e.employeeId) + i) % 12);
    out.push({
      name,
      role: pick(PROJECT_ROLES, e.employeeId + name, i),
      status: active ? "Active" : (hash(e.employeeId + name) % 5 === 0 ? "On hold" : "Completed"),
      start: `${startYear}-${String(startMonth).padStart(2, "0")}-01`,
      end: active ? undefined : `${startYear + 1}-${String(startMonth).padStart(2, "0")}-01`,
      contribution: range(e.employeeId + name, 45, 98, i),
    });
  }
  return out;
}

// ------------------------------------------------------------- achievements
export interface AchievementRow { title: string; detail: string; year: number; kind: "Award" | "Recognition" | "Milestone" }

const AWARDS = [
  { title: "Star Performer", detail: "Top quartile performance for two consecutive quarters", kind: "Award" as const },
  { title: "Innovation Award", detail: "Proposed and shipped a process improvement", kind: "Award" as const },
  { title: "Team Player", detail: "Recognised by peers for cross-team collaboration", kind: "Recognition" as const },
  { title: "Perfect Attendance", detail: "No unplanned absence in the period", kind: "Milestone" as const },
  { title: "Customer Champion", detail: "Outstanding client feedback on delivery", kind: "Recognition" as const },
  { title: "Mentor of the Year", detail: "Mentored junior colleagues through onboarding", kind: "Award" as const },
];

export function deriveAchievements(e: Employee): AchievementRow[] {
  const base = e.performanceScore > 85 ? 3 : e.performanceScore > 70 ? 2 : 1;
  const out: AchievementRow[] = [];
  for (let i = 0; i < base; i++) {
    const a = AWARDS[(hash(e.employeeId) + i * 2) % AWARDS.length];
    if (out.some((x) => x.title === a.title)) continue;
    out.push({ ...a, year: 2023 + ((hash(e.employeeId + a.title) + i) % 3) });
  }
  if (e.attendancePct > 95 && !out.some((x) => x.title === "Perfect Attendance")) {
    out.push({ title: "Perfect Attendance", detail: `Attendance of ${e.attendancePct}% maintained`, year: 2025, kind: "Milestone" });
  }
  return out;
}

// ----------------------------------------------------------------- feedback
export interface FeedbackRow { from: string; role: string; date: string; positives: string; improvements: string; rating: number }

export function deriveFeedback(e: Employee, all: Employee[]): FeedbackRow[] {
  const mgr = all.find((x) => x.employeeId === e.managerId);
  const peers = all.filter((x) => x.department === e.department && x.employeeId !== e.employeeId).slice(0, 2);
  const rows: FeedbackRow[] = [];
  rows.push({
    from: mgr?.name ?? "Reporting Manager",
    role: "Manager",
    date: "2026-08-15",
    positives: e.performanceScore > 80 ? "Consistently delivers high-quality work ahead of schedule." : "Reliable contributor with steady delivery.",
    improvements: e.trainingCompleted < e.trainingRequired ? "Complete outstanding training modules this quarter." : "Take on more cross-functional ownership.",
    rating: Math.round(e.performanceScore / 20),
  });
  rows.push({
    from: "HR Business Partner",
    role: "HR",
    date: "2026-06-30",
    positives: e.engagement > 70 ? "Highly engaged and participates actively in team initiatives." : "Dependable and professional in day-to-day work.",
    improvements: e.attendancePct < 85 ? "Improve attendance consistency." : "Continue building depth in core skills.",
    rating: Math.round(e.engagement / 20),
  });
  if (peers[0]) {
    rows.push({
      from: peers[0].name,
      role: "Peer",
      date: "2026-05-12",
      positives: "Approachable, communicates clearly and supports the team.",
      improvements: "Could share knowledge more widely through documentation.",
      rating: 4,
    });
  }
  return rows;
}

// ------------------------------------------------------------ career ladder
const LADDERS: Record<string, string[]> = {
  Engineering: ["Software Engineer", "Senior Engineer", "Tech Lead", "Engineering Manager", "Director of Engineering"],
  Product: ["Associate PM", "Product Manager", "Senior PM", "Group PM", "Head of Product"],
  Design: ["UI/UX Designer", "Senior Designer", "Design Lead", "Design Manager", "Head of Design"],
  Sales: ["Sales Executive", "Senior Executive", "Sales Manager", "Regional Head", "VP Sales"],
  Marketing: ["Marketing Associate", "Marketing Manager", "Senior Manager", "Head of Marketing", "CMO"],
  "Human Resources": ["HR Associate", "HR Business Partner", "Senior HRBP", "HR Manager", "Head of People"],
  "Data & AI": ["Data Analyst", "Data Scientist", "Senior Data Scientist", "Lead Data Scientist", "Head of Data"],
  Finance: ["Finance Analyst", "Senior Analyst", "Finance Manager", "Controller", "CFO"],
  Operations: ["Operations Associate", "Operations Lead", "Operations Manager", "Head of Operations", "COO"],
  "Customer Success": ["CS Associate", "CS Manager", "Senior CSM", "Head of CS", "VP Customer"],
};

export interface CareerPath { steps: string[]; currentIndex: number; nextRole: string | null; readiness: number }

export function deriveCareerPath(e: Employee): CareerPath {
  const ladder = LADDERS[e.department] ?? ["Associate", "Specialist", "Senior Specialist", "Lead", "Manager"];
  let idx = ladder.findIndex((s) => s.toLowerCase() === (e.designation ?? "").toLowerCase());
  if (idx === -1) idx = Math.min(ladder.length - 2, Math.floor(e.yearsOfExperience / 4));
  const readiness = Math.min(100, Math.round(
    e.performanceScore * 0.4 +
    e.attendancePct * 0.2 +
    e.engagement * 0.2 +
    (e.trainingCompleted / Math.max(1, e.trainingRequired)) * 100 * 0.2,
  ));
  return { steps: ladder, currentIndex: idx, nextRole: ladder[idx + 1] ?? null, readiness };
}

// ----------------------------------------------------------------- history
export interface HistoryEvent { date: string; title: string; detail: string; kind: "join" | "promotion" | "transfer" | "training" | "award" | "cert" | "manager" }

export function deriveHistory(e: Employee): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  const join = new Date(e.joiningDate);
  events.push({ date: e.joiningDate, title: "Joined the organisation", detail: `Onboarded as ${e.designation} in ${e.department} at ${e.location}.`, kind: "join" });

  const y1 = new Date(join); y1.setFullYear(join.getFullYear() + 1);
  if (y1 < new Date()) {
    events.push({ date: y1.toISOString().split("T")[0], title: "Completed first year", detail: "Confirmed in role after successful first-year review.", kind: "training" });
  }
  for (const c of deriveCertifications(e)) {
    events.push({ date: c.issued, title: `Certified: ${c.name}`, detail: `Issued by ${c.provider}.`, kind: "cert" });
  }
  if (e.promotionEligible) {
    const p = new Date(join); p.setFullYear(join.getFullYear() + 2);
    if (p < new Date()) {
      events.push({ date: p.toISOString().split("T")[0], title: "Promoted", detail: `Recognised for sustained performance and moved into ${e.designation}.`, kind: "promotion" });
    }
  }
  for (const a of deriveAchievements(e)) {
    events.push({ date: `${a.year}-11-01`, title: a.title, detail: a.detail, kind: "award" });
  }
  if (e.managerId) {
    const m = new Date(join); m.setMonth(join.getMonth() + 18);
    if (m < new Date()) {
      events.push({ date: m.toISOString().split("T")[0], title: "Reporting line updated", detail: `Now reporting to ${e.manager ?? e.managerId}.`, kind: "manager" });
    }
  }
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

// -------------------------------------------------------- productivity mix
export function deriveProductivity(e: Employee) {
  const taskCompletion = Math.min(100, Math.round(e.performanceScore * 0.9 + 8));
  const goalCompletion = Math.min(100, Math.round(e.performanceScore * 0.95));
  const consistency = e.attendancePct;
  const trainingParticipation = Math.round((e.trainingCompleted / Math.max(1, e.trainingRequired)) * 100);
  const productivity = Math.round((taskCompletion + goalCompletion + consistency + trainingParticipation) / 4);
  return { taskCompletion, goalCompletion, consistency, trainingParticipation, productivity, engagement: e.engagement };
}

// --------------------------------------------------------------- KPI goals
export interface GoalRow { name: string; target: number; achieved: number; weight: number }

export function deriveGoals(e: Employee): GoalRow[] {
  const base = e.performanceScore;
  return [
    { name: "Delivery commitments met", target: 100, achieved: Math.min(100, base + 4), weight: 30 },
    { name: "Quality / defect rate", target: 95, achieved: Math.min(100, base - 2), weight: 20 },
    { name: "Collaboration & reviews", target: 90, achieved: Math.min(100, Math.round(e.engagement * 0.95)), weight: 20 },
    { name: "Skill development", target: 100, achieved: Math.round((e.trainingCompleted / Math.max(1, e.trainingRequired)) * 100), weight: 15 },
    { name: "Attendance consistency", target: 95, achieved: e.attendancePct, weight: 15 },
  ];
}

/** Last 6 review periods, trending toward the current score. */
export function derivePerformanceHistory(e: Employee) {
  const labels = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"];
  return labels.map((label, i) => {
    const drift = (hash(e.employeeId + label) % 11) - 5;
    const ramp = (i - labels.length + 1) * 2;
    return { period: label, score: Math.max(35, Math.min(100, e.performanceScore + ramp + drift)) };
  });
}

// ----------------------------------------------------- attendance analytics
export function attendanceSummary(records: AttendanceRecord[]) {
  const present = records.filter((a) => a.status === "Present").length;
  const late = records.filter((a) => a.status === "Late").length;
  const absent = records.filter((a) => a.status === "Absent").length;
  const onLeave = records.filter((a) => a.status === "On Leave").length;
  const halfDay = records.filter((a) => a.status === "Half Day").length;
  const early = records.filter((a) => a.status === "Early Checkout").length;
  const counted = records.length;
  const attended = present + late + halfDay + early;
  const pct = counted ? (attended / counted) * 100 : 0;
  const hours = records.reduce((a, b) => a + (b.workingHours ?? 0), 0);
  return { present, late, absent, onLeave, halfDay, early, counted, attended, pct, hours };
}

/** Group attendance into month buckets for charting. */
export function attendanceByMonth(records: AttendanceRecord[]) {
  const m: Record<string, { month: string; present: number; absent: number; late: number }> = {};
  for (const r of records) {
    const key = r.date.slice(0, 7);
    if (!m[key]) m[key] = { month: key, present: 0, absent: 0, late: 0 };
    if (r.status === "Present" || r.status === "Half Day" || r.status === "Early Checkout") m[key].present++;
    else if (r.status === "Late") m[key].late++;
    else if (r.status === "Absent") m[key].absent++;
  }
  return Object.values(m).sort((a, b) => a.month.localeCompare(b.month));
}

/** Overtime rows derived from timesheet + employee overtime budget. */
export function deriveOvertime(e: Employee, timesheets: TimesheetEntry[]) {
  const rows = timesheets
    .filter((t) => t.hours > 8)
    .map((t) => ({ date: t.date, hours: +(t.hours - 8).toFixed(1), project: t.project, status: t.status === "Approved" ? "Approved" as const : "Pending" as const }));
  if (rows.length === 0 && e.overtime > 0) {
    // Fall back to the monthly overtime budget on the employee record.
    const n = Math.min(5, Math.max(1, Math.round(e.overtime / 6)));
    for (let i = 0; i < n; i++) {
      const d = new Date(); d.setDate(d.getDate() - (i * 5 + 3));
      rows.push({
        date: d.toISOString().split("T")[0],
        hours: +(1 + ((hash(e.employeeId) + i) % 4)).toFixed(1),
        project: e.project,
        status: i % 2 === 0 ? "Approved" : "Pending",
      });
    }
  }
  const total = rows.reduce((a, b) => a + b.hours, 0);
  const approved = rows.filter((r) => r.status === "Approved").reduce((a, b) => a + b.hours, 0);
  return { rows: rows.slice(0, 12), total: +total.toFixed(1), approved: +approved.toFixed(1), pending: +(total - approved).toFixed(1) };
}

// --------------------------------------------------------------- leave math
export function leaveSummary(e: Employee, leaves: LeaveRequest[]) {
  const mine = leaves.filter((l) => l.employeeId === e.employeeId);
  const approved = mine.filter((l) => l.status === "Approved");
  const pending = mine.filter((l) => l.status === "Pending");
  const rejected = mine.filter((l) => l.status === "Rejected");
  const used = approved.reduce((a, b) => a + b.days, 0);
  const entitlement = used + e.leaveBalance;
  const byType: Record<string, number> = {};
  for (const l of approved) byType[l.type] = (byType[l.type] ?? 0) + l.days;
  return { mine, approved, pending, rejected, used, entitlement, remaining: e.leaveBalance, byType };
}

// ------------------------------------------------------------- AI insights
export function deriveAIInsights(e: Employee, kind: PersonKind, reports: Employee[]): { tone: "good" | "warn" | "info"; title: string; body: string }[] {
  const out: { tone: "good" | "warn" | "info"; title: string; body: string }[] = [];
  const career = deriveCareerPath(e);

  if (e.performanceScore > 85 && e.attendancePct > 90 && e.yearsOfExperience > 3) {
    out.push({ tone: "good", title: "Promotion consideration", body: `Strong, consistent performance (${e.performanceScore}%) with ${e.attendancePct}% attendance and ${e.yearsOfExperience}y experience. May be considered for ${career.nextRole ?? "the next role"}. Recommendation — final decision should be made by authorized HR/management personnel.` });
  }
  if (e.attritionRisk === "High") {
    out.push({ tone: "warn", title: "Predicted attrition risk — High", body: `Potential contributing factors: ${[e.engagement < 60 ? "low engagement" : null, e.overtime > 20 ? "sustained overtime" : null, e.attendancePct < 85 ? "attendance dips" : null, e.trainingCompleted < e.trainingRequired ? "limited skill development" : null].filter(Boolean).join(", ") || "tenure and workload patterns"}. Predicted risk — not a certainty.` });
  }
  if (e.trainingCompleted < e.trainingRequired) {
    out.push({ tone: "info", title: "Training recommendation", body: `${e.trainingRequired - e.trainingCompleted} of ${e.trainingRequired} modules outstanding. Suggested focus: ${deriveSkillGaps(e).map((g) => g.skill).join(", ") || "core role skills"}.` });
  }
  if (e.attendancePct < 85) {
    out.push({ tone: "warn", title: "Attendance concern", body: `Attendance at ${e.attendancePct}% is below the 85% guideline. Recommend a supportive check-in conversation.` });
  }
  if (kind === "manager" && reports.length > 0) {
    const avg = reports.reduce((a, b) => a + b.performanceScore, 0) / reports.length;
    const high = reports.filter((r) => r.attritionRisk === "High").length;
    out.push({ tone: avg > 75 ? "good" : "info", title: "Team performance signal", body: `Team of ${reports.length} averaging ${avg.toFixed(0)}% performance.${high > 0 ? ` ${high} member(s) flagged as high attrition risk — consider 1:1 conversations.` : " No high-risk members detected."}` });
  }
  if (out.length === 0) {
    out.push({ tone: "info", title: "Steady contributor", body: "No significant risk signals detected. Continue current development plan and review next quarter." });
  }
  return out;
}

// ------------------------------------------------------------ HR workload
export function hrScope(e: Employee, all: Employee[]) {
  // An HR partner supports their own department plus a deterministic slice of others.
  const own = all.filter((x) => x.department === e.department);
  const departments = Array.from(new Set(all.map((x) => x.department))).sort();
  const assignedCount = Math.max(2, Math.min(departments.length, 2 + (hash(e.employeeId) % 3)));
  const startIdx = hash(e.employeeId) % departments.length;
  const assigned = Array.from({ length: assignedCount }, (_, i) => departments[(startIdx + i) % departments.length]);
  const handled = all.filter((x) => assigned.includes(x.department));
  return { assignedDepartments: assigned, handled, own };
}

// -------------------------------------------------------- department stats
export function departmentStats(dept: string, all: Employee[], attendance: AttendanceRecord[], leaves: LeaveRequest[]) {
  const people = all.filter((e) => e.department === dept);
  const ids = new Set(people.map((p) => p.employeeId));
  const managers = people.filter((p) => classifyPerson(p, all) === "manager");
  const hrStaff = people.filter((p) => classifyPerson(p, all) === "hr");
  const active = people.filter((p) => p.status === "Active").length;
  const onLeave = people.filter((p) => p.status === "On Leave").length;
  const att = attendance.filter((a) => ids.has(a.employeeId));
  const summary = attendanceSummary(att);
  const avg = (fn: (e: Employee) => number) => (people.length ? people.reduce((a, b) => a + fn(b), 0) / people.length : 0);
  const head = [...managers].sort((a, b) => b.yearsOfExperience - a.yearsOfExperience)[0] ?? people[0];
  const trainingPct = people.length
    ? (people.reduce((a, b) => a + b.trainingCompleted, 0) / Math.max(1, people.reduce((a, b) => a + b.trainingRequired, 0))) * 100
    : 0;
  const skillCount: Record<string, number> = {};
  for (const p of people) for (const s of p.skills) skillCount[s] = (skillCount[s] ?? 0) + 1;
  const gaps = DEMAND_SKILLS.filter((s) => (skillCount[s] ?? 0) < Math.max(1, Math.round(people.length * 0.25)));
  return {
    people, managers, hrStaff, active, onLeave, head,
    attendancePct: summary.pct,
    avgHours: people.length ? avg((e) => e.workHours) : 0,
    overtime: people.reduce((a, b) => a + b.overtime, 0),
    performance: avg((e) => e.performanceScore),
    engagement: avg((e) => e.engagement),
    trainingPct,
    gaps,
    highRisk: people.filter((p) => p.attritionRisk === "High").length,
    mediumRisk: people.filter((p) => p.attritionRisk === "Medium").length,
    pendingLeave: leaves.filter((l) => ids.has(l.employeeId) && l.status === "Pending").length,
    cost: people.reduce((a, b) => a + b.salary, 0),
  };
}
