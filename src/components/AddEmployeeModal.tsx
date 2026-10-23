"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Modal } from "@/components/Modal";
import { Avatar } from "@/components/Avatar";
import {
  UserPlus, IdCard, Mail, Building2, Briefcase, Calendar, MapPin, Clock,
  UserCog, Wallet, Sparkles, TrendingUp, CalendarCheck, BookOpen, Check,
  X as XIcon, Plus, List, Pencil,
} from "lucide-react";
import { todayISO } from "@/lib/utils";
import type { Employee } from "@/lib/types";
import {
  INDIA_LOCATIONS, ALL_LOCATIONS, DEPARTMENT_DESIGNATIONS,
  DEFAULT_DEPARTMENTS, ALL_DESIGNATIONS,
} from "@/lib/locations";

const SHIFTS = ["Morning", "Evening", "Night", "Rotational"];
const STATUSES: Employee["status"][] = ["Active", "On Leave", "Inactive"];
const RISKS: Employee["attritionRisk"][] = ["Low", "Medium", "High"];
const GENDERS = ["Male", "Female", "Other"];
const SKILL_SUGGESTIONS = [
  "React", "Node.js", "TypeScript", "Python", "Java", "Go", "AWS", "GCP", "Kubernetes",
  "Docker", "SQL", "PostgreSQL", "GraphQL", "TensorFlow", "Power BI", "Tableau", "Figma",
  "Product Strategy", "Agile", "Salesforce", "Excel", "Recruitment", "HR Analytics", "Mentoring",
];

interface FormState {
  employeeId: string; name: string; email: string; gender: string; age: string;
  department: string; designation: string; managerId: string; joiningDate: string;
  yearsOfExperience: string; location: string; salary: string; shift: string;
  project: string; status: string; attritionRisk: string;
  performanceScore: string; attendancePct: string; engagement: string;
  workHours: string; overtime: string; leaveBalance: string;
  trainingCompleted: string; trainingRequired: string; skills: string[];
}

const STEPS = [
  { key: 1, label: "Personal", icon: IdCard },
  { key: 2, label: "Employment", icon: Briefcase },
  { key: 3, label: "Work & Skills", icon: BookOpen },
  { key: 4, label: "Review", icon: Check },
];

