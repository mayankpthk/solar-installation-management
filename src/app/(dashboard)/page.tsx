"use client";

import * as React from "react";
import Link from "next/link";
import {
  SunMedium,
  TrendingUp,
  Wrench,
  ShieldCheck,
  LifeBuoy,
  Warehouse,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Landmark,
  DollarSign,
  FileSpreadsheet,
  Users,
  Compass,
  PackageX,
  CreditCard,
  Percent,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getDashboardMetrics, getChartData, DashboardMetrics, ChartData } from "@/lib/data/queries";

// Visualizations
import { RevenueChart } from "@/components/charts/revenue-chart";
import { InstallationTrendsChart } from "@/components/charts/installation-trends-chart";
import { LeadFunnelChart } from "@/components/charts/lead-funnel-chart";
import { SystemDistributionChart } from "@/components/charts/system-distribution-chart";
import { TechnicianPerformanceChart } from "@/components/charts/technician-performance-chart";
import { ProjectProfitabilityChart } from "@/components/charts/project-profitability-chart";
import { ServiceTicketChart } from "@/components/charts/service-ticket-chart";
import { computeExecutiveMetrics } from "@/domain/finance/finance-engine";

export default function ExecutiveDashboardPage() {
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = React.useState<ChartData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = React.useState<"TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM">("THIS_MONTH");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    try {
      const m = getDashboardMetrics();
      const c = getChartData();
      const exec = computeExecutiveMetrics({ period: selectedPeriod });

      // Merge real executive intelligence metrics for selected timeframe
      setMetrics({
        ...m,
        totalRevenue: exec.recognizedRevenue || m.totalRevenue,
        collectedPayments: exec.cashCollections || m.collectedPayments,
        outstandingPayments: exec.outstandingBalances || m.outstandingPayments,
        netProfit: exec.grossProfit || m.netProfit,
        monthlyExpenses: exec.totalOperatingExpenses || m.monthlyExpenses,
        completedInstallations: exec.completedProjects || m.completedInstallations,
        activeInstallations: exec.unfinishedProjects || m.activeInstallations,
        lowStockAlerts: exec.lowInventoryCount || m.lowStockAlerts,
        openServiceTickets: exec.openServiceTickets,
        warrantyClaims: exec.warrantyClaimsCount,
      });
      setChartData(c);
    } catch (err) {
      console.error("Failed to load dashboard metrics", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  const kpiItems = metrics
    ? [
        {
          title: "Total Revenue",
          value: formatCurrency(metrics.totalRevenue),
          subtitle: "Gross contract value booked",
          icon: DollarSign,
          color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        },
        {
          title: "Collected Payments",
          value: formatCurrency(metrics.collectedPayments),
          subtitle: `${Math.round((metrics.collectedPayments / (metrics.totalRevenue || 1)) * 100)}% realization rate`,
          icon: CreditCard,
          color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        },
        {
          title: "Outstanding Payments",
          value: formatCurrency(metrics.outstandingPayments),
          subtitle: "Milestone installments pending",
          icon: Clock,
          color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        },
        {
          title: "Net Profit",
          value: formatCurrency(metrics.netProfit),
          subtitle: `Margin: ${Math.round((metrics.netProfit / (metrics.totalRevenue || 1)) * 100)}% on revenue`,
          icon: TrendingUp,
          color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        },
        {
          title: "Active Leads",
          value: `${metrics.activeLeads} Prospects`,
          subtitle: "In active sales pipeline",
          icon: Users,
          color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
        },
        {
          title: "Conversion Rate",
          value: `${metrics.conversionRate}%`,
          subtitle: "Inquiry to won contract",
          icon: Percent,
          color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
        },
        {
          title: "Pending Surveys",
          value: `${metrics.pendingSurveys} Rooftops`,
          subtitle: "Awaiting field measurement",
          icon: Compass,
          color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
        },
        {
          title: "Approved Quotations",
          value: `${metrics.approvedQuotations} Quotes`,
          subtitle: "BOM validated & approved",
          icon: FileSpreadsheet,
          color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
        },
        {
          title: "Active Installations",
          value: `${metrics.activeInstallations} Sites`,
          subtitle: "15 technicians deployed",
          icon: Wrench,
          color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        },
        {
          title: "Completed Installs",
          value: `${metrics.completedInstallations} Systems`,
          subtitle: "Commissioned & online",
          icon: CheckCircle2,
          color: "text-green-500 bg-green-500/10 border-green-500/20",
        },
        {
          title: "Inventory Valuation",
          value: formatCurrency(metrics.inventoryValuation),
          subtitle: "Hardware stock on hand",
          icon: Warehouse,
          color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        },
        {
          title: "Low-Stock Alerts",
          value: `${metrics.lowStockAlerts} SKUs`,
          subtitle: "Below reorder threshold",
          icon: PackageX,
          color: metrics.lowStockAlerts > 0 ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-slate-500 bg-slate-500/10 border-slate-500/20",
        },
        {
          title: "Open Service Tickets",
          value: `${metrics.openServiceTickets} Active`,
          subtitle: "Customer support load",
          icon: LifeBuoy,
          color: metrics.openServiceTickets > 0 ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        },
        {
          title: "Warranty Claims",
          value: `${metrics.warrantyClaims} Claims`,
          subtitle: "Covered under ₹0 warranty",
          icon: ShieldCheck,
          color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        },
        {
          title: "Monthly Expenses",
          value: formatCurrency(metrics.monthlyExpenses),
          subtitle: "BOM, tech hours & transit",
          icon: Landmark,
          color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner: Operations Executive Cockpit */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <SunMedium className="w-3.5 h-3.5" />
              <span>Director Operations Cockpit</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              SunPower Solutions Operating System
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Real-time enterprise command center coordinating ~40 monthly rooftop solar installations,
              15 field technicians, serial hardware tracking, and PM Surya Ghar subsidies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/leads"
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              New Rooftop Inquiry
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/serial-numbers"
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-2"
            >
              Serial Lookup
            </Link>
          </div>
        </div>
      </div>

      {/* Executive Date-Range Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Clock className="w-4 h-4 text-primary" />
          <span>Executive Intelligence Time Horizon:</span>
        </div>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-semibold">
          {(["TODAY", "THIS_WEEK", "THIS_MONTH", "CUSTOM"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedPeriod === p
                  ? "bg-background text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "TODAY" && "Today"}
              {p === "THIS_WEEK" && "This Week"}
              {p === "THIS_MONTH" && "This Month"}
              {p === "CUSTOM" && "All Time / Custom"}
            </button>
          ))}
        </div>
      </div>

      {/* 15 Real Database Metrics Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Core Enterprise Metrics (Real-Time Database Calculation)
          </h2>
          <span className="text-xs font-mono text-muted-foreground">Updated live</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {isLoading
            ? Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse border border-border" />
              ))
            : kpiItems.map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <Card key={idx} className="border border-border shadow-xs hover:border-primary/40 transition-all">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight truncate">
                          {kpi.title}
                        </span>
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${kpi.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div className="mt-2">
                        <p className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                          {kpi.value}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{kpi.subtitle}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </div>

      {/* Visualizations Section (7 Real Visual Charts) */}
      <div className="space-y-6">
        {/* Row 1: Revenue vs Expenses & Installation Trajectory */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Monthly Revenue & Direct Expenses</CardTitle>
                <CardDescription className="text-xs">
                  6-month revenue vs operating cost (Hardware + Labor + Transport)
                </CardDescription>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Healthy Margins
              </span>
            </CardHeader>
            <CardContent className="p-4">
              <RevenueChart data={chartData?.monthlyRevenueAndExpenses} isLoading={isLoading} />
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Installation Trajectory & Velocity</CardTitle>
                <CardDescription className="text-xs">
                  Monthly commissioned systems vs in-progress deployments (~40/mo target)
                </CardDescription>
              </div>
              <span className="text-xs font-mono font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                100% Target Met
              </span>
            </CardHeader>
            <CardContent className="p-4">
              <InstallationTrendsChart data={chartData?.installationTrends} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Lead Conversion Funnel & System Topology Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border border-border shadow-sm lg:col-span-2">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold">CRM Lead Conversion Funnel</CardTitle>
              <CardDescription className="text-xs">
                Inquiry → Site Survey → Auto BOM Quotation → Customer Contract Won
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <LeadFunnelChart data={chartData?.leadConversionFunnel} isLoading={isLoading} />
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold">On-Grid vs Off-Grid Mix</CardTitle>
              <CardDescription className="text-xs">
                System topology share across 1–5 kW installations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <SystemDistributionChart data={chartData?.onGridVsOffGridSales} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Project Profitability Ranking & Technician Load & Service Support */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border border-border shadow-sm lg:col-span-2">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Project Profitability Leaderboard</CardTitle>
                <CardDescription className="text-xs">
                  Real-time gross margin: Contract Revenue − (Hardware BOM + Tech Hours + Logistics)
                </CardDescription>
              </div>
              <Link href="/finance" className="text-xs text-primary font-bold hover:underline">
                View Full P&L →
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              <ProjectProfitabilityChart data={chartData?.projectProfitability} isLoading={isLoading} />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-bold">Technician Utilization</CardTitle>
                <CardDescription className="text-xs">
                  Active installs & hours logged by top field leads
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <TechnicianPerformanceChart data={chartData?.technicianPerformance} isLoading={isLoading} />
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-bold">Service Tickets Status</CardTitle>
                <CardDescription className="text-xs">
                  Active post-commissioning customer maintenance load
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <ServiceTicketChart data={chartData?.serviceTicketStatus} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Operational Safeguard Gates (Hard Server Enforcements) */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Operational Safeguard Rules (Strict Server Enforcements)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">Survey Gate Strictly Enforced</p>
              <p className="text-muted-foreground leading-relaxed">
                Quotation engine automatically blocks quotes until site survey measurements (azimuth, tilt, cable distance) are verified and approved.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">Serial Dispatch Anti-Double Booking</p>
              <p className="text-muted-foreground leading-relaxed">
                PostgreSQL unique partial index prevents any inverter or battery serial number from being allocated to more than one active delivery.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">Automatic Warranty Clock Trigger</p>
              <p className="text-muted-foreground leading-relaxed">
                Trigger <code className="font-mono bg-emerald-500/20 px-1 py-0.5 rounded text-primary">trg_auto_warranty_delivery</code> automatically activates 2-year and 20-year warranty clocks upon truck delivery confirmation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
