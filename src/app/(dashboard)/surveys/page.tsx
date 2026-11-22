"use client";

import * as React from "react";
import Link from "next/link";
import {
  Compass,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Plus,
  Cable,
  Ruler,
  Sun,
  ShieldCheck,
  Zap,
  Camera,
  FileCheck2,
  UserCheck,
  Building,
  Upload,
  Eye,
  Lock,
  Unlock,
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
  scheduleSurvey,
  submitSurvey,
  reviewSurvey,
  recordAdminOverride,
} from "@/lib/data/store";
import { canApproveSurvey, canOverrideSurveyGate } from "@/domain/workflow/survey-gate";
import { SiteSurvey, SurveyStatus, SurveyOutcome, UserRole } from "@/lib/types/database";

const SAMPLE_ROOF_PHOTOS = [
  { url: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80", caption: "Unobstructed RCC Flat Roof Surface (South Facing)" },
  { url: "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=600&auto=format&fit=crop&q=80", caption: "Parapet Wall & Shading Distance Measurement" },
  { url: "https://images.unsplash.com/photo-1558441719-8b489c63f7d1?w=600&auto=format&fit=crop&q=80", caption: "DC Combiner Box & Inverter Wall Location" },
  { url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80", caption: "PSPCL Bidirectional Meter & Main Service DB" },
];

export default function SurveysPage() {
  const { toast } = useToast();
  const [surveys, setSurveys] = React.useState<SiteSurvey[]>([]);

  // Simulated active user role (matches header role switcher or director by default)
  const [activeRole, setActiveRole] = React.useState<UserRole>("DIRECTOR");

  // Modals
  const [isScheduleOpen, setIsScheduleOpen] = React.useState(false);
  const [isExecuteOpen, setIsExecuteOpen] = React.useState(false);
  const [isReviewOpen, setIsReviewOpen] = React.useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = React.useState(false);
  const [selectedSurvey, setSelectedSurvey] = React.useState<SiteSurvey | null>(null);

  // Schedule Survey Form
  const [scheduleLeadId, setScheduleLeadId] = React.useState("");
  const [scheduleTechId, setScheduleTechId] = React.useState("20000000-0000-0000-0000-000000000006");
  const [scheduleDate, setScheduleDate] = React.useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [scheduleNotes, setScheduleNotes] = React.useState("Priority rooftop feasibility check.");

  // Execute Survey Form (Full Technical Measurements)
  const [roofArea, setRoofArea] = React.useState("650");
  const [usableArea, setUsableArea] = React.useState("550");
  const [shadowFreeArea, setShadowFreeArea] = React.useState("520");
  const [roofDirection, setRoofDirection] = React.useState("SOUTH");
  const [tiltAngle, setTiltAngle] = React.useState("28");
  const [roofType, setRoofType] = React.useState("RCC_FLAT");
  const [dcCableDist, setDcCableDist] = React.useState("18");
  const [acCableDist, setAcCableDist] = React.useState("10");
  const [gridPhase, setGridPhase] = React.useState("SINGLE_PHASE");
  const [sanctionedLoad, setSanctionedLoad] = React.useState("5");
  const [gridSuitability, setGridSuitability] = React.useState("SUITABLE - STABLE 230V");
  const [structuralIntegrity, setStructuralIntegrity] = React.useState("SOUND");
  const [structuralNotes, setStructuralNotes] = React.useState("Load-bearing RCC slab in excellent condition, parapet 3ft height.");
  const [shadowNotes, setShadowNotes] = React.useState("Zero shadow from 9:00 AM to 4:30 PM year-round.");
  const [techNotes, setTechNotes] = React.useState("Recommended 3 kW (8x 540W Mono PERC). Cable routing through internal shaft.");
  const [photoUrls, setPhotoUrls] = React.useState<string[]>(SAMPLE_ROOF_PHOTOS.map((p) => p.url));

  // Review Form
  const [reviewOutcome, setReviewOutcome] = React.useState<SurveyOutcome>("APPROVED");
  const [reviewComments, setReviewComments] = React.useState("Technical feasibility verified: South-facing RCC roof with optimal tilt.");

  // Admin Override Form
  const [overrideReason, setOverrideReason] = React.useState(
    "Director physical site inspection completed; pre-existing certified civil engineering report verified."
  );

  const loadData = React.useCallback(() => {
    const store = getStore();
    setSurveys([...store.surveys]);
    if (store.leads.length > 0 && !scheduleLeadId) {
      setScheduleLeadId(store.leads[0].id);
    }
  }, [scheduleLeadId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleScheduleSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const store = getStore();
      const tech = store.technicians.find((t) => t.profile_id === scheduleTechId);
      const techName = tech ? tech.name : "Manpreet Singh";

      scheduleSurvey(
        scheduleLeadId,
        scheduleTechId,
        techName,
        scheduleDate,
        scheduleNotes,
        "sales_manager",
        "Sales Manager"
      );

      loadData();
      setIsScheduleOpen(false);

      toast({
        title: "Survey Scheduled & Technician Assigned",
        description: `Survey assigned to ${techName} for ${scheduleDate}.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({ title: "Scheduling Error", description: err.message, variant: "error" });
    }
  };

  const handleOpenExecute = (survey: SiteSurvey) => {
    setSelectedSurvey(survey);
    setRoofArea(String(survey.roof_area_sqft || 650));
    setUsableArea(String(survey.usable_area_sqft || 550));
    setShadowFreeArea(String(survey.shadow_free_area_sqft || 520));
    setRoofDirection(survey.roof_azimuth_direction || "SOUTH");
    setTiltAngle(String(survey.roof_tilt_angle_deg || 28));
    setRoofType(survey.roof_type || "RCC_FLAT");
    setDcCableDist(String(survey.dc_cable_distance_meters || 18));
    setAcCableDist(String(survey.ac_cable_distance_meters || 10));
    setStructuralIntegrity(survey.structural_integrity || "SOUND");
    setStructuralNotes(survey.structural_observations || "Load-bearing RCC slab in sound condition.");
    setShadowNotes(survey.shadow_obstacles_notes || "Zero shadow from 9:00 AM to 4:30 PM.");
    setTechNotes(survey.technician_notes || "Optimal for 3 kW solar array.");
    setIsExecuteOpen(true);
  };

  const handleSubmitFindings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurvey) return;

    try {
      submitSurvey(
        selectedSurvey.id,
        {
          roof_area_sqft: Number(roofArea) || 650,
          usable_area_sqft: Number(usableArea) || 550,
          shadow_free_area_sqft: Number(shadowFreeArea) || 520,
          roof_azimuth_direction: roofDirection,
          roof_tilt_angle_deg: Number(tiltAngle) || 28,
          roof_type: roofType,
          dc_cable_distance_meters: Number(dcCableDist) || 18,
          ac_cable_distance_meters: Number(acCableDist) || 10,
          electrical_connection_details: `${gridPhase} • Sanctioned Load: ${sanctionedLoad} kW`,
          grid_suitability: gridSuitability,
          sanctioned_load_kw: Number(sanctionedLoad) || 5,
          structural_integrity: structuralIntegrity,
          structural_observations: structuralNotes,
          shadow_obstacles_notes: shadowNotes,
          technician_notes: techNotes,
          photo_urls: photoUrls,
          feasibility_status: "APPROVED",
        },
        "survey_tech_1",
        "Manpreet Singh (Survey Tech)"
      );

      loadData();
      setIsExecuteOpen(false);

      toast({
        title: "Technical Survey Submitted",
        description: `Survey ${selectedSurvey.survey_code} measurements and photographs logged for manager review.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "error" });
    }
  };

  const handleOpenReview = (survey: SiteSurvey) => {
    setSelectedSurvey(survey);
    setReviewOutcome("APPROVED");
    setReviewComments(`Technical feasibility approved for ${survey.usable_area_sqft || 550} sqft south-facing rooftop.`);
    setIsReviewOpen(true);
  };

  const handleReviewDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurvey) return;

    if (!canApproveSurvey(activeRole)) {
      toast({
        title: "Authorization Blocked",
        description: `Role '${activeRole}' is not permitted to review surveys. Only Super Admin, Director, or Sales Manager have authority.`,
        variant: "error",
      });
      return;
    }

    try {
      reviewSurvey(
        selectedSurvey.id,
        reviewOutcome,
        reviewComments,
        activeRole,
        activeRole === "DIRECTOR" ? "Rajesh Malhotra (Director)" : "Sales Manager"
      );

      loadData();
      setIsReviewOpen(false);

      toast({
        title: `Survey ${reviewOutcome}`,
        description: `Survey ${selectedSurvey.survey_code} marked as ${reviewOutcome}.`,
        variant: reviewOutcome === "APPROVED" ? "success" : reviewOutcome === "REJECTED" ? "error" : "warning",
      });
    } catch (err: any) {
      toast({ title: "Review Failed", description: err.message, variant: "error" });
    }
  };

  const handleOpenOverride = (survey: SiteSurvey) => {
    setSelectedSurvey(survey);
    setIsOverrideOpen(true);
  };

  const handleExecuteOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurvey) return;

    if (!canOverrideSurveyGate(activeRole)) {
      toast({
        title: "Permission Denied",
        description: `Only Super Admin and Company Director can execute an administrative override. Current role: ${activeRole}.`,
        variant: "error",
      });
      return;
    }

    try {
      recordAdminOverride(
        selectedSurvey.id,
        undefined,
        overrideReason,
        activeRole,
        "Rajesh Malhotra (Director)"
      );

      loadData();
      setIsOverrideOpen(false);

      toast({
        title: "Administrative Override Recorded",
        description: `Survey gate bypassed with documented reason. Immutable audit log recorded.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({ title: "Override Error", description: err.message, variant: "error" });
    }
  };

  const columns: Column<SiteSurvey>[] = [
    {
      header: "Survey Code",
      accessorKey: "survey_code",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground font-mono">{row.survey_code}</p>
          <p className="text-[10px] text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      header: "Roof Dimensions & Azimuth",
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-foreground">
            {row.usable_area_sqft || 550} sqft <span className="text-muted-foreground font-normal">({row.roof_type || "RCC Flat"})</span>
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Azimuth: <strong className="text-primary">{row.roof_azimuth_direction || "SOUTH"}</strong> • Tilt: {row.roof_tilt_angle_deg || 28}°
          </p>
        </div>
      ),
    },
    {
      header: "Cabling & Grid",
      cell: (row) => (
        <div className="text-xs font-mono">
          <p className="font-bold text-foreground flex items-center gap-1">
            <Cable className="w-3.5 h-3.5 text-primary" />
            {row.dc_cable_distance_meters || 18}m DC / {row.ac_cable_distance_meters || 10}m AC
          </p>
          <p className="text-[10px] text-muted-foreground">{row.electrical_connection_details || "Single Phase 230V"}</p>
        </div>
      ),
    },
    {
      header: "Assigned Tech",
      cell: (row) => (
        <div className="text-xs">
          <p className="font-medium text-foreground">{row.assigned_technician_name || "Manpreet Singh"}</p>
          <p className="text-[10px] text-muted-foreground font-mono">Date: {row.scheduled_date}</p>
        </div>
      ),
    },
    {
      header: "Gate Status",
      accessorKey: "status",
      sortable: true,
      cell: (row) => {
        if (row.admin_override_reason) {
          return (
            <div className="space-y-0.5">
              <StatusPill status={row.status} />
              <span className="block text-[9px] font-mono font-bold text-purple-500 bg-purple-500/10 px-1 rounded border border-purple-500/20 text-center">
                ADMIN OVERRIDDEN
              </span>
            </div>
          );
        }
        return <StatusPill status={row.status} />;
      },
    },
    {
      header: "Workflow Actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Action 1: Fill Survey Findings (Technician) */}
          {row.status === "SCHEDULED" || row.status === "IN_PROGRESS" ? (
            <Button
              size="sm"
              className="h-7 text-xs bg-primary text-primary-foreground font-semibold"
              onClick={() => handleOpenExecute(row)}
            >
              <Camera className="w-3.5 h-3.5 mr-1" /> Execute Survey
            </Button>
          ) : null}

          {/* Action 2: Review Feasibility Decision (Manager/Director) */}
          {row.status === "SUBMITTED" || row.status === "REQUIRES_REASSESSMENT" ? (
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs"
              onClick={() => handleOpenReview(row)}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Review Gate
            </Button>
          ) : null}

          {/* Action 3: Generate Quote (If Approved or Overridden) */}
          {row.status === "APPROVED" || row.admin_override_reason ? (
            <Link
              href="/quotations"
              className="h-7 px-2.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5" /> Quote Ready
            </Link>
          ) : null}

          {/* Action 4: Admin Override Trigger for Non-Approved Surveys */}
          {row.status !== "APPROVED" && !row.admin_override_reason && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-purple-500/40 text-purple-500 hover:bg-purple-500/10 font-mono"
              onClick={() => handleOpenOverride(row)}
              title="Record Administrator Documented Override"
            >
              <Unlock className="w-3.5 h-3.5 mr-1" /> Override Gate
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
            <Compass className="w-6 h-6 text-primary" />
            Site Survey & Technical Roof Measurements
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Standardized rooftop engineering assessments: Azimuth compass, tilt angle, shadow analysis, photos, and feasibility outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Simulated Active Role Selector for Testing Role Permissions */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-xs">
            <span className="text-muted-foreground font-semibold">Simulated Role:</span>
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as UserRole)}
              className="bg-background text-foreground font-mono text-[11px] font-bold rounded px-1.5 py-0.5 border border-border"
            >
              <option value="DIRECTOR">Director (Full Auth)</option>
              <option value="SALES_MANAGER">Sales Manager (Approve Auth)</option>
              <option value="SALES_EXECUTIVE">Sales Executive (No Approval Auth)</option>
              <option value="SURVEY_TECHNICIAN">Survey Tech (Field Only)</option>
              <option value="CUSTOMER">Customer (Read Only)</option>
            </select>
          </div>

          <Button
            onClick={() => setIsScheduleOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Schedule Site Survey
          </Button>
        </div>
      </div>

      {/* Critical Business Rule Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-background to-card border border-emerald-500/30 flex items-start gap-3.5 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-foreground flex items-center gap-2">
            <span>Critical Architecture Gate: Survey Approval Prerequisite</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-primary font-bold">
              Hard Server Enforcement
            </span>
          </p>
          <p className="text-muted-foreground leading-relaxed">
            A quotation cannot be finalized unless its required site survey is <strong>Approved</strong>,
            except when an authorized administrator explicitly records a documented override.
            Survey outcomes: <strong>Approved</strong>, <strong>Rejected</strong>, or <strong>Requires Reassessment</strong>.
          </p>
        </div>
      </div>

      {/* Survey Data Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold">Site Survey Queue & Feasibility Registry</CardTitle>
          <CardDescription className="text-xs">
            Filter, review engineering parameters, upload site inspection photos, and record feasibility decisions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={surveys}
            columns={columns}
            searchPlaceholder="Search surveys by code, technician, roof type..."
            filterOptions={{
              label: "Gate Status",
              key: "status",
              options: [
                { label: "Scheduled", value: "SCHEDULED" },
                { label: "Submitted for Review", value: "SUBMITTED" },
                { label: "Approved (Quote Ready)", value: "APPROVED" },
                { label: "Requires Reassessment", value: "REQUIRES_REASSESSMENT" },
                { label: "Rejected (Non-Feasible)", value: "REJECTED" },
              ],
            }}
          />
        </CardContent>
      </Card>

      {/* Modal 1: Schedule Site Survey */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Site Survey & Assign Technician</DialogTitle>
            <DialogDescription>
              Assign a certified field technician to inspect rooftop orientation and structural stability.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleSurvey} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Select Customer Lead *</label>
              <select
                value={scheduleLeadId}
                onChange={(e) => setScheduleLeadId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-1 focus:ring-primary"
                required
              >
                {getStore().leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name} ({l.lead_code}) — {l.interested_capacity_kw} kW {l.system_topology}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Scheduled Date *</label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-background"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Assign Survey Technician *</label>
              <select
                value={scheduleTechId}
                onChange={(e) => setScheduleTechId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-1 focus:ring-primary"
                required
              >
                {getStore().technicians.map((t) => (
                  <option key={t.id} value={t.profile_id}>
                    {t.name} ({t.skills.join(", ")}) — ₹{t.hourly_rate}/hr
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Survey Notes / Access Instructions</label>
              <textarea
                rows={2}
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Access through terrace staircase; check 3-phase meter compatibility..."
                className="w-full p-2 bg-background border border-input rounded-md text-xs focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Confirm & Dispatch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Execute Survey Form (Full Technical Measurements + Photos) */}
      {selectedSurvey && (
        <Dialog open={isExecuteOpen} onOpenChange={setIsExecuteOpen}>
          <DialogContent className="max-w-2xl max-h-[92vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Technical Roof Survey Form: {selectedSurvey.survey_code}
              </DialogTitle>
              <DialogDescription>
                Capture roof dimensions, azimuth, tilt, shadow analysis, photos, and electrical parameters.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitFindings} className="space-y-4 text-xs">
              {/* Section 1: Roof Geometry */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3">
                <p className="font-bold text-foreground uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-primary" /> 1. Roof Geometry & Solar Orientation
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1">Total Roof Area (sqft)</label>
                    <Input
                      type="number"
                      value={roofArea}
                      onChange={(e) => setRoofArea(e.target.value)}
                      className="bg-background"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Usable Area (sqft) *</label>
                    <Input
                      type="number"
                      value={usableArea}
                      onChange={(e) => setUsableArea(e.target.value)}
                      className="bg-background"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Shadow-Free Area (sqft)</label>
                    <Input
                      type="number"
                      value={shadowFreeArea}
                      onChange={(e) => setShadowFreeArea(e.target.value)}
                      className="bg-background"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1">Roof Direction (Azimuth)</label>
                    <select
                      value={roofDirection}
                      onChange={(e) => setRoofDirection(e.target.value)}
                      className="w-full px-2.5 py-2 bg-background border border-input rounded-md text-xs focus:ring-1 focus:ring-primary"
                    >
                      <option value="SOUTH">South (180° - Maximum Yield)</option>
                      <option value="SOUTH_WEST">South-West (225°)</option>
                      <option value="SOUTH_EAST">South-East (135°)</option>
                      <option value="EAST">East (90°)</option>
                      <option value="WEST">West (270°)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Tilt Angle (°)</label>
                    <Input
                      type="number"
                      value={tiltAngle}
                      onChange={(e) => setTiltAngle(e.target.value)}
                      className="bg-background"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Roof Type</label>
                    <select
                      value={roofType}
                      onChange={(e) => setRoofType(e.target.value)}
                      className="w-full px-2.5 py-2 bg-background border border-input rounded-md text-xs focus:ring-1 focus:ring-primary"
                    >
                      <option value="RCC_FLAT">RCC Flat Slab</option>
                      <option value="TIN_SHED">Industrial Tin Shed</option>
                      <option value="TILED">Sloped Mangalore Tile</option>
                      <option value="GROUND_MOUNT">Ground Mount</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Cabling & Electrical Details */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-3">
                <p className="font-bold text-foreground uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary" /> 2. Cable Run Distance & Electrical Connection
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1">DC Cable Distance (Array to Inverter) *</label>
                    <Input
                      type="number"
                      value={dcCableDist}
                      onChange={(e) => setDcCableDist(e.target.value)}
                      className="bg-background"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">AC Cable Distance (Inverter to Main DB)</label>
                    <Input
                      type="number"
                      value={acCableDist}
                      onChange={(e) => setAcCableDist(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-muted-foreground block mb-1">Connection Phase</label>
                    <select
                      value={gridPhase}
                      onChange={(e) => setGridPhase(e.target.value)}
                      className="w-full px-2.5 py-2 bg-background border border-input rounded-md text-xs"
                    >
                      <option value="SINGLE_PHASE">Single Phase (230V)</option>
                      <option value="THREE_PHASE">Three Phase (415V)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Sanctioned Load (kW)</label>
                    <Input
                      type="number"
                      value={sanctionedLoad}
                      onChange={(e) => setSanctionedLoad(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Grid Suitability</label>
                    <select
                      value={gridSuitability}
                      onChange={(e) => setGridSuitability(e.target.value)}
                      className="w-full px-2.5 py-2 bg-background border border-input rounded-md text-xs"
                    >
                      <option value="SUITABLE - STABLE 230V">Suitable - Stable 230V Grid</option>
                      <option value="FLUCTUATING - EARTHING REQUIRED">Fluctuating - Requires Chemical Earthing</option>
                      <option value="UNSUITABLE - VOLTAGE COLLAPSE">Unsuitable - Chronic Grid Collapse</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Roof Photographs Upload Gallery */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-foreground uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-primary" /> 3. Roof Photographs & Evidence ({photoUrls.length})
                  </p>
                  <span className="text-[10px] text-emerald-500 font-mono font-semibold">
                    ✓ 4 Geo-Tagged Photos Uploaded
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {SAMPLE_ROOF_PHOTOS.map((item, idx) => (
                    <div key={idx} className="group relative rounded-lg overflow-hidden border border-border bg-slate-950">
                      <img
                        src={item.url}
                        alt={item.caption}
                        className="h-24 w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="p-1 bg-slate-950/90 text-[9px] text-slate-300 truncate">
                        {item.caption}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Structural Observations & Notes */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Structural Observations</label>
                    <Input
                      value={structuralNotes}
                      onChange={(e) => setStructuralNotes(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Shadow Obstacles Analysis</label>
                    <Input
                      value={shadowNotes}
                      onChange={(e) => setShadowNotes(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Technician Recommendations</label>
                  <textarea
                    rows={2}
                    value={techNotes}
                    onChange={(e) => setTechNotes(e.target.value)}
                    className="w-full p-2 bg-background border border-input rounded-md text-xs"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsExecuteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                  Submit Survey Findings
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 3: Review Survey Decision & 3 Outcomes */}
      {selectedSurvey && (
        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Survey Review: {selectedSurvey.survey_code}
              </DialogTitle>
              <DialogDescription>
                Evaluate technical findings and record official feasibility outcome.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleReviewDecision} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <p className="font-semibold text-foreground">Survey Findings Summary:</p>
                <p className="text-muted-foreground">
                  Usable Area: <strong className="text-foreground">{selectedSurvey.usable_area_sqft || 550} sqft</strong> •
                  Azimuth: <strong className="text-foreground">{selectedSurvey.roof_azimuth_direction || "SOUTH"}</strong> •
                  Cable: <strong className="text-foreground">{selectedSurvey.dc_cable_distance_meters || 18}m</strong>
                </p>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-2">Select Feasibility Outcome *</label>
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      reviewOutcome === "APPROVED"
                        ? "bg-emerald-500/10 border-emerald-500 text-foreground"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value="APPROVED"
                      checked={reviewOutcome === "APPROVED"}
                      onChange={() => setReviewOutcome("APPROVED")}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">Approved (Feasible)</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Rooftop is structurally sound with adequate solar exposure. Unlocks the Quotation Engine.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      reviewOutcome === "REJECTED"
                        ? "bg-rose-500/10 border-rose-500 text-foreground"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value="REJECTED"
                      checked={reviewOutcome === "REJECTED"}
                      onChange={() => setReviewOutcome("REJECTED")}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <p className="font-bold text-rose-600 dark:text-rose-400">Rejected (Non-Feasible)</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Excessive shading, compromised roof structure, or severe grid instability. Blocks quotation.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      reviewOutcome === "REQUIRES_REASSESSMENT"
                        ? "bg-amber-500/10 border-amber-500 text-foreground"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value="REQUIRES_REASSESSMENT"
                      checked={reviewOutcome === "REQUIRES_REASSESSMENT"}
                      onChange={() => setReviewOutcome("REQUIRES_REASSESSMENT")}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <p className="font-bold text-amber-600 dark:text-amber-400">Requires Reassessment</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Complex cabling route or structural reinforcement needed before final quotation.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Engineering Review Comments *</label>
                <textarea
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full p-2.5 bg-background border border-input rounded-md text-xs focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsReviewOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                  Confirm Outcome
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 4: Administrator Survey Gate Override */}
      {selectedSurvey && (
        <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-400">
                <Unlock className="w-5 h-5 text-purple-400" />
                Administrative Survey Gate Override
              </DialogTitle>
              <DialogDescription>
                Explicit administrative authorization to allow quotation generation for an unapproved site survey.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleExecuteOverride} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                <p className="font-bold text-purple-400">Security Governance Policy</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Only <strong>Super Admin</strong> or <strong>Company Director</strong> can record this override.
                  A formal justification of at least 10 characters will be permanently written to the immutable audit trail.
                </p>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Survey Target: <span className="font-mono text-primary">{selectedSurvey.survey_code}</span> (Status: {selectedSurvey.status})
                </label>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Documented Justification / Override Reason *
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State the engineering basis, historical structural audit, or executive authorization..."
                  className="w-full p-2.5 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOverrideOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-semibold">
                  Record Official Override
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
