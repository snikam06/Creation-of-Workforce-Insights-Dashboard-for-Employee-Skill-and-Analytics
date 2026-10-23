// Workforce Copilot answer engine.
// Every answer is computed from the LIVE central store, so replies always match
// exactly what the dashboards show. Respects the signed-in user's role.

import { useApp } from "./store";
import type { Employee, Role } from "./types";
import { isInRange, todayISO, formatCurrency } from "./utils";
import {
  classifyPerson, directReports, deriveSkillGaps, deriveCareerPath,
  deriveProductivity, departmentStats, attendanceSummary,
} from "./people";

export interface AnswerBlock {
  text: string;
  rows?: { label: string; value: string }[];
  bars?: { label: string; value: number; max: number }[];
  bullets?: string[];
  note?: string;
}

export interface PromptTemplate { label: string; q: string; group: string }

/** Role-aware clickable prompt templates shown in the chat. */
export function promptTemplates(role: Role): PromptTemplate[] {
  const common: PromptTemplate[] = [
    { group: "Guide", label: "How do I use this app?", q: "How do I use this application?" },
    { group: "Guide", label: "What can you do?", q: "What can you do?" },
  ];

  if (role === "employee") {
    return [
      { group: "My data", label: "My attendance", q: "What is my attendance?" },
      { group: "My data", label: "My leave balance", q: "What is my leave balance?" },
      { group: "My data", label: "My performance", q: "What is my performance?" },
      { group: "My data", label: "My salary status", q: "What is my salary status?" },
      { group: "Growth", label: "Skills I should learn", q: "What skills should I learn?" },
      { group: "Growth", label: "How can I improve?", q: "How can I improve my performance?" },
      { group: "Growth", label: "My career path", q: "What is my career path?" },
      { group: "Growth", label: "Am I ready for promotion?", q: "Am I ready for a promotion?" },
      ...common,
    ];
  }

  const org: PromptTemplate[] = [
    { group: "Workforce", label: "Total headcount", q: "How many employees are there?" },
    { group: "Workforce", label: "Absent today", q: "How many employees are absent today?" },
    { group: "Workforce", label: "Attendance rate", q: "What is the attendance rate?" },
    { group: "Workforce", label: "Department breakdown", q: "Show the department breakdown" },
    { group: "Talent", label: "Top performers", q: "Show me the top performers" },
    { group: "Talent", label: "Attrition risk", q: "Which employees are at attrition risk?" },
    { group: "Talent", label: "Skill gaps", q: "Which skill gaps do we have?" },
    { group: "Talent", label: "Appraisal candidates", q: "Who is eligible for appraisal?" },
    { group: "Actions", label: "Pending leave requests", q: "How many leave requests are pending?" },
    { group: "Actions", label: "Overtime hotspots", q: "Who has the highest overtime?" },
    { group: "Insights", label: "Growth recommendations", q: "What recommendations do you have to help the company grow?" },
    { group: "Insights", label: "Workforce forecast", q: "What is the workforce forecast?" },
  ];

  if (role === "manager") {
    return [
      { group: "My team", label: "Team summary", q: "Give me a summary of my team" },
      { group: "My team", label: "Team attendance", q: "What is my team attendance?" },
      { group: "My team", label: "Top performers", q: "Show me the top performers" },
      { group: "My team", label: "Attrition risk", q: "Which employees are at attrition risk?" },
      { group: "Actions", label: "Pending leave requests", q: "How many leave requests are pending?" },
      { group: "Actions", label: "Overtime hotspots", q: "Who has the highest overtime?" },
      { group: "Insights", label: "Skill gaps", q: "Which skill gaps do we have?" },
      { group: "Insights", label: "Growth recommendations", q: "What recommendations do you have to help the company grow?" },
      ...common,
    ];
  }

  return [...org, ...common];
}

