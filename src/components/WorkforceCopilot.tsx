"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrentUser } from "@/lib/store";
import { Bot, X, Send, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { answerQuestion, promptTemplates, type AnswerBlock } from "@/lib/copilot";

type Msg = { id: string; role: "user" | "ai"; text: string; block?: AnswerBlock; ts: number };

function rid() { return Math.random().toString(36).slice(2, 10); }

export function WorkforceCopilot() {
  const user = useCurrentUser();
  const role = user?.role ?? "employee";

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const templates = useMemo(() => promptTemplates(role), [role]);
  const groups = useMemo(() => {
    const m: Record<string, typeof templates> = {};
    for (const t of templates) (m[t.group] ??= []).push(t);
    return m;
  }, [templates]);

  const greeting: Msg = useMemo(() => ({
    id: "greet",
    role: "ai",
    text: `Hi${user?.username ? ` ${user.username}` : ""}, I'm your Workforce Copilot. I read your live dashboard data, so every answer matches exactly what you see on screen. Tap a suggestion below or ask me anything.`,
    ts: Date.now(),
  }), [user?.username]);

  const [msgs, setMsgs] = useState<Msg[]>([greeting]);
  useEffect(() => { setMsgs([greeting]); }, [greeting]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading, open]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setMsgs((m) => [...m, { id: rid(), role: "user", text: q, ts: Date.now() }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const block = answerQuestion(q);
      setMsgs((m) => [...m, { id: rid(), role: "ai", text: block.text, block, ts: Date.now() }]);
      setLoading(false);
    }, 480);
  };

  const showTemplates = msgs.length <= 1;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 px-4 py-3 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 text-white font-medium shadow-2xl shadow-blue-500/30 hover:scale-105 transition flex items-center gap-2 animate-pulse-glow"
        aria-label="Ask Workforce Copilot"
      >
        <Sparkles size={18} />
        <span className="hidden sm:inline">Ask Workforce AI</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[color:var(--bg-elev)] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl border border-[color:var(--border)] flex flex-col h-[92vh] sm:h-[680px] animate-slide-up">
            {/* header */}
            <div className="flex items-center justify-between p-4 border-b border-[color:var(--border)] bg-gradient-to-r from-blue-600/10 to-cyan-500/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Workforce Copilot</div>
                  <div className="text-[10px] text-[color:var(--text-muted)] flex items-center gap-1">
                    <span className="live-dot" /> Live data · {role} permissions
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMsgs([greeting])} className="p-1.5 rounded-lg hover:bg-[color:var(--bg-soft)] text-[color:var(--text-muted)]" title="Reset conversation">
                  <RotateCcw size={16} />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-[color:var(--bg-soft)]" aria-label="Close"><X size={18} /></button>
              </div>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-cyan-500 text-white"
                      : "bg-[color:var(--bg-soft)] border border-[color:var(--border)]"
                  }`}>
                    <div>{m.text}</div>

                    {m.block?.bars && m.block.bars.length > 0 && (
                      <div className="mt-2.5 space-y-1.5">
                        {m.block.bars.map((b, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-[11px] mb-0.5">
                              <span className="opacity-85 truncate pr-2">{b.label}</span>
                              <span className="font-semibold shrink-0">{b.value}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[color:var(--bg)] overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${Math.min(100, (b.value / Math.max(1, b.max)) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.block?.rows && m.block.rows.length > 0 && (
                      <div className="mt-2.5 grid grid-cols-1 gap-1">
                        {m.block.rows.map((r, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 text-xs bg-[color:var(--bg-elev)]/60 rounded px-2 py-1.5">
                            <span className="font-medium truncate">{r.label}</span>
                            <span className="opacity-80 shrink-0 text-right">{r.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.block?.bullets && m.block.bullets.length > 0 && (
                      <ul className="mt-2.5 space-y-1.5">
                        {m.block.bullets.map((b, i) => (
                          <li key={i} className="flex gap-2 text-xs">
                            <span className="text-blue-500 shrink-0 mt-0.5">•</span>
                            <span className="opacity-90">{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {m.block?.note && (
                      <div className="mt-2.5 pt-2 border-t border-[color:var(--border)] text-[10px] opacity-70 italic">{m.block.note}</div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[color:var(--bg-soft)] border border-[color:var(--border)] rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                    <Loader2 size={14} className="animate-spin" /> Reading your dashboard data…
                  </div>
                </div>
              )}

              {/* template chips */}
              {showTemplates && !loading && (
                <div className="space-y-3 pt-1">
                  {Object.entries(groups).map(([group, items]) => (
                    <div key={group}>
                      <div className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)] font-semibold mb-1.5">{group}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((t) => (
                          <button
                            key={t.q}
                            onClick={() => ask(t.q)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[color:var(--bg-soft)] border border-[color:var(--border)] hover:border-blue-500 hover:text-blue-500 hover:bg-blue-500/5 transition text-left"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* quick chips above input once chatting */}
            {!showTemplates && (
              <div className="px-3 pt-2 flex gap-1.5 overflow-x-auto">
                {templates.slice(0, 6).map((t) => (
                  <button
                    key={t.q}
                    onClick={() => ask(t.q)}
                    className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[color:var(--bg-soft)] border border-[color:var(--border)] hover:border-blue-500 hover:text-blue-500 transition whitespace-nowrap"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* input */}
            <div className="p-3 border-t border-[color:var(--border)] mt-2">
              <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about your workforce…"
                  className="input !py-2.5"
                />
                <button type="submit" className="btn btn-primary !p-2.5" disabled={!input.trim() || loading} aria-label="Send">
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
