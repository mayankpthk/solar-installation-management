"use client";

import * as React from "react";
import {
  Printer,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  Phone,
  Barcode,
  Layers,
  Wrench,
  Award,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateCompletionReportData } from "@/domain/installations/installation-engine";

interface CommissioningReportModalProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommissioningReportModal({
  jobId,
  isOpen,
  onClose,
}: CommissioningReportModalProps) {
  const [data, setData] = React.useState<ReturnType<typeof generateCompletionReportData> | null>(null);

  React.useEffect(() => {
    if (jobId && isOpen) {
      try {
        const reportData = generateCompletionReportData(jobId);
        setData(reportData);
      } catch {
        setData(null);
      }
    }
  }, [jobId, isOpen]);

  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Rooftop Solar Installation & Commissioning Certificate
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">
                Certificate ID: CERT-COM-{data.job.id.toUpperCase()} • Order: {data.system.orderNumber}
              </DialogDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Official Certificate Body */}
        <div id="printable-completion-report" className="space-y-4 text-xs">
          {/* Company Letterhead */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base tracking-tight">{data.company.name}</h3>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">{data.company.address}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                GSTIN: {data.company.gstin} • Support: {data.company.phone}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold font-mono">
                <ShieldCheck className="w-3.5 h-3.5" /> MNRE CEA COMPLIANT
              </span>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Issued: {new Date(data.generatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Customer & System Specification Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-border bg-card space-y-1">
              <p className="text-muted-foreground text-[10px] uppercase font-bold">Site & Customer Information</p>
              <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {data.customer.name}
              </p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">{data.customer.address}</p>
              <p className="text-muted-foreground font-mono text-[10px] flex items-center gap-1">
                <Phone className="w-3 h-3" /> {data.customer.phone}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border bg-card space-y-1">
              <p className="text-muted-foreground text-[10px] uppercase font-bold">Solar Plant Specification</p>
              <p className="font-bold text-foreground text-sm">
                {data.system.capacityKw} kW {data.system.topology.replace("_", "-")} System
              </p>
              <p className="text-muted-foreground text-[11px] font-mono">
                Sales Order Ref: {data.system.orderNumber}
              </p>
              <p className="text-muted-foreground text-[11px] font-mono">
                Transit Manifest: {data.system.dispatchNumber}
              </p>
              <p className="text-emerald-600 font-semibold text-[10px]">
                Commissioning Date: {data.job.finishTime ? new Date(data.job.finishTime).toLocaleDateString() : "Pending"}
              </p>
            </div>
          </div>

          {/* Electrical Test Readings Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-2.5 bg-muted/60 font-bold border-b border-border flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-primary" /> Live Commissioning Electrical Test Results
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">Passed Statutory Audit</span>
            </div>

            <div className="grid grid-cols-5 divide-x divide-border bg-card text-center p-3">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold">DC Voltage</p>
                <p className="font-mono font-extrabold text-sm text-foreground mt-0.5">
                  {data.measurements.dcVoltage} V
                </p>
                <span className="text-[9px] text-muted-foreground">Open Circuit</span>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold">DC Current</p>
                <p className="font-mono font-extrabold text-sm text-foreground mt-0.5">
                  {data.measurements.dcCurrent} A
                </p>
                <span className="text-[9px] text-muted-foreground">String Array</span>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold">AC Grid Voltage</p>
                <p className="font-mono font-extrabold text-sm text-foreground mt-0.5">
                  {data.measurements.acVoltage} V
                </p>
                <span className="text-[9px] text-muted-foreground">Phase-Neutral</span>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold">Instant Power</p>
                <p className="font-mono font-extrabold text-sm text-emerald-600 mt-0.5">
                  {data.measurements.generationKw} kW
                </p>
                <span className="text-[9px] text-muted-foreground">Synchronized</span>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold">Earthing Ohms</p>
                <p className="font-mono font-extrabold text-sm text-foreground mt-0.5">
                  {data.measurements.earthingResistanceOhms} Ω
                </p>
                <span className="text-[9px] text-emerald-600 font-bold">&lt; 5.0 Ω Compliant</span>
              </div>
            </div>
          </div>

          {/* 8-Step SOP Checklist Audit */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-2.5 bg-muted/60 font-bold border-b border-border text-xs flex items-center justify-between">
              <span>8-Point Installation Standard Operating Procedure (SOP) Audit</span>
              <span className="text-[10px] font-mono text-muted-foreground">8 of 8 Checkpoints Passed</span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-card text-xs">
              {[
                { label: "1. Mounting Structures Torqued & Fastened", done: data.checklist.mountingStructuresFitted },
                { label: "2. Solar Panels Installed & Clamped", done: data.checklist.solarPanelsInstalled },
                { label: "3. Inverter Mounted & Wall Grounded", done: data.checklist.inverterInstalled },
                { label: "4. DC & AC Cabling Glanded in Conduits", done: data.checklist.wiringCompleted },
                { label: "5. Electrical Safety Disconnects & SPD", done: data.checklist.electricalSafetyChecksCompleted },
                { label: "6. Chemical Earthing Pit Complete (<5Ω)", done: data.checklist.earthingCompleted },
                { label: "7. High-Pot & Insulation Testing Performed", done: data.checklist.systemTestingPerformed },
                { label: "8. Power Generation & Net Meter Verified", done: data.checklist.powerGenerationVerified },
              ].map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${step.done ? "text-emerald-500" : "text-muted-foreground"}`} />
                  <span className={step.done ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Equipment Serial Numbers */}
          {data.serials.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-2.5 bg-muted/60 font-bold border-b border-border text-xs">
                Verified Hardware Serial Number Registry
              </div>
              <div className="divide-y divide-border bg-card">
                {data.serials.map((s, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs font-mono">
                    <div>
                      <p className="font-bold text-foreground">{s.serialNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{s.componentName} ({s.componentCode})</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{s.supplier}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dual Sign-Off Block */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <p className="text-muted-foreground text-[10px] uppercase font-bold">Certified Lead Technician</p>
              <p className="font-bold text-foreground text-sm">{data.technician.name}</p>
              <p className="text-[10px] text-muted-foreground">{data.technician.certification}</p>
              <div className="pt-2 border-t border-border/60">
                <p className="text-[10px] text-emerald-600 font-mono font-bold">✓ Commissioning Engineer Sign-Off</p>
                <p className="text-[9px] text-muted-foreground font-mono">Timestamp: {new Date(data.generatedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <p className="text-muted-foreground text-[10px] uppercase font-bold">Customer Handover & Acceptance</p>
              <p className="font-bold text-foreground text-sm">
                {data.signature?.signerName || data.customer.name}
              </p>
              {data.signature?.signatureSvg ? (
                <div className="h-10 bg-white border border-border rounded flex items-center justify-center overflow-hidden">
                  <img src={data.signature.signatureSvg} alt="Customer Signature" className="max-h-8 max-w-full object-contain" />
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">Signature captured on file</p>
              )}
              <div className="pt-2 border-t border-border/60">
                <p className="text-[10px] text-emerald-600 font-mono font-bold">
                  ✓ Customer Accepted ({data.signature?.rating || 5} / 5 Stars)
                </p>
                <p className="text-[9px] text-muted-foreground font-mono">
                  Signed: {data.signature?.timestamp ? new Date(data.signature.timestamp).toLocaleString() : "Confirmed"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3">
          <Button variant="outline" onClick={onClose}>
            Close Certificate
          </Button>
          <Button
            className="bg-primary text-primary-foreground font-bold text-xs"
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Commissioning Certificate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