// ---------------------------------------------------------------- context
function buildContext() {
  const s = useApp.getState();
  const user = s.users.find((u) => u.id === s.currentUserId);
  const role: Role = user?.role ?? "employee";
  const me = user?.employeeId ? s.employees.find((e) => e.employeeId === user.employeeId) : undefined;

  // Scope mirrors lib/selectors.useScope so answers match the dashboards exactly.
  let scope: Employee[] = s.employees;
  if (role === "manager" && user?.employeeId) {
    const reports = s.employees.filter((e) => e.managerId === user.employeeId || e.employeeId === user.employeeId);
    scope = reports.length > 1 ? reports : s.employees.slice(0, Math.min(20, s.employees.length));
  } else if (role === "employee" && user?.employeeId) {
    scope = s.employees.filter((e) => e.employeeId === user.employeeId);
  }

  const ids = new Set(scope.map((e) => e.employeeId));
  const range = s.dateRange;
  const attendanceInRange = s.attendance.filter((a) => ids.has(a.employeeId) && isInRange(a.date, range.from, range.to));
  const leaves = s.leaves.filter((l) => (role === "admin" || role === "hr") ? true : ids.has(l.employeeId));

  return { store: s, user, role, me, scope, all: s.employees, attendanceInRange, allAttendance: s.attendance, leaves, range };
}

type Ctx = ReturnType<typeof buildContext>;

const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

// --------------------------------------------------------------- matchers
function has(q: string, ...words: string[]) { return words.some((w) => q.includes(w)); }

