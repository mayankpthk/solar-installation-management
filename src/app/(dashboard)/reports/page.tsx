"use client";

import * as React from "react";
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  Warehouse,
  UserCog,
  DollarSign,
  ShieldCheck,
  LifeBuoy,
  Landmark,
  CreditCard,
  Layers,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shared/toast-context";
import { formatCurrency } from "@/lib/utils";
import { UserRole } from "@/lib/types/database";
import {
  ReportPayload,
  generateRevenueReport,
  generateExpenseReport,
  generateProjectProfitabilityReport,
  generateInventoryValuationReport,
  generateTechnicianPerformanceReport,
  generateOutstandingPaymentReport,
  generateWarrantyReport,
  generateServiceTicketReport,
  generateSubsidyReport,
  canAccessReport,
} from "@/domain/reports/reporting-engine";

const REPORTS_CATALOG = [
  { id: "REVENUE", name: "1. Revenue & Collections Report", icon: TrendingUp, desc: "Recognized project revenue, cash collections, and unearned advance liability." },
  { id: "EXPENSES", name: "2. Operating Expense Report", icon: DollarSign, desc: "Direct hardware withdrawals, logistics, permits, and technician labor expenses." },
  { id: "PROJECT_PROFITABILITY", name: "3. Project Profitability & Job Costing", icon: BarChart3, desc: "Granular order-by-order gross margin, direct BOM costs, and project profitability." },
  { id: "INVENTORY_VALUATION", name: "4. Inventory Valuation Report", icon: Warehouse, desc: "Warehouse stock asset valuation by SKU, cost price, and low stock threshold alerts." },
  { id: "TECHNICIAN_PERFORMANCE", name: "5. Technician Utilization Report", icon: UserCog, desc: "Logged labor hours, jobs completed, utilization rate %, and technician billing costs." },
  { id: "OUTSTANDING_PAYMENTS", name: "6. Outstanding Payments & Aging", icon: CreditCard, desc: "Customer receivables, contract balances due, payment milestone statuses, and overdue amounts." },
  { id: "WARRANTY", name: "7. Hardware Warranty & Coverage", icon: ShieldCheck, desc: "Active warranty certificates, 2-year inverters, 20-year panels, and 90-day expiry tracker." },
  { id: "SERVICE_TICKETS", name: "8. After-Sales Service & Breakdown", icon: LifeBuoy, desc: "Monsoon breakdown calls, fault code frequency, warranty free repairs vs billable quotes." },
  { id: "SUBSIDY", name: "9. PM Surya Ghar Subsidy Pipeline", icon: Landmark, desc: "DISCOM applications, eligible CFA assistance, and confirmed Direct Benefit Transfer credits." },
];

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedReportId, setSelectedReportId] = React.useState<string>("REVENUE");
  const [userRole, setUserRole] = React.useState<UserRole>("DIRECTOR");
  const [currentReport, setCurrentReport] = React.useState<ReportPayload | null>(null);

  const loadReport = React.useCallback((reportId: string, role: UserRole) => {
    let payload: ReportPayload;
    switch (reportId) {
      case "EXPENSES":
        payload = generateExpenseReport(role);
        break;
      case "PROJECT_PROFITABILITY":
        payload = generateProjectProfitabilityReport(role);
        break;
      case "INVENTORY_VALUATION":
        payload = generateInventoryValuationReport(role);
        break;
      case "TECHNICIAN_PERFORMANCE":
        payload = generateTechnicianPerformanceReport(role);
        break;
      case "OUTSTANDING_PAYMENTS":
        payload = generateOutstandingPaymentReport(role);
        break;
      case "WARRANTY":
        payload = generateWarrantyReport(role);
        break;
      case "SERVICE_TICKETS":
        payload = generateServiceTicketReport(role);
        break;
      case "SUBSIDY":
        payload = generateSubsidyReport(role);
        break;
      case "REVENUE":
      default:
        payload = generateRevenueReport(role);
        break;
    }
    setCurrentReport(payload);
  }, []);

  React.useEffect(() => {
    loadReport(selectedReportId, userRole);
  }, [selectedReportId, userRole, loadReport]);

  const handleDownloadCSV = () => {
    if (!currentReport) return;
    try {
      const csvContent = currentReport.toCSV();
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SolarOS_${currentReport.reportId}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "CSV Download Complete",
        description: `${currentReport.title} exported with ${currentReport.rows.length} rows.`,
        variant: "success",
      });
    } catch {
      toast({ title: "Export Error", description: "Could not generate CSV export.", variant: "error" });
    }
  };

  const hasAccess = canAccessReport(userRole, selectedReportId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Executive Reports & Analytics Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Official operational reports with CSV spreadsheet downloads, formatted printable summaries, and role-based access.
          </p>
        </div>

        {/* Role Selector Simulator */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Viewer Role:</span>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
            className="px-2.5 py-1.5 bg-background border border-input rounded-md text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="DIRECTOR">Director (Full Access)</option>
            <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
            <option value="FINANCE_MANAGER">Finance Manager</option>
            <option value="SALES_MANAGER">Sales Manager</option>
            <option value="INSTALLATION_MANAGER">Installation Manager</option>
            <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
            <option value="FIELD_TECHNICIAN">Field Technician</option>
          </select>
        </div>
      </div>

      {/* 9 Reports Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {REPORTS_CATALOG.map((rep) => {
          const Icon = rep.icon;
          const isSelected = selectedReportId === rep.id;
          const accessible = canAccessReport(userRole, rep.id);

          return (
            <button
              key={rep.id}
              onClick={() => setSelectedReportId(rep.id)}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : accessible
                  ? "border-border bg-card hover:border-border/80"
                  : "border-border/40 bg-muted/30 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="font-bold text-xs text-foreground">{rep.name}</p>
                </div>
                {!accessible && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{rep.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Main Report Viewer */}
      {hasAccess && currentReport ? (
        <div className="space-y-4">
          {/* Report Top Action Bar */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    {currentReport.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Generated on {new Date(currentReport.generatedAt).toLocaleString()} • Period: {currentReport.period}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleDownloadCSV}
                    className="bg-primary text-primary-foreground font-semibold text-xs h-8"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export CSV Spreadsheet
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                    className="border-border text-xs h-8"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    Print Statement
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Executive Summary Metrics Ribbon */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(currentReport.summary).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-lg bg-muted/40 border border-border">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">{key}</p>
                    <p className="text-base font-black text-foreground mt-0.5">
                      {typeof val === "number" && key.includes("INR") ? formatCurrency(val) : String(val)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Live Preview Table */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-muted sticky top-0 border-b border-border z-10">
                      <tr>
                        {currentReport.headers.map((h) => (
                          <th key={h} className="p-2.5 font-bold text-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {currentReport.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          {currentReport.headers.map((h) => {
                            const val = row[h];
                            const isCurrency = h.includes("INR") || h.includes("Cost") || h.includes("Value") || h.includes("Revenue") || h.includes("Billed");
                            return (
                              <td key={h} className="p-2.5 whitespace-nowrap font-mono text-[11px]">
                                {typeof val === "number" && isCurrency
                                  ? formatCurrency(val)
                                  : String(val ?? "—")}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border border-border p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Access Restricted by Role Policy</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            User role <strong className="text-foreground font-mono">{userRole}</strong> is not authorized to inspect
            the selected financial report. Please select an authorized executive or managerial role in the selector above.
          </p>
        </Card>
      )}
    </div>
  );
}
