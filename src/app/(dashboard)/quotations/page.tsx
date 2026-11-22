"use client";

import * as React from "react";
import {
  FileSpreadsheet,
  Plus,
  Printer,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ShieldAlert,
  ExternalLink,
  GitBranch,
  ShoppingCart,
  SlidersHorizontal,
  PackageCheck,
  PackageX,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-context";
import { formatCurrency } from "@/lib/utils";
import { getStore, recordAdminOverride, updateRecipeComponentQuantity } from "@/lib/data/store";
import { Quotation, SystemTopology, SiteSurvey, UserRole, ProductRecipe } from "@/lib/types/database";
import { calculateAutomaticBOM, ResolvedBOM } from "@/domain/bom/calculator";
import { calculateQuotationPricing, PricingResult } from "@/domain/pricing/calculator";
import { verifyQuotationEligibility } from "@/domain/workflow/survey-gate";
import { generateQuotationPipeline, createQuotationRevision } from "@/domain/quotations/quotation-engine";
import { confirmOrderFromQuotation } from "@/domain/payments/payment-processor";

export default function QuotationsPage() {
  const { toast } = useToast();
  const [quotations, setQuotations] = React.useState<Quotation[]>([]);
  const [surveys, setSurveys] = React.useState<SiteSurvey[]>([]);
  const [recipes, setRecipes] = React.useState<ProductRecipe[]>([]);
  const [isGenerateOpen, setIsGenerateOpen] = React.useState(false);

  // Active user role simulation for testing and UI demonstration
  const [userRole, setUserRole] = React.useState<UserRole>("DIRECTOR");

  // Form state
  const [capacityKw, setCapacityKw] = React.useState("3");
  const [topology, setTopology] = React.useState<SystemTopology>("ON_GRID");
  const [discountAmount, setDiscountAmount] = React.useState("0");
  const [selectedSurveyId, setSelectedSurveyId] = React.useState("");
  const [enableOverride, setEnableOverride] = React.useState(false);
  const [adminOverrideReason, setAdminOverrideReason] = React.useState("");

  // Revise Dialog state
  const [isReviseOpen, setIsReviseOpen] = React.useState(false);
  const [quotationToRevise, setQuotationToRevise] = React.useState<Quotation | null>(null);
  const [amendmentReason, setAmendmentReason] = React.useState("");
  const [revisedCapacityKw, setRevisedCapacityKw] = React.useState("3");
  const [revisedDiscount, setRevisedDiscount] = React.useState("0");

  // Confirm Order Dialog state
  const [isConfirmOrderOpen, setIsConfirmOrderOpen] = React.useState(false);
  const [acceptedQuotationForOrder, setAcceptedQuotationForOrder] = React.useState<Quotation | null>(null);
  const [advancePaymentRef, setAdvancePaymentRef] = React.useState("");
  const [advancePaymentAmount, setAdvancePaymentAmount] = React.useState("");

  // Recipe Configuration Dialog state
  const [isRecipeConfigOpen, setIsRecipeConfigOpen] = React.useState(false);
  const [selectedRecipe, setSelectedRecipe] = React.useState<ProductRecipe | null>(null);
  const [editRecipeQty, setEditRecipeQty] = React.useState<number>(1);

  const loadData = React.useCallback(() => {
    const store = getStore();
    setQuotations([...store.quotations]);
    setSurveys([...store.surveys]);
    setRecipes([...store.recipes]);
  }, []);

  React.useEffect(() => {
    loadData();
    const store = getStore();
    const approvedSurvey = store.surveys.find((s) => s.status === "APPROVED");
    if (approvedSurvey) {
      setSelectedSurveyId(approvedSurvey.id);
    } else if (store.surveys[0]) {
      setSelectedSurveyId(store.surveys[0].id);
    }
  }, [loadData]);

  const currentSurvey = React.useMemo(() => {
    return surveys.find((s) => s.id === selectedSurveyId);
  }, [surveys, selectedSurveyId]);

  const eligibility = React.useMemo(() => {
    return verifyQuotationEligibility({
      survey: currentSurvey,
      userRole,
      overrideReason: enableOverride ? adminOverrideReason : undefined,
    });
  }, [currentSurvey, userRole, enableOverride, adminOverrideReason]);

  // Live calculation preview in dialog
  const livePreview = React.useMemo(() => {
    try {
      const cap = Number(capacityKw) || 3;
      const bom: ResolvedBOM = calculateAutomaticBOM(cap, topology, {
        dcCableDistanceMeters: currentSurvey?.dc_cable_distance_meters || 20,
        acCableDistanceMeters: currentSurvey?.ac_cable_distance_meters || 10,
      });

      const pricing: PricingResult = calculateQuotationPricing({
        bomTotalCost: bom.hardwareTotalCost,
        capacityKw: cap,
        discount: Number(discountAmount) || 0,
        gstRatePercent: 12,
      });

      const marginPercent = Math.round(((pricing.taxableAmount - bom.hardwareTotalCost) / (pricing.taxableAmount || 1)) * 1000) / 10;

      return { bom, pricing, marginPercent, error: null };
    } catch (err: any) {
      return { bom: null, pricing: null, marginPercent: 0, error: err.message };
    }
  }, [capacityKw, topology, currentSurvey, discountAmount]);

  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentSurvey) {
      toast({
        title: "Survey Gate Blocked",
        description: "You must link an approved site survey before generating a quotation.",
        variant: "error",
      });
      return;
    }

    if (!eligibility.isEligible) {
      toast({
        title: "Survey Gate Enforced",
        description: eligibility.rejectionReason || "Survey is not approved. Quotation cannot be finalized.",
        variant: "error",
      });
      return;
    }

    try {
      const result = generateQuotationPipeline({
        leadId: currentSurvey.lead_id,
        surveyId: currentSurvey.id,
        systemCapacityKw: Number(capacityKw) || 3,
        systemTopology: topology,
        discountAmount: Number(discountAmount) || 0,
        adminOverrideReason: enableOverride ? adminOverrideReason : undefined,
        createdByRole: userRole,
        createdById: "20000000-0000-0000-0000-000000000001",
        createdByName: "Director / Sales Manager",
      });

      loadData();
      setIsGenerateOpen(false);
      setEnableOverride(false);
      setAdminOverrideReason("");

      toast({
        title: "Quotation Generated (9-Step Pipeline)",
        description: `${result.quotation.quotation_number} generated. Contract total: ${formatCurrency(result.quotation.gross_total)}. Stock Status: ${result.inventoryCheck.status}.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Quotation Generation Failed",
        description: err.message,
        variant: "error",
      });
    }
  };

  const handleCreateRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotationToRevise) return;

    try {
      const result = createQuotationRevision({
        quotationId: quotationToRevise.id,
        amendmentReason: amendmentReason.trim(),
        modifiedCapacityKw: Number(revisedCapacityKw) || quotationToRevise.system_capacity_kw,
        modifiedDiscountAmount: Number(revisedDiscount) || quotationToRevise.discount_amount,
        userRole,
        userName: "Sales Manager",
      });

      loadData();
      setIsReviseOpen(false);

      toast({
        title: "Revision Generated",
        description: `Created ${result.quotation.quotation_number} (v${result.quotation.version}). Previous revision archived as REVISED.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Revision Failed",
        description: err.message,
        variant: "error",
      });
    }
  };

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedQuotationForOrder) return;

    try {
      const advancePaid = Number(advancePaymentAmount) || 0;
      const idempotencyKey = `idem-ord-${acceptedQuotationForOrder.id}-${Date.now()}`;

      const { order, initialPayment } = confirmOrderFromQuotation({
        quotationId: acceptedQuotationForOrder.id,
        advancePaymentReference: advancePaymentRef.trim() || undefined,
        advanceAmountPaid: advancePaid,
        paymentMode: "BANK_TRANSFER_NEFT",
        idempotencyKey,
        minAdvancePercent: 20,
        userRole,
        userName: "Sales & Finance Lead",
      });

      loadData();
      setIsConfirmOrderOpen(false);

      toast({
        title: "Order Confirmed & Created",
        description: `Order ${order.order_number} confirmed. Contract total: ${formatCurrency(order.total_contract_value)}. Lead converted!`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Order Confirmation Blocked",
        description: err.message,
        variant: "error",
      });
    }
  };

  const handleSaveRecipeQty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;

    try {
      updateRecipeComponentQuantity(selectedRecipe.id, editRecipeQty, userRole);
      loadData();
      setIsRecipeConfigOpen(false);

      toast({
        title: "Recipe Updated",
        description: `Component quantity for ${selectedRecipe.component_code} adjusted to ${editRecipeQty}.`,
        variant: "info",
      });
    } catch (err: any) {
      toast({
        title: "Recipe Update Forbidden",
        description: err.message,
        variant: "error",
      });
    }
  };

  const columns: Column<Quotation>[] = [
    {
      header: "Quotation #",
      accessorKey: "quotation_number",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground font-mono">{row.quotation_number}</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
              v{row.version}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      header: "System Specs",
      cell: (row) => (
        <div className="text-xs">
          <p className="font-bold text-foreground">{row.system_capacity_kw} kW System</p>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {row.system_topology}
          </span>
        </div>
      ),
    },
    {
      header: "Contract Total (Inc. GST)",
      accessorKey: "gross_total",
      sortable: true,
      cell: (row) => (
        <div className="text-xs">
          <p className="font-bold text-foreground">{formatCurrency(row.gross_total)}</p>
          <p className="text-[10px] text-muted-foreground">GST: {formatCurrency(row.tax_amount)} (12%)</p>
        </div>
      ),
    },
    {
      header: "Net Payable (After Subsidy)",
      accessorKey: "net_payable_by_customer",
      sortable: true,
      cell: (row) => (
        <div className="text-xs">
          <p className="font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(row.net_payable_by_customer)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Subsidy: {formatCurrency(row.estimated_subsidy_amount)}
          </p>
        </div>
      ),
    },
    {
      header: "Inventory Status",
      cell: (row) => (
        <div className="text-xs">
          {row.inventory_availability_status === "FULL_STOCK" ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full font-semibold">
              <PackageCheck className="w-3 h-3 text-emerald-600" /> In Stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full font-semibold">
              <PackageX className="w-3 h-3 text-amber-600" /> Shortage
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      sortable: true,
      cell: (row) => <StatusPill status={row.status} />,
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Customer Portal Link */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-border hover:bg-muted font-medium"
            onClick={() => window.open(`/portal/quotation/${row.id}`, "_blank")}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            Portal
          </Button>

          {/* Revise Quotation (only if not already accepted) */}
          {row.status !== "ACCEPTED" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-border hover:bg-muted font-medium"
              onClick={() => {
                setQuotationToRevise(row);
                setRevisedCapacityKw(String(row.system_capacity_kw));
                setRevisedDiscount(String(row.discount_amount));
                setAmendmentReason("");
                setIsReviseOpen(true);
              }}
            >
              <GitBranch className="w-3.5 h-3.5 mr-1" />
              Revise
            </Button>
          )}

          {/* Confirm Order (only if accepted by customer) */}
          {row.status === "ACCEPTED" && (
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              onClick={() => {
                setAcceptedQuotationForOrder(row);
                const advance20 = Math.round(row.gross_total * 0.2);
                setAdvancePaymentAmount(String(advance20));
                setAdvancePaymentRef(`UTR-${Date.now().toString().slice(-6)}`);
                setIsConfirmOrderOpen(true);
              }}
            >
              <ShoppingCart className="w-3.5 h-3.5 mr-1" />
              Confirm Order
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            Quotations & Recipe BOM Engine
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Deterministic 9-step recipe calculation, stock verification, versioning (v1→v2), and tokenized customer acceptance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* User Role Simulation */}
          <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as UserRole)}
              className="bg-background border border-input rounded text-xs font-semibold px-2 py-0.5 focus:outline-none"
            >
              <option value="DIRECTOR">Director (Full Auth)</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="SALES_MANAGER">Sales Manager</option>
              <option value="SALES_EXECUTIVE">Sales Executive (Restricted)</option>
            </select>
          </div>

          <Button
            variant="outline"
            onClick={() => setIsRecipeConfigOpen(true)}
            className="text-xs h-9 border-border hover:bg-muted font-semibold"
          >
            <SlidersHorizontal className="w-4 h-4 mr-1.5 text-primary" />
            Configure Recipes
          </Button>

          <Button
            onClick={() => setIsGenerateOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Generate Auto BOM Quote
          </Button>
        </div>
      </div>

      {/* Quotations Data Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold">Quotation Register</CardTitle>
          <CardDescription className="text-xs">
            Inspect BOM pricing breakdowns, stock availability, revision history, and customer acceptance states.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={quotations}
            columns={columns}
            searchPlaceholder="Search quotations by number..."
          />
        </CardContent>
      </Card>

      {/* Auto BOM Generator Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Quotation (9-Step Pipeline)</DialogTitle>
            <DialogDescription>
              Select system capacity and topology. BOM recipe engine automatically compiles exact bill of materials.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateQuotation} className="space-y-4 text-xs">
            {/* Site Survey Selector */}
            <div>
              <label className="font-semibold text-foreground block mb-1">Link Site Survey</label>
              <select
                value={selectedSurveyId}
                onChange={(e) => {
                  setSelectedSurveyId(e.target.value);
                  setEnableOverride(false);
                  setAdminOverrideReason("");
                }}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {surveys.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.survey_code} — Status: {srv.status} {srv.feasibility_status ? `(${srv.feasibility_status})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Survey Gate Status Card */}
            {currentSurvey && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  eligibility.gatePassed
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : eligibility.isOverrideApplied
                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                    : "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {eligibility.gatePassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : eligibility.isOverrideApplied ? (
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Lock className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">
                      {eligibility.gatePassed
                        ? "Survey Gate Passed: Survey is Approved"
                        : eligibility.isOverrideApplied
                        ? "Survey Gate: Administrative Override Active"
                        : "Survey Gate Enforced: Survey Not Approved"}
                    </p>
                    <p className="text-[11px] opacity-90">
                      {eligibility.gatePassed
                        ? `Survey ${currentSurvey.survey_code} is officially verified and approved for quotation finalization.`
                        : eligibility.isOverrideApplied
                        ? `Quotation generation permitted under documented administrative override by ${userRole}.`
                        : eligibility.rejectionReason}
                    </p>
                  </div>
                </div>

                {/* Administrative Override Section */}
                {!eligibility.gatePassed && (
                  <div className="mt-3 pt-2.5 border-t border-border/50 space-y-2">
                    {eligibility.isOverrideAllowed ? (
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-[11px]">
                          <input
                            type="checkbox"
                            checked={enableOverride}
                            onChange={(e) => setEnableOverride(e.target.checked)}
                            className="rounded border-input text-primary focus:ring-primary"
                          />
                          <span>Authorize Administrative Survey Gate Override</span>
                        </label>

                        {enableOverride && (
                          <div className="mt-2 space-y-1">
                            <textarea
                              value={adminOverrideReason}
                              onChange={(e) => setAdminOverrideReason(e.target.value)}
                              placeholder="Document official business justification (min. 10 chars)..."
                              rows={2}
                              className="w-full px-2.5 py-1.5 bg-background border border-input rounded text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                            {adminOverrideReason.trim().length > 0 && adminOverrideReason.trim().length < 10 && (
                              <p className="text-[10px] text-red-500 font-semibold">
                                Reason must be at least 10 characters ({adminOverrideReason.trim().length}/10).
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Overriding this gate requires Super Admin or Company Director authorization.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">System Capacity</label>
                <select
                  value={capacityKw}
                  onChange={(e) => setCapacityKw(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="1">1 kW System</option>
                  <option value="2">2 kW System</option>
                  <option value="3">3 kW System</option>
                  <option value="4">4 kW System</option>
                  <option value="5">5 kW System</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Topology</label>
                <select
                  value={topology}
                  onChange={(e) => setTopology(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="ON_GRID">On-Grid (String Inverter)</option>
                  <option value="OFF_GRID">Off-Grid (Inverter + LiFePO4 BESS)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Commercial Discount (₹)</label>
              <Input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="Optional discount amount"
              />
            </div>

            {/* Live BOM Breakdown Box */}
            {livePreview.bom && livePreview.pricing && (
              <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-2">
                <p className="font-bold text-foreground flex items-center justify-between">
                  <span>Deterministic Hardware Recipe</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    BOM Cost: {formatCurrency(livePreview.bom.hardwareTotalCost)}
                  </span>
                </p>

                <div className="space-y-1 text-[11px] text-muted-foreground border-t border-border pt-2">
                  {livePreview.bom.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span>• {item.name} (x{item.quantity} {item.unitOfMeasure})</span>
                      <span className="font-mono font-medium text-foreground">{formatCurrency(item.totalCost)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="font-semibold text-foreground">Projected Gross Total:</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatCurrency(livePreview.pricing.grossTotal)}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsGenerateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!eligibility.isEligible}
                className="bg-primary text-primary-foreground font-semibold disabled:opacity-50"
              >
                Generate Quotation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revise Quotation Dialog */}
      {quotationToRevise && (
        <Dialog open={isReviseOpen} onOpenChange={setIsReviseOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Quotation Revision (v{quotationToRevise.version + 1})</DialogTitle>
              <DialogDescription>
                Amending {quotationToRevise.quotation_number}. Previous version will be archived permanently as REVISED.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateRevision} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Reason for Amendment *</label>
                <textarea
                  required
                  rows={2}
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="E.g., Customer requested higher capacity or adjusted commercial pricing..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Adjusted Capacity (kW)</label>
                  <select
                    value={revisedCapacityKw}
                    onChange={(e) => setRevisedCapacityKw(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs"
                  >
                    <option value="1">1 kW</option>
                    <option value="2">2 kW</option>
                    <option value="3">3 kW</option>
                    <option value="4">4 kW</option>
                    <option value="5">5 kW</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Adjusted Discount (₹)</label>
                  <Input
                    type="number"
                    value={revisedDiscount}
                    onChange={(e) => setRevisedDiscount(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsReviseOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!amendmentReason.trim()}
                  className="bg-primary text-primary-foreground font-semibold"
                >
                  Generate Revision v{quotationToRevise.version + 1}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Order Dialog */}
      {acceptedQuotationForOrder && (
        <Dialog open={isConfirmOrderOpen} onOpenChange={setIsConfirmOrderOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Order from Accepted Quotation</DialogTitle>
              <DialogDescription>
                Convert quotation {acceptedQuotationForOrder.quotation_number} into a binding customer order and freeze pricing.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleConfirmOrder} className="space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 rounded-lg text-emerald-900 dark:text-emerald-200 space-y-1">
                <p className="font-bold">Total Contract Value: {formatCurrency(acceptedQuotationForOrder.gross_total)}</p>
                <p className="text-[11px]">
                  20% Booking Advance Required: <span className="font-bold">{formatCurrency(Math.round(acceptedQuotationForOrder.gross_total * 0.2))}</span>
                </p>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Advance Payment Received (₹)</label>
                <Input
                  type="number"
                  value={advancePaymentAmount}
                  onChange={(e) => setAdvancePaymentAmount(e.target.value)}
                  placeholder="e.g. 40000"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Bank UTR / Transaction Reference</label>
                <Input
                  value={advancePaymentRef}
                  onChange={(e) => setAdvancePaymentRef(e.target.value)}
                  placeholder="e.g. UTR-9876543210"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsConfirmOrderOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  Confirm & Create Order
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Recipe Configuration Modal */}
      <Dialog open={isRecipeConfigOpen} onOpenChange={setIsRecipeConfigOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Product Recipe Configurations (BOM Templates)</DialogTitle>
            <DialogDescription>
              Authorized administrators can configure component quotas based on approved SunPower Solutions engineering standards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
            {recipes.map((rec) => (
              <div key={rec.id} className="p-3 border rounded-lg bg-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{rec.component_name || rec.component_code}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Rule: {rec.quantity_rule} | Default Qty: {rec.default_quantity} {rec.unit_of_measure}
                  </p>
                </div>
                {(userRole === "DIRECTOR" || userRole === "SUPER_ADMIN" || userRole === "SALES_MANAGER") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSelectedRecipe(rec);
                      setEditRecipeQty(rec.default_quantity);
                    }}
                  >
                    Edit Qty
                  </Button>
                )}
              </div>
            ))}
          </div>

          {selectedRecipe && (
            <form onSubmit={handleSaveRecipeQty} className="p-3 bg-muted/50 rounded-lg border space-y-2 mt-2 text-xs">
              <p className="font-bold text-foreground">Editing: {selectedRecipe.component_name}</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={editRecipeQty}
                  onChange={(e) => setEditRecipeQty(Number(e.target.value))}
                  className="w-32"
                />
                <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-semibold">
                  Save Recipe Quota
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedRecipe(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <DialogFooter>
            <Button type="button" onClick={() => setIsRecipeConfigOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