export function answerQuestion(question: string): AnswerBlock {
  const ctx = buildContext();
  const q = question.toLowerCase().trim();
  const { role, me, scope, all, attendanceInRange, allAttendance, leaves, range } = ctx;

  // ---------- permission guard -------------------------------------------
  if (role === "employee") {
    const asksOthers = has(q, "other employee", "another employee", "someone else", "everyone", "all employees", "all staff", "whole company", "colleague");
    const sensitive = has(q, "salary", "ctc", "pay", "compensation", "appraisal", "attrition", "performance of");
    if (asksOthers && sensitive) {
      return { text: "You don't have permission to access that information. As an employee you can view your own profile, attendance, leave, performance, skills and salary only." };
    }
  }
  if (role === "manager" && has(q, "all employees", "whole company", "entire organisation", "entire organization") && has(q, "salary", "ctc", "compensation")) {
    return { text: "You don't have permission to access organisation-wide compensation data. You can view your own team's workforce information." };
  }

  // ---------- guidance ----------------------------------------------------
  if (has(q, "how do i use", "how to use", "guide me", "help me navigate", "getting started", "how does this work")) {
    return guidance(role);
  }
  if (has(q, "what can you do", "what do you do", "your capabilities", "what can i ask")) {
    return {
      text: "I read your live dashboard data and answer in real time — so my numbers always match what you see on screen.",
      bullets: [
        "Workforce: headcount, attendance rate, absences, department breakdown",
        "Talent: top performers, attrition risk, skill gaps, appraisal candidates",
        "Operations: pending leave, overtime hotspots, timesheets, shifts",
        "Growth: personalised skill recommendations and company improvement ideas",
        "Guidance: how to use any part of this application",
      ],
      note: "Everything respects your role permissions.",
    };
  }

  // ---------- personal (employee-first) -----------------------------------
  if (me && has(q, "my ")) {
    const personal = answerPersonal(q, me, ctx);
    if (personal) return personal;
  }
  if (role === "employee" && me) {
    const personal = answerPersonal(q, me, ctx);
    if (personal) return personal;
  }

  // ---------- growth / recommendations ------------------------------------
  if (has(q, "recommend", "suggestion", "advice", "how can we grow", "company grow", "improve the company", "optimis", "optimiz")) {
    return growthRecommendations(ctx);
  }
  if (has(q, "what skills", "skills should", "learn", "upskill", "skill development") && me) {
    return skillAdvice(me);
  }
  if (has(q, "how can i improve", "become better", "improve my performance", "develop myself") && me) {
    return improvementPlan(me);
  }
  if (has(q, "career path", "career growth", "next role", "promotion") && me) {
    return careerAdvice(me);
  }

  // ---------- headcount ----------------------------------------------------
  if (has(q, "how many employee", "total employee", "headcount", "team size", "how many people", "workforce size")) {
    const active = scope.filter((e) => e.status === "Active").length;
    const onLeave = scope.filter((e) => e.status === "On Leave").length;
    const depts = new Set(scope.map((e) => e.department)).size;
    return {
      text: role === "manager"
        ? `Your team has ${scope.length} members.`
        : `There are ${scope.length} employees in the current dataset.`,
      rows: [
        { label: "Total", value: String(scope.length) },
        { label: "Active", value: String(active) },
        { label: "On leave", value: String(onLeave) },
        { label: "Departments", value: String(depts) },
      ],
    };
  }

  // ---------- team summary (manager) --------------------------------------
  if (has(q, "summary of my team", "team summary", "about my team", "my team")) {
    const perf = avg(scope.map((e) => e.performanceScore));
    const att = avg(scope.map((e) => e.attendancePct));
    const eng = avg(scope.map((e) => e.engagement));
    const high = scope.filter((e) => e.attritionRisk === "High").length;
    return {
      text: `Your team has ${scope.length} members with an average performance of ${perf.toFixed(0)}%.`,
      bars: [
        { label: "Performance", value: Math.round(perf), max: 100 },
        { label: "Attendance", value: Math.round(att), max: 100 },
        { label: "Engagement", value: Math.round(eng), max: 100 },
      ],
      rows: [
        { label: "High attrition risk", value: String(high) },
        { label: "Pending leave", value: String(leaves.filter((l) => l.status === "Pending").length) },
        { label: "Total overtime", value: `${scope.reduce((a, b) => a + b.overtime, 0)}h` },
      ],
    };
  }

  // ---------- absent today -------------------------------------------------
  if (has(q, "absent") && has(q, "today")) {
    const t = todayISO();
    const ids = new Set(scope.map((e) => e.employeeId));
    const absentToday = allAttendance.filter((a) => a.date === t && a.status === "Absent" && ids.has(a.employeeId));
    const names = absentToday.map((a) => all.find((e) => e.employeeId === a.employeeId)).filter(Boolean) as Employee[];
    if (names.length === 0) return { text: `No absences recorded for today (${t}). Everyone in scope is either present, late, on leave or not yet recorded.` };
    return {
      text: `${names.length} ${names.length === 1 ? "person is" : "people are"} marked absent today (${t}).`,
      rows: names.slice(0, 8).map((e) => ({ label: e.name, value: `${e.department} · ${e.employeeId}` })),
      note: names.length > 8 ? `Showing 8 of ${names.length}. Open Attendance for the full list.` : undefined,
    };
  }

  // ---------- attendance rate ---------------------------------------------
  if (has(q, "attendance")) {
    const s = attendanceSummary(attendanceInRange);
    if (s.counted === 0) return { text: `No attendance records found between ${range.from} and ${range.to}. Try widening the global date filter.` };
    return {
      text: `Attendance rate is ${fmtPct(s.pct)} for ${range.from} → ${range.to} — exactly what the Attendance dashboard shows for this range.`,
      rows: [
        { label: "Present", value: String(s.present) },
        { label: "Late", value: String(s.late) },
        { label: "Absent", value: String(s.absent) },
        { label: "On leave", value: String(s.onLeave) },
        { label: "Total records", value: String(s.counted) },
        { label: "Hours logged", value: `${s.hours.toFixed(0)}h` },
      ],
      note: "Change the global date filter to recalculate.",
    };
  }

  // ---------- top performers -----------------------------------------------
  if (has(q, "top performer", "best performer", "high performer", "highest performance", "best employee")) {
    const top = [...scope].sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 5);
    if (!top.length) return { text: "No employees in scope." };
    return {
      text: `Top ${top.length} by performance score${role === "manager" ? " in your team" : ""}:`,
      bars: top.map((e) => ({ label: e.name, value: e.performanceScore, max: 100 })),
      rows: top.map((e) => ({ label: e.name, value: `${e.designation} · ${e.performanceScore}%` })),
    };
  }

  // ---------- attrition -----------------------------------------------------
  if (has(q, "attrition", "leaving", "resign", "retention", "at risk", "flight risk")) {
    const high = scope.filter((e) => e.attritionRisk === "High");
    const med = scope.filter((e) => e.attritionRisk === "Medium");
    const low = scope.length - high.length - med.length;
    return {
      text: `Predicted attrition risk across ${scope.length} people: ${high.length} High, ${med.length} Medium, ${low} Low.`,
      bars: [
        { label: "Low", value: low, max: scope.length },
        { label: "Medium", value: med.length, max: scope.length },
        { label: "High", value: high.length, max: scope.length },
      ],
      rows: high.slice(0, 6).map((e) => ({ label: e.name, value: `${e.department} · eng ${e.engagement}%` })),
      note: "Predicted risk — not a certainty. Final decisions rest with HR/management.",
    };
  }

  // ---------- skill gaps -----------------------------------------------------
  if (has(q, "skill gap", "skills gap", "missing skill", "which skill")) {
    const counts: Record<string, number> = {};
    for (const e of scope) for (const s of e.skills) counts[s] = (counts[s] ?? 0) + 1;
    const scarce = Object.entries(counts).sort((a, b) => a[1] - b[1]).slice(0, 6);
    const behind = scope.filter((e) => e.trainingCompleted < e.trainingRequired).length;
    return {
      text: `Scarcest skills in scope (potential gaps) and ${behind} employees behind on required training.`,
      bars: scarce.map(([k, v]) => ({ label: k, value: v, max: scope.length })),
      bullets: [
        "Plan targeted training for the scarcest skills above",
        "Consider hiring or internal mobility for critical shortages",
        "Pair low-coverage skills with mentors who already hold them",
      ],
    };
  }

  // ---------- appraisal ------------------------------------------------------
  if (has(q, "appraisal", "bonus", "reward", "recognition", "eligible for")) {
    const eligible = scope
      .filter((e) => e.performanceScore > 80 && e.attendancePct > 85 && e.yearsOfExperience > 3)
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 6);
    if (!eligible.length) return { text: "No one currently meets all appraisal criteria (performance > 80%, attendance > 85%, experience > 3 years)." };
    return {
      text: `${eligible.length} ${eligible.length === 1 ? "person meets" : "people meet"} the appraisal criteria (performance > 80%, attendance > 85%, tenure > 3y):`,
      rows: eligible.map((e) => ({ label: e.name, value: `perf ${e.performanceScore}% · att ${e.attendancePct}% · ${e.yearsOfExperience}y` })),
      note: "Recommendation — final decision should be made by authorized HR/management personnel.",
    };
  }

  // ---------- departments ------------------------------------------------------
  if (has(q, "department")) {
    const counts: Record<string, number> = {};
    for (const e of scope) counts[e.department] = (counts[e.department] ?? 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (has(q, "need", "staff", "hiring", "more people", "understaffed")) {
      const weakest = sorted
        .map(([d]) => ({ d, s: departmentStats(d, all, allAttendance, leaves) }))
        .sort((a, b) => (a.s.performance + a.s.attendancePct) - (b.s.performance + b.s.attendancePct))[0];
      return {
        text: `Based on performance, attendance and attrition signals, ${weakest.d} shows the most strain.`,
        rows: [
          { label: "Current headcount", value: String(weakest.s.people.length) },
          { label: "Projected need (+15%)", value: String(Math.round(weakest.s.people.length * 1.15)) },
          { label: "Potential gap", value: `+${Math.round(weakest.s.people.length * 0.15)}` },
          { label: "High attrition risk", value: String(weakest.s.highRisk) },
        ],
        note: "Forecast estimate — final decision should be made by HR/management.",
      };
    }
    return {
      text: `Workforce is spread across ${sorted.length} departments. Largest: ${sorted[0][0]} (${sorted[0][1]}). Smallest: ${sorted[sorted.length - 1][0]} (${sorted[sorted.length - 1][1]}).`,
      bars: sorted.slice(0, 8).map(([k, v]) => ({ label: k, value: v, max: sorted[0][1] })),
    };
  }

  // ---------- leave -------------------------------------------------------------
  if (has(q, "leave", "time off", "holiday", "vacation")) {
    const pending = leaves.filter((l) => l.status === "Pending");
    const approved = leaves.filter((l) => l.status === "Approved");
    const rejected = leaves.filter((l) => l.status === "Rejected");
    return {
      text: `${pending.length} leave ${pending.length === 1 ? "request is" : "requests are"} pending approval.`,
      rows: [
        { label: "Pending", value: String(pending.length) },
        { label: "Approved", value: String(approved.length) },
        { label: "Rejected", value: String(rejected.length) },
        ...pending.slice(0, 4).map((l) => ({ label: l.employeeName, value: `${l.type} · ${l.days}d from ${l.fromDate}` })),
      ],
    };
  }

  // ---------- overtime ------------------------------------------------------------
  if (has(q, "overtime", "extra hours", "working late", "burnout", "workload")) {
    const top = [...scope].sort((a, b) => b.overtime - a.overtime).slice(0, 6).filter((e) => e.overtime > 0);
    const total = scope.reduce((a, b) => a + b.overtime, 0);
    if (!top.length) return { text: "No overtime recorded in the current scope." };
    return {
      text: `Total overtime in scope is ${total}h. Highest contributors:`,
      bars: top.map((e) => ({ label: e.name, value: e.overtime, max: top[0].overtime })),
      bullets: top.filter((e) => e.overtime > 20).length > 0
        ? ["Consider rebalancing workload for anyone consistently above 20h/month", "Sustained overtime is a known attrition driver"]
        : undefined,
    };
  }

  // ---------- forecast ---------------------------------------------------------------
  if (has(q, "forecast", "predict", "future", "projection", "demand")) {
    const cur = scope.length;
    const proj = Math.round(cur * 1.15);
    return {
      text: `Workforce forecast (15% growth model): current ${cur} → projected ${proj}, a potential gap of +${proj - cur}.`,
      rows: [
        { label: "Current workforce", value: String(cur) },
        { label: "Projected requirement", value: String(proj) },
        { label: "Potential gap", value: `+${proj - cur}` },
      ],
      note: "Predicted estimate using a demo model — not a trained forecast. Final decision rests with HR/management.",
    };
  }

  // ---------- cost ---------------------------------------------------------------------
  if ((role === "admin" || role === "hr") && has(q, "cost", "payroll", "salary budget", "compensation")) {
    const total = scope.reduce((a, b) => a + b.salary, 0);
    return {
      text: `Total annual workforce cost in scope is ${formatCurrency(total)}.`,
      rows: [
        { label: "Headcount", value: String(scope.length) },
        { label: "Average CTC", value: formatCurrency(Math.round(total / Math.max(1, scope.length))) },
        { label: "Total", value: formatCurrency(total) },
      ],
    };
  }

  // ---------- engagement -----------------------------------------------------------------
  if (has(q, "engagement", "morale", "satisfaction", "sentiment")) {
    const eng = avg(scope.map((e) => e.engagement));
    const low = scope.filter((e) => e.engagement < 60);
    return {
      text: `Average engagement is ${eng.toFixed(0)}% across ${scope.length} people.`,
      rows: [
        { label: "Highly engaged (>75%)", value: String(scope.filter((e) => e.engagement > 75).length) },
        { label: "Moderate (60–75%)", value: String(scope.filter((e) => e.engagement >= 60 && e.engagement <= 75).length) },
        { label: "Low (<60%)", value: String(low.length) },
      ],
      note: "No free-text survey data is connected, so this reflects the engagement score in the dataset only.",
    };
  }

  // ---------- training -----------------------------------------------------------------------
  if (has(q, "training", "course", "learning", "certification")) {
    const behind = scope.filter((e) => e.trainingCompleted < e.trainingRequired);
    const pct = scope.length
      ? (scope.reduce((a, b) => a + b.trainingCompleted, 0) / Math.max(1, scope.reduce((a, b) => a + b.trainingRequired, 0))) * 100
      : 0;
    return {
      text: `Training completion is ${pct.toFixed(0)}% overall. ${behind.length} ${behind.length === 1 ? "person has" : "people have"} outstanding modules.`,
      bars: [{ label: "Completion", value: Math.round(pct), max: 100 }],
      rows: behind.slice(0, 5).map((e) => ({ label: e.name, value: `${e.trainingCompleted}/${e.trainingRequired} complete` })),
    };
  }

  // ---------- search a named person ------------------------------------------------------------
  const named = all.find((e) => q.includes(e.name.toLowerCase()) || q.includes(e.employeeId.toLowerCase()));
  if (named) {
    const allowed = role === "admin" || role === "hr" || (role === "manager" && scope.some((s) => s.employeeId === named.employeeId)) || (role === "employee" && me?.employeeId === named.employeeId);
    if (!allowed) return { text: "You don't have permission to access that employee's information." };
    const prod = deriveProductivity(named);
    return {
      text: `${named.name} — ${named.designation}, ${named.department} (${named.employeeId}).`,
      rows: [
        { label: "Status", value: named.status },
        { label: "Performance", value: `${named.performanceScore}%` },
        { label: "Attendance", value: `${named.attendancePct}%` },
        { label: "Engagement", value: `${named.engagement}%` },
        { label: "Productivity", value: `${prod.productivity}%` },
        { label: "Attrition risk", value: named.attritionRisk },
        { label: "Leave balance", value: `${named.leaveBalance} days` },
        ...((role === "admin" || role === "hr") ? [{ label: "Annual CTC", value: formatCurrency(named.salary) }] : []),
      ],
      note: "Open Employees → click the name for the full workforce profile.",
    };
  }

  // ---------- fallback ---------------------------------------------------------------------------
  return {
    text: "I couldn't match that to the dashboard data. Here's what I can answer right now:",
    bullets: promptTemplates(role).slice(0, 8).map((t) => t.q),
    note: "Tap any suggestion chip above the input to ask instantly.",
  };
}

