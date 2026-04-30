"use client";

import { useEffect } from "react";
import { Settings2, Save, Loader2, CheckCircle2 } from "lucide-react";
import { useChatPreferences } from "@/hooks/useChatPreferences";
import type { ChatPreferences } from "@/lib/chat/types";

function PreferenceSelect<K extends keyof ChatPreferences>({
  label,
  description,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: ChatPreferences[K];
  options: { value: ChatPreferences[K]; label: string }[];
  onChange: (v: ChatPreferences[K]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-xs font-medium text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
      <select
        value={value as string}
        onChange={(e) => onChange(e.target.value as ChatPreferences[K])}
        disabled={disabled}
        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-300 disabled:opacity-60"
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
          checked ? "bg-violet-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

const DEFAULTS: ChatPreferences = {
  tone: "professional",
  response_length: "balanced",
  approval_strictness: "smart",
  show_contextual_suggestions: true,
};

export function ChatPreferencesPanel() {
  const { state, load, save } = useChatPreferences();

  useEffect(() => {
    load();
  }, [load]);

  const prefs: ChatPreferences =
    state.phase === "done" || state.phase === "saved"
      ? state.preferences
      : DEFAULTS;

  const isLoading = state.phase === "loading";
  const isSaving = state.phase === "saving";
  const isSaved = state.phase === "saved";
  const isError = state.phase === "error";

  const update = <K extends keyof ChatPreferences>(key: K, value: ChatPreferences[K]) => {
    save({ ...prefs, [key]: value });
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <Settings2 className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">AI Assistant Preferences</h2>
          <p className="text-xs text-slate-500">Customize how the assistant behaves</p>
        </div>
      </div>

      {isError && state.phase === "error" && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
          {state.message}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
              <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <PreferenceSelect
            label="Response Tone"
            description="How the assistant communicates with you"
            value={prefs.tone}
            options={[
              { value: "professional", label: "Professional — formal and precise" },
              { value: "casual", label: "Casual — friendly and conversational" },
              { value: "concise", label: "Concise — brief and to the point" },
            ]}
            onChange={(v) => update("tone", v)}
            disabled={isSaving}
          />

          <PreferenceSelect
            label="Response Length"
            description="How detailed responses should be by default"
            value={prefs.response_length}
            options={[
              { value: "brief", label: "Brief — short summaries" },
              { value: "balanced", label: "Balanced — summaries with key details" },
              { value: "detailed", label: "Detailed — comprehensive explanations" },
            ]}
            onChange={(v) => update("response_length", v)}
            disabled={isSaving}
          />

          <PreferenceSelect
            label="Approval Strictness"
            description="When the assistant asks for your approval before acting"
            value={prefs.approval_strictness}
            options={[
              { value: "always_ask", label: "Always ask — approve every action" },
              { value: "smart", label: "Smart — ask for significant actions only" },
              { value: "auto_approve", label: "Auto approve — act without asking" },
            ]}
            onChange={(v) => update("approval_strictness", v)}
            disabled={isSaving}
          />

          <PreferenceToggle
            label="Contextual Suggestions"
            description="Show quick action suggestions based on the current page"
            checked={prefs.show_contextual_suggestions}
            onChange={(v) => update("show_contextual_suggestions", v)}
            disabled={isSaving}
          />
        </div>
      )}

      {(isSaving || isSaved) && (
        <div className="flex items-center gap-2 text-xs">
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
              <span className="text-slate-500">Saving…</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600">Preferences saved</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
