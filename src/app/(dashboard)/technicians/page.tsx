"use client";

import * as React from "react";
import {
  UserCog,
  Phone,
  Mail,
  Award,
  CheckCircle2,
  Clock,
  Star,
  Wrench,
  Calendar,
  Layers,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { useToast } from "@/components/shared/toast-context";
import { formatCurrency } from "@/lib/utils";
import { getStore } from "@/lib/data/store";
import { Technician } from "@/lib/types/database";

export default function TechniciansPage() {
  const { toast } = useToast();
  const [technicians, setTechnicians] = React.useState<
    (Technician & {
      name: string;
      phone: string;
      email: string;
      completedJobs?: number;
      rating?: number;
      activeJobId?: string;
    })[]
  >([]);
  const [activeFilter, setActiveFilter] = React.useState<"ALL" | "AVAILABLE" | "ON_JOB">("ALL");

  const loadData = React.useCallback(() => {
    const store = getStore();

    const enriched = store.technicians.map((tech) => {
      // Find jobs completed by this technician
      const completedJobs = store.installations.filter(
        (j) =>
          j.status === "APPROVED" &&
          (j.lead_technician_id === tech.profile_id ||
            (j.team_technician_ids && j.team_technician_ids.includes(tech.profile_id)))
      ).length;

      // Find any active job
      const activeJob = store.installations.find(
        (j) =>
          (j.status === "IN_PROGRESS" || j.status === "ASSIGNED" || j.status === "TESTING") &&
          (j.lead_technician_id === tech.profile_id ||
            (j.team_technician_ids && j.team_technician_ids.includes(tech.profile_id)))
      );

      // Default ratings from 4.7 to 5.0
      const rating = 4.8 + ((tech.hourly_rate % 30) / 100);

      return {
        ...tech,
        completedJobs: tech.completed_jobs_count || completedJobs || 12,
        rating: tech.customer_rating || Math.min(5.0, Number(rating.toFixed(1))),
        activeJobId: activeJob?.id,
      };
    });

    setTechnicians(enriched);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = (id: string) => {
    const store = getStore();
    const tech = store.technicians.find((t) => t.id === id);
    if (tech) {
      tech.is_available = !tech.is_available;
      loadData();
      toast({
        title: "Technician Availability Updated",
        description: `${tech.name} is now ${tech.is_available ? "Available for Dispatch" : "Off Duty"}.`,
        variant: "info",
      });
    }
  };

  const filteredTechs = technicians.filter((t) => {
    if (activeFilter === "AVAILABLE") return t.is_available && !t.activeJobId;
    if (activeFilter === "ON_JOB") return !!t.activeJobId;
    return true;
  });

  const activeCount = technicians.filter((t) => t.is_available).length;
  const onJobCount = technicians.filter((t) => t.activeJobId).length;
  const avgHourlyRate = technicians.length > 0
    ? technicians.reduce((sum, t) => sum + t.hourly_rate, 0) / technicians.length
    : 0;

  const columns: Column<
    Technician & {
      name: string;
      phone: string;
      email: string;
      completedJobs?: number;
      rating?: number;
      activeJobId?: string;
    }
  >[] = [
    {
      header: "Technician Profile",
      accessorKey: "name",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
            {row.name}
            {row.certifications && row.certifications.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
                Certified
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {row.skills.map((skill) => (
              <span
                key={skill}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold"
              >
                {skill.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      header: "Contact Details",
      cell: (row) => (
        <div className="text-xs space-y-0.5 font-mono text-muted-foreground">
          <p className="flex items-center gap-1 text-foreground font-semibold">
            <Phone className="w-3 h-3 text-primary" /> {row.phone}
          </p>
          <p className="flex items-center gap-1 truncate max-w-[170px]">
            <Mail className="w-3 h-3" /> {row.email}
          </p>
        </div>
      ),
    },
    {
      header: "Performance & Jobs",
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <p className="font-bold text-foreground flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {row.rating} / 5.0
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {row.completedJobs} Completed Jobs
          </p>
        </div>
      ),
    },
    {
      header: "Labor Rate",
      accessorKey: "hourly_rate",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-mono font-bold text-foreground">
          {formatCurrency(row.hourly_rate)} / hr
        </span>
      ),
    },
    {
      header: "Deployment Status",
      accessorKey: "is_available",
      sortable: true,
      cell: (row) => {
        if (row.activeJobId) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-500/15 text-blue-600 border border-blue-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              DEPLOYED ON-JOB
            </span>
          );
        }
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono ${
              row.is_available
                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                : "bg-slate-500/15 text-slate-500 border border-slate-500/30"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${row.is_available ? "bg-emerald-500" : "bg-slate-400"}`} />
            {row.is_available ? "AVAILABLE" : "OFF-DUTY"}
          </span>
        );
      },
    },
    {
      header: "Actions",
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-border hover:bg-muted font-semibold"
          onClick={() => handleToggleStatus(row.id)}
        >
          {row.is_available ? "Set Off-Duty" : "Set Available"}
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
            <UserCog className="w-6 h-6 text-primary" />
            Field Technicians & Crew Management (15 Staff)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Certified solar electricians, roof mounting riggers, billable hourly rates, and on-site deployment rosters.
          </p>
        </div>
      </div>

      {/* KPI Workload Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Certified Crew Roster</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{technicians.length} Staff</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <UserCog className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Currently On Site</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">{onJobCount} Deployed</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Available for Dispatch</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{activeCount} Ready</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Average Labor Cost</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{formatCurrency(avgHourlyRate)}/hr</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roster Filter Tabs */}
      <div className="flex gap-2 text-xs">
        {[
          { id: "ALL", label: `All Crew (${technicians.length})` },
          { id: "AVAILABLE", label: `Available for Dispatch (${technicians.filter((t) => t.is_available && !t.activeJobId).length})` },
          { id: "ON_JOB", label: `Active On-Site (${onJobCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeFilter === tab.id
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "bg-muted/70 hover:bg-muted text-muted-foreground border border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Technicians Data Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Punjab Solar Technician Roster</CardTitle>
              <CardDescription className="text-xs">
                Review solar electricians, inverter synchronization specialists, and roof anchoring leads.
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              Showing {filteredTechs.length} technicians
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={filteredTechs}
            columns={columns}
            searchPlaceholder="Search technician by name, phone or skill..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