// ------------------------------------------------------------------ personal
function answerPersonal(q: string, me: Employee, ctx: Ctx): AnswerBlock | null {
  const { allAttendance, store, range } = ctx;
  const mine = allAttendance.filter((a) => a.employeeId === me.employeeId && isInRange(a.date, range.from, range.to));

  if (has(q, "attendance", "present", "absent")) {
    const s = attendanceSummary(mine);
    return {
      text: `${me.name}, your attendance is ${fmtPct(s.pct)} for ${range.from} → ${range.to}.`,
      rows: [
        { label: "Present", value: String(s.present) },
        { label: "Late", value: String(s.late) },
        { label: "Absent", value: String(s.absent) },
        { label: "Hours logged", value: `${s.hours.toFixed(0)}h` },
        { label: "Shift", value: me.shift },
      ],
    };
  }
  if (has(q, "leave", "time off", "holiday")) {
    const mineL = store.leaves.filter((l) => l.employeeId === me.employeeId);
    return {
      text: `You have ${me.leaveBalance} days of leave remaining.`,
      rows: [
        { label: "Balance", value: `${me.leaveBalance} days` },
        { label: "Pending", value: String(mineL.filter((l) => l.status === "Pending").length) },
        { label: "Approved", value: String(mineL.filter((l) => l.status === "Approved").length) },
        { label: "Rejected", value: String(mineL.filter((l) => l.status === "Rejected").length) },
      ],
      note: "Apply for leave from My Leave → Apply Leave.",
    };
  }
  if (has(q, "salary", "payslip", "pay", "ctc")) {
    const sal = store.salaries.filter((s) => s.employeeId === me.employeeId).sort((a, b) => b.month.localeCompare(a.month))[0];
    if (!sal) return { text: "No salary records are available for your account yet." };
    return {
      text: `Your latest payslip (${sal.month}) shows a net pay of ${formatCurrency(sal.netPay)} — status ${sal.status}.`,
      rows: [
        { label: "Base", value: formatCurrency(sal.baseSalary) },
        { label: "Overtime", value: formatCurrency(sal.overtime) },
        { label: "Incentives", value: formatCurrency(sal.incentives) },
        { label: "Bonus", value: formatCurrency(sal.bonus) },
        { label: "Net pay", value: formatCurrency(sal.netPay) },
        { label: "Acknowledged", value: sal.acknowledged ? "Yes" : "Pending" },
      ],
      note: "Download or print it from Salary & Payslips.",
    };
  }
  if (has(q, "performance", "kpi", "score", "rating")) {
    const prod = deriveProductivity(me);
    return {
      text: `Your performance score is ${me.performanceScore}% with ${prod.productivity}% productivity.`,
      bars: [
        { label: "Performance", value: me.performanceScore, max: 100 },
        { label: "Attendance", value: me.attendancePct, max: 100 },
        { label: "Engagement", value: me.engagement, max: 100 },
        { label: "Training", value: prod.trainingParticipation, max: 100 },
      ],
    };
  }
  if (has(q, "shift", "timing", "roster")) {
    return { text: `You are on the ${me.shift} shift. Open My Shifts for the full calendar and check-in window.` };
  }
  if (has(q, "profile", "my detail", "about me")) {
    return {
      text: `${me.name} — ${me.designation}, ${me.department}.`,
      rows: [
        { label: "Employee ID", value: me.employeeId },
        { label: "Location", value: me.location },
        { label: "Shift", value: me.shift },
        { label: "Experience", value: `${me.yearsOfExperience} years` },
        { label: "Project", value: me.project },
        { label: "Status", value: me.status },
      ],
    };
  }
  return null;
}

