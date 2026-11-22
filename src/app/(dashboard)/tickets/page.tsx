"use client";

import * as React from "react";
import {
  LifeBuoy,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  DollarSign,
  QrCode,
  FileCheck2,
  User,
  ArrowRight,
  RefreshCw,
  Lock,
  Star,
  FileText,
  Truck,
  Activity,
  History,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-context";
import { getStore } from "@/lib/data/store";
import { ServiceTicket, ServiceTicketUpdate, TicketStatus, SerialNumber } from "@/lib/types/database";
import {
  evaluateSerialWarrantyEligibility,
  submitServiceComplaint,
  assignServiceTicket,
  startServiceTicket,
  requestPartsForTicket,
  createRepairEstimate,
  approveRepairEstimate,
  generateServiceInvoice,
  executeWarrantyReplacement,
  resolveServiceTicket,
  closeServiceTicket,
  SerialWarrantyEvaluation,
} from "@/domain/warranty/warranty-service-engine";

export default function TicketsPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = React.useState<ServiceTicket[]>([]);
  const [ticketUpdates, setTicketUpdates] = React.useState<ServiceTicketUpdate[]>([]);
  const [activeTab, setActiveTab] = React.useState<string>("ALL");

  // Log Ticket Dialog
  const [isLogOpen, setIsLogOpen] = React.useState(false);
  const [serialInput, setSerialInput] = React.useState("INV-2024-884912");
  const [serialEval, setSerialEval] = React.useState<SerialWarrantyEvaluation | null>(null);
  const [faultCode, setFaultCode] = React.useState("E04");
  const [priority, setPriority] = React.useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [symptom, setSymptom] = React.useState(
    "Heavy monsoon thunderstorm tripped the system. Inverter is reporting grid overvoltage E04 with zero power generation."
  );
  const [assignTechId, setAssignTechId] = React.useState<string>("");

  // Manage / Detail Drawer
  const [selectedTicket, setSelectedTicket] = React.useState<ServiceTicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  // Sub-actions in Detail Drawer
  const [resolutionNotes, setResolutionNotes] = React.useState("");
  const [estimateParts, setEstimateParts] = React.useState(4500);
  const [estimateLabor, setEstimateLabor] = React.useState(1500);
  const [estimatePartsList, setEstimatePartsList] = React.useState("Replacement AC Circuit Breaker & Contactor");
  const [selectedReplacementSerial, setSelectedReplacementSerial] = React.useState("");
  const [replacementNotes, setReplacementNotes] = React.useState("Swapped defective unit under manufacturer warranty.");

  // Closing Gate State
  const [customerConfirmedClose, setCustomerConfirmedClose] = React.useState(true);
  const [feedbackRating, setFeedbackRating] = React.useState(5);
  const [feedbackComments, setFeedbackComments] = React.useState("Issue resolved quickly, system generating 3.1 kW.");
  const [adminOverrideReason, setAdminOverrideReason] = React.useState("");
  const [useAdminOverride, setUseAdminOverride] = React.useState(false);

  const loadData = React.useCallback(() => {
    const store = getStore();
    setTickets([...store.serviceTickets]);
    setTicketUpdates([...store.serviceTicketUpdates]);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time serial number check for New Ticket form
  React.useEffect(() => {
    if (!serialInput.trim()) {
      setSerialEval(null);
      return;
    }
    try {
      const evaluation = evaluateSerialWarrantyEligibility(serialInput.trim());
      setSerialEval(evaluation);
    } catch {
      setSerialEval(null);
    }
  }, [serialInput]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialInput.trim() || !symptom.trim()) return;

    try {
      const result = submitServiceComplaint({
        serialNumber: serialInput.trim(),
        reportedFaultCode: faultCode,
        symptomDescription: symptom,
        priority,
        assignedTechnicianId: assignTechId || undefined,
        userRole: "OPERATIONS_MANAGER",
        userId: "ops-manager",
      });

      loadData();
      setIsLogOpen(false);

      toast({
        title: "Service Breakdown Ticket Logged",
        description: `${result.ticket.ticket_number} created! Warranty classified as ${result.ticket.billing_classification} (₹${result.eligibility.customerPayableAmount.toFixed(2)} cost).`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create service ticket.";
      toast({
        title: "Service Request Error",
        description: msg,
        variant: "error",
      });
    }
  };

  // State Transition Handlers
  const handleAssign = (ticketId: string, techId: string) => {
    try {
      assignServiceTicket(ticketId, {
        technicianId: techId,
        userRole: "OPERATIONS_MANAGER",
        userId: "ops-mgr",
      });
      loadData();
      refreshSelected(ticketId);
      toast({ title: "Technician Assigned", description: "Service ticket updated to ASSIGNED status.", variant: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error assigning technician";
      toast({ title: "Action Failed", description: msg, variant: "error" });
    }
  };

  const handleStartWork = (ticketId: string) => {
    try {
      startServiceTicket(ticketId, { userRole: "FIELD_TECHNICIAN", userId: "tech-1" });
      loadData();
      refreshSelected(ticketId);
      toast({ title: "Diagnostic Started", description: "Service ticket moved to IN_PROGRESS status.", variant: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error starting work";
      toast({ title: "Action Failed", description: msg, variant: "error" });
    }
  };

  const handleRequestParts = (ticketId: string) => {
    const parts = prompt("Enter description of required spare parts from warehouse:", "DC Isolator Switch 32A 1000V");
    if (!parts) return;
    try {
      requestPartsForTicket(ticketId, { requiredParts: parts, userRole: "FIELD_TECHNICIAN" });
      loadData();
      refreshSelected(ticketId);
      toast({ title: "Spare Parts Requisitioned", description: "Status updated to AWAITING_PARTS.", variant: "warning" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error requesting parts";
      toast({ title: "Action Failed", description: msg, variant: "error" });
    }
  };

  const handleCreateEstimate = (ticketId: string) => {
    try {
      createRepairEstimate(ticketId, {
        partsCost: Number(estimateParts),
        laborCost: Number(estimateLabor),
        partsList: estimatePartsList,
        userRole: "OPERATIONS_MANAGER",
      });
      loadData();
      refreshSelected(ticketId);
      toast({
        title: "Repair Estimate Created",
        description: `Estimate of ₹${(Number(estimateParts) + Number(estimateLabor)).toFixed(2)} generated. Customer approval required.`,
        variant: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Estimate error";
      toast({ title: "Error Creating Estimate", description: msg, variant: "error" });
    }
  };

  const handleApproveEstimate = (ticketId: string, approved: boolean) => {
    try {
      approveRepairEstimate(ticketId, { approvedByCustomer: approved, userRole: "OPERATIONS_MANAGER" });
      loadData();
      refreshSelected(ticketId);
      toast({
        title: approved ? "Estimate Approved by Customer" : "Estimate Rejected",
        description: approved ? "Technician is now authorized to execute repair." : "Customer declined repair quote.",
        variant: approved ? "success" : "warning",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval error";
      toast({ title: "Action Failed", description: msg, variant: "error" });
    }
  };

  const handleGenerateInvoice = (ticketId: string) => {
    try {
      const inv = generateServiceInvoice(ticketId, { dueDateDays: 7 });
      loadData();
      refreshSelected(ticketId);
      toast({
        title: "Service Invoice Issued",
        description: `${inv.invoice_number} created for ₹${inv.total_amount.toFixed(2)}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invoice creation failed";
      toast({ title: "Cannot Issue Invoice", description: msg, variant: "error" });
    }
  };

  const handleExecuteRMA = (ticketId: string) => {
    if (!selectedTicket || !selectedReplacementSerial) {
      toast({ title: "Selection Missing", description: "Please select an available warehouse serial unit.", variant: "warning" });
      return;
    }
    try {
      executeWarrantyReplacement(ticketId, {
        oldSerialNumber: selectedTicket.serial_number || "",
        newSerialNumber: selectedReplacementSerial,
        technicianId: selectedTicket.assigned_technician_id || "tech-1",
        notes: replacementNotes,
        userRole: "FIELD_TECHNICIAN",
      });
      loadData();
      refreshSelected(ticketId);
      toast({
        title: "RMA Warranty Replacement Successful",
        description: `Defective unit marked REPLACED. Unit ${selectedReplacementSerial} INSTALLED and remaining warranty transferred!`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "RMA replacement failed";
      toast({ title: "RMA Error", description: msg, variant: "error" });
    }
  };

  const handleResolve = (ticketId: string) => {
    if (!resolutionNotes.trim()) {
      toast({ title: "Notes Required", description: "Please enter detailed technician resolution notes.", variant: "warning" });
      return;
    }
    try {
      resolveServiceTicket(ticketId, {
        resolutionNotes,
        technicianId: selectedTicket?.assigned_technician_id || "tech-1",
        userRole: "FIELD_TECHNICIAN",
      });
      loadData();
      refreshSelected(ticketId);
      toast({
        title: "Technical Resolution Recorded",
        description: "Ticket moved to Customer Confirmation Pending.",
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Resolution error";
      toast({ title: "Resolution Failed", description: msg, variant: "error" });
    }
  };

  const handleClose = (ticketId: string) => {
    try {
      closeServiceTicket(ticketId, {
        customerConfirmed: !useAdminOverride ? customerConfirmedClose : false,
        customerFeedbackRating: !useAdminOverride ? feedbackRating : undefined,
        customerFeedbackComments: !useAdminOverride ? feedbackComments : undefined,
        adminOverrideReason: useAdminOverride ? adminOverrideReason : undefined,
        userRole: useAdminOverride ? "DIRECTOR" : "OPERATIONS_MANAGER",
        userId: useAdminOverride ? "director-01" : "cust-confirm",
      });
      loadData();
      setIsDetailOpen(false);
      setSelectedTicket(null);
      toast({
        title: "Service Ticket Permanently Closed",
        description: "Closing condition verified and permanent audit history recorded.",
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Closing condition violation";
      toast({
        title: "Cannot Close Ticket",
        description: msg,
        variant: "error",
      });
    }
  };

  const refreshSelected = (ticketId: string) => {
    const store = getStore();
    const t = store.serviceTickets.find((item) => item.id === ticketId);
    if (t) setSelectedTicket({ ...t });
  };

  // Available IN_STOCK serials for RMA replacement
  const availableInStockSerials = React.useMemo(() => {
    const store = getStore();
    return store.serialNumbers.filter((s) => s.status === "IN_STOCK");
  }, []);

  const store = getStore();
  const techniciansList = store.technicians;

  // Filtered Tickets
  const filteredTickets = React.useMemo(() => {
    return tickets.filter((t) => {
      if (activeTab === "ALL") return true;
      if (activeTab === "OPEN") return t.status === "OPEN" || t.status === "LOGGED";
      if (activeTab === "ASSIGNED") return t.status === "ASSIGNED";
      if (activeTab === "IN_PROGRESS") return t.status === "IN_PROGRESS" || t.status === "TECHNICIAN_VISITED";
      if (activeTab === "AWAITING_PARTS") return t.status === "AWAITING_PARTS" || t.status === "PARTS_PENDING";
      if (activeTab === "RESOLVED") return t.status === "RESOLVED";
      if (activeTab === "CONFIRMATION_PENDING") return t.status === "CUSTOMER_CONFIRMATION_PENDING";
      if (activeTab === "CLOSED") return t.status === "CLOSED";
      return true;
    });
  }, [tickets, activeTab]);

  const openCount = tickets.filter((t) => ["OPEN", "ASSIGNED", "IN_PROGRESS", "AWAITING_PARTS", "LOGGED", "PARTS_PENDING"].includes(t.status)).length;
  const warrantyFreeCount = tickets.filter((t) => t.billing_classification === "WARRANTY_FREE" && t.status !== "CLOSED").length;
  const billableCount = tickets.filter((t) => t.billing_classification === "BILLABLE" && t.status !== "CLOSED").length;
  const pendingConfirmCount = tickets.filter((t) => t.status === "CUSTOMER_CONFIRMATION_PENDING" || t.status === "RESOLVED").length;

  const columns: Column<ServiceTicket>[] = [
    {
      header: "Ticket #",
      accessorKey: "ticket_number",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground font-mono text-xs">{row.ticket_number}</p>
          <p className="text-[10px] text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      header: "Hardware & Serial",
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-foreground">{row.component_name || "Solar Inverter"}</p>
          <div className="flex items-center gap-1 font-mono text-[11px] text-primary">
            <QrCode className="w-3.5 h-3.5" />
            <span>{row.serial_number || "INV-SERIAL"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Fault Code & Symptom",
      cell: (row) => (
        <div className="text-xs space-y-1 max-w-xs">
          <span className="font-mono font-bold px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-500 border border-red-500/20">
            Fault: {row.reported_fault_code || "GEN_FAULT"}
          </span>
          <p className="text-muted-foreground truncate text-[11px]">{row.symptom_description}</p>
        </div>
      ),
    },
    {
      header: "Warranty Entitlement",
      cell: (row) => (
        <div>
          {row.billing_classification === "WARRANTY_FREE" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              ₹0.00 Covered
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <DollarSign className="w-3.5 h-3.5" />
              Billable Service
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Technician",
      cell: (row) => {
        const tech = techniciansList.find((t) => t.profile_id === row.assigned_technician_id);
        return (
          <div className="text-xs">
            <p className="font-medium text-foreground">{tech ? tech.name : "Unassigned"}</p>
            <p className="text-[10px] text-muted-foreground">{tech ? tech.phone : "Requires Dispatch"}</p>
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
      header: "Action",
      cell: (row) => (
        <Button
          size="sm"
          className="h-7 text-xs bg-primary text-primary-foreground font-semibold"
          onClick={() => {
            setSelectedTicket(row);
            setResolutionNotes(row.resolution_notes || "");
            setIsDetailOpen(true);
          }}
        >
          Manage Ticket
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
            <LifeBuoy className="w-6 h-6 text-primary" />
            Service Breakdown Tickets & Support Operations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Log monsoon breakdown fault codes, verify ₹0 warranty entitlements, execute RMA replacements, and manage repair history.
          </p>
        </div>

        <Button
          onClick={() => setIsLogOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Log Service Ticket
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Open Tickets</p>
              <p className="text-2xl font-black text-foreground mt-1">{openCount}</p>
              <p className="text-[10px] text-amber-500 font-medium mt-0.5">Assigned & In Progress</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">₹0 Warranty Free</p>
              <p className="text-2xl font-black text-foreground mt-1">{warrantyFreeCount}</p>
              <p className="text-[10px] text-emerald-500 font-medium mt-0.5">Monsoon Surge Covered</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Billable Repairs</p>
              <p className="text-2xl font-black text-foreground mt-1">{billableCount}</p>
              <p className="text-[10px] text-primary font-medium mt-0.5">Requires Estimate Approval</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Closing Sign-Off Pending</p>
              <p className="text-2xl font-black text-foreground mt-1">{pendingConfirmCount}</p>
              <p className="text-[10px] text-purple-500 font-medium mt-0.5">Awaiting Customer Confirmation</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Ticket Register */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">Service Tickets Register</CardTitle>
              <CardDescription className="text-xs">
                Manage breakdown lifecycles across the 7 formal states.
              </CardDescription>
            </div>

            {/* 7 Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg overflow-x-auto max-w-full">
              {[
                { key: "ALL", label: "All" },
                { key: "OPEN", label: "Open" },
                { key: "ASSIGNED", label: "Assigned" },
                { key: "IN_PROGRESS", label: "In Progress" },
                { key: "AWAITING_PARTS", label: "Awaiting Parts" },
                { key: "CONFIRMATION_PENDING", label: "Sign-Off Pending" },
                { key: "CLOSED", label: "Closed" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                    activeTab === tab.key
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
            data={filteredTickets}
            columns={columns}
            searchPlaceholder="Search tickets by ticket number, serial, or customer..."
          />
        </CardContent>
      </Card>

      {/* Log Service Ticket Dialog */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-primary" />
              Log Customer Breakdown Ticket
            </DialogTitle>
            <DialogDescription>
              Record customer breakdown call, verify hardware serial number, and auto-evaluate ₹0 warranty coverage.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
            {/* Serial Number & Real-time Verification */}
            <div>
              <label className="font-semibold text-foreground block mb-1">Equipment Serial Number *</label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Enter equipment serial (e.g. INV-2024-884912, INV-2023-112490)..."
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  className="pl-9 font-mono text-xs bg-background"
                  required
                />
              </div>

              {serialEval ? (
                <div className="mt-2 p-2.5 rounded-lg border border-border bg-muted/40 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{serialEval.componentName}</p>
                    <p className="text-[10px] text-muted-foreground">Customer: {serialEval.customerName}</p>
                  </div>
                  <div>
                    {serialEval.isCovered ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        ₹0.00 Warranty Free ({serialEval.remainingDays}d left)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Billable Repair Required
                      </span>
                    )}
                  </div>
                </div>
              ) : serialInput.trim() ? (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">
                  Serial number not found in hardware register. Please verify barcode.
                </p>
              ) : null}
            </div>

            {/* Fault Code & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Reported Inverter Fault Code *</label>
                <select
                  value={faultCode}
                  onChange={(e) => setFaultCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="E04">E04 - Grid Overvoltage / Monsoon Surge</option>
                  <option value="E01">E01 - DC Ground Fault / Insulation Breakdown</option>
                  <option value="E08">E08 - Inverter Overtemperature</option>
                  <option value="F02">F02 - AC Frequency Out of Range</option>
                  <option value="BAT_UV">BAT_UV - Battery Under-Voltage / BMS Lock</option>
                  <option value="PV_LOSS">PV_LOSS - Array Output Loss / Microcrack</option>
                  <option value="INFO_MAINT">Routine Preventive Maintenance</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Urgency Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="CRITICAL">Critical (Total Power Loss)</option>
                  <option value="HIGH">High (Monsoon Storm Surge)</option>
                  <option value="MEDIUM">Medium (Degraded Output)</option>
                  <option value="LOW">Low (Routine Checkup)</option>
                </select>
              </div>
            </div>

            {/* Symptom Description */}
            <div>
              <label className="font-semibold text-foreground block mb-1">Customer Reported Breakdown Symptom *</label>
              <textarea
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            {/* Technician Assignment */}
            <div>
              <label className="font-semibold text-foreground block mb-1">Assign Emergency Technician (Optional)</label>
              <select
                value={assignTechId}
                onChange={(e) => setAssignTechId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Leave Unassigned (Dispatch Later)</option>
                {techniciansList.map((t) => (
                  <option key={t.id} value={t.profile_id}>
                    {t.name} ({t.phone}) - {t.skills.slice(0, 2).join(", ")}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsLogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-primary text-primary-foreground font-semibold"
                disabled={!serialEval}
              >
                Submit & Dispatch Tech
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail, Action & Closing Gate Drawer Modal */}
      {selectedTicket && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-primary" />
                  <DialogTitle className="text-base font-bold">
                    {selectedTicket.ticket_number}
                  </DialogTitle>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={selectedTicket.status} />
                  {selectedTicket.billing_classification === "WARRANTY_FREE" ? (
                    <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ₹0.00 Warranty Free
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Billable Repair
                    </span>
                  )}
                </div>
              </div>
              <DialogDescription className="text-xs">
                Fault: {selectedTicket.reported_fault_code} • {selectedTicket.component_name} ({selectedTicket.serial_number})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Customer & Breakdown Summary */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-muted/30">
                <div>
                  <span className="text-muted-foreground text-[10px] block">Customer</span>
                  <span className="font-bold text-foreground">{selectedTicket.customer_name}</span>
                  <span className="text-[10px] text-muted-foreground block">{selectedTicket.customer_phone || selectedTicket.customer_email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Equipment Serial Barcode</span>
                  <span className="font-mono font-bold text-primary">{selectedTicket.serial_number}</span>
                  <span className="text-[10px] text-muted-foreground block">Priority: {selectedTicket.priority}</span>
                </div>
                <div className="col-span-2 border-t border-border/60 pt-2">
                  <span className="text-muted-foreground text-[10px] block font-semibold">Reported Breakdown:</span>
                  <p className="text-foreground mt-0.5">{selectedTicket.symptom_description}</p>
                </div>
              </div>

              {/* Dynamic State Actions Panel */}
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-primary" />
                  Lifecycle State Operations (Current: {selectedTicket.status.replace(/_/g, " ")})
                </p>

                {/* State 1: OPEN -> Assign */}
                {(selectedTicket.status === "OPEN" || selectedTicket.status === "LOGGED") && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground">Assign an experienced repair technician to respond on-site:</p>
                    <div className="flex items-center gap-2">
                      <select
                        defaultValue={techniciansList[0]?.profile_id}
                        id="assignTechSelect"
                        className="flex-1 h-8 px-2 bg-background border border-input rounded-md text-xs"
                      >
                        {techniciansList.map((t) => (
                          <option key={t.id} value={t.profile_id}>
                            {t.name} ({t.phone})
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground font-semibold h-8 text-xs"
                        onClick={() => {
                          const el = document.getElementById("assignTechSelect") as HTMLSelectElement;
                          if (el) handleAssign(selectedTicket.id, el.value);
                        }}
                      >
                        Confirm Assignment
                      </Button>
                    </div>
                  </div>
                )}

                {/* State 2: ASSIGNED -> Start */}
                {selectedTicket.status === "ASSIGNED" && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground">Technician has arrived on site? Start the active diagnostic:</p>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground font-semibold text-xs h-8"
                      onClick={() => handleStartWork(selectedTicket.id)}
                    >
                      <Activity className="w-3.5 h-3.5 mr-1" />
                      Start On-Site Diagnostic (Move to IN_PROGRESS)
                    </Button>
                  </div>
                )}

                {/* State 3: IN_PROGRESS or AWAITING_PARTS */}
                {(selectedTicket.status === "IN_PROGRESS" ||
                  selectedTicket.status === "AWAITING_PARTS" ||
                  selectedTicket.status === "TECHNICIAN_VISITED") && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border text-xs h-8"
                        onClick={() => handleRequestParts(selectedTicket.id)}
                      >
                        Requisition Spare Parts
                      </Button>
                    </div>

                    {/* RMA Warranty Replacement Section (If WARRANTY_FREE) */}
                    {selectedTicket.billing_classification === "WARRANTY_FREE" && (
                      <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <RefreshCw className="w-4 h-4" />
                          RMA Hardware Replacement (Covered under ₹0.00 Warranty)
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Swap out defective serial unit. Select an available unit from warehouse stock:
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <select
                            value={selectedReplacementSerial}
                            onChange={(e) => setSelectedReplacementSerial(e.target.value)}
                            className="flex-1 w-full h-8 px-2 bg-background border border-input rounded-md text-xs font-mono"
                          >
                            <option value="">-- Select Available In-Stock Unit --</option>
                            {availableInStockSerials.map((sn) => (
                              <option key={sn.id} value={sn.serial_number}>
                                {sn.serial_number} - {sn.component_name}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 w-full sm:w-auto"
                            onClick={() => handleExecuteRMA(selectedTicket.id)}
                            disabled={!selectedReplacementSerial}
                          >
                            Execute RMA Swap
                          </Button>
                        </div>
                        {selectedTicket.replaced_serial_number && (
                          <p className="text-[10px] text-emerald-500 font-bold mt-1">
                            ✓ Replaced {selectedTicket.replaced_serial_number} with {selectedTicket.new_serial_number}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Billable Repair Estimate Section (If BILLABLE) */}
                    {selectedTicket.billing_classification === "BILLABLE" && (
                      <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                        <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4" />
                          Billable Repair Estimation & Customer Approval
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Parts Cost (₹)</label>
                            <Input
                              type="number"
                              value={estimateParts}
                              onChange={(e) => setEstimateParts(Number(e.target.value))}
                              className="h-7 text-xs bg-background"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Labor Cost (₹)</label>
                            <Input
                              type="number"
                              value={estimateLabor}
                              onChange={(e) => setEstimateLabor(Number(e.target.value))}
                              className="h-7 text-xs bg-background"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-border"
                            onClick={() => handleCreateEstimate(selectedTicket.id)}
                          >
                            Generate Estimate
                          </Button>

                          {selectedTicket.total_estimate ? (
                            <div className="flex items-center gap-2">
                              {!selectedTicket.customer_approved_estimate ? (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                                  onClick={() => handleApproveEstimate(selectedTicket.id, true)}
                                >
                                  Customer Approve (₹{selectedTicket.total_estimate})
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="bg-primary text-primary-foreground text-xs h-7"
                                  onClick={() => handleGenerateInvoice(selectedTicket.id)}
                                  disabled={!!selectedTicket.service_invoice_id}
                                >
                                  <FileText className="w-3.5 h-3.5 mr-1" />
                                  {selectedTicket.service_invoice_id ? "Invoice Issued" : "Issue Service Invoice"}
                                </Button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Record Resolution Box */}
                    <div className="space-y-2 border-t border-border pt-2.5">
                      <label className="font-bold text-foreground block">Technician Technical Resolution Notes *</label>
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Detail the technical diagnostics, repaired components, and generation verification..."
                        rows={3}
                        className="w-full p-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground font-semibold text-xs h-8 w-full"
                        onClick={() => handleResolve(selectedTicket.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Record Resolution & Request Customer Sign-Off
                      </Button>
                    </div>
                  </div>
                )}

                {/* State 4: Sign-Off & Closing Invariant Gate */}
                {(selectedTicket.status === "CUSTOMER_CONFIRMATION_PENDING" ||
                  selectedTicket.status === "RESOLVED") && (
                  <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-purple-500" />
                        Closing Condition Invariant Gate
                      </p>
                      <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        Resolution Notes Verified
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      SolarOS Invariant: Tickets cannot be closed without confirmed customer satisfaction OR an authorized Director documented exception.
                    </p>

                    {/* Toggle Override vs Customer */}
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="closeMode"
                          checked={!useAdminOverride}
                          onChange={() => setUseAdminOverride(false)}
                        />
                        Customer Sign-Off (Standard SOP)
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-amber-500">
                        <input
                          type="radio"
                          name="closeMode"
                          checked={useAdminOverride}
                          onChange={() => setUseAdminOverride(true)}
                        />
                        Director Exception Override
                      </label>
                    </div>

                    {!useAdminOverride ? (
                      <div className="space-y-2.5 p-2.5 rounded-lg bg-background border border-border">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Customer Confirmation Received</span>
                          <input
                            type="checkbox"
                            checked={customerConfirmedClose}
                            onChange={(e) => setCustomerConfirmedClose(e.target.checked)}
                            className="w-4 h-4 accent-primary"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[11px]">Rating:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRating(star)}
                              className="text-amber-400 hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`w-4 h-4 ${star <= feedbackRating ? "fill-amber-400" : "text-muted-foreground"}`}
                              />
                            </button>
                          ))}
                        </div>
                        <Input
                          placeholder="Customer feedback comments..."
                          value={feedbackComments}
                          onChange={(e) => setFeedbackComments(e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2 p-2.5 rounded-lg bg-background border border-amber-500/40">
                        <label className="font-bold text-amber-600 dark:text-amber-400 block text-[11px]">
                          Documented Director Exception Reason *
                        </label>
                        <Input
                          placeholder="e.g. Customer out of country for 3 weeks; oral phone authorization recorded..."
                          value={adminOverrideReason}
                          onChange={(e) => setAdminOverrideReason(e.target.value)}
                          className="h-8 text-xs font-medium"
                          required
                        />
                      </div>
                    )}

                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 w-full"
                      onClick={() => handleClose(selectedTicket.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Verify Conditions & Permanently Close Ticket
                    </Button>
                  </div>
                )}

                {/* State 5: CLOSED */}
                {selectedTicket.status === "CLOSED" && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Ticket Permanently Closed
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Technical resolution and closing sign-off permanently recorded in SolarOS ledger.
                    </p>
                  </div>
                )}
              </div>

              {/* Full Repair History Ledger */}
              <div className="space-y-2 border-t border-border pt-3">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <History className="w-4 h-4 text-primary" />
                  Complete Repair History Ledger
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {ticketUpdates
                    .filter((u) => u.ticket_id === selectedTicket.id)
                    .map((update) => (
                      <div key={update.id} className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-foreground">{update.updated_by_name || update.updated_by}</span>
                          <span className="text-muted-foreground font-mono">
                            {new Date(update.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px]">{update.comment}</p>
                      </div>
                    ))}
                </div>
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
    </div>
  );
}
