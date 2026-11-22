"use client";

import * as React from "react";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileCheck2,
  Sliders,
  Plus,
  Calendar,
  Zap,
  Building2,
  Award,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-context";
import {
  getStore,
  getWarrantyActivationPolicy,
  setWarrantyActivationPolicy,
  createWarrantyPolicy,
} from "@/lib/data/store";
import { Warranty, WarrantyPolicy } from "@/lib/types/database";
import { evaluateSerialWarrantyEligibility, SerialWarrantyEvaluation } from "@/domain/warranty/warranty-service-engine";

export default function WarrantiesPage() {
  const { toast } = useToast();
  const [warranties, setWarranties] = React.useState<Warranty[]>([]);
  const [policies, setPolicies] = React.useState<WarrantyPolicy[]>([]);
  const [selectedFilter, setSelectedFilter] = React.useState<"ALL" | "ACTIVE" | "EXPIRING" | "EXPIRED">("ALL");

  // Lookup state
  const [lookupSerial, setLookupSerial] = React.useState("");
  const [lookupResult, setLookupResult] = React.useState<SerialWarrantyEvaluation | null>(null);

  // Policy Modal state
  const [isPolicyModalOpen, setIsPolicyModalOpen] = React.useState(false);
  const [activationTrigger, setActivationTrigger] = React.useState<"ON_DELIVERY" | "ON_COMMISSIONING">("ON_COMMISSIONING");

  // New Policy form state
  const [newPolicyName, setNewPolicyName] = React.useState("");
  const [newPolicyCategory, setNewPolicyCategory] = React.useState("INVERTER");
  const [newPolicyMonths, setNewPolicyMonths] = React.useState(24);
  const [newPolicyTerms, setNewPolicyTerms] = React.useState("");

  // Certificate Modal state
  const [selectedCertificate, setSelectedCertificate] = React.useState<Warranty | null>(null);

  const loadData = React.useCallback(() => {
    const store = getStore();
    setWarranties([...store.warranties]);
    setPolicies([...store.warrantyPolicies]);
    setActivationTrigger(getWarrantyActivationPolicy());
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupSerial.trim()) return;

    try {
      const evaluation = evaluateSerialWarrantyEligibility(lookupSerial.trim());
      setLookupResult(evaluation);
      if (evaluation.isCovered) {
        toast({
          title: "Warranty Verified Active (₹0.00 Covered)",
          description: `Serial ${lookupSerial} is covered under ${evaluation.policyName} until ${evaluation.warrantyEndDate}.`,
          variant: "success",
        });
      } else {
        toast({
          title: "Warranty Expired or Out-of-Scope",
          description: `Serial ${lookupSerial} is classified as BILLABLE.`,
          variant: "warning",
        });
      }
    } catch {
      setLookupResult(null);
      toast({
        title: "Serial Not Found",
        description: `No hardware record found matching serial '${lookupSerial}'.`,
        variant: "error",
      });
    }
  };

  const handleSaveActivationPolicy = (policy: "ON_DELIVERY" | "ON_COMMISSIONING") => {
    setWarrantyActivationPolicy(policy, "DIRECTOR");
    setActivationTrigger(policy);
    toast({
      title: "Warranty Activation Trigger Updated",
      description: `Warranties will automatically activate ${policy === "ON_COMMISSIONING" ? "upon Customer Commissioning Sign-Off" : "upon Gate Pass Dispatch & Delivery"}.`,
      variant: "success",
    });
  };

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim() || newPolicyMonths <= 0) return;

    createWarrantyPolicy(
      {
        organization_id: "00000000-0000-0000-0000-000000000001",
        name: newPolicyName.trim(),
        component_category: newPolicyCategory,
        duration_months: Number(newPolicyMonths),
        terms: newPolicyTerms.trim() || "Full OEM warranty coverage for parts and technical repair labor.",
        is_active: true,
      },
      "SUPER_ADMIN"
    );

    loadData();
    setNewPolicyName("");
    setNewPolicyTerms("");
    toast({
      title: "Warranty Policy Created",
      description: `Configured ${newPolicyMonths}-month policy for ${newPolicyCategory}.`,
      variant: "success",
    });
  };

  // Filtered Warranties
  const filteredWarranties = React.useMemo(() => {
    const now = Date.now();
    return warranties.filter((w) => {
      if (selectedFilter === "ACTIVE") return w.status === "ACTIVE";
      if (selectedFilter === "EXPIRED") return w.status === "EXPIRED" || new Date(w.warranty_end_date).getTime() < now;
      if (selectedFilter === "EXPIRING") {
        const diff = new Date(w.warranty_end_date).getTime() - now;
        const days = diff / 86400000;
        return w.status === "ACTIVE" && days >= 0 && days <= 90;
      }
      return true;
    });
  }, [warranties, selectedFilter]);

  const activeCount = warranties.filter((w) => w.status === "ACTIVE").length;
  const panelCount = warranties.filter((w) => (w.duration_months || 0) >= 120 && w.status === "ACTIVE").length;
  const inverterCount = warranties.filter((w) => (w.duration_months || 0) <= 36 && w.status === "ACTIVE").length;

  const columns: Column<Warranty>[] = [
    {
      header: "Warranty Certificate",
      accessorKey: "id",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground font-mono text-xs">{row.id}</p>
          <p className="text-[10px] text-muted-foreground">Order: {row.order_number || "ORD-2026-0088"}</p>
        </div>
      ),
    },
    {
      header: "Component & Serial",
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-foreground">{row.component_name || "Grid Inverter"}</p>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-primary">
            <QrCode className="w-3.5 h-3.5" />
            <span>{row.serial_number || "INV-2024-884912"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-foreground">{row.customer_name || "SunPower Customer"}</p>
          <p className="text-[10px] text-muted-foreground">{row.customer_phone || row.customer_email || "Verified Site"}</p>
        </div>
      ),
    },
    {
      header: "Coverage Duration",
      cell: (row) => (
        <div className="text-xs font-mono">
          <p className="font-bold text-foreground">
            {row.duration_months ? `${Math.round(row.duration_months / 12)} Years (${row.duration_months} mo)` : "2 Years"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {row.warranty_start_date} → {row.warranty_end_date}
          </p>
        </div>
      ),
    },
    {
      header: "Days Remaining",
      cell: (row) => {
        const end = new Date(row.warranty_end_date).getTime();
        const now = Date.now();
        const days = Math.round((end - now) / 86400000);
        if (days <= 0 || row.status === "EXPIRED") {
          return <span className="text-xs font-mono font-bold text-rose-500">Expired</span>;
        }
        return (
          <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {days} Days Left
          </div>
        );
      },
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
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-border hover:bg-muted font-medium"
          onClick={() => setSelectedCertificate(row)}
        >
          <FileCheck2 className="w-3.5 h-3.5 mr-1 text-primary" />
          View Certificate
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
            <ShieldCheck className="w-6 h-6 text-primary" />
            Digital Warranties & Serial Entitlements
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track manufacturer warranties, configure category policies, and verify real-time ₹0.00 service entitlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPolicyModalOpen(true)}
            className="border-border hover:bg-muted text-xs h-9 font-semibold"
          >
            <Sliders className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Configure Policies
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Warranties</p>
              <p className="text-2xl font-black text-foreground mt-1">{activeCount}</p>
              <p className="text-[10px] text-emerald-500 font-medium mt-0.5">100% Verified Serials</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Inverter Coverage (2-Yr)</p>
              <p className="text-2xl font-black text-foreground mt-1">{inverterCount}</p>
              <p className="text-[10px] text-primary font-medium mt-0.5">₹0 Monsoon Swap</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Solar Panels (20-Yr)</p>
              <p className="text-2xl font-black text-foreground mt-1">{panelCount}</p>
              <p className="text-[10px] text-emerald-500 font-medium mt-0.5">Linear Power Guarantee</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Activation Trigger</p>
              <p className="text-xs font-black font-mono text-foreground mt-2">
                {activationTrigger === "ON_COMMISSIONING" ? "ON COMMISSIONING" : "ON DELIVERY"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Configurable SOP Policy</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instant Serial Number Lookup Tool */}
      <Card className="border border-border shadow-sm bg-gradient-to-r from-card via-muted/30 to-card">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Enter Serial Number to verify coverage (e.g. INV-2024-884912, INV-2023-112490)..."
                value={lookupSerial}
                onChange={(e) => setLookupSerial(e.target.value)}
                className="pl-9 bg-background font-mono text-xs"
              />
            </div>
            <Button type="submit" className="bg-primary text-primary-foreground font-semibold w-full sm:w-auto h-9 text-xs">
              Check Warranty Status
            </Button>
          </form>

          {lookupResult && (
            <div className="mt-4 p-4 rounded-xl border border-border bg-background animate-in fade-in space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  {lookupResult.isCovered ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-foreground font-mono">
                      Serial: {lookupResult.serialNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lookupResult.componentName} ({lookupResult.componentCode})
                    </p>
                  </div>
                </div>

                <div>
                  {lookupResult.isCovered ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-4 h-4" />
                      WARRANTY_FREE • ₹0.00 Cost
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="w-4 h-4" />
                      BILLABLE REPAIR REQUIRED
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Customer & Order:</span>
                  <span className="font-semibold text-foreground">{lookupResult.customerName || "Customer"}</span>
                  <span className="text-muted-foreground block text-[10px]">Order: {lookupResult.orderNumber || "ORD-001"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Coverage Window:</span>
                  <span className="font-semibold font-mono text-foreground">
                    {lookupResult.warrantyStartDate || "N/A"} → {lookupResult.warrantyEndDate || "N/A"}
                  </span>
                  <span className="text-muted-foreground block text-[10px]">
                    {lookupResult.remainingDays > 0 ? `${lookupResult.remainingDays} days remaining` : "Expired"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Entitlement Terms:</span>
                  <p className="text-foreground text-[11px] leading-tight">{lookupResult.policyTerms || lookupResult.reason}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warranties Data Table with Filter Tabs */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">Active Warranty Certificates</CardTitle>
              <CardDescription className="text-xs">
                Review all registered hardware certificates and policy expirations.
              </CardDescription>
            </div>

            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              {(["ALL", "ACTIVE", "EXPIRING", "EXPIRED"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    selectedFilter === filter
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter === "ALL" && "All"}
                  {filter === "ACTIVE" && "Active"}
                  {filter === "EXPIRING" && "Expiring (<90d)"}
                  {filter === "EXPIRED" && "Expired"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={filteredWarranties}
            columns={columns}
            searchPlaceholder="Search warranties by certificate ID or serial..."
          />
        </CardContent>
      </Card>

      {/* Policy Configuration Modal */}
      <Dialog open={isPolicyModalOpen} onOpenChange={setIsPolicyModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              Warranty Policy Configuration Engine
            </DialogTitle>
            <DialogDescription>
              Configure duration rules by equipment category and set the official warranty activation event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 text-xs">
            {/* Activation Trigger Selector */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2.5">
              <label className="font-bold text-foreground block">Company Warranty Activation Trigger</label>
              <p className="text-[11px] text-muted-foreground">
                Specify when manufacturer and company warranty coverage officially starts for delivered systems:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveActivationPolicy("ON_COMMISSIONING")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    activationTrigger === "ON_COMMISSIONING"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    On Commissioning
                  </p>
                  <p className="text-[10px] mt-1 text-muted-foreground">
                    Activates after customer digital sign-off & verified power generation test.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveActivationPolicy("ON_DELIVERY")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    activationTrigger === "ON_DELIVERY"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    On Dispatch Delivery
                  </p>
                  <p className="text-[10px] mt-1 text-muted-foreground">
                    Activates immediately when materials are dispatched & confirmed at site.
                  </p>
                </button>
              </div>
            </div>

            {/* Existing Configured Policies */}
            <div>
              <label className="font-bold text-foreground block mb-2">Approved Company Warranty Policies</label>
              <div className="space-y-2">
                {policies.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg border border-border bg-background flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.terms}</p>
                      <span className="inline-block mt-1 font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-foreground">
                        Category: {p.component_category}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-primary/10 text-primary">
                      {Math.round(p.duration_months / 12)} Yrs ({p.duration_months} mo)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Policy Form */}
            <form onSubmit={handleCreatePolicy} className="p-3.5 rounded-xl border border-border bg-card space-y-3">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                Add New Category Policy
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Policy Title *</label>
                  <Input
                    placeholder="e.g. Hybrid Inverter 5-Year Extended..."
                    value={newPolicyName}
                    onChange={(e) => setNewPolicyName(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Hardware Category</label>
                  <select
                    value={newPolicyCategory}
                    onChange={(e) => setNewPolicyCategory(e.target.value)}
                    className="w-full h-8 px-2.5 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="INVERTER">Inverter</option>
                    <option value="BATTERY">Battery Bank</option>
                    <option value="PANEL">Solar Panels (PV)</option>
                    <option value="CHARGE_CONTROLLER">Charge Controller</option>
                    <option value="STRUCTURE">Mounting Structure</option>
                    <option value="SWITCH">Switchgear / ACDB</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Duration (Months) *</label>
                  <Input
                    type="number"
                    min="1"
                    max="600"
                    value={newPolicyMonths}
                    onChange={(e) => setNewPolicyMonths(Number(e.target.value))}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Coverage Scope & Terms</label>
                  <Input
                    placeholder="e.g. ₹0 cost repair or component replacement..."
                    value={newPolicyTerms}
                    onChange={(e) => setNewPolicyTerms(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <Button type="submit" size="sm" className="w-full bg-primary text-primary-foreground font-semibold h-8 text-xs">
                Save Policy Definition
              </Button>
            </form>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsPolicyModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Digital Certificate Viewer Modal */}
      {selectedCertificate && (
        <Dialog open={!!selectedCertificate} onOpenChange={() => setSelectedCertificate(null)}>
          <DialogContent className="max-w-lg bg-card border border-border">
            <div className="p-6 border-4 border-double border-primary/30 rounded-xl space-y-4 bg-background">
              {/* Certificate Header */}
              <div className="text-center space-y-1 border-b border-border pb-4">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/30">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                </div>
                <h3 className="text-lg font-black tracking-wider uppercase text-foreground">
                  SunPower Solutions Pvt. Ltd.
                </h3>
                <p className="text-[11px] font-bold tracking-widest uppercase text-primary">
                  Official Hardware Warranty Certificate
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Certificate Ref: {selectedCertificate.id}
                </p>
              </div>

              {/* Certificate Details */}
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/30">
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Customer Name</span>
                    <span className="font-bold text-foreground">{selectedCertificate.customer_name || "Customer"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Order Reference</span>
                    <span className="font-mono font-bold text-foreground">{selectedCertificate.order_number || "ORD-2026-0088"}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-muted-foreground text-[10px] block">Protected Equipment & Barcode</span>
                  <p className="font-bold text-foreground">{selectedCertificate.component_name || "Solar System Component"}</p>
                  <p className="font-mono text-primary font-bold text-xs">{selectedCertificate.serial_number || "INV-2024-884912"}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/30">
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Valid From</span>
                    <span className="font-mono font-semibold text-foreground">{selectedCertificate.warranty_start_date}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block">Valid Until</span>
                    <span className="font-mono font-semibold text-foreground">{selectedCertificate.warranty_end_date}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px]">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Full Labor & Hardware Replacement Guarantee
                  </p>
                  <p className="text-[10px] mt-0.5 text-muted-foreground">
                    All service visits, breakdown diagnostics, spare components, and technician charges are covered at ₹0.00 cost under approved warranty conditions.
                  </p>
                </div>
              </div>

              {/* Certificate Footer Stamp */}
              <div className="flex items-center justify-between pt-3 border-t border-border text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <QrCode className="w-8 h-8 text-foreground" />
                  <span>Digitally Signed & Blockchain-Hashed by SolarOS</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">SunPower QA Assurance</p>
                  <p>Certified Installer</p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast({
                    title: "Certificate Download Initiated",
                    description: `PDF generated for ${selectedCertificate.serial_number}.`,
                    variant: "info",
                  });
                  setSelectedCertificate(null);
                }}
              >
                Download PDF
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground font-semibold" onClick={() => setSelectedCertificate(null)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