// ------------------------------------------------------------- growth advice
function skillAdvice(me: Employee): AnswerBlock {
  const gaps = deriveSkillGaps(me);
  const career = deriveCareerPath(me);
  return {
    text: `Based on your current role (${me.designation}) and the skills in your profile, these are the highest-impact skills to develop next:`,
    rows: gaps.map((g) => ({ label: g.skill, value: `need ${g.required} · ${g.training}` })),
    bullets: [
      `Your current skills: ${me.skills.join(", ") || "none recorded"}`,
      career.nextRole ? `Target role: ${career.nextRole} — readiness ${career.readiness}%` : "You are at the top of the current ladder",
      me.trainingCompleted < me.trainingRequired
        ? `Finish your ${me.trainingRequired - me.trainingCompleted} outstanding training module(s) first — it is the fastest readiness gain`
        : "All assigned training is complete — take an elective in your gap areas",
    ],
    note: "Open My Skills and My Learning for the full breakdown.",
  };
}

function improvementPlan(me: Employee): AnswerBlock {
  const prod = deriveProductivity(me);
  const career = deriveCareerPath(me);
  const actions: string[] = [];
  if (me.attendancePct < 90) actions.push(`Lift attendance from ${me.attendancePct}% to 95% — it carries 15% of your score`);
  if (me.trainingCompleted < me.trainingRequired) actions.push(`Complete ${me.trainingRequired - me.trainingCompleted} outstanding training module(s)`);
  if (me.engagement < 75) actions.push("Increase engagement: join a cross-team initiative or volunteer for a stretch project");
  if (me.overtime > 20) actions.push(`Your overtime is ${me.overtime}h/month — sustained overload reduces output quality; discuss rebalancing`);
  if (prod.goalCompletion < 85) actions.push("Break large goals into weekly milestones to lift goal completion");
  const gaps = deriveSkillGaps(me);
  if (gaps.length) actions.push(`Build depth in ${gaps.map((g) => g.skill).join(", ")}`);
  if (!actions.length) actions.push("You are performing strongly across every tracked metric — focus on mentoring others and leading a project end-to-end");

  return {
    text: `Here is a personalised improvement plan, ${me.name}. Your current composite productivity is ${prod.productivity}%.`,
    bars: [
      { label: "Performance", value: me.performanceScore, max: 100 },
      { label: "Attendance", value: me.attendancePct, max: 100 },
      { label: "Engagement", value: me.engagement, max: 100 },
      { label: "Training", value: prod.trainingParticipation, max: 100 },
      { label: "Promotion readiness", value: career.readiness, max: 100 },
    ],
    bullets: actions,
    note: "Guidance only — your manager and HR make the final assessment.",
  };
}

