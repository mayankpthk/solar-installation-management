"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Phone,
  Mail,
  MapPin,
  Compass,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Filter,
  UserCheck,
  Calendar,
  MessageSquare,
  History,
  FileSpreadsheet,
  Kanban,
  Table as TableIcon,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-context";
import { formatCurrency } from "@/lib/utils";
import {
  getStore,
  assignSalesperson,
  scheduleLeadFollowUp,
  updateLeadStatus,
  addLeadActivity,
  scheduleSurvey,
} from "@/lib/data/store";
import { Lead, LeadActivity, LeadStatus } from "@/lib/types/database";

const STAGES: { id: LeadStatus; label: string; color: string; border: string }[] = [
  { id: "NEW", label: "New Inquiries", color: "text-blue-400 bg-blue-500/10", border: "border-blue-500/30" },
  { id: "CONTACTED", label: "Contacted", color: "text-sky-400 bg-sky-500/10", border: "border-sky-500/30" },
  { id: "QUALIFIED", label: "Qualified", color: "text-teal-400 bg-teal-500/10", border: "border-teal-500/30" },
  { id: "SURVEY_SCHEDULED", label: "Survey Scheduled", color: "text-amber-400 bg-amber-500/10", border: "border-amber-500/30" },
  { id: "SURVEY_COMPLETED", label: "Survey Completed", color: "text-indigo-400 bg-indigo-500/10", border: "border-indigo-500/30" },
  { id: "QUOTED", label: "Quotation Sent", color: "text-purple-400 bg-purple-500/10", border: "border-purple-500/30" },
  { id: "WON", label: "Converted / Won", color: "text-emerald-400 bg-emerald-500/10", border: "border-emerald-500/30" },
  { id: "LOST", label: "Lost / Closed", color: "text-rose-400 bg-rose-500/10", border: "border-rose-500/30" },
];

const SALES_REPS = [
  { id: "rep-1", name: "Amit Sharma", email: "amit.sharma@sunpowersolutions.com", phone: "+91 98722 00002" },
  { id: "rep-2", name: "Neha Verma", email: "neha.verma@sunpowersolutions.com", phone: "+91 98722 00003" },
  { id: "rep-3", name: "Rajesh Malhotra (Director)", email: "rajesh.m@sunpowersolutions.com", phone: "+91 98722 00001" },
  { id: "rep-4", name: "Vikas Sethi", email: "vikas.sethi@sunpowersolutions.com", phone: "+91 98722 00008" },
];

