"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Sparkles, Calendar, Users, TrendingUp, Loader2 } from "lucide-react";
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
    } catch (error) {
      console.error("Error generating campaign:", error);
      setError(getErrorMessage(error, "Unable to generate campaign. Please try again."));
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
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Expected ROI",
      value: campaignPlan?.expected_roi || "245%",
      description: "Return on investment",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Timeline",
      value: campaignPlan?.timeline || "30 days",
      description: "Campaign duration",
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Budget",
      value: campaignPlan?.budget || "$5,000",
      description: "Allocated budget",
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Campaign Planner</h1>
        <p className="text-gray-600 mt-2">Create AI-powered marketing campaigns for better results</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Campaign Creation Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-orange-600" />
                AI Campaign Generator
              </CardTitle>
              <CardDescription>
                Describe your campaign goal and let AI create a comprehensive plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Goal
                </label>
                <Input
                  placeholder="e.g., Increase product awareness for our new SaaS platform"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                onClick={generateCampaign}
                disabled={loading || !goal.trim()}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Generate Campaign</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Results */}
        <div className="lg:col-span-2">
          {campaignPlan ? (
            <div className="space-y-6">
              {/* Campaign Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>{campaignPlan.campaign_name}</CardTitle>
                  <CardDescription>
                    AI-generated campaign plan based on your goal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {campaignMetrics.map((metric, index) => (
                      <div key={index} className="text-center">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${metric.bgColor} mb-2`}>
                          <metric.icon className={`w-6 h-6 ${metric.color}`} />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                        <div className="text-sm text-gray-600">{metric.title}</div>
                      </div>
                    ))}
                  </div>

                  {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Target Audience</h4>
                      <p className="text-gray-600">{campaignPlan.target_audience}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Marketing Channels</h4>
                      <div className="flex flex-wrap gap-2">
                        {campaignPlan.channels.map((channel, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                          >
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Target className="w-4 h-4 mr-2" />
                  Launch Campaign
                </Button>
                <Button variant="outline">
                  Save as Draft
                </Button>
                <Button variant="outline">
                  Export Plan
                </Button>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to Create Your Campaign?
                </h3>
                <p className="text-gray-600 text-center max-w-md">
                  Describe your marketing goal in the form on the left, and our AI will generate a comprehensive campaign plan with target audience, channels, timeline, and budget recommendations.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}