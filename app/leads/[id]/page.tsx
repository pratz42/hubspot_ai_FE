"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Star,
  Mail,
  Phone,
  Building,
  Calendar,
  Target,
  MessageSquare,
  TrendingUp
} from "lucide-react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
interface Lead {
  id: number;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  ai_score?: number;
  ai_reason?: string;
  next_action?: string;
  status: string;
  created_at: string;
}

export default function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const leadId = resolvedParams?.id;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!leadId) {
      setError("Invalid lead ID.");
      setLoading(false);
      return;
    }

    const fetchLead = async () => {
      try {
        const res = await API.get(`/leads/${leadId}`);
        setLead(res.data);
      } catch (error) {
        console.error("Error fetching lead:", error);
        setError(getErrorMessage(error, "Unable to load this lead. Please try again."));
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [leadId]);

  const getScoreColor = (score?: number) => {
    if (!score) return "text-gray-500";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score?: number) => {
    if (!score) return "bg-gray-100";
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-gray-400 mb-4">
              <Target className="w-16 h-16" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {error ? "Unable to Load Lead" : "Lead not found"}
            </h3>
            <p className="text-gray-600 mb-4">
              {error || "The lead you're looking for doesn't exist."}
            </p>
            <Link href="/leads">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leads
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/leads">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leads
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
            <p className="text-gray-600 mt-1">Lead Details & AI Insights</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </Button>
          <Button variant="outline">
            <Phone className="w-4 h-4 mr-2" />
            Call
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700">
            Convert to Deal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Basic details about this lead</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Company</p>
                    <p className="font-medium text-gray-900">{lead.company}</p>
                  </div>
                </div>

                {lead.email && (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{lead.email}</p>
                    </div>
                  </div>
                )}

                {lead.phone && (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{lead.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge variant="secondary">{lead.status}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-orange-600" />
                AI Insights
              </CardTitle>
              <CardDescription>
                AI-powered analysis and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Score */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Lead Score</h4>
                  <p className="text-sm text-gray-600">AI-calculated conversion probability</p>
                </div>
                {lead.ai_score ? (
                  <div className={`inline-flex items-center px-4 py-2 rounded-lg ${getScoreBgColor(lead.ai_score)}`}>
                    <Star className={`w-5 h-5 mr-2 ${getScoreColor(lead.ai_score)}`} />
                    <span className={`text-lg font-bold ${getScoreColor(lead.ai_score)}`}>
                      {lead.ai_score}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400">Not scored</span>
                )}
              </div>

              {/* AI Reasoning */}
              {lead.ai_reason && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Analysis</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{lead.ai_reason}</p>
                  </div>
                </div>
              )}

              {/* Next Action */}
              {lead.next_action && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommended Next Action</h4>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Target className="w-5 h-5 text-orange-600 mt-0.5" />
                      <p className="text-orange-800">{lead.next_action}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Email Template
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Star className="w-4 h-4 mr-2" />
                Add to Campaign
              </Button>
            </CardContent>
          </Card>

          {/* Lead Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Recent interactions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Lead created</p>
                    <p className="text-xs text-gray-600">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">AI analysis completed</p>
                    <p className="text-xs text-gray-600">Score: {lead.ai_score || "N/A"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}