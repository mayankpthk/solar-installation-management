"use client";

import * as React from "react";
import {
  Settings,
  ShieldCheck,
  Building,
  Sliders,
  Database,
  History,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/shared/toast-context";

export default function SettingsPage() {
  const { toast } = useToast();

  // Business Parameters state
  const [orgName, setOrgName] = React.useState("SunPower Solutions");
  const [gstin, setGstin] = React.useState("03AAAAA0000A1Z5");
  const [advancePct, setAdvancePct] = React.useState("20");
  const [minMargin, setMinMargin] = React.useState("25");
  const [inverterWarrantyYrs, setInverterWarrantyYrs] = React.useState("2");
  const [panelWarrantyYrs, setPanelWarrantyYrs] = React.useState("20");

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "System Configuration Saved",
      description: "Business parameters and corporate policy updated successfully.",
      variant: "success",
    });
  };

  const auditEvents = [
    {
      time: "2026-11-21 09:30:12",
      user: "Rajesh Malhotra (Director)",
      action: "QUOTATION_APPROVED",
      entity: "QT-2026-0001",
      details: "BOM validated: Margin 27.8% >= 25% threshold",
    },
    {
      time: "2026-11-21 08:45:00",
      user: "Manpreet Singh (Survey Tech)",
      action: "SURVEY_APPROVED",
      entity: "SRV-2026-0001",
      details: "Cleared azimuth 180° south-facing and 18m cable run",
    },
    {
      time: "2026-11-20 16:15:22",
      user: "System (trg_auto_warranty_delivery)",
      action: "WARRANTY_ACTIVATED",
      entity: "INV-2024-884912",
      details: "Delivery confirmed for ORD-2026-0089. Clock started.",
    },
    {
      time: "2026-11-20 14:00:10",
      user: "Surjit Singh (Warehouse Lead)",
      action: "SERIAL_ASSIGNED",
      entity: "INV-2026-0042",
      details: "Serialized to delivery manifest MNF-2026-0012",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Enterprise Settings & System Governance
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configurable business parameters, Row Level Security (RLS) enforcement, and immutable audit logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                Configurable Business Rules & Defaults
              </CardTitle>
              <CardDescription className="text-xs">
                In compliance with architectural principles, unstated business policies are parameterized here.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Company Operating Name</label>
                    <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">GSTIN Registration</label>
                    <Input value={gstin} onChange={(e) => setGstin(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Default Booking Advance (%)
                    </label>
                    <Input value={advancePct} onChange={(e) => setAdvancePct(e.target.value)} />
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      Required to unlock staging
                    </span>
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Minimum Target Gross Margin (%)
                    </label>
                    <Input value={minMargin} onChange={(e) => setMinMargin(e.target.value)} />
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      Quotes below this trigger alert
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Standard Inverter Warranty (Years)
                    </label>
                    <Input
                      value={inverterWarrantyYrs}
                      onChange={(e) => setInverterWarrantyYrs(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Standard Panel Warranty (Years)
                    </label>
                    <Input
                      value={panelWarrantyYrs}
                      onChange={(e) => setPanelWarrantyYrs(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                    Save Configuration
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Immutable Audit Log Viewer */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                Immutable System Audit History
              </CardTitle>
              <CardDescription className="text-xs">
                Append-only log of sensitive operations: gate approvals, warranty clocks, and serial allocations.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">User Profile</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Record</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditEvents.map((evt, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px] whitespace-nowrap">
                        {evt.time}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{evt.user}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground">
                          {evt.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">{evt.entity}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{evt.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Security & RLS Health Sidebar */}
        <div className="space-y-6">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Security & Isolation Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground">Multi-Tenant Isolation (RLS)</p>
                  <p className="text-muted-foreground mt-0.5">
                    PostgreSQL Row Level Security is active. Tenants are locked strictly to their organization_id.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground">Single Source of Truth</p>
                  <p className="text-muted-foreground mt-0.5">
                    Deterministic pricing, BOM recipes, and warranty durations are governed by domain engines.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground">Anti-Double Booking</p>
                  <p className="text-muted-foreground mt-0.5">
                    Unique partial index prevents duplicate serial assignments across active job sites.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