function careerAdvice(me: Employee): AnswerBlock {
  const c = deriveCareerPath(me);
  const gaps = deriveSkillGaps(me);
  return {
    text: c.nextRole
      ? `Your path: ${c.steps.join(" → ")}. You are at ${me.designation}; the next step is ${c.nextRole} with ${c.readiness}% readiness.`
      : `You are at ${me.designation}, the top of the ${me.department} ladder. Focus on breadth: mentoring, strategy and cross-functional leadership.`,
    bars: [{ label: "Promotion readiness", value: c.readiness, max: 100 }],
    bullets: [
      `Experience: ${me.yearsOfExperience} years · Performance: ${me.performanceScore}% · Attendance: ${me.attendancePct}%`,
      gaps.length ? `Close these gaps first: ${gaps.map((g) => g.skill).join(", ")}` : "No blocking skill gaps detected",
      me.promotionEligible ? "You already meet the eligibility flag — raise it in your next 1:1" : "Keep performance above 80% and attendance above 85% to hit the eligibility flag",
    ],
    note: "Recommendation — final decision should be made by authorized HR/management personnel.",
  };
}

function growthRecommendations(ctx: Ctx): AnswerBlock {
  const { scope, all, allAttendance, leaves, role } = ctx;
  const recs: string[] = [];

  const highRisk = scope.filter((e) => e.attritionRisk === "High");
  if (highRisk.length) recs.push(`Retention: ${highRisk.length} people are at high attrition risk. Replacing one employee typically costs far more than retaining them — run stay interviews this month.`);

  const behind = scope.filter((e) => e.trainingCompleted < e.trainingRequired);
  if (behind.length) recs.push(`Capability: ${behind.length} employees have unfinished training. Closing this lifts delivery quality and promotion readiness.`);

  const overworked = scope.filter((e) => e.overtime > 20);
  if (overworked.length) recs.push(`Workload: ${overworked.length} people exceed 20h overtime per month. Rebalance to protect quality and reduce burnout-driven attrition.`);

  const lowEng = scope.filter((e) => e.engagement < 60);
  if (lowEng.length) recs.push(`Engagement: ${lowEng.length} employees score below 60%. Engagement is the strongest leading indicator of both productivity and retention.`);

  const stars = scope.filter((e) => e.performanceScore > 85 && e.attendancePct > 90);
  if (stars.length) recs.push(`Recognition: ${stars.length} consistently strong performers. Formal recognition is the cheapest retention lever available.`);

  // Weakest department
  if (role === "admin" || role === "hr") {
    const depts = Array.from(new Set(all.map((e) => e.department)));
    const ranked = depts.map((d) => ({ d, s: departmentStats(d, all, allAttendance, leaves) }))
      .sort((a, b) => a.s.performance - b.s.performance);
    if (ranked[0]) recs.push(`Department focus: ${ranked[0].d} has the lowest average performance (${ranked[0].s.performance.toFixed(0)}%). Targeted coaching there gives the biggest organisational lift.`);
  }

  // Scarce skills
  const counts: Record<string, number> = {};
  for (const e of scope) for (const s of e.skills) counts[s] = (counts[s] ?? 0) + 1;
  const scarce = Object.entries(counts).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([k]) => k);
  if (scarce.length) recs.push(`Skill strategy: ${scarce.join(", ")} are the scarcest skills. Build them internally before hiring externally — it is faster and cheaper.`);

  const pending = leaves.filter((l) => l.status === "Pending").length;
  if (pending > 0) recs.push(`Operations: ${pending} leave requests are waiting. Fast approvals measurably improve employee experience scores.`);

  if (!recs.length) recs.push("No material risks detected in the current dataset. Maintain the current cadence and review again next quarter.");

  return {
    text: "Here are data-driven recommendations to help the company grow, generated from your live dashboard:",
    bullets: recs,
    note: "Decision support only — authorized HR/management personnel make the final call.",
  };
}

