"use client";

import * as React from "react";
import {
  Sun,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Printer,
  FileCheck,
  Zap,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { StatusPill } from "@/components/shared/status-pill";
import { formatCurrency } from "@/lib/utils";
import { Quotation, QuotationItem, Lead, SiteSurvey } from "@/lib/types/database";

export default function CustomerQuotationPortalPage({
  params,
}: {
  params: { id: string };
}) {
  const [quotation, setQuotation] = React.useState<Quotation | null>(null);
  const [items, setItems] = React.useState<QuotationItem[]>([]);
  const [lead, setLead] = React.useState<Lead | null>(null);
  const [survey, setSurvey] = React.useState<SiteSurvey | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modals
  const [isAcceptOpen, setIsAcceptOpen] = React.useState(false);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [customerName, setCustomerName] = React.useState("");
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const fetchQuotationData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quotations/${params.id}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to load quotation");
      }

      setQuotation(data.data.quotation);
      setItems(data.data.items || []);
      setLead(data.data.lead || null);
      setSurvey(data.data.survey || null);
      if (data.data.lead?.full_name) {
        setCustomerName(data.data.lead.full_name);
      }
    } catch (err: any) {
      setError(err.message || "Quotation could not be retrieved.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  React.useEffect(() => {
    fetchQuotationData();
  }, [fetchQuotationData]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/quotations/${quotation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACCEPT",
          customerName: customerName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Acceptance failed");
      }

      setQuotation(data.data);
      setIsAcceptOpen(false);
      setActionSuccess("Thank you! You have accepted this quotation. Your SunPower project manager will contact you shortly to coordinate advance payment and installation.");
    } catch (err: any) {
      alert(`Error accepting quotation: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotation) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/quotations/${quotation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          customerName: customerName.trim(),
          reason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Rejection failed");
      }

      setQuotation(data.data);
      setIsRejectOpen(false);
      setActionSuccess("Quotation marked as declined. Our design team has been notified of your feedback.");
    } catch (err: any) {
      alert(`Error declining quotation: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading official solar quotation...</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 shadow-md">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">Quotation Unavailable</h2>
            <p className="text-xs text-slate-600">{error || "This quotation link may be invalid or expired."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAccepted = quotation.status === "ACCEPTED";
  const isRejected = quotation.status === "REJECTED";
  const canAct = quotation.status === "APPROVED" || quotation.status === "SENT";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white print:p-0">
      {/* Top Action Bar (hidden in print) */}
      <div className="bg-slate-900 text-white px-4 py-3 print:hidden sticky top-0 z-30 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight">SunPower Solutions</span>
            <span className="text-[11px] text-slate-400 block font-mono">SolarOS Customer Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="h-8 text-xs bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Download / Print PDF
          </Button>

          {canAct && (
            <>
              <Button
                size="sm"
                onClick={() => setIsAcceptOpen(true)}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Accept Quotation
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsRejectOpen(true)}
                className="h-8 text-xs border-red-500/50 text-red-300 hover:bg-red-950/30"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Decline
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Document Container */}
      <div className="max-w-4xl mx-auto my-6 bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200 print:my-0 print:border-none print:shadow-none">
        {/* Status Alerts */}
        {actionSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-4 text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Action Confirmed</p>
              <p className="text-xs">{actionSuccess}</p>
            </div>
          </div>
        )}

        {isAccepted && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> This quotation was officially ACCEPTED on{" "}
              {quotation.accepted_at ? new Date(quotation.accepted_at).toLocaleString() : "record"}.
            </span>
            <span className="font-mono bg-emerald-700 px-2 py-0.5 rounded text-[11px]">Contract Active</span>
          </div>
        )}

        {isRejected && (
          <div className="bg-red-600 text-white px-6 py-2.5 flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Quotation was DECLINED on{" "}
              {quotation.rejected_at ? new Date(quotation.rejected_at).toLocaleString() : "record"}.
            </span>
            {quotation.rejection_reason && (
              <span className="italic opacity-90 truncate max-w-xs font-normal">Reason: {quotation.rejection_reason}</span>
            )}
          </div>
        )}

        {/* Corporate Header */}
        <div className="p-8 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Sun className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">SunPower Solutions</h1>
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Approved Rooftop Solar Engineering & EPC Contractor. Certified PM Surya Ghar Vendor.
            </p>
            <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-600" /> Focal Point Industrial Zone, Jalandhar, Punjab - 144001
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-emerald-600" /> +91 (181) 456-7890 | GSTIN: 03AAAAA0000A1Z5
              </p>
            </div>
          </div>

          <div className="sm:text-right space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Formal Proposal</span>
            <p className="text-lg font-black text-slate-900 font-mono">{quotation.quotation_number}</p>
            <div className="text-xs space-y-0.5">
              <p className="text-slate-600">
                <span className="text-slate-400">Version:</span>{" "}
                <span className="font-bold">v{quotation.version}</span>
              </p>
              <p className="text-slate-600">
                <span className="text-slate-400">Date:</span> {new Date(quotation.created_at).toLocaleDateString()}
              </p>
              <p className="text-slate-600">
                <span className="text-slate-400">Valid Until:</span>{" "}
                <span className="font-semibold text-emerald-700">{quotation.valid_until}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Technical Profile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-slate-50/50 border-b border-slate-200">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Customer & Site Profile</h3>
            <p className="font-extrabold text-slate-900 text-sm">{lead?.full_name || "Valued Customer"}</p>
            <p className="text-xs text-slate-600 mt-1">{lead?.address || "Site Address"}</p>
            <p className="text-xs text-slate-600">
              {lead?.city}, {lead?.state} - {lead?.pincode}
            </p>
            <p className="text-xs text-slate-600 mt-1 font-mono">
              Phone: {lead?.phone} | Email: {lead?.email || "N/A"}
            </p>
            {survey?.sanctioned_load_kw && (
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                Discom Sanctioned Load: {survey.sanctioned_load_kw} kW (PSPCL)
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">System Configuration</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Rated System Capacity:</span>
                <span className="font-bold text-slate-900 font-mono">{quotation.system_capacity_kw} kW</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">System Architecture:</span>
                <span className="font-bold text-slate-900">
                  {quotation.system_topology === "ON_GRID"
                    ? "On-Grid Net Metered (String Inverter)"
                    : "Off-Grid Hybrid (Lithium BESS Storage)"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Verified Technical Survey:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {survey?.survey_code || "SUR-VERIFIED"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Inventory Allocation:</span>
                <span className="font-bold text-emerald-700">
                  {quotation.inventory_availability_status === "FULL_STOCK" ? "100% In Stock" : "Reserved for Build"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Bill of Materials (BOM) */}
        <div className="p-8 border-b border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Itemized Bill of Materials (BOM) & Equipment Specifications</span>
            <span className="text-[11px] text-slate-500 font-normal">Deterministic Recipe Engine v2.4</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Component / Specification</th>
                  <th className="py-2.5 px-3">Warranty</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{item.component_name || item.component_code}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.component_code}</p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium text-[11px]">
                        {item.component_code?.includes("PANEL")
                          ? "25 Years Performance"
                          : item.component_code?.includes("INV")
                          ? "5 Years Replacement"
                          : item.component_code?.includes("BATT")
                          ? "5 Years Warranty"
                          : "1 Year Standard"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {item.quantity} {item.unit_of_measure || "units"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-500">
                      Standard {quotation.system_capacity_kw} kW {quotation.system_topology} BOM package.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing, Subsidy & Net Payable Summary */}
        <div className="p-8 bg-slate-50/60 flex flex-col md:flex-row justify-between gap-8">
          <div className="max-w-md space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              PM Surya Ghar: Muft Bijli Yojana Financial Benefit
            </h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              As an authorized Ministry of New and Renewable Energy (MNRE) vendor, SunPower Solutions handles end-to-end
              national portal subsidy processing, Discom bi-directional net-meter synchronization, and direct beneficiary
              subsidy transfer (DBT) to your bank account.
            </p>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 space-y-1">
              <p className="font-bold text-xs">Estimated Monthly Bill Savings:</p>
              <p className="text-[11px]">
                Approximately <span className="font-bold">360–420 kWh generated/month</span>, yielding ₹3,200–₹3,800
                savings every billing cycle.
              </p>
            </div>
          </div>

          <div className="w-full md:w-80 space-y-2 text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span>Hardware & Materials:</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrency(quotation.hardware_total)}</span>
            </div>

            <div className="flex justify-between py-1 text-slate-600">
              <span>Installation & Civil Work:</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrency(quotation.installation_charges)}</span>
            </div>

            <div className="flex justify-between py-1 text-slate-600">
              <span>Logistics & Transit Insurance:</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrency(quotation.logistics_charges)}</span>
            </div>

            {quotation.discount_amount > 0 && (
              <div className="flex justify-between py-1 text-emerald-700 font-semibold">
                <span>Promotional Discount:</span>
                <span className="font-mono">- {formatCurrency(quotation.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between py-1 text-slate-600 border-t border-slate-200 pt-2">
              <span>GST (12% Solar Rate):</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrency(quotation.tax_amount)}</span>
            </div>

            <div className="flex justify-between py-2 border-t border-slate-300 font-bold text-sm text-slate-900">
              <span>Gross Contract Value:</span>
              <span className="font-mono">{formatCurrency(quotation.gross_total)}</span>
            </div>

            <div className="flex justify-between py-1.5 text-purple-700 font-bold bg-purple-50 px-2 rounded">
              <span>Less: PM Surya Ghar Subsidy:</span>
              <span className="font-mono">- {formatCurrency(quotation.estimated_subsidy_amount)}</span>
            </div>

            <div className="flex justify-between py-3 border-t-2 border-slate-900 font-black text-base text-emerald-700">
              <span>Net Cost to Customer:</span>
              <span className="font-mono text-lg">{formatCurrency(quotation.net_payable_by_customer)}</span>
            </div>

            <p className="text-[10px] text-slate-400 text-right italic">
              * Advance Booking: 20% ({formatCurrency(Math.round(quotation.gross_total * 0.2))}) upon acceptance
            </p>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="p-8 border-t border-slate-200 text-[11px] text-slate-500 space-y-2 bg-white">
          <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Commercial & Warranty Terms</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <span className="font-semibold text-slate-700">Payment Milestones:</span> 20% advance booking payment on
              order confirmation, 60% pre-dispatch inspection milestone, 20% upon installation testing and handover.
            </li>
            <li>
              <span className="font-semibold text-slate-700">Statutory Clearances:</span> Net metering liaising with PSPCL
              is included. Customer to provide latest electricity bill and property ownership records.
            </li>
            <li>
              <span className="font-semibold text-slate-700">Comprehensive Warranty:</span> 25-year linear performance
              guarantee on PV modules; 5-year replacement guarantee on string inverter.
            </li>
          </ul>
        </div>

        {/* Customer Decision Footer (Actionable on Web) */}
        {canAct && (
          <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div>
              <p className="font-bold text-sm">Ready to power your rooftop with SunPower?</p>
              <p className="text-xs text-slate-400">Accept this quotation online to lock in pricing and reserve stock.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsRejectOpen(true)}
                className="w-full sm:w-auto text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Request Modification / Decline
              </Button>
              <Button
                onClick={() => setIsAcceptOpen(true)}
                className="w-full sm:w-auto text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20"
              >
                Accept Proposal & Book System
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Accept Confirmation Dialog */}
      <Dialog open={isAcceptOpen} onOpenChange={setIsAcceptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Solar Quotation</DialogTitle>
            <DialogDescription>
              Confirm your acceptance of {quotation.quotation_number} for {quotation.system_capacity_kw} kW system.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAccept} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-900 block mb-1">Your Full Name (Electronic Signature)</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Enter your legal full name"
              />
            </div>

            <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
              <p className="font-bold text-slate-900">Contract Total: {formatCurrency(quotation.gross_total)}</p>
              <p className="text-[11px] text-slate-600">
                Net Payable after PM Surya Ghar Subsidy:{" "}
                <span className="font-bold text-emerald-700">{formatCurrency(quotation.net_payable_by_customer)}</span>
              </p>
              <p className="text-[10px] text-slate-500 pt-1 border-t">
                By clicking confirm, you acknowledge agreement with SunPower Solutions proposal terms and authorize order
                creation.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAcceptOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !customerName.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {submitting ? "Confirming..." : "Confirm & Accept Proposal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject / Decline Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline or Request Revision</DialogTitle>
            <DialogDescription>
              Provide feedback for our sales and engineering team to update your proposal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReject} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-900 block mb-1">Reason for Decline / Requested Changes</label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="E.g., require higher capacity, change to hybrid battery system, or pricing adjustment..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold"
              >
                {submitting ? "Submitting..." : "Submit Feedback & Decline"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
