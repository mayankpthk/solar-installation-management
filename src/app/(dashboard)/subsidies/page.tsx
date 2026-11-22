"use client";

import * as React from "react";
import {
  Landmark,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Building,
  Plus,
  AlertTriangle,
  UploadCloud,
  FileText,
  DollarSign,
  Info,
  Check,
  X,
  CreditCard,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-context";
import { formatCurrency } from "@/lib/utils";
import { getStore } from "@/lib/data/store";
import { SubsidyApplication, SubsidyStatus } from "@/lib/types/database";
import {
  calculateEligibleSubsidy,
  verifySubsidyDocuments,
  createSubsidyApplication,
  advanceSubsidyStage,
  recordSubsidyDisbursement,
  rejectSubsidyApplication,
  GOVERNMENT_INTEGRATION_DISCLAIMER,
  SUBSIDY_PIPELINE_STAGES,
} from "@/domain/subsidies/subsidy-engine";

export default function SubsidiesPage() {
  const { toast } = useToast();
  const [subsidies, setSubsidies] = React.useState<SubsidyApplication[]>([]);
  const [selectedFilter, setSelectedFilter] = React.useState<string>("ALL");

  // New Application Dialog
  const [isNewAppOpen, setIsNewAppOpen] = React.useState(false);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>("");
  const [discomName, setDiscomName] = React.useState("PSPCL");
  const [hasBill, setHasBill] = React.useState(true);
  const [hasAadhaar, setHasAadhaar] = React.useState(true);
  const [hasPropertyTax, setHasPropertyTax] = React.useState(true);
  const [hasPassbook, setHasPassbook] = React.useState(true);

  // Application Detail Modal
  const [selectedApp, setSelectedApp] = React.useState<SubsidyApplication | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  // Disbursement Modal
  const [isDisburseOpen, setIsDisburseOpen] = React.useState(false);
  const [disburseAmount, setDisburseAmount] = React.useState(78000);
  const [dbtRef, setDbtRef] = React.useState("DBT-PFMS-2026-994821");

  const loadData = React.useCallback(() => {
    const store = getStore();
    setSubsidies([...store.subsidies]);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const store = getStore();
  const ordersList = store.orders.filter((o) => o.system_topology === "ON_GRID");

  const handleCreateApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast({ title: "Order Required", description: "Please select an active On-Grid solar project.", variant: "warning" });
      return;
    }

    try {
      const newApp = createSubsidyApplication({
        orderId: selectedOrderId,
        discomName,
        electricityBillUrl: hasBill ? "/docs/electricity-bill.pdf" : undefined,
        idProofUrl: hasAadhaar ? "/docs/aadhaar.pdf" : undefined,
        propertyTaxUrl: hasPropertyTax ? "/docs/property-tax.pdf" : undefined,
        bankPassbookUrl: hasPassbook ? "/docs/bank-passbook.pdf" : undefined,
        userRole: "OPERATIONS_MANAGER",
        userId: "ops-mgr",
      });

      loadData();
      setIsNewAppOpen(false);

      toast({
        title: "Subsidy Application Created",
        description: `Application ${newApp.portal_application_number} lodged for ₹${newApp.subsidy_amount_eligible.toLocaleString("en-IN")}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Creation error";
      toast({ title: "Failed to Create Application", description: msg, variant: "error" });
    }
  };

  const handleAdvance = (appId: string, nextStage: SubsidyStatus) => {
    try {
      advanceSubsidyStage(appId, {
        nextStage,
        userRole: "OPERATIONS_MANAGER",
        userId: "ops-mgr",
      });
      loadData();
      refreshSelected(appId);
      toast({
        title: "Subsidy Milestone Advanced",
        description: `Application status moved to ${nextStage.replace(/_/g, " ")}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error advancing stage";
      toast({ title: "Cannot Advance Milestone", description: msg, variant: "error" });
    }
  };

  const handleRecordDisbursement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || disburseAmount <= 0) return;

    try {
      recordSubsidyDisbursement(selectedApp.id, {
        amount: Number(disburseAmount),
        disbursedDate: new Date().toISOString().slice(0, 10),
        dbtTransactionRef: dbtRef,
        userRole: "FINANCE_MANAGER",
        userId: "fin-mgr",
      });
      loadData();
      refreshSelected(selectedApp.id);
      setIsDisburseOpen(false);
      toast({
        title: "DBT Subsidy Disbursed",
        description: `₹${Number(disburseAmount).toLocaleString("en-IN")} confirmed received via Direct Benefit Transfer!`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Disbursement error";
      toast({ title: "Error Recording Disbursement", description: msg, variant: "error" });
    }
  };

  const handleReject = (appId: string) => {
    const reason = prompt("Enter official DISCOM / MNRE rejection reason:", "Rooftop property tax receipt name does not match electricity bill account.");
    if (!reason) return;

    try {
      rejectSubsidyApplication(appId, { rejectionReason: reason, userRole: "OPERATIONS_MANAGER" });
      loadData();
      refreshSelected(appId);
      toast({ title: "Application Marked Rejected", description: "Rejection documented in audit trail.", variant: "warning" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      toast({ title: "Action Failed", description: msg, variant: "error" });
    }
  };

  const refreshSelected = (appId: string) => {
    const s = getStore();
    const app = s.subsidies.find((item) => item.id === appId);
    if (app) setSelectedApp({ ...app });
  };

  // Filtered Subsidies
  const filteredSubsidies = React.useMemo(() => {
    return subsidies.filter((s) => {
      if (selectedFilter === "ALL") return true;
      if (selectedFilter === "DOCS_PENDING") return s.status === "DOCS_PENDING";
      if (selectedFilter === "PORTAL_SUBMITTED") return s.status === "PORTAL_SUBMITTED" || s.status === "FEASIBILITY_APPROVED";
      if (selectedFilter === "NET_METER") return s.status === "INSPECTED" || s.status === "NET_METER_INSTALLED" || s.status === "CLAIM_LODGED";
      if (selectedFilter === "DISBURSED") return s.status === "DISBURSED";
      if (selectedFilter === "REJECTED") return s.status === "REJECTED";
      return true;
    });
  }, [subsidies, selectedFilter]);

  const totalEligible = subsidies.reduce((sum, s) => sum + s.subsidy_amount_eligible, 0);
  const totalDisbursed = subsidies.reduce((sum, s) => sum + (s.disbursed_amount || 0), 0);
  const pendingCount = subsidies.filter((s) => s.status !== "DISBURSED" && s.status !== "REJECTED").length;

  const columns: Column<SubsidyApplication>[] = [
    {
      header: "Portal Application #",
      accessorKey: "portal_application_number",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground font-mono text-xs">{row.portal_application_number}</p>
          <p className="text-[10px] text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      header: "Discom Utility",
      accessorKey: "discom_name",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-primary" /> {row.discom_name}
        </span>
      ),
    },
    {
      header: "Govt Subsidy Amount",
      accessorKey: "subsidy_amount_eligible",
      sortable: true,
      cell: (row) => (
        <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.subsidy_amount_eligible)}
          {row.disbursed_amount ? (
            <p className="text-[10px] text-primary font-medium">Disbursed: {formatCurrency(row.disbursed_amount)}</p>
          ) : (
            <p className="text-[10px] text-muted-foreground">Pending DBT</p>
          )}
        </div>
      ),
    },
    {
      header: "Statutory Stage",
      accessorKey: "status",
      sortable: true,
      cell: (row) => <StatusPill status={row.status} />,
    },
    {
      header: "Document Readiness",
      cell: (row) => {
        const docs = verifySubsidyDocuments(row);
        return docs.isComplete ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500">
            <AlertTriangle className="w-3.5 h-3.5" /> {docs.missingDocuments.length} Pending
          </span>
        );
      },
    },
    {
      header: "Action",
      cell: (row) => (
        <Button
          size="sm"
          className="h-7 text-xs bg-primary text-primary-foreground font-semibold"
          onClick={() => {
            setSelectedApp(row);
            setIsDetailOpen(true);
          }}
        >
          Track & Advance
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" />
            MNRE & PM Surya Ghar Subsidy Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track statutory documentation, DISCOM technical feasibility approvals, net-metering installations, and direct benefit transfers.
          </p>
        </div>

        <Button
          onClick={() => {
            if (ordersList.length > 0) setSelectedOrderId(ordersList[0].id);
            setIsNewAppOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Subsidy Dossier
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Eligible Subsidies</p>
              <p className="text-2xl font-black text-foreground mt-1">{formatCurrency(totalEligible)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{subsidies.length} Registered Applications</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Disbursed (DBT Direct)</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(totalDisbursed)}
              </p>
              <p className="text-[10px] text-emerald-500 font-medium mt-0.5">Credited to Consumer Bank</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pending DISCOM Pipeline</p>
              <p className="text-2xl font-black text-amber-500 mt-1">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Feasibility & Net-Metering</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Central Scheme Cap</p>
              <p className="text-xl font-black text-foreground mt-1">₹78,000 / Site</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">PM Surya Ghar Yojana (3 kW+)</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statutory Integration Disclaimer */}
      <div className="p-3.5 rounded-xl border border-border bg-muted/40 flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-foreground">Statutory Workflow Integrity Disclaimer</p>
          <p className="text-muted-foreground text-[11px]">{GOVERNMENT_INTEGRATION_DISCLAIMER}</p>
        </div>
      </div>

      {/* Main Subsidies Data Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">National Solar Rooftop Portal Pipeline</CardTitle>
              <CardDescription className="text-xs">
                Track status across DISCOM utilities and manage DBT milestones.
              </CardDescription>
            </div>

            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg overflow-x-auto">
              {[
                { key: "ALL", label: "All" },
                { key: "DOCS_PENDING", label: "Docs Pending" },
                { key: "PORTAL_SUBMITTED", label: "Portal Submitted" },
                { key: "NET_METER", label: "Net Meter / Inspect" },
                { key: "DISBURSED", label: "Disbursed" },
                { key: "REJECTED", label: "Rejected" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedFilter(tab.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                    selectedFilter === tab.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={filteredSubsidies}
            columns={columns}
            searchPlaceholder="Search by portal application number or DISCOM..."
          />
        </CardContent>
      </Card>

      {/* New Subsidy Dossier Modal */}
      <Dialog open={isNewAppOpen} onOpenChange={setIsNewAppOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              Prepare PM Surya Ghar Subsidy Dossier
            </DialogTitle>
            <DialogDescription>
              Link an active On-Grid installation and verify mandatory statutory documents.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateApplication} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Select On-Grid Installation *</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full px-2.5 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                required
              >
                {ordersList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} ({o.system_capacity_kw} kW On-Grid) - Subsidy: ₹{calculateEligibleSubsidy(o.system_capacity_kw, o.system_topology).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">DISCOM Power Distribution Utility *</label>
              <select
                value={discomName}
                onChange={(e) => setDiscomName(e.target.value)}
                className="w-full px-2.5 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="PSPCL">Punjab State Power Corporation Limited (PSPCL)</option>
                <option value="BSES Rajdhani">BSES Rajdhani Power Limited (BRPL)</option>
                <option value="Tata Power DDL">Tata Power Delhi Distribution Limited (TPDDL)</option>
                <option value="DHBVN">Dakshin Haryana Bijli Vitran Nigam (DHBVN)</option>
                <option value="UPPCL">Uttar Pradesh Power Corporation Limited (UPPCL)</option>
              </select>
            </div>

            <div className="p-3 rounded-xl border border-border bg-muted/40 space-y-2">
              <label className="font-bold text-foreground block">Mandatory Document Attachments</label>
              <p className="text-[11px] text-muted-foreground">
                National portal submission requires four verified documents:
              </p>

              <div className="space-y-1.5 pt-1">
                {[
                  { label: "Latest Paid Electricity Bill", checked: hasBill, toggle: setHasBill },
                  { label: "Aadhaar Card / Government Photo ID", checked: hasAadhaar, toggle: setHasAadhaar },
                  { label: "Property Ownership / Municipal Tax Receipt", checked: hasPropertyTax, toggle: setHasPropertyTax },
                  { label: "Bank Account Passbook / Cancelled Cheque (DBT Direct)", checked: hasPassbook, toggle: setHasPassbook },
                ].map((item, idx) => (
                  <label key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border cursor-pointer">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.toggle(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewAppOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-semibold">
                Generate Dossier & Register
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Application Detail & Stage Progression Modal */}
      {selectedApp && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <Landmark className="w-5 h-5 text-primary" />
                  {selectedApp.portal_application_number}
                </DialogTitle>
                <StatusPill status={selectedApp.status} />
              </div>
              <DialogDescription className="text-xs">
                Utility: {selectedApp.discom_name} • Central Assistance: {formatCurrency(selectedApp.subsidy_amount_eligible)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Document Readiness Card */}
              {(() => {
                const docs = verifySubsidyDocuments(selectedApp);
                return (
                  <div className={`p-3.5 rounded-xl border ${docs.isComplete ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-primary" />
                        Statutory Document Verification Status
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${docs.isComplete ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/20 text-amber-600"}`}>
                        {docs.isComplete ? "100% Verified" : `${docs.missingDocuments.length} Missing`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="flex items-center gap-1.5">
                        {docs.hasElectricityBill ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>Electricity Bill</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {docs.hasIdProof ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>Aadhaar Photo ID</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {docs.hasPropertyTax ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>Property Tax Deed</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {docs.hasBankPassbook ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>Bank DBT Passbook</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Pipeline Milestone Stepper */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                <p className="font-bold text-foreground">Statutory Portal Milestone Stepper</p>
                <div className="space-y-2">
                  {SUBSIDY_PIPELINE_STAGES.map((stage, idx) => {
                    const currentIdx = SUBSIDY_PIPELINE_STAGES.indexOf(selectedApp.status);
                    const isPast = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div key={stage} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/60">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isPast ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                          }`}>
                            {idx + 1}
                          </div>
                          <span className={`text-xs ${isCurrent ? "font-bold text-primary" : isPast ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {stage.replace(/_/g, " ")}
                          </span>
                        </div>

                        {idx === currentIdx + 1 && selectedApp.status !== "DISBURSED" && selectedApp.status !== "REJECTED" && (
                          <Button
                            size="sm"
                            className="h-6 text-[11px] bg-primary text-primary-foreground font-semibold px-2"
                            onClick={() => handleAdvance(selectedApp.id, stage)}
                          >
                            Advance to {stage.replace(/_/g, " ")}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DBT Disbursement or Rejection Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                {selectedApp.status !== "DISBURSED" && selectedApp.status !== "REJECTED" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs h-8"
                      onClick={() => handleReject(selectedApp.id)}
                    >
                      Record Portal Rejection
                    </Button>

                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8"
                      onClick={() => {
                        setDisburseAmount(selectedApp.subsidy_amount_eligible);
                        setIsDisburseOpen(true);
                      }}
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1" />
                      Record DBT Disbursement
                    </Button>
                  </>
                )}

                {selectedApp.status === "DISBURSED" && (
                  <div className="p-3 w-full rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold text-center">
                    ✓ Subsidy Disbursed: {formatCurrency(selectedApp.disbursed_amount || selectedApp.subsidy_amount_eligible)} credited to customer bank on {selectedApp.disbursed_date}.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button size="sm" variant="outline" onClick={() => setIsDetailOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Record DBT Disbursement Dialog */}
      <Dialog open={isDisburseOpen} onOpenChange={setIsDisburseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record DBT Subsidy Credit</DialogTitle>
            <DialogDescription>
              Confirm Central Financial Assistance disbursement received in customer bank account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordDisbursement} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Disbursed Amount (₹) *</label>
              <Input
                type="number"
                min="1"
                value={disburseAmount}
                onChange={(e) => setDisburseAmount(Number(e.target.value))}
                required
                className="h-8 text-xs font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Public Financial Management (PFMS / DBT) Ref *</label>
              <Input
                value={dbtRef}
                onChange={(e) => setDbtRef(e.target.value)}
                required
                className="h-8 text-xs font-mono"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDisburseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Confirm Disbursement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