function guidance(role: Role): AnswerBlock {
  const common = [
    "Use the global date filter on any dashboard to recalculate every KPI, chart and table.",
    "Toggle light/dark mode and manage your account from Settings.",
    "The bell icon shows notifications; the search bar finds people, skills and departments.",
  ];
  if (role === "admin") {
    return {
      text: "Quick guide for System Admin:",
      bullets: [
        "Dataset Manager — upload CSV/XLSX/JSON; columns are mapped automatically and every dashboard updates.",
        "Employees — click Add Employee to onboard someone, or click any employee name to open their full profile.",
        "Department tiles and filters let you drill from organisation → department → individual.",
        "Audit Logs track every login, upload and record change.",
        ...common,
      ],
    };
  }
  if (role === "hr") {
    return { text: "Quick guide for HR:", bullets: ["Employees — click a name for the complete workforce profile.", "Attrition Analytics and Talent Intelligence surface risk and appraisal candidates.", "Leave Management approves or rejects requests; HR Issues tracks employee queries.", ...common] };
  }
  if (role === "manager") {
    return { text: "Quick guide for Manager:", bullets: ["Dashboard — approve leave inline and view AI team insights.", "My Team — click a member's name for their profile.", "Resource Planning shows workload distribution across projects.", ...common] };
  }
  return {
    text: "Quick guide for Employee:",
    bullets: [
      "My Attendance — check in via Biometric, Face, GPS or QR; your shift window controls on-time vs late.",
      "My Leave — apply for leave and track approvals.",
      "Salary & Payslips — preview, print or download your payslip.",
      "My Skills, My Learning and Career Growth show what to develop next.",
      ...common,
    ],
  };
}
