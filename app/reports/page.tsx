"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatPageContext } from "@/hooks/useChatContext";
import { useReportFilters } from "@/hooks/useReportFilters";
import { useReport } from "@/hooks/useReport";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportNav } from "@/components/reports/ReportNav";
import { ReportFilterBar } from "@/components/reports/ReportFilterBar";
import { ReportFilterChips } from "@/components/reports/ReportFilterChips";
import { DashboardPlaceholder } from "@/components/reports/DashboardPlaceholder";
import { OverviewDashboard } from "@/components/reports/overview/OverviewDashboard";
import { SalesDashboard } from "@/components/reports/sales/SalesDashboard";
import { LeadsContactsDashboard } from "@/components/reports/leads/LeadsContactsDashboard";
import { CampaignsDashboard } from "@/components/reports/campaigns/CampaignsDashboard";
import { AIEffectivenessDashboard } from "@/components/reports/ai/AIEffectivenessDashboard";
import { DataQualityDashboard } from "@/components/reports/quality/DataQualityDashboard";
import { ActivityDashboard } from "@/components/reports/activity/ActivityDashboard";
import { CustomDashboardManager } from "@/components/reports/custom/CustomDashboardManager";
import type {
  OverviewReport,
  SalesReport,
  LeadsContactsReport,
  CampaignsReport,
  AIEffectivenessReport,
  DataQualityReport,
  ActivityReport,
  CustomDashboardItem,
} from "@/components/reports/types";

export default function ReportsPage() {
  useChatPageContext({
    page: "reports",
    entity_type: "report",
    suggested_prompts: [
      "Explain this forecast",
      "Summarize key trends",
      "Find anomalies in data",
      "What needs attention?",
    ],
  });

  const router = useRouter();

  const {
    section,
    setSection,
    filters,
    updateFilter,
    clearFilter,
    clearAll,
    activeFilters,
    activeCount,
  } = useReportFilters();

  const { data, dataSection, loading, error, refetch, lastUpdated } = useReport(section, filters);

  // Keep badge count in sync: use loaded data when on custom section, persist otherwise
  const [customDashboardCount, setCustomDashboardCount] = useState(0);
  useEffect(() => {
    if (section === "custom" && Array.isArray(data)) {
      setCustomDashboardCount((data as CustomDashboardItem[]).length);
    }
  }, [section, data]);

  const handleCreateDashboard = useCallback(() => {
    setSection("custom");
  }, [setSection]);

  // Guard against rendering a section dashboard with stale data from a
  // previous section: only set hasData when the loaded data's section matches
  // the current section. Without this, navigating "sales→overview" causes a
  // brief render where SalesReport data is cast as OverviewReport → crash.
  const hasData = data !== null && !loading && dataSection === section;

  // ── Render the correct dashboard for the current section ───────────────
  function renderDashboard() {
    if (loading || error || !hasData) {
      return (
        <DashboardPlaceholder
          section={section}
          loading={loading}
          error={error}
          hasData={hasData}
          onRetry={refetch}
          onCreateDashboard={handleCreateDashboard}
        />
      );
    }

    if (section === "overview") {
      return (
        <OverviewDashboard
          data={data as OverviewReport}
          onDealStageClick={() => setSection("sales")}
          onLeadClick={(id) => router.push(`/leads/${id}`)}
        />
      );
    }

    if (section === "sales") {
      return (
        <SalesDashboard
          data={data as SalesReport}
          filters={filters}
          onStageClick={(stage) => updateFilter("deal_stage_id", stage)}
        />
      );
    }

    if (section === "leads") {
      return (
        <LeadsContactsDashboard
          data={data as LeadsContactsReport}
          onFilterDrill={(key, value) => updateFilter(key, value)}
          onLeadClick={(id) => router.push(`/leads/${id}`)}
        />
      );
    }

    if (section === "campaigns") {
      return (
        <CampaignsDashboard
          data={data as CampaignsReport}
          onFilterDrill={(key, value) => updateFilter(key, value)}
          onCampaignClick={(id) => router.push(`/campaigns/${id}`)}
        />
      );
    }

    if (section === "ai") {
      return (
        <AIEffectivenessDashboard
          data={data as AIEffectivenessReport}
          onFilterDrill={(key, value) => updateFilter(key, value)}
          onLeadClick={(id) => router.push(`/leads/${id}`)}
        />
      );
    }

    if (section === "quality") {
      return <DataQualityDashboard data={data as DataQualityReport} />;
    }

    if (section === "activity") {
      return <ActivityDashboard data={data as ActivityReport} />;
    }

    if (section === "custom") {
      return (
        <CustomDashboardManager
          initialDashboards={
            Array.isArray(data) ? (data as CustomDashboardItem[]) : []
          }
          refetch={refetch}
          loading={loading}
        />
      );
    }

    // Fallback — should not be reached
    return (
      <DashboardPlaceholder
        section={section}
        loading={false}
        error={null}
        hasData={false}
        onRetry={refetch}
        onCreateDashboard={handleCreateDashboard}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* ── Sticky header ───────────────────────────────────────── */}
      <ReportHeader
        section={section}
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={refetch}
        onCreateDashboard={handleCreateDashboard}
      />

      {/* ── Section navigation ───────────────────────────────────── */}
      <ReportNav
        active={section}
        onSelect={setSection}
        dashboardCount={customDashboardCount}
      />

      {/* ── Filter bar ────────────────────────────────────────────── */}
      <ReportFilterBar
        filters={filters}
        activeCount={activeCount}
        onUpdate={updateFilter}
        onClearAll={clearAll}
      />

      {/* ── Active filter chips ───────────────────────────────────── */}
      <ReportFilterChips
        activeFilters={activeFilters}
        onClear={clearFilter}
        onClearAll={clearAll}
      />

      {/* ── Dashboard content area ────────────────────────────────── */}
      <div className="flex-1 px-6 py-5">
        {renderDashboard()}
      </div>
    </div>
  );
}
