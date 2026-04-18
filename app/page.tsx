"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  Lock,
  Mail,
  Loader2,
  Sparkles,
  Brain,
  Shield,
  ArrowRight,
  Zap,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      localStorage.setItem("token", data.session.access_token);
      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex">

      {/* ── Background layer ───────────────────────────────────────── */}

      {/* Gradient blobs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_-15%_-15%,rgba(234,88,12,0.22)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_115%_115%,rgba(124,58,237,0.20)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_55%_55%,rgba(99,102,241,0.07)_0%,transparent_65%)]" />

      {/* Dot-grid texture */}
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Full-screen neural network */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Layer 1 nodes — left cluster (x=120) */}
        {/* Layer 2 nodes — mid-left cluster (x=380) */}
        {/* Layer 3 nodes — center cluster (x=650) */}
        {/* Layer 4 nodes — mid-right cluster (x=920) */}
        {/* Layer 5 nodes — right cluster (x=1200) */}

        {/* All connections — white, very low opacity */}
        <g stroke="rgba(255,255,255,0.055)" strokeWidth="1">
          {/* L1 → L2 */}
          <line x1="120" y1="150" x2="380" y2="100"/><line x1="120" y1="150" x2="380" y2="260"/><line x1="120" y1="150" x2="380" y2="420"/><line x1="120" y1="150" x2="380" y2="580"/><line x1="120" y1="150" x2="380" y2="740"/>
          <line x1="120" y1="340" x2="380" y2="100"/><line x1="120" y1="340" x2="380" y2="260"/><line x1="120" y1="340" x2="380" y2="420"/><line x1="120" y1="340" x2="380" y2="580"/><line x1="120" y1="340" x2="380" y2="740"/>
          <line x1="120" y1="530" x2="380" y2="100"/><line x1="120" y1="530" x2="380" y2="260"/><line x1="120" y1="530" x2="380" y2="420"/><line x1="120" y1="530" x2="380" y2="580"/><line x1="120" y1="530" x2="380" y2="740"/>
          <line x1="120" y1="720" x2="380" y2="100"/><line x1="120" y1="720" x2="380" y2="260"/><line x1="120" y1="720" x2="380" y2="420"/><line x1="120" y1="720" x2="380" y2="580"/><line x1="120" y1="720" x2="380" y2="740"/>
          {/* L2 → L3 */}
          <line x1="380" y1="100" x2="650" y2="80"/><line x1="380" y1="100" x2="650" y2="220"/><line x1="380" y1="100" x2="650" y2="380"/><line x1="380" y1="100" x2="650" y2="540"/><line x1="380" y1="100" x2="650" y2="700"/><line x1="380" y1="100" x2="650" y2="840"/>
          <line x1="380" y1="260" x2="650" y2="80"/><line x1="380" y1="260" x2="650" y2="220"/><line x1="380" y1="260" x2="650" y2="380"/><line x1="380" y1="260" x2="650" y2="540"/><line x1="380" y1="260" x2="650" y2="700"/><line x1="380" y1="260" x2="650" y2="840"/>
          <line x1="380" y1="420" x2="650" y2="80"/><line x1="380" y1="420" x2="650" y2="220"/><line x1="380" y1="420" x2="650" y2="380"/><line x1="380" y1="420" x2="650" y2="540"/><line x1="380" y1="420" x2="650" y2="700"/><line x1="380" y1="420" x2="650" y2="840"/>
          <line x1="380" y1="580" x2="650" y2="80"/><line x1="380" y1="580" x2="650" y2="220"/><line x1="380" y1="580" x2="650" y2="380"/><line x1="380" y1="580" x2="650" y2="540"/><line x1="380" y1="580" x2="650" y2="700"/><line x1="380" y1="580" x2="650" y2="840"/>
          <line x1="380" y1="740" x2="650" y2="80"/><line x1="380" y1="740" x2="650" y2="220"/><line x1="380" y1="740" x2="650" y2="380"/><line x1="380" y1="740" x2="650" y2="540"/><line x1="380" y1="740" x2="650" y2="700"/><line x1="380" y1="740" x2="650" y2="840"/>
          {/* L3 → L4 */}
          <line x1="650" y1="80" x2="920" y2="140"/><line x1="650" y1="80" x2="920" y2="320"/><line x1="650" y1="80" x2="920" y2="500"/><line x1="650" y1="80" x2="920" y2="680"/>
          <line x1="650" y1="220" x2="920" y2="140"/><line x1="650" y1="220" x2="920" y2="320"/><line x1="650" y1="220" x2="920" y2="500"/><line x1="650" y1="220" x2="920" y2="680"/>
          <line x1="650" y1="380" x2="920" y2="140"/><line x1="650" y1="380" x2="920" y2="320"/><line x1="650" y1="380" x2="920" y2="500"/><line x1="650" y1="380" x2="920" y2="680"/>
          <line x1="650" y1="540" x2="920" y2="140"/><line x1="650" y1="540" x2="920" y2="320"/><line x1="650" y1="540" x2="920" y2="500"/><line x1="650" y1="540" x2="920" y2="680"/>
          <line x1="650" y1="700" x2="920" y2="140"/><line x1="650" y1="700" x2="920" y2="320"/><line x1="650" y1="700" x2="920" y2="500"/><line x1="650" y1="700" x2="920" y2="680"/>
          <line x1="650" y1="840" x2="920" y2="140"/><line x1="650" y1="840" x2="920" y2="320"/><line x1="650" y1="840" x2="920" y2="500"/><line x1="650" y1="840" x2="920" y2="680"/>
          {/* L4 → L5 */}
          <line x1="920" y1="140" x2="1200" y2="200"/><line x1="920" y1="140" x2="1200" y2="420"/><line x1="920" y1="140" x2="1200" y2="640"/>
          <line x1="920" y1="320" x2="1200" y2="200"/><line x1="920" y1="320" x2="1200" y2="420"/><line x1="920" y1="320" x2="1200" y2="640"/>
          <line x1="920" y1="500" x2="1200" y2="200"/><line x1="920" y1="500" x2="1200" y2="420"/><line x1="920" y1="500" x2="1200" y2="640"/>
          <line x1="920" y1="680" x2="1200" y2="200"/><line x1="920" y1="680" x2="1200" y2="420"/><line x1="920" y1="680" x2="1200" y2="640"/>
        </g>

        {/* Active path highlights — orange */}
        <g stroke="rgba(251,146,60,0.22)" strokeWidth="1.5">
          <line x1="120" y1="340" x2="380" y2="260"/>
          <line x1="380" y1="260" x2="650" y2="380"/>
          <line x1="650" y1="380" x2="920" y2="320"/>
          <line x1="920" y1="320" x2="1200" y2="420"/>
        </g>
        {/* Active path highlights — violet */}
        <g stroke="rgba(167,139,250,0.18)" strokeWidth="1.5">
          <line x1="120" y1="530" x2="380" y2="580"/>
          <line x1="380" y1="580" x2="650" y2="540"/>
          <line x1="650" y1="540" x2="920" y2="500"/>
          <line x1="920" y1="500" x2="1200" y2="420"/>
        </g>

        {/* Layer 1 — input nodes */}
        <g fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1">
          <circle cx="120" cy="150" r="5"/><circle cx="120" cy="340" r="5"/><circle cx="120" cy="530" r="5"/><circle cx="120" cy="720" r="5"/>
        </g>
        {/* Layer 2 */}
        <g fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.16)" strokeWidth="1">
          <circle cx="380" cy="100" r="6"/><circle cx="380" cy="260" r="6"/><circle cx="380" cy="420" r="6"/><circle cx="380" cy="580" r="6"/><circle cx="380" cy="740" r="6"/>
        </g>
        {/* Layer 3 */}
        <g fill="rgba(255,255,255,0.09)" stroke="rgba(255,255,255,0.14)" strokeWidth="1">
          <circle cx="650" cy="80" r="6"/><circle cx="650" cy="220" r="6"/><circle cx="650" cy="380" r="6"/><circle cx="650" cy="540" r="6"/><circle cx="650" cy="700" r="6"/><circle cx="650" cy="840" r="6"/>
        </g>
        {/* Layer 4 */}
        <g fill="rgba(255,255,255,0.09)" stroke="rgba(255,255,255,0.14)" strokeWidth="1">
          <circle cx="920" cy="140" r="6"/><circle cx="920" cy="320" r="6"/><circle cx="920" cy="500" r="6"/><circle cx="920" cy="680" r="6"/>
        </g>
        {/* Layer 5 — output nodes */}
        <g fill="rgba(167,139,250,0.25)" stroke="rgba(167,139,250,0.50)" strokeWidth="1.5">
          <circle cx="1200" cy="200" r="8"/><circle cx="1200" cy="420" r="9"/><circle cx="1200" cy="640" r="8"/>
        </g>

        {/* Active nodes — orange */}
        <g fill="rgba(251,146,60,0.30)" stroke="rgba(251,146,60,0.60)" strokeWidth="1.5">
          <circle cx="120" cy="340" r="6"/><circle cx="380" cy="260" r="7"/><circle cx="650" cy="380" r="7"/><circle cx="920" cy="320" r="7"/>
        </g>
        {/* Active nodes — violet */}
        <g fill="rgba(167,139,250,0.22)" stroke="rgba(167,139,250,0.45)" strokeWidth="1.5">
          <circle cx="120" cy="530" r="6"/><circle cx="380" cy="580" r="7"/><circle cx="650" cy="540" r="7"/><circle cx="920" cy="500" r="7"/>
        </g>

        {/* Glow halos on key nodes */}
        <g fill="none" stroke="rgba(251,146,60,0.10)" strokeWidth="8">
          <circle cx="650" cy="380" r="16"/><circle cx="920" cy="320" r="14"/>
        </g>
        <g fill="none" stroke="rgba(167,139,250,0.12)" strokeWidth="8">
          <circle cx="1200" cy="420" r="20"/>
        </g>
      </svg>

      {/* ── Left content panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between py-12 px-14 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">Hubspot AI</div>
            <div className="text-orange-400 text-xs font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              AI Sales Insight
            </div>
          </div>
        </div>

        {/* Hero copy + floating metrics */}
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold text-white leading-[1.1] mb-5 tracking-tight">
            Close more deals<br />
            with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400">
              AI-powered
            </span>
            <br />intelligence
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-md">
            Score leads automatically, generate campaigns in seconds, and never miss the right moment to act.
          </p>

          {/* Live metric chips */}
          <div className="flex flex-wrap gap-3 mb-10">
            {[
              { value: "94%", label: "AI Accuracy", color: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
              { value: "3.2×", label: "More Conversions", color: "border-violet-500/30 bg-violet-500/10 text-violet-300" },
              { value: "60s", label: "To Score a Lead", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
              { value: "∞", label: "Scalable Pipelines", color: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
            ].map((chip) => (
              <div key={chip.label} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-sm ${chip.color}`}>
                <span className="text-base font-bold leading-none">{chip.value}</span>
                <span className="text-xs font-medium opacity-80">{chip.label}</span>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="space-y-0">
            {[
              { icon: Brain, label: "AI Lead Scoring", desc: "Real-time conversion probability from web signals", color: "text-violet-400", glow: "bg-violet-500/10 border-violet-500/20" },
              { icon: Sparkles, label: "Smart Campaigns", desc: "AI-personalized messaging and budget planning", color: "text-orange-400", glow: "bg-orange-500/10 border-orange-500/20" },
              { icon: Shield, label: "Enterprise Security", desc: "Bank-grade encryption and role-based access", color: "text-emerald-400", glow: "bg-emerald-500/10 border-emerald-500/20" },
              { icon: Zap, label: "Web Intelligence", desc: "Live signals harvested from across the internet", color: "text-sky-400", glow: "bg-sky-500/10 border-sky-500/20" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 py-3.5 border-b border-white/[0.05] group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${item.glow}`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                  <span className="text-slate-500 text-sm"> — {item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            All systems operational · Enterprise-grade security
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500">SOC 2</span>
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500">GDPR</span>
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500">ISO 27001</span>
          </div>
        </div>
      </div>

      {/* ── Right: login form card ─────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center relative z-10 p-8 lg:max-w-[480px]">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.10] rounded-2xl p-8 shadow-2xl shadow-black/40">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">Hubspot AI</div>
                <div className="text-orange-400 text-xs font-medium">AI Sales Insight</div>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
              <p className="text-slate-400 mt-1.5 text-sm">Sign in to your sales command center</p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 h-11 bg-white/[0.07] border-white/[0.12] text-white placeholder:text-slate-600 rounded-xl focus:border-orange-500/50 focus:ring-orange-500/20"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 h-11 bg-white/[0.07] border-white/[0.12] text-white placeholder:text-slate-600 rounded-xl focus:border-orange-500/50 focus:ring-orange-500/20"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                  <div className="w-4 h-4 rounded-full border-2 border-red-400/50 flex-shrink-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  </div>
                  {error}
                </div>
              )}

              <Button
                onClick={handleLogin}
                disabled={loading || !email || !password}
                className="w-full h-11 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/25 transition-all duration-200 mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</>
                ) : (
                  <>Sign in<ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>

            <p className="text-xs text-slate-600 text-center mt-6">
              Don&apos;t have an account?{" "}
              <span className="text-orange-400 font-semibold cursor-pointer hover:text-orange-300 transition-colors">
                Contact your administrator
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