export function AddEmployeeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const employees = useApp((s) => s.employees);
  const addEmployee = useApp((s) => s.addEmployee);
  const pushToast = useApp((s) => s.pushToast);

  // Merge departments/designations/locations already in the dataset with the master lists.
  const departments = useMemo(
    () => Array.from(new Set([...DEFAULT_DEPARTMENTS, ...employees.map((e) => e.department)])).filter(Boolean).sort(),
    [employees],
  );
  const locations = useMemo(
    () => Array.from(new Set([...ALL_LOCATIONS, ...employees.map((e) => e.location)])).filter(Boolean).sort(),
    [employees],
  );
  const projects = useMemo(
    () => Array.from(new Set(employees.map((e) => e.project))).filter(Boolean).sort(),
    [employees],
  );
  const managers = useMemo(
    () => employees
      .filter((e) => employees.some((x) => x.managerId === e.employeeId) || /manager|lead|head|director/i.test(e.designation))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  );

  const nextId = useMemo(() => {
    const nums = employees.map((e) => Number(String(e.employeeId).replace(/\D/g, ""))).filter((n) => !Number.isNaN(n));
    return `EMP-${String((nums.length ? Math.max(...nums) : 1000) + 1).padStart(4, "0")}`;
  }, [employees]);

  // Everything starts EMPTY — the admin fills it in. Only the ID and joining
  // date are pre-seeded because they are system/calendar values.
  const blank = (): FormState => ({
    employeeId: nextId, name: "", email: "", gender: "", age: "",
    department: "", designation: "", managerId: "", joiningDate: todayISO(),
    yearsOfExperience: "", location: "", salary: "", shift: "",
    project: "", status: "Active", attritionRisk: "",
    performanceScore: "", attendancePct: "", engagement: "",
    workHours: "", overtime: "", leaveBalance: "",
    trainingCompleted: "", trainingRequired: "", skills: [],
  });

  const [form, setForm] = useState<FormState>(blank);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Re-seed the suggested ID whenever the modal is re-opened.
  useEffect(() => {
    if (open) setForm((p) => (p.name || p.email ? p : { ...blank() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => {
      const n = { ...p, [k]: v };
      // Changing department resets a designation that no longer belongs to it.
      if (k === "department") {
        const allowed = DEPARTMENT_DESIGNATIONS[v as string];
        if (allowed && n.designation && !allowed.includes(n.designation)) n.designation = "";
      }
      return n;
    });
    setErrors((p) => { const n = { ...p }; delete n[k as string]; return n; });
  };

  const reset = () => { setForm(blank()); setStep(1); setErrors({}); setSkillInput(""); };
  const closeAll = () => { reset(); onClose(); };

  // Designations available for the chosen department (falls back to all).
  const designationOptions = useMemo(() => {
    const fromDept = DEPARTMENT_DESIGNATIONS[form.department] ?? [];
    const fromData = employees.filter((e) => !form.department || e.department === form.department).map((e) => e.designation);
    const merged = Array.from(new Set([...fromDept, ...fromData])).filter(Boolean).sort();
    return merged.length ? merged : ALL_DESIGNATIONS;
  }, [form.department, employees]);

  // ------------------------------------------------------------- validation
  function errorsFor(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    const req = (k: keyof FormState, msg: string) => { if (!String(form[k] ?? "").trim()) e[k] = msg; };
    const pct = (k: keyof FormState, label: string) => {
      const raw = String(form[k] ?? "").trim();
      if (!raw) { e[k] = `${label} is required.`; return; }
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0 || n > 100) e[k] = "Enter a value between 0 and 100.";
    };

    if (s === 1) {
      req("employeeId", "Employee ID is required.");
      if (form.employeeId.trim() && employees.some((x) => x.employeeId.toLowerCase() === form.employeeId.trim().toLowerCase())) e.employeeId = "This Employee ID already exists.";
      req("name", "Full name is required.");
      req("email", "Email is required.");
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
      else if (form.email.trim() && employees.some((x) => x.email.toLowerCase() === form.email.trim().toLowerCase())) e.email = "This email is already registered.";
      if (form.age.trim() && (Number(form.age) < 16 || Number(form.age) > 80)) e.age = "Age must be between 16 and 80.";
    }
    if (s === 2) {
      req("department", "Select a department.");
      req("designation", "Select a designation.");
      req("joiningDate", "Joining date is required.");
      req("location", "Select a work location.");
      req("shift", "Select a shift.");
      req("salary", "Annual CTC is required.");
      if (form.salary.trim() && Number(form.salary) <= 0) e.salary = "Enter a valid annual CTC.";
      req("yearsOfExperience", "Years of experience is required.");
      if (form.yearsOfExperience.trim() && Number(form.yearsOfExperience) < 0) e.yearsOfExperience = "Experience cannot be negative.";
    }
    if (s === 3) {
      pct("performanceScore", "Performance score");
      pct("attendancePct", "Attendance");
      pct("engagement", "Engagement");
      req("attritionRisk", "Select an attrition risk level.");
      if (form.trainingCompleted.trim() && form.trainingRequired.trim()
        && Number(form.trainingCompleted) > Number(form.trainingRequired)) {
        e.trainingCompleted = "Cannot exceed required modules.";
      }
    }
    return e;
  }

  function validateStep(s: number): boolean {
    const e = errorsFor(s);
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => { if (validateStep(step)) setStep((s) => Math.min(4, s + 1)); };
  const back = () => { setErrors({}); setStep((s) => Math.max(1, s - 1)); };

  const addSkill = (s: string) => {
    const v = s.trim();
    if (!v || form.skills.includes(v)) return;
    set("skills", [...form.skills, v]);
    setSkillInput("");
  };

  function submit() {
    const all = { ...errorsFor(1), ...errorsFor(2), ...errorsFor(3) };
    if (Object.keys(all).length) {
      setErrors(all);
      const firstStep = Object.keys(errorsFor(1)).length ? 1 : Object.keys(errorsFor(2)).length ? 2 : 3;
      setStep(firstStep);
      pushToast({ message: "Please complete the highlighted required fields.", type: "error" });
      return;
    }
    setSaving(true);
    const mgr = employees.find((m) => m.employeeId === form.managerId);
    const perf = Number(form.performanceScore);
    const att = Number(form.attendancePct);
    const exp = Number(form.yearsOfExperience);
    const num = (v: string, fallback: number) => (String(v).trim() === "" ? fallback : Number(v));

    setTimeout(() => {
      addEmployee({
        employeeId: form.employeeId.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        gender: form.gender || undefined,
        age: form.age.trim() ? Number(form.age) : undefined,
        department: form.department.trim(),
        designation: form.designation.trim(),
        role: form.designation.trim(),
        joiningDate: form.joiningDate,
        yearsOfExperience: exp,
        location: form.location.trim(),
        manager: mgr?.name,
        managerId: form.managerId || undefined,
        salary: Number(form.salary),
        performanceScore: perf,
        attendancePct: att,
        skills: form.skills,
        trainingCompleted: num(form.trainingCompleted, 0),
        trainingRequired: Math.max(1, num(form.trainingRequired, 4)),
        engagement: Number(form.engagement),
        shift: form.shift,
        project: form.project.trim() || "Internal",
        attritionRisk: (form.attritionRisk || "Low") as Employee["attritionRisk"],
        workHours: num(form.workHours, 8),
        overtime: num(form.overtime, 0),
        leaveBalance: num(form.leaveBalance, 12),
        status: (form.status || "Active") as Employee["status"],
        promotionEligible: perf > 80 && att > 85 && exp > 3,
      });
      setSaving(false);
      reset();
      onClose();
    }, 420);
  }

  // --------------------------------------------------------------- sections
  const personalFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Employee ID" required error={errors.employeeId} icon={<IdCard size={13} />}>
        <input className="input" value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} placeholder="e.g. EMP-1121" />
      </Field>
      <Field label="Full name" required error={errors.name}>
        <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rahul Kumar" />
      </Field>
      <Field label="Email" required error={errors.email} icon={<Mail size={13} />}>
        <input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="e.g. rahul.kumar@nexora.com" />
      </Field>
      <Field label="Gender" error={errors.gender}>
        <select className="input cursor-pointer" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
          <option value="">Select gender</option>
          {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>
      <Field label="Age" error={errors.age}>
        <input type="number" min={16} max={80} className="input" value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="e.g. 28" />
      </Field>
    </div>
  );

  const employmentFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <PickOrAdd
        label="Department" required icon={<Building2 size={13} />} error={errors.department}
        value={form.department} onChange={(v) => set("department", v)}
        options={departments} placeholder="Select department" addLabel="Add a new department"
      />
      <PickOrAdd
        label="Designation" required icon={<Briefcase size={13} />} error={errors.designation}
        value={form.designation} onChange={(v) => set("designation", v)}
        options={designationOptions}
        placeholder={form.department ? "Select designation" : "Select a department first"}
        addLabel="Add a new designation" disabled={!form.department}
      />
      <Field label="Reporting manager" icon={<UserCog size={13} />}>
        <select className="input cursor-pointer" value={form.managerId} onChange={(e) => set("managerId", e.target.value)}>
          <option value="">No manager assigned</option>
          {managers.map((m) => <option key={m.employeeId} value={m.employeeId}>{m.name} · {m.designation}</option>)}
        </select>
      </Field>
      <Field label="Joining date" required error={errors.joiningDate} icon={<Calendar size={13} />}>
        <input type="date" className="input" value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} />
      </Field>
      <PickOrAdd
        label="Work location" required icon={<MapPin size={13} />} error={errors.location}
        value={form.location} onChange={(v) => set("location", v)}
        options={locations} groups={INDIA_LOCATIONS}
        placeholder="Select state / city" addLabel="Add a new location"
      />
      <Field label="Shift" required error={errors.shift} icon={<Clock size={13} />}>
        <select className="input cursor-pointer" value={form.shift} onChange={(e) => set("shift", e.target.value)}>
          <option value="">Select shift</option>
          {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Employment status" error={errors.status}>
        <select className="input cursor-pointer" value={form.status} onChange={(e) => set("status", e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Years of experience" required error={errors.yearsOfExperience}>
        <input type="number" min={0} step="0.1" className="input" value={form.yearsOfExperience} onChange={(e) => set("yearsOfExperience", e.target.value)} placeholder="e.g. 4.5" />
      </Field>
      <Field label="Annual CTC (₹)" required error={errors.salary} icon={<Wallet size={13} />}>
        <input type="number" min={0} step="1000" className="input" value={form.salary} onChange={(e) => set("salary", e.target.value)} placeholder="e.g. 900000" />
      </Field>
      <PickOrAdd
        label="Project" value={form.project} onChange={(v) => set("project", v)}
        options={projects} placeholder="Select project (optional)" addLabel="Add a new project"
      />
    </div>
  );

  const workFields = (
    <div className="space-y-4">
      <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-[11px] text-[color:var(--text-muted)]">
        Enter the employee&apos;s actual figures. The greyed text in each box is only an example format.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Performance score (%)" required error={errors.performanceScore} icon={<TrendingUp size={13} />}>
          <input type="number" min={0} max={100} className="input" value={form.performanceScore} onChange={(e) => set("performanceScore", e.target.value)} placeholder="e.g. 82" />
        </Field>
        <Field label="Attendance (%)" required error={errors.attendancePct} icon={<CalendarCheck size={13} />}>
          <input type="number" min={0} max={100} className="input" value={form.attendancePct} onChange={(e) => set("attendancePct", e.target.value)} placeholder="e.g. 94" />
        </Field>
        <Field label="Engagement (%)" required error={errors.engagement} icon={<Sparkles size={13} />}>
          <input type="number" min={0} max={100} className="input" value={form.engagement} onChange={(e) => set("engagement", e.target.value)} placeholder="e.g. 78" />
        </Field>
        <Field label="Working hours / day" error={errors.workHours}>
          <input type="number" min={0} max={16} step="0.5" className="input" value={form.workHours} onChange={(e) => set("workHours", e.target.value)} placeholder="e.g. 8" />
        </Field>
        <Field label="Overtime (hrs / month)" error={errors.overtime}>
          <input type="number" min={0} className="input" value={form.overtime} onChange={(e) => set("overtime", e.target.value)} placeholder="e.g. 6" />
        </Field>
        <Field label="Leave balance (days)" error={errors.leaveBalance}>
          <input type="number" min={0} className="input" value={form.leaveBalance} onChange={(e) => set("leaveBalance", e.target.value)} placeholder="e.g. 12" />
        </Field>
        <Field label="Training completed" error={errors.trainingCompleted}>
          <input type="number" min={0} className="input" value={form.trainingCompleted} onChange={(e) => set("trainingCompleted", e.target.value)} placeholder="e.g. 2" />
        </Field>
        <Field label="Training required" error={errors.trainingRequired}>
          <input type="number" min={1} className="input" value={form.trainingRequired} onChange={(e) => set("trainingRequired", e.target.value)} placeholder="e.g. 5" />
        </Field>
        <Field label="Attrition risk" required error={errors.attritionRisk}>
          <select className="input cursor-pointer" value={form.attritionRisk} onChange={(e) => set("attritionRisk", e.target.value)}>
            <option value="">Select risk level</option>
            {RISKS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Skills" icon={<BookOpen size={13} />}>
        <div className="flex gap-2">
          <input
            className="input flex-1" value={skillInput} list="skill-list"
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
            placeholder="Type a skill and press Enter"
          />
          <datalist id="skill-list">{SKILL_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
          <button type="button" className="btn btn-secondary" onClick={() => addSkill(skillInput)}>Add</button>
        </div>
        {form.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.skills.map((s) => (
              <span key={s} className="tag">
                {s}
                <button type="button" onClick={() => set("skills", form.skills.filter((x) => x !== s))} className="hover:text-rose-500" aria-label={`Remove ${s}`}>
                  <XIcon size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SKILL_SUGGESTIONS.filter((s) => !form.skills.includes(s)).slice(0, 10).map((s) => (
            <button key={s} type="button" onClick={() => addSkill(s)} className="tag hover:!border-blue-500 hover:!text-blue-500 transition cursor-pointer">+ {s}</button>
          ))}
        </div>
      </Field>
    </div>
  );

  const hasAnyError = Object.keys(errors).length > 0;

  return (
    <Modal
      open={open}
      onClose={closeAll}
      title="Add New Employee"
      size="xl"
      footer={
        <>
          <button className="btn btn-secondary" onClick={closeAll}>Cancel</button>
          {step > 1 && <button className="btn btn-secondary" onClick={back}>Back</button>}
          {step < 4
            ? <button className="btn btn-primary" onClick={next}>Continue</button>
            : <button className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? "Saving…" : <><UserPlus size={15} /> Add Employee</>}
              </button>}
        </>
      }
    >
      {/* stepper */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { if (s.key <= step || validateStep(step)) setStep(s.key); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition border ${
                step === s.key ? "bg-blue-500/10 border-blue-500/40 text-blue-500"
                : step > s.key ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                : "bg-[color:var(--bg-soft)] border-[color:var(--border)] text-[color:var(--text-muted)]"
              }`}
            >
              {step > s.key ? <Check size={13} /> : <s.icon size={13} />}
              {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="text-[color:var(--text-muted)] text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* ---------------------------------------------------------- step 1 */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-[color:var(--border)]">
            <Avatar name={form.name || "?"} size={48} />
            <div>
              <div className="text-sm font-semibold">{form.name || "New employee"}</div>
              <div className="text-xs text-[color:var(--text-muted)]">Profile photo is generated from the initials you enter.</div>
            </div>
          </div>
          {personalFields}
        </div>
      )}

      {/* ---------------------------------------------------------- step 2 */}
      {step === 2 && employmentFields}

      {/* ---------------------------------------------------------- step 3 */}
      {step === 3 && workFields}

      {/* ---------------------------------------------------------- step 4 */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/8 to-cyan-500/8 border border-blue-500/25">
            <Avatar name={form.name || "?"} size={56} />
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold">{form.name || "—"}</div>
              <div className="text-xs text-[color:var(--text-muted)]">
                {form.designation || "—"} · {form.department || "—"} · <span className="font-mono">{form.employeeId}</span>
              </div>
            </div>
            <span className={`badge ${form.status === "Active" ? "badge-success" : "badge-warning"}`}>{form.status}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/25 text-[11px] text-[color:var(--text-muted)] flex items-center gap-2">
            <Pencil size={12} className="text-amber-500 shrink-0" />
            Everything below is still editable. Any change here is saved exactly as shown and reflected across all dashboards.
          </div>

          {hasAnyError && (
            <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/25 text-[11px] text-rose-500">
              Some required fields are incomplete — they are highlighted below.
            </div>
          )}

          <ReviewSection title="Personal information" icon={<IdCard size={14} className="text-blue-500" />}>{personalFields}</ReviewSection>
          <ReviewSection title="Employment details" icon={<Briefcase size={14} className="text-violet-500" />}>{employmentFields}</ReviewSection>
          <ReviewSection title="Work metrics & skills" icon={<BookOpen size={14} className="text-emerald-500" />}>{workFields}</ReviewSection>

          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/25 text-xs text-[color:var(--text-muted)]">
            <b className="text-emerald-600">On save:</b> this record is written to the central workforce store and will immediately appear in the Admin, HR, Manager and Employee dashboards, plus attendance, shifts, timesheets, payroll, analytics, reports and the Workforce Copilot.
          </div>
        </div>
      )}
    </Modal>
  );
}

/* --------------------------------------------------------------- helpers */

function Field({ label, children, required, error, icon }: {
  label: string; children: React.ReactNode; required?: boolean; error?: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-[color:var(--text-muted)] font-semibold flex items-center gap-1.5 mb-1.5">
        {icon}{label}{required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-rose-500 mt-1">{error}</p>}
    </div>
  );
}

/**
 * A dropdown that also lets the admin add a value that isn't in the list yet.
 * Supports optional <optgroup> grouping (used for state → city locations).
 */
function PickOrAdd({
  label, value, onChange, options, placeholder, addLabel, required, error, icon, groups, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
  placeholder: string; addLabel: string; required?: boolean; error?: string;
  icon?: React.ReactNode; groups?: { label: string; items: string[] }[]; disabled?: boolean;
}) {
  const known = useMemo(() => new Set(options), [options]);
  const [custom, setCustom] = useState(false);

  // If the current value isn't a known option (e.g. typed earlier), stay in custom mode.
  useEffect(() => {
    if (value && !known.has(value)) setCustom(true);
  }, [value, known]);

  // Values present in the dataset but missing from the grouped master list.
  const extras = useMemo(() => {
    if (!groups) return [];
    const inGroups = new Set(groups.flatMap((g) => g.items));
    return options.filter((o) => !inGroups.has(o));
  }, [groups, options]);

  return (
    <Field label={label} required={required} error={error} icon={icon}>
      {custom ? (
        <div className="flex gap-2">
          <input
            className="input flex-1" value={value} autoFocus
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Type a new ${label.toLowerCase()}`}
            disabled={disabled}
          />
          <button
            type="button" className="btn btn-secondary !px-2.5"
            title="Choose from list instead"
            onClick={() => { setCustom(false); onChange(""); }}
          >
            <List size={14} />
          </button>
        </div>
      ) : (
        <select
          className="input cursor-pointer" value={value} disabled={disabled}
          onChange={(e) => {
            if (e.target.value === "__add__") { setCustom(true); onChange(""); }
            else onChange(e.target.value);
          }}
        >
          <option value="">{placeholder}</option>
          {groups ? (
            <>
              {groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((it) => <option key={`${g.label}-${it}`} value={it}>{it}</option>)}
                </optgroup>
              ))}
              {extras.length > 0 && (
                <optgroup label="Other locations in use">
                  {extras.map((o) => <option key={o} value={o}>{o}</option>)}
                </optgroup>
              )}
            </>
          ) : (
            options.map((o) => <option key={o} value={o}>{o}</option>)
          )}
          <option value="__add__">➕ {addLabel}…</option>
        </select>
      )}
    </Field>
  );
}

function ReviewSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-[color:var(--border)] overflow-hidden">
      <button
        type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-[color:var(--bg-soft)] text-left"
      >
        {icon}
        <span className="text-sm font-semibold flex-1">{title}</span>
        <span className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-wider">{open ? "Hide" : "Edit"}</span>
      </button>
      {open && <div className="p-3.5">{children}</div>}
    </div>
  );
}
