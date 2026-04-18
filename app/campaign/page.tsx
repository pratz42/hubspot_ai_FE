"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Target,
  Sparkles,
  Calendar,
  Users,
  TrendingUp,
  Loader2,
  DollarSign,
  ArrowRight,
  Brain,
  Megaphone,
} from "lucide-react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

interface CampaignPlan {
  campaign_name: string;
  target_audience: string;
  channels: string[];
  timeline: string;
  budget: string;
  expected_roi: string;
}

export default function CampaignPage() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [campaignPlan, setCampaignPlan] = useState<CampaignPlan | null>(null);
  const [error, setError] = useState("");

  const generateCampaign = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/campaigns/plan", { goal });
      setCampaignPlan(res.data);
    } catch (err) {
      console.error("Error generating campaign:", err);
      setError(getErrorMessage(err, "Unable to generate campaign. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const campaignMetrics = [
    {
      title: "Campaign Reach",
      value: "2.4K",
      description: "Potential customers",
      icon: Users,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      borderColor: "border-l-blue-500",
    },
    {
      title: "Expected ROI",
      value: campaignPlan?.expected_roi || "245%",
      description: "Return on investment",
      icon: TrendingUp,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
      borderColor: "border-l-emerald-500",
    },
    {
      title: "Timeline",
      value: campaignPlan?.timeline || "30 days",
      description: "Campaign duration",
      icon: Calendar,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-50",
      borderColor: "border-l-violet-500",
    },
    {
      title: "Budget",
      value: campaignPlan?.budget || "$5,000",
      description: "Allocated budget",
      icon: DollarSign,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-50",
      borderColor: "border-l-orange-500",
    },
  ];

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Campaign Planner</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Describe your goal and let AI generate a complete campaign strategy
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — AI Generator panel */}
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800/60 p-6 h-full flex flex-col">
            {/* Ambient glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_-5%_-5%,rgba(234,88,12,0.15)_0%,transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_110%_110%,rgba(124,58,237,0.08)_0%,transparent_55%)]" />

            <div className="relative z-10 flex flex-col h-full gap-6">
              {/* Icon + title */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">AI Campaign Generator</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Powered by AI — describes your goal and we handle strategy, channels, budget, and timeline.
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-800/60" />

              {/* Form */}
              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                    Campaign Goal
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Increase product awareness for our new SaaS platform targeting mid-market B2B companies in logistics..."
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-700/60 text-slate-200 placeholder:text-slate-600 rounded-lg px-3.5 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/50 transition-all"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-xs text-red-400">
                    {error}
                  </div>
                )}

                <Button
                  onClick={generateCampaign}
                  disabled={loading || !goal.trim()}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold h-10 shadow-lg shadow-orange-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating strategy…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Campaign
                    </>
                  )}
                </Button>
              </div>

              {/* Footer hint */}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Brain className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
                Uses AI to analyze your market, audience, and budget
              </div>
            </div>
          </div>
        </div>

        {/* Right — Results */}
        <div className="lg:col-span-3">
          {campaignPlan ? (
            <div className="space-y-5">
              {/* Campaign name header */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        {campaignPlan.campaign_name}
                      </h2>
                      <p className="text-xs text-slate-500">AI-generated campaign strategy</p>
                    </div>
                  </div>
                </div>

                {/* Metric cards */}
                <div className="grid grid-cols-2 gap-px bg-slate-100">
                  {campaignMetrics.map((metric) => (
                    <div
                      key={metric.title}
                      className={`bg-white px-5 py-4 border-l-4 ${metric.borderColor}`}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`p-1.5 rounded-lg ${metric.iconBg}`}>
                          <metric.icon className={`w-3.5 h-3.5 ${metric.iconColor}`} />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{metric.title}</span>
                      </div>
                      <div className="text-xl font-bold text-slate-900">{metric.value}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{metric.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target audience + channels */}
              <div className="grid grid-cols-1 gap-4">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-3 pt-4 px-5">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Target Audience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {campaignPlan.target_audience}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-3 pt-4 px-5">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Marketing Channels
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <div className="flex flex-wrap gap-2">
                      {campaignPlan.channels.map((channel, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100"
                        >
                          {channel}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <Button className="bg-orange-600 hover:bg-orange-700 shadow-sm shadow-orange-200 font-semibold">
                  <Target className="w-4 h-4 mr-2" />
                  Launch Campaign
                </Button>
                <Button variant="outline" className="border-slate-200 text-slate-700">
                  Save as Draft
                </Button>
                <Button variant="outline" className="border-slate-200 text-slate-700">
                  Export Plan
                </Button>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="h-full min-h-[400px] rounded-xl border border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-center p-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-5">
                <Target className="w-7 h-7 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-2">
                Ready to build your campaign?
              </h3>
              <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
                Describe your marketing goal on the left and our AI will create a complete plan — audience, channels, timeline, and budget.
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-orange-600">
                <ArrowRight className="w-3.5 h-3.5" />
                Enter your goal to get started
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