export default function LeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [activities, setActivities] = React.useState<LeadActivity[]>([]);
  const [viewMode, setViewMode] = React.useState<"kanban" | "table">("kanban");

  // Selected Lead Drawer / Detail Modal
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);

  // New Lead Modal
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [capacityKw, setCapacityKw] = React.useState("3");
  const [topology, setTopology] = React.useState<"ON_GRID" | "OFF_GRID" | "HYBRID">("ON_GRID");
  const [address, setAddress] = React.useState("");
  const [monthlyBill, setMonthlyBill] = React.useState("5000");
  const [roofAvailability, setRoofAvailability] = React.useState("IMMEDIATE");
  const [isSubsidyRequested, setIsSubsidyRequested] = React.useState(true);
  const [additionalRequirements, setAdditionalRequirements] = React.useState("");

  // Drawer Action Forms
  const [assigneeId, setAssigneeId] = React.useState("rep-1");
  const [followUpInput, setFollowUpInput] = React.useState("");
  const [newNoteInput, setNewNoteInput] = React.useState("");

  // Survey Schedule Dialog
  const [isScheduleOpen, setIsScheduleOpen] = React.useState(false);
  const [surveyDate, setSurveyDate] = React.useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [surveyTechId, setSurveyTechId] = React.useState("20000000-0000-0000-0000-000000000006");
  const [surveyNotes, setSurveyNotes] = React.useState("Verify RCC parapet shadow and south-facing azimuth.");

  const loadData = React.useCallback(() => {
    const store = getStore();
    setLeads([...store.leads]);
    setActivities([...store.leadActivities]);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep selectedLead updated with latest mutations
  const activeLead = selectedLead ? leads.find((l) => l.id === selectedLead.id) || selectedLead : null;
  const activeLeadActivities = activeLead
    ? activities
        .filter((a) => a.lead_id === activeLead.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      toast({
        title: "Validation Error",
        description: "Customer Name and Phone Number are mandatory.",
        variant: "error",
      });
      return;
    }

    const store = getStore();
    const code = `LED-2026-${String(store.leads.length + 101).padStart(4, "0")}`;

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      organization_id: "00000000-0000-0000-0000-000000000001",
      lead_code: code,
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || "Model Town",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144001",
      interested_capacity_kw: Number(capacityKw) || 3,
      system_topology: topology,
      monthly_bill_amount: Number(monthlyBill) || 5000,
      roof_availability: roofAvailability,
      is_subsidy_requested: isSubsidyRequested,
      additional_requirements: additionalRequirements || undefined,
      assigned_sales_rep_id: "rep-1",
      assigned_sales_rep_name: "Amit Sharma",
      follow_up_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      source: "PHONE_INQUIRY",
      status: "NEW",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.leads.unshift(newLead);

    addLeadActivity(
      newLead.id,
      "SYSTEM_AUDIT",
      `Direct inquiry registered for ${newLead.interested_capacity_kw} kW ${newLead.system_topology} system. Assigned to Amit Sharma.`,
      "sales_coordinator",
      "Sales Coordinator"
    );

    loadData();
    setIsAddOpen(false);

    setFullName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setAdditionalRequirements("");

    toast({
      title: "Lead Created Successfully",
      description: `Inquiry registered for ${newLead.full_name} (${code}).`,
      variant: "success",
    });
  };

  const handleAssignSalesperson = () => {
    if (!activeLead) return;
    const rep = SALES_REPS.find((r) => r.id === assigneeId) || SALES_REPS[0];
    try {
      assignSalesperson(
        activeLead.id,
        rep.id,
        rep.name,
        followUpInput || activeLead.follow_up_date,
        undefined,
        "sales_manager"
      );
      loadData();
      toast({
        title: "Salesperson Assigned",
        description: `${activeLead.full_name} assigned to ${rep.name}.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({ title: "Assignment Failed", description: err.message, variant: "error" });
    }
  };

  const handleScheduleFollowUp = () => {
    if (!activeLead || !followUpInput) {
      toast({ title: "Date Required", description: "Please pick a follow-up date.", variant: "warning" });
      return;
    }
    try {
      scheduleLeadFollowUp(
        activeLead.id,
        followUpInput,
        newNoteInput || "Customer requested detailed callback regarding PM Surya Ghar subsidy.",
        "sales_rep",
        activeLead.assigned_sales_rep_name || "Sales Rep"
      );
      setNewNoteInput("");
      loadData();
      toast({
        title: "Follow-up Scheduled",
        description: `Next action date set to ${followUpInput}.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "error" });
    }
  };

  const handleAddNote = () => {
    if (!activeLead || !newNoteInput.trim()) return;
    addLeadActivity(
      activeLead.id,
      "NOTE",
      newNoteInput.trim(),
      "sales_rep",
      activeLead.assigned_sales_rep_name || "Sales Rep"
    );
    setNewNoteInput("");
    loadData();
    toast({ title: "Note Logged", description: "Activity history updated.", variant: "success" });
  };

  const handleAdvanceStage = (id: string, targetStatus: LeadStatus) => {
    try {
      updateLeadStatus(id, targetStatus, "sales_rep", "Sales Rep");
      loadData();
      toast({
        title: "Lead Status Advanced",
        description: `Moved lead to ${targetStatus}.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "error" });
    }
  };

  const handleScheduleSurveyForLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;

    try {
      const store = getStore();
      const tech = store.technicians.find((t) => t.profile_id === surveyTechId);
      const techName = tech ? tech.name : "Manpreet Singh";

      scheduleSurvey(
        activeLead.id,
        surveyTechId,
        techName,
        surveyDate,
        surveyNotes,
        "sales_rep",
        activeLead.assigned_sales_rep_name || "Sales Rep"
      );

      loadData();
      setIsScheduleOpen(false);

      toast({
        title: "Site Survey Scheduled",
        description: `Survey scheduled with technician ${techName} for ${surveyDate}.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({ title: "Scheduling Error", description: err.message, variant: "error" });
    }
  };

  // KPI Metrics
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => l.status === "QUALIFIED").length;
  const surveyScheduled = leads.filter((l) => l.status === "SURVEY_SCHEDULED" || l.status === "SURVEY_COMPLETED").length;
  const convertedLeads = leads.filter((l) => l.status === "WON" || (l.status as any) === "CONVERTED").length;
  const winRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0;

  // Table Columns
  const columns: Column<Lead>[] = [
    {
      header: "Lead / Customer",
      accessorKey: "full_name",
      sortable: true,
      cell: (row) => (
        <div>
          <button
            onClick={() => setSelectedLead(row)}
            className="font-bold text-foreground hover:text-primary transition-colors text-left"
          >
            {row.full_name}
          </button>
          <p className="text-[11px] font-mono text-muted-foreground">{row.lead_code}</p>
        </div>
      ),
    },
    {
      header: "Contact",
      accessorKey: "phone",
      cell: (row) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-1 font-mono text-foreground font-medium">
            <Phone className="w-3 h-3 text-primary" /> {row.phone}
          </p>
          <p className="text-[11px] truncate max-w-[180px]">{row.address}, {row.city}</p>
        </div>
      ),
    },
    {
      header: "System Specs",
      accessorKey: "interested_capacity_kw",
      sortable: true,
      cell: (row) => (
        <div className="text-xs">
          <span className="font-bold text-foreground">{row.interested_capacity_kw} kW</span>
          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-muted border border-border">
            {row.system_topology}
          </span>
          {row.monthly_bill_amount && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Bill: ₹{row.monthly_bill_amount.toLocaleString()}/mo
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Assigned Rep",
      cell: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-foreground">{row.assigned_sales_rep_name || "Unassigned"}</p>
          {row.follow_up_date && (
            <p className="text-[10px] text-amber-500 flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3" /> {row.follow_up_date}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Stage",
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
            className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setSelectedLead(row)}
          >
            Lead 360
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            CRM & Rooftop Lead Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            End-to-end sales lifecycle: Public enquiry intake, salesperson assignment, scheduled follow-ups, and site surveys.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/enquiry"
            target="_blank"
            className="px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Public Enquiry Form
          </Link>

          {/* View Toggle */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === "kanban" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === "table" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Data Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Lead
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border border-border">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Inquiries</p>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">{totalLeads}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Qualified Leads</p>
            <p className="text-xl sm:text-2xl font-black text-teal-500 mt-0.5">{qualifiedLeads}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Surveys Scheduled</p>
            <p className="text-xl sm:text-2xl font-black text-amber-500 mt-0.5">{surveyScheduled}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Converted Contracts</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-500 mt-0.5">{convertedLeads}</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-primary/5 border-primary/20">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Win Conversion Rate</p>
            <p className="text-xl sm:text-2xl font-black text-primary mt-0.5">{winRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area: Kanban Board vs Table */}
      {viewMode === "kanban" ? (
        /* Kanban Pipeline Board (All 8 Stages) */
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex gap-3.5 min-w-[1400px]">
            {STAGES.map((stage) => {
              const stageLeads = leads.filter((l) => {
                if (stage.id === "WON") return l.status === "WON" || (l.status as any) === "CONVERTED";
                if (stage.id === "QUOTED") return l.status === "QUOTED" || (l.status as any) === "QUOTATION_SENT";
                return l.status === stage.id;
              });

              return (
                <div
                  key={stage.id}
                  className="w-72 bg-card/60 border border-border rounded-xl p-3 flex flex-col flex-shrink-0 space-y-3 max-h-[750px]"
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${stage.color} ${stage.border}`}>
                      {stage.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Stage Cards Scroll Area */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-border">
                    {stageLeads.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                        No leads in this stage
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="p-3 rounded-lg bg-card border border-border hover:border-primary/50 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2 group"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                                {lead.full_name}
                              </p>
                              <p className="text-[10px] font-mono text-muted-foreground">{lead.lead_code}</p>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">
                              {lead.interested_capacity_kw} kW
                            </span>
                          </div>

                          <div className="text-[11px] text-muted-foreground space-y-1">
                            <p className="flex items-center gap-1 font-mono text-foreground">
                              <Phone className="w-3 h-3 text-primary shrink-0" />
                              {lead.phone}
                            </p>
                            <p className="truncate text-[10px]">{lead.address}, {lead.city}</p>
                          </div>

                          <div className="pt-1 border-t border-border/80 flex items-center justify-between text-[10px]">
                            <span className="font-medium text-foreground truncate max-w-[120px]">
                              {lead.assigned_sales_rep_name || "Unassigned"}
                            </span>
                            {lead.follow_up_date && (
                              <span className="font-mono text-amber-500 flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {lead.follow_up_date}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Data Table View */
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base font-bold">Rooftop Lead Pipeline</CardTitle>
            <CardDescription className="text-xs">
              Search, filter by stage, and progress qualified prospects to technical roof surveys.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <DataTable
              data={leads}
              columns={columns}
              searchPlaceholder="Search leads by customer name, phone, code..."
              filterOptions={{
                label: "Stage",
                key: "status",
                options: STAGES.map((s) => ({ label: s.label, value: s.id })),
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Add Lead Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Rooftop Inquiry</DialogTitle>
            <DialogDescription>
              Capture homeowner details, roof location, and estimated kW requirement.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Customer Full Name *</label>
              <Input
                placeholder="e.g. Kulwinder Singh"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Phone Number *</label>
                <Input
                  placeholder="+919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Target Capacity</label>
                <select
                  value={capacityKw}
                  onChange={(e) => setCapacityKw(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="1">1 kW (4 Panels)</option>
                  <option value="2">2 kW (6 Panels)</option>
                  <option value="3">3 kW (8 Panels)</option>
                  <option value="4">4 kW (10 Panels)</option>
                  <option value="5">5 kW (12 Panels)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">System Topology</label>
                <select
                  value={topology}
                  onChange={(e) => setTopology(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="ON_GRID">On-Grid (Net Metered)</option>
                  <option value="OFF_GRID">Off-Grid (Battery Storage)</option>
                  <option value="HYBRID">Hybrid (Grid + Battery)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Monthly Electricity Bill (₹)</label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={monthlyBill}
                  onChange={(e) => setMonthlyBill(e.target.value)}
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Roof Availability</label>
                <select
                  value={roofAvailability}
                  onChange={(e) => setRoofAvailability(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="IMMEDIATE">Immediate Dedicated Roof</option>
                  <option value="UNDER_CONSTRUCTION">Under Construction</option>
                  <option value="SHARED">Shared Roof</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Installation Address</label>
              <Input
                placeholder="House / Street, City, Pincode"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Additional Requirements</label>
              <textarea
                rows={2}
                placeholder="Special mounting structure, meter shifting, etc."
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                className="w-full p-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Save & Register
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead 360 Detail & Activity History Modal */}
      {activeLead && (
        <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <span>{activeLead.full_name}</span>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                      {activeLead.lead_code}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    Registered on {new Date(activeLead.created_at).toLocaleDateString()} via {activeLead.source}
                  </DialogDescription>
                </div>
                <StatusPill status={activeLead.status} />
              </div>
            </DialogHeader>

            <div className="space-y-5 text-xs">
              {/* Lead Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-muted/40 border border-border">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Contact Phone</p>
                  <p className="font-mono font-bold text-foreground mt-0.5">{activeLead.phone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Target System</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {activeLead.interested_capacity_kw} kW ({activeLead.system_topology})
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Monthly Bill</p>
                  <p className="font-mono font-bold text-foreground mt-0.5">
                    {activeLead.monthly_bill_amount ? formatCurrency(activeLead.monthly_bill_amount) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">PM Surya Ghar</p>
                  <p className="font-bold text-purple-500 mt-0.5">
                    {activeLead.is_subsidy_requested ? "Eligible (₹78k)" : "Not Requested"}
                  </p>
                </div>
              </div>

              {/* Salesperson Assignment & Next Follow-Up Row */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Assigned Sales Representative & Follow-Up
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Assign Salesperson</label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-background border border-input rounded-md text-xs focus:ring-1 focus:ring-primary"
                    >
                      {SALES_REPS.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Scheduled Follow-Up Date</label>
                    <Input
                      type="date"
                      value={followUpInput || activeLead.follow_up_date || ""}
                      onChange={(e) => setFollowUpInput(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      size="sm"
                      onClick={handleAssignSalesperson}
                      className="w-full h-8 text-xs bg-primary text-primary-foreground font-semibold"
                    >
                      Update Assignment
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stage Transition Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
                <span className="text-[11px] font-bold text-muted-foreground">Move Stage:</span>
                {activeLead.status === "NEW" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-blue-500 text-blue-500 hover:bg-blue-500/10"
                    onClick={() => handleAdvanceStage(activeLead.id, "CONTACTED")}
                  >
                    Mark Contacted
                  </Button>
                )}
                {activeLead.status === "CONTACTED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-teal-500 text-teal-500 hover:bg-teal-500/10"
                    onClick={() => handleAdvanceStage(activeLead.id, "QUALIFIED")}
                  >
                    Mark Qualified
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-7 text-xs bg-primary text-primary-foreground font-semibold"
                  onClick={() => setIsScheduleOpen(true)}
                >
                  <Compass className="w-3.5 h-3.5 mr-1" />
                  Schedule Site Survey
                </Button>
                {activeLead.status !== "WON" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-500/10"
                    onClick={() => handleAdvanceStage(activeLead.id, "WON")}
                  >
                    Mark Converted / Won
                  </Button>
                )}
              </div>

              {/* Add Note & Activity Log */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <History className="w-4 h-4 text-primary" />
                    Immutable Activity History ({activeLeadActivities.length})
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Log customer call notes, quote feedback, or technical constraints..."
                    value={newNoteInput}
                    onChange={(e) => setNewNoteInput(e.target.value)}
                    className="text-xs bg-background"
                  />
                  <Button size="sm" onClick={handleAddNote} className="h-8 text-xs shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    Add Note
                  </Button>
                </div>

                {/* Activity Feed Timeline */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 border border-border rounded-lg p-2.5 bg-muted/20 scrollbar-thin">
                  {activeLeadActivities.length === 0 ? (
                    <p className="text-center text-muted-foreground text-xs py-3">No activity logged yet.</p>
                  ) : (
                    activeLeadActivities.map((act) => (
                      <div key={act.id} className="p-2 rounded bg-background border border-border/70 text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono font-bold text-primary">{act.activity_type}</span>
                          <span className="text-muted-foreground">{new Date(act.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-foreground text-[11px] leading-relaxed">{act.details}</p>
                        {act.performer_name && (
                          <p className="text-[10px] text-muted-foreground text-right italic">— {act.performer_name}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedLead(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Schedule Site Survey Modal for Selected Lead */}
      {activeLead && (
        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" />
                Schedule Rooftop Site Survey
              </DialogTitle>
              <DialogDescription>
                Dispatch a certified survey technician to measure azimuth, tilt angle, and shadow obstacles for {activeLead.full_name}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleScheduleSurveyForLead} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Customer / Property</label>
                <p className="font-bold text-foreground">
                  {activeLead.full_name} ({activeLead.address}, {activeLead.city})
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Requested: {activeLead.interested_capacity_kw} kW {activeLead.system_topology}
                </p>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Scheduled Date *</label>
                <Input
                  type="date"
                  value={surveyDate}
                  onChange={(e) => setSurveyDate(e.target.value)}
                  className="bg-background"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Assign Survey Technician *</label>
                <select
                  value={surveyTechId}
                  onChange={(e) => setSurveyTechId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="20000000-0000-0000-0000-000000000006">Manpreet Singh (Tier 1 Lead Surveyor)</option>
                  <option value="20000000-0000-0000-0000-000000000007">Harpreet Bajwa (Certified Electrician)</option>
                  <option value="20000000-0000-0000-0000-000000000008">Amritpal Singh (Rooftop Technician)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Survey Instructions & Roof Access Notes</label>
                <textarea
                  rows={2}
                  value={surveyNotes}
                  onChange={(e) => setSurveyNotes(e.target.value)}
                  className="w-full p-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                  Confirm & Dispatch Technician
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
