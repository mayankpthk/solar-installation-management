"use client";

import * as React from "react";
import {
  Wrench,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  ClipboardCheck,
  Calendar,
  User,
  Phone,
  MapPin,
  Truck,
  Plus,
  AlertTriangle,
  Smartphone,
  Layers,
  ArrowRight,
  FileText,
  Camera,
  RefreshCw,
  Wifi,
  WifiOff,
  Star,
  Printer,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-context";
import { getStore } from "@/lib/data/store";
import { InstallationJob, InstallationChecklist, Order, Technician } from "@/lib/types/database";
import { SignaturePad } from "@/components/installations/signature-pad";
import { CommissioningReportModal } from "@/components/installations/commissioning-report-modal";
import {
  scheduleInstallationJob,
  rescheduleInstallationJob,
  startInstallationJob,
  updateInstallationChecklist,
  recordCommissioningMeasurements,
  recordInstallationPhoto,
  submitCustomerSignatureAndCommissioning,
  InstallationError,
  SchedulingConflictError,
  JobClosedError,
  EarthingSafetyHazardError,
} from "@/domain/installations/installation-engine";

export default function InstallationsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = React.useState<InstallationJob[]>([]);
  const [technicians, setTechnicians] = React.useState<Technician[]>([]);
  const [ordersReady, setOrdersReady] = React.useState<Order[]>([]);

  // Mode: Manager Scheduling vs Mobile-First Field Technician Workspace
  const [viewMode, setViewMode] = React.useState<"MANAGER" | "FIELD_MOBILE">("FIELD_MOBILE");
  const [selectedJob, setSelectedJob] = React.useState<InstallationJob | null>(null);

  // Scheduling Modal State
  const [isScheduleOpen, setIsScheduleOpen] = React.useState(false);
  const [scheduleOrderId, setScheduleOrderId] = React.useState("");
  const [scheduleLeadTechId, setScheduleLeadTechId] = React.useState("");
  const [scheduleTeamTechIds, setScheduleTeamTechIds] = React.useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = React.useState("2026-11-25");
  const [scheduleTimeSlot, setScheduleTimeSlot] = React.useState("09:00 - 15:00");

  // Rescheduling Modal State
  const [isRescheduleOpen, setIsRescheduleOpen] = React.useState(false);
  const [rescheduleJob, setRescheduleJob] = React.useState<InstallationJob | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = React.useState("");
  const [newRescheduleSlot, setNewRescheduleSlot] = React.useState("09:00 - 15:00");
  const [rescheduleReason, setRescheduleReason] = React.useState("");

  // Mobile Field Workspace State
  const [activeMobileTab, setActiveMobileTab] = React.useState<
    "BRIEF" | "CHECKLIST" | "TESTING" | "PHOTOS" | "SIGNATURE"
  >("BRIEF");

  // 8-Step SOP Checklist local state for active job
  const [sopChecklist, setSopChecklist] = React.useState<InstallationChecklist | null>(null);

  // Electrical Testing Readings local state
  const [dcVoltage, setDcVoltage] = React.useState("245");
  const [dcCurrent, setDcCurrent] = React.useState("9.8");
  const [acVoltage, setAcVoltage] = React.useState("232");
  const [generationKw, setGenerationKw] = React.useState("2.25");
  const [earthingOhms, setEarthingOhms] = React.useState("2.1");

  // Digital Signature local state
  const [signerCustomerName, setSignerCustomerName] = React.useState("");
  const [signatureSvgData, setSignatureSvgData] = React.useState("");
  const [customerRating, setCustomerRating] = React.useState(5);
  const [customerRemarks, setCustomerRemarks] = React.useState("");
  const [technicianNotes, setTechnicianNotes] = React.useState("");

  // Offline Draft & Sync State
  const [isOfflineMode, setIsOfflineMode] = React.useState(false);
  const [hasCachedDraft, setHasCachedDraft] = React.useState(false);

  // Commissioning Report Modal State
  const [reportJobId, setReportJobId] = React.useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = React.useState(false);

  const loadData = React.useCallback(() => {
    const store = getStore();
    setJobs([...store.installations]);
    setTechnicians([...store.technicians]);

    // Orders ready to be scheduled
    const availableOrders = store.orders.filter(
      (o) =>
        o.status === "CONFIRMED" ||
        o.status === "READY_FOR_DISPATCH" ||
        o.status === "DISPATCHED" ||
        o.status === "INSTALLATION_SCHEDULED"
    );
    setOrdersReady(availableOrders);

    if (availableOrders.length > 0 && !scheduleOrderId) {
      setScheduleOrderId(availableOrders[0].id);
    }
    if (store.technicians.length > 0 && !scheduleLeadTechId) {
      setScheduleLeadTechId(store.technicians[0].profile_id);
    }

    // Default select active job for mobile view
    if (!selectedJob && store.installations.length > 0) {
      const active = store.installations.find((j) => j.status === "IN_PROGRESS") || store.installations[0];
      setSelectedJob(active);
      loadJobDetails(active);
    }
  }, [scheduleOrderId, scheduleLeadTechId, selectedJob]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Load active job details for mobile field interface
  const loadJobDetails = (job: InstallationJob) => {
    const store = getStore();
    const chk = store.installationChecklists.find((c) => c.installation_job_id === job.id);
    setSopChecklist(
      chk || {
        id: `chk-${job.id}`,
        installation_job_id: job.id,
        mounting_structures_fitted: false,
        solar_panels_installed: false,
        inverter_installed: false,
        wiring_completed: false,
        electrical_safety_checks_completed: false,
        earthing_completed: false,
        system_testing_performed: false,
        power_generation_verified: false,
      }
    );

    setDcVoltage(String(job.measured_dc_voltage || 245));
    setDcCurrent(String(job.measured_dc_current || 9.8));
    setAcVoltage(String(job.measured_ac_voltage || 232));
    setGenerationKw(String(job.measured_instantaneous_power_kw || 2.25));
    setEarthingOhms(String(job.earthing_resistance_ohms || 2.1));
    setTechnicianNotes(job.technician_notes || "");

    const sig = store.customerSignatures.find((s) => s.installation_job_id === job.id);
    if (sig) {
      setSignerCustomerName(sig.signer_name);
      setSignatureSvgData(sig.signature_svg);
      setCustomerRating(sig.feedback_rating || 5);
      setCustomerRemarks(sig.feedback_comments || "");
    } else {
      setSignerCustomerName(job.customer_name || "");
      setSignatureSvgData("");
      setCustomerRating(5);
      setCustomerRemarks("");
    }

    // Check offline localStorage draft
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`solaros_draft_${job.id}`);
      setHasCachedDraft(!!saved);
    }
  };

  // Schedule Job Submit Handler
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newJob = scheduleInstallationJob({
        orderId: scheduleOrderId,
        leadTechnicianId: scheduleLeadTechId,
        teamTechnicianIds: scheduleTeamTechIds,
        scheduledDate: scheduleDate,
        scheduledTimeSlot: scheduleTimeSlot,
        userRole: "INSTALLATION_MANAGER",
        userId: "20000000-0000-0000-0000-000000000005",
        userName: "Installation Manager",
      });

      loadData();
      setIsScheduleOpen(false);
      setSelectedJob(newJob);
      loadJobDetails(newJob);

      toast({
        title: "Installation Scheduled Successfully",
        description: `Job ${newJob.id} assigned to team for ${scheduleDate} (${scheduleTimeSlot}).`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error scheduling job";
      toast({ title: "Scheduling Blocked", description: msg, variant: "error" });
    }
  };

  // Reschedule Job Submit Handler
  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleJob) return;

    try {
      rescheduleInstallationJob({
        jobId: rescheduleJob.id,
        newDate: newRescheduleDate,
        newTimeSlot: newRescheduleSlot,
        reason: rescheduleReason,
        userRole: "INSTALLATION_MANAGER",
        userId: "20000000-0000-0000-0000-000000000005",
        userName: "Installation Manager",
      });

      loadData();
      setIsRescheduleOpen(false);
      toast({
        title: "Job Rescheduled Successfully",
        description: `Job ${rescheduleJob.id} moved to ${newRescheduleDate}. Documented audit reason recorded.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error rescheduling job";
      toast({ title: "Rescheduling Failed", description: msg, variant: "error" });
    }
  };

  // Start Job on Site
  const handleStartJob = (jobId: string) => {
    try {
      const started = startInstallationJob(jobId, "tech-lead");
      loadData();
      setSelectedJob(started);
      toast({
        title: "Installation Started on Job Site",
        description: `Clock started at ${new Date().toLocaleTimeString()}. Technician arrival recorded.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error starting job";
      toast({ title: "Action Failed", description: msg, variant: "error" });
    }
  };

  // Checklist Item Toggle Handler
  const handleToggleChecklist = (key: keyof InstallationChecklist) => {
    if (!selectedJob || !sopChecklist) return;
    if (selectedJob.status === "APPROVED" || selectedJob.status === "CUSTOMER_SIGNED") {
      toast({ title: "Job Closed", description: "Completed installations cannot be modified.", variant: "warning" });
      return;
    }

    const updatedValue = !sopChecklist[key];
    try {
      const updated = updateInstallationChecklist(selectedJob.id, { [key]: updatedValue });
      setSopChecklist({ ...updated });

      // Save offline draft
      if (typeof window !== "undefined") {
        localStorage.setItem(`solaros_draft_${selectedJob.id}`, JSON.stringify({ checklist: updated }));
        setHasCachedDraft(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating checklist";
      toast({ title: "Checklist Error", description: msg, variant: "error" });
    }
  };

  // Save Commissioning Electrical Measurements
  const handleSaveMeasurements = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      const updated = recordCommissioningMeasurements(selectedJob.id, {
        measuredDcVoltage: Number(dcVoltage),
        measuredDcCurrent: Number(dcCurrent),
        measuredAcVoltage: Number(acVoltage),
        measuredInstantaneousPowerKw: Number(generationKw),
        earthingResistanceOhms: Number(earthingOhms),
      });

      loadData();
      setSelectedJob(updated);
      toast({
        title: "Electrical Measurements Recorded",
        description: `Verified: ${dcVoltage}V DC, ${acVoltage}V AC, ${earthingOhms}Ω Earthing (<5Ω compliant).`,
        variant: "success",
      });
      setActiveMobileTab("PHOTOS");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Measurement validation failed";
      toast({ title: "Safety Violation", description: msg, variant: "error" });
    }
  };

  // Attach Simulated Photo
  const handleAttachPhoto = (type: "ROOF_ARRAY" | "INVERTER_MOUNT" | "EARTHING_PIT" | "GENERATION_METER") => {
    if (!selectedJob) return;
    try {
      recordInstallationPhoto(selectedJob.id, {
        photoType: type,
        photoUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800",
        gpsLatitude: 31.326,
        gpsLongitude: 75.5762,
      });
      loadData();
      toast({
        title: "Photo Evidence Captured",
        description: `Captured ${type} with GPS timestamp (31.326° N, 75.576° E).`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Photo capture failed";
      toast({ title: "Capture Error", description: msg, variant: "error" });
    }
  };

  // Final Customer Digital Signature & Commissioning Submit
  const handleFinalCommissioning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      const finishedJob = submitCustomerSignatureAndCommissioning({
        jobId: selectedJob.id,
        signerName: signerCustomerName,
        signatureSvg: signatureSvgData || "data:image/svg+xml;utf8,<svg><path d='M10 20 L50 20'/></svg>",
        feedbackRating: customerRating,
        feedbackComments: customerRemarks,
        technicianNotes,
        idempotencyKey: `IDEM-COM-${selectedJob.id}-${Date.now()}`,
      });

      // Clear offline draft
      if (typeof window !== "undefined") {
        localStorage.removeItem(`solaros_draft_${selectedJob.id}`);
        setHasCachedDraft(false);
      }

      loadData();
      setSelectedJob(finishedJob);

      toast({
        title: "Installation Commissioned & Signed Off!",
        description: `Job closed. Warranty countdown activated! Customer signature recorded.`,
        variant: "success",
      });

      // Open completion certificate
      setReportJobId(finishedJob.id);
      setIsReportOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Commissioning handover failed";
      toast({ title: "Handover Blocked", description: msg, variant: "error" });
    }
  };

  // Compute checklist completed steps
  const completedStepsCount = sopChecklist
    ? [
        sopChecklist.mounting_structures_fitted,
        sopChecklist.solar_panels_installed,
        sopChecklist.inverter_installed,
        sopChecklist.wiring_completed,
        sopChecklist.electrical_safety_checks_completed,
        sopChecklist.earthing_completed,
        sopChecklist.system_testing_performed,
        sopChecklist.power_generation_verified,
      ].filter(Boolean).length
    : 0;

  const checklistProgressPercent = Math.round((completedStepsCount / 8) * 100);

  // Table Columns for Manager View
  const columns: Column<InstallationJob>[] = [
    {
      header: "Installation Job",
      accessorKey: "id",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground font-mono text-xs">{row.id}</p>
          <p className="text-[10px] text-muted-foreground font-mono">
            Order: {row.order_number || "ORD-2026"} • {row.scheduled_date || "Pending Date"}
          </p>
        </div>
      ),
    },
    {
      header: "Customer & Site",
      cell: (row) => (
        <div className="text-xs">
          <p className="font-bold text-foreground flex items-center gap-1">
            <User className="w-3 h-3 text-muted-foreground" />
            {row.customer_name || "Customer"}
          </p>
          <p className="text-muted-foreground text-[11px] truncate max-w-[200px]">
            {row.customer_address || "Jalandhar Site"}
          </p>
        </div>
      ),
    },
    {
      header: "Lead Technician",
      cell: (row) => {
        const tech = technicians.find((t) => t.profile_id === row.lead_technician_id);
        return (
          <div className="text-xs">
            <p className="font-bold text-foreground">{tech?.name || "Lead Tech"}</p>
            <p className="text-[10px] font-mono text-muted-foreground">{tech?.phone || "+919811100001"}</p>
          </div>
        );
      },
    },
    {
      header: "Job Status",
      accessorKey: "status",
      sortable: true,
      cell: (row) => <StatusPill status={row.status} />,
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 font-semibold"
            onClick={() => {
              setSelectedJob(row);
              loadJobDetails(row);
              setViewMode("FIELD_MOBILE");
            }}
          >
            <Smartphone className="w-3.5 h-3.5 mr-1" />
            Field View
          </Button>

          {row.status !== "APPROVED" && row.status !== "CUSTOMER_SIGNED" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-border hover:bg-muted"
              onClick={() => {
                setRescheduleJob(row);
                setNewRescheduleDate(row.scheduled_date || "2026-11-26");
                setNewRescheduleSlot(row.scheduled_time_slot || "09:00 - 15:00");
                setRescheduleReason("");
                setIsRescheduleOpen(true);
              }}
            >
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Reschedule
            </Button>
          )}

          {row.status === "APPROVED" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 font-semibold"
              onClick={() => {
                setReportJobId(row.id);
                setIsReportOpen(true);
              }}
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Certificate
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
            <Wrench className="w-6 h-6 text-primary" />
            Field Installation & Technician Workspace
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Schedule crews, avoid double-booking conflicts, execute 8-step mobile SOP checklist, and capture digital customer sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher Button */}
          <div className="flex items-center p-1 bg-muted rounded-lg border border-border text-xs">
            <button
              onClick={() => setViewMode("FIELD_MOBILE")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "FIELD_MOBILE"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              Field Technician Mode
            </button>
            <button
              onClick={() => setViewMode("MANAGER")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === "MANAGER"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              Manager Scheduling
            </button>
          </div>

          <Button
            onClick={() => setIsScheduleOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Schedule Installation
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: MOBILE-FIRST FIELD TECHNICIAN WORKSPACE (RESPONSIVE) */}
      {/* ============================================================== */}
      {viewMode === "FIELD_MOBILE" && selectedJob && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Offline Resilient Status Bar */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOfflineMode(!isOfflineMode)}
                className={`flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  isOfflineMode
                    ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                }`}
                title="Click to toggle simulated offline connectivity"
              >
                {isOfflineMode ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5" /> Offline Mode Active
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5" /> Connected to Cloud
                  </>
                )}
              </button>

              {hasCachedDraft && (
                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-primary animate-spin" /> Local draft cached on device
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-semibold">Active Job:</span>
              <select
                value={selectedJob.id}
                onChange={(e) => {
                  const found = jobs.find((j) => j.id === e.target.value);
                  if (found) {
                    setSelectedJob(found);
                    loadJobDetails(found);
                  }
                }}
                className="px-2 py-1 bg-background border border-input rounded text-xs font-mono font-bold focus:outline-none"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.id} — {j.customer_name} ({j.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Field Header Card */}
          <Card className="border border-border bg-card/90 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  FIELD TECHNICIAN WORKSPACE
                </span>
                <h2 className="text-lg font-extrabold tracking-tight mt-0.5 flex items-center gap-2">
                  {selectedJob.customer_name}
                </h2>
                <p className="text-xs text-slate-300 font-mono">
                  Job ID: {selectedJob.id} • Order: {selectedJob.order_number}
                </p>
              </div>

              <div className="text-right">
                <StatusPill status={selectedJob.status} />
                <p className="text-[10px] text-slate-300 mt-1 font-mono">
                  {selectedJob.system_capacity_kw} kW {selectedJob.system_topology}
                </p>
              </div>
            </div>

            {/* Quick Actions (Call, Map Directions, Start Job) */}
            <div className="p-3 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <a
                  href={`tel:${selectedJob.customer_phone || "+919872200001"}`}
                  className="px-2.5 py-1 rounded bg-background border border-border hover:bg-muted font-semibold flex items-center gap-1.5 text-foreground"
                >
                  <Phone className="w-3.5 h-3.5 text-primary" /> Call Customer
                </a>

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(selectedJob.customer_address || "Jalandhar")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-background border border-border hover:bg-muted font-semibold flex items-center gap-1.5 text-foreground"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Site Directions
                </a>
              </div>

              <div>
                {selectedJob.status === "ASSIGNED" && (
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    onClick={() => handleStartJob(selectedJob.id)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Start Installation
                  </Button>
                )}
                {selectedJob.start_time && (
                  <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    Started: {new Date(selectedJob.start_time).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            {/* Mobile Tab Navigation */}
            <div className="grid grid-cols-5 border-b border-border text-center text-xs font-bold divide-x divide-border">
              {[
                { id: "BRIEF", label: "Job Brief" },
                { id: "CHECKLIST", label: `SOP (${completedStepsCount}/8)` },
                { id: "TESTING", label: "Grid Tests" },
                { id: "PHOTOS", label: "Photos" },
                { id: "SIGNATURE", label: "Sign-Off" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMobileTab(tab.id as any)}
                  className={`py-2.5 transition-colors ${
                    activeMobileTab === tab.id
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <CardContent className="p-4">
              {/* TAB 1: JOB BRIEF */}
              {activeMobileTab === "BRIEF" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Installation Site</p>
                      <p className="font-bold text-foreground text-sm">{selectedJob.customer_name}</p>
                      <p className="text-muted-foreground leading-relaxed">{selectedJob.customer_address}</p>
                      <p className="text-muted-foreground font-mono">{selectedJob.customer_phone}</p>
                    </div>

                    <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Transit Manifest & Vehicle</p>
                      <p className="font-bold text-foreground font-mono text-sm">
                        {selectedJob.dispatch_number || "DSP-2026-0041"}
                      </p>
                      <p className="text-muted-foreground font-mono">Van: PB-08-AX-9912 (Fleet Unit 01)</p>
                      <p className="text-muted-foreground">Driver: Balwant Singh (+919876544321)</p>
                    </div>
                  </div>

                  {/* Verified Equipment & Hardware Serials */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="p-2.5 bg-muted/60 font-bold border-b border-border flex items-center justify-between text-xs">
                      <span>Assigned Hardware & Dispatched Serial Numbers</span>
                      <span className="text-[10px] font-mono text-muted-foreground">BOM Verified</span>
                    </div>
                    <div className="divide-y divide-border bg-card">
                      <div className="p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-foreground">540W Mono-PERC Solar PV Modules</p>
                          <p className="text-[10px] font-mono text-muted-foreground">SKU: PV-PANEL-540W • Qty: 6 Units</p>
                        </div>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-foreground">
                          SN: PV-540W-2026-0101 .. 0106
                        </span>
                      </div>
                      <div className="p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-foreground">3 kW Single-Phase Grid Inverter</p>
                          <p className="text-[10px] font-mono text-muted-foreground">SKU: INV-3KW-OG • Qty: 1 Unit</p>
                        </div>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-foreground">
                          SN: INV-3KW-2026-0041
                        </span>
                      </div>
                      <div className="p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-foreground">Hot Dip Galvanized Modular Structure</p>
                          <p className="text-[10px] font-mono text-muted-foreground">SKU: STR-GI-MODULAR • Qty: 3 Sets</p>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">Standard Hardware</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => setActiveMobileTab("CHECKLIST")}
                      className="bg-primary text-primary-foreground font-bold text-xs"
                    >
                      Open 8-Step SOP Checklist <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 2: 8-STEP SOP CHECKLIST */}
              {activeMobileTab === "CHECKLIST" && sopChecklist && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground text-sm">Installation SOP Checkpoints</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Tap each item once physically verified and torqued on site.
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-extrabold text-primary text-base">{checklistProgressPercent}%</span>
                      <p className="text-[10px] text-muted-foreground">{completedStepsCount} of 8 Done</p>
                    </div>
                  </div>

                  {/* Checklist Progress Bar */}
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${checklistProgressPercent}%` }}
                    />
                  </div>

                  {/* 8 Required Touch-Optimized Toggles */}
                  <div className="space-y-2">
                    {[
                      {
                        key: "mounting_structures_fitted" as const,
                        title: "1. Mounting Structures Fitted",
                        desc: "Roof anchor bolts torqued to 25 Nm; water-tight chemical sealant applied.",
                      },
                      {
                        key: "solar_panels_installed" as const,
                        title: "2. Solar Panels Installed",
                        desc: "All PV modules clamped with mid/end clamps and tilt aligned south.",
                      },
                      {
                        key: "inverter_installed" as const,
                        title: "3. Inverter Installed",
                        desc: "Mounted in shaded location with 30cm clearance and wall grounded.",
                      },
                      {
                        key: "wiring_completed" as const,
                        title: "4. Wiring Completed",
                        desc: "UV-rated solar DC cable isolated in conduits; MC4 crimps inspected.",
                      },
                      {
                        key: "electrical_safety_checks_completed" as const,
                        title: "5. Electrical Safety Checks Completed",
                        desc: "DCDB/ACDB SPD connected; polarity and open-circuit voltage verified.",
                      },
                      {
                        key: "earthing_completed" as const,
                        title: "6. Earthing Completed",
                        desc: "Dual chemical earthing pits installed with bentonite backfill (<5Ω).",
                      },
                      {
                        key: "system_testing_performed" as const,
                        title: "7. System Testing Performed",
                        desc: "High-voltage insulation resistance test & phase sequence verified.",
                      },
                      {
                        key: "power_generation_verified" as const,
                        title: "8. Power Generation Verified",
                        desc: "Grid synchronized; instantaneous kW power output confirmed on display.",
                      },
                    ].map((step) => {
                      const isDone = !!sopChecklist[step.key];
                      return (
                        <div
                          key={step.key}
                          onClick={() => handleToggleChecklist(step.key)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isDone
                              ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                              : "bg-card border-border hover:bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <div className="space-y-0.5 pr-2">
                            <p className={`font-bold text-sm ${isDone ? "text-foreground" : "text-foreground/80"}`}>
                              {step.title}
                            </p>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">{step.desc}</p>
                          </div>

                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              isDone ? "bg-emerald-500 text-white" : "border-2 border-muted-foreground/40 bg-background"
                            }`}
                          >
                            {isDone && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setActiveMobileTab("BRIEF")}>
                      Back to Brief
                    </Button>
                    <Button
                      onClick={() => setActiveMobileTab("TESTING")}
                      className="bg-primary text-primary-foreground font-bold"
                    >
                      Proceed to Grid Testing <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 3: ELECTRICAL GRID TESTS */}
              {activeMobileTab === "TESTING" && (
                <form onSubmit={handleSaveMeasurements} className="space-y-4 text-xs">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-2.5">
                    <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-foreground">Electrical Commissioning Tests & Safety Verification</p>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">
                        Input actual multimeter and clamp meter readings. Earthing resistance must comply with CEA/MNRE limits (&lt; 5.0 Ω).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">
                        Measured DC Voltage (V) *
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="245.5"
                        value={dcVoltage}
                        onChange={(e) => setDcVoltage(e.target.value)}
                        className="font-mono text-xs"
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">String Voc open circuit</span>
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">
                        Measured DC Current (A) *
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="9.8"
                        value={dcCurrent}
                        onChange={(e) => setDcCurrent(e.target.value)}
                        className="font-mono text-xs"
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">Array operating current</span>
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">
                        Measured AC Voltage (V) *
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="232.0"
                        value={acVoltage}
                        onChange={(e) => setAcVoltage(e.target.value)}
                        className="font-mono text-xs"
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">Phase-to-Neutral grid voltage</span>
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">
                        Instantaneous Power Output (kW) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="2.25"
                        value={generationKw}
                        onChange={(e) => setGenerationKw(e.target.value)}
                        className="font-mono text-xs font-bold text-emerald-600"
                        required
                      />
                      <span className="text-[10px] text-muted-foreground">Generation confirmed on inverter</span>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-semibold text-foreground block mb-1">
                        Earthing Pit Resistance (Ω) * (MNRE Compliance Limit: &lt; 5.0 Ω)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="2.1"
                        value={earthingOhms}
                        onChange={(e) => setEarthingOhms(e.target.value)}
                        className={`font-mono text-xs font-bold ${
                          Number(earthingOhms) >= 5.0 ? "border-red-500 text-red-500" : "text-foreground"
                        }`}
                        required
                      />
                      {Number(earthingOhms) >= 5.0 ? (
                        <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> HAZARD: Resistance ≥ 5.0 Ω violates safety guidelines. Pit must be backfilled.
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                          ✓ Compliant with CEA & MNRE safety specifications (&lt; 5.0 Ω)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button type="button" variant="outline" onClick={() => setActiveMobileTab("CHECKLIST")}>
                      Back
                    </Button>
                    <Button type="submit" className="bg-primary text-primary-foreground font-bold">
                      Save Readings & Continue <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </form>
              )}

              {/* TAB 4: PHOTO EVIDENCE CAPTURE */}
              {activeMobileTab === "PHOTOS" && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                    <p className="font-bold text-foreground">Before & After Installation Photo Evidence</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Capture high-resolution photos of the solar array, inverter mount, earthing pit, and net generation meter with GPS location tags.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { type: "ROOF_ARRAY" as const, label: "Rooftop Solar Array" },
                      { type: "INVERTER_MOUNT" as const, label: "Inverter & DCDB" },
                      { type: "EARTHING_PIT" as const, label: "Earthing Pit Chamber" },
                      { type: "GENERATION_METER" as const, label: "Bidirectional Meter" },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleAttachPhoto(item.type)}
                        className="p-4 rounded-xl border border-dashed border-border bg-muted/40 hover:bg-primary/5 hover:border-primary/50 transition-all text-center flex flex-col items-center justify-center gap-2"
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Camera className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-foreground text-xs">{item.label}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Tap to Capture</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setActiveMobileTab("TESTING")}>
                      Back
                    </Button>
                    <Button
                      onClick={() => setActiveMobileTab("SIGNATURE")}
                      className="bg-primary text-primary-foreground font-bold"
                    >
                      Customer Digital Sign-Off <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 5: CUSTOMER DIGITAL SIGN-OFF */}
              {activeMobileTab === "SIGNATURE" && (
                <form onSubmit={handleFinalCommissioning} className="space-y-4 text-xs">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-600">
                      <ShieldCheck className="w-4 h-4" /> Official Customer Handover & Warranty Activation
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Upon digital signature submission, the installation job is marked <strong>APPROVED</strong>,
                      the sales order is marked <strong>COMPLETED</strong>, and the 2-year inverter &amp; 20-year panel warranty countdowns are activated.
                    </p>
                  </div>

                  {/* Technician Commissioning Observations */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Technician Commissioning Notes
                    </label>
                    <textarea
                      value={technicianNotes}
                      onChange={(e) => setTechnicianNotes(e.target.value)}
                      placeholder="Array torque checked, earthing pit tested, customer instructed on monitoring app..."
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* Customer Interactive Signature Pad */}
                  <SignaturePad
                    signerName={signerCustomerName}
                    onSignerNameChange={setSignerCustomerName}
                    onSignatureCapture={setSignatureSvgData}
                    rating={customerRating}
                    onRatingChange={setCustomerRating}
                    comments={customerRemarks}
                    onCommentsChange={setCustomerRemarks}
                  />

                  <div className="flex justify-between pt-2">
                    <Button type="button" variant="outline" onClick={() => setActiveMobileTab("PHOTOS")}>
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={selectedJob.status === "APPROVED"}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-6 shadow-md shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      {selectedJob.status === "APPROVED"
                        ? "Installation Already Approved"
                        : "Submit Handover & Activate Warranty"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: INSTALLATION MANAGER VIEW (SCHEDULING & CALENDAR) */}
      {/* ============================================================== */}
      {viewMode === "MANAGER" && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Rooftop Installation Deployments</CardTitle>
                <CardDescription className="text-xs">
                  Coordinate field crews, track SOP execution status, and audit electrical testing records.
                </CardDescription>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">
                Total Deployments: {jobs.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <DataTable
              data={jobs}
              columns={columns}
              searchPlaceholder="Search jobs by ID, customer name or order number..."
            />
          </CardContent>
        </Card>
      )}

      {/* Schedule Job Modal */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Installation Deployment</DialogTitle>
            <DialogDescription>
              Assign lead technician, installation team, date, and time slot with automatic conflict detection.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Select Order *</label>
              <select
                value={scheduleOrderId}
                onChange={(e) => setScheduleOrderId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                required
              >
                {ordersReady.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} ({o.system_capacity_kw} kW {o.system_topology})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Lead Technician *</label>
              <select
                value={scheduleLeadTechId}
                onChange={(e) => setScheduleLeadTechId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                required
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.profile_id}>
                    {t.name} (Rate: ₹{t.hourly_rate}/hr) — {t.skills.slice(0, 2).join(", ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Scheduled Date *</label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Time Slot *</label>
                <select
                  value={scheduleTimeSlot}
                  onChange={(e) => setScheduleTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="08:30 - 14:00">Morning (08:30 - 14:00)</option>
                  <option value="09:00 - 15:00">Standard (09:00 - 15:00)</option>
                  <option value="13:00 - 18:30">Afternoon (13:00 - 18:30)</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Schedule Job
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reschedule Job Modal */}
      {rescheduleJob && (
        <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reschedule Installation Job</DialogTitle>
              <DialogDescription>
                Move deployment date for Job {rescheduleJob.id} ({rescheduleJob.customer_name}).
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">New Date *</label>
                  <Input
                    type="date"
                    value={newRescheduleDate}
                    onChange={(e) => setNewRescheduleDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Time Slot *</label>
                  <select
                    value={newRescheduleSlot}
                    onChange={(e) => setNewRescheduleSlot(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="08:30 - 14:00">Morning (08:30 - 14:00)</option>
                    <option value="09:00 - 15:00">Standard (09:00 - 15:00)</option>
                    <option value="13:00 - 18:30">Afternoon (13:00 - 18:30)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Rescheduling Reason * (Required for audit)
                </label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Heavy rainfall forecast / Customer requested postponement..."
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRescheduleOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                  Confirm Reschedule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Official Commissioning Report Modal */}
      {reportJobId && (
        <CommissioningReportModal
          jobId={reportJobId}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}
