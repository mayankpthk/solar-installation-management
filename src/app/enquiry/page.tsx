"use client";

import * as React from "react";
import Link from "next/link";
import {
  SunMedium,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Zap,
  ArrowRight,
  Landmark,
  BadgePercent,
  Home,
  Check,
  Building,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/shared/toast-context";
import { formatCurrency } from "@/lib/utils";
import { getStore, addLeadActivity, addAuditLogEntry } from "@/lib/data/store";
import { Lead } from "@/lib/types/database";

function PublicEnquiryForm() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = React.useState(false);
  const [leadCode, setLeadCode] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form Fields
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("Jalandhar");
  const [state, setState] = React.useState("Punjab");
  const [pincode, setPincode] = React.useState("144001");
  const [capacityKw, setCapacityKw] = React.useState("3");
  const [topology, setTopology] = React.useState<"ON_GRID" | "OFF_GRID" | "HYBRID">("ON_GRID");
  const [monthlyBill, setMonthlyBill] = React.useState("5000");
  const [roofAvailability, setRoofAvailability] = React.useState("IMMEDIATE");
  const [isSubsidyRequested, setIsSubsidyRequested] = React.useState(true);
  const [additionalRequirements, setAdditionalRequirements] = React.useState("");

  // Live Savings Calculation based on monthly bill
  const billNum = Number(monthlyBill) || 0;
  const estimatedAnnualSavings = Math.round(billNum * 12 * 0.9);
  const eligibleSubsidy = topology === "ON_GRID" ? (Number(capacityKw) >= 3 ? 78000 : Number(capacityKw) * 30000) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in your name, contact phone number, and address.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const store = getStore();
      const code = `LED-2026-${String(store.leads.length + 101).padStart(4, "0")}`;

      const newLead: Lead = {
        id: `lead-pub-${Date.now()}`,
        organization_id: "00000000-0000-0000-0000-000000000001",
        lead_code: code,
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        interested_capacity_kw: Number(capacityKw) || 3,
        system_topology: topology,
        monthly_bill_amount: Number(monthlyBill) || 5000,
        roof_availability: roofAvailability,
        is_subsidy_requested: isSubsidyRequested,
        additional_requirements: additionalRequirements.trim() || undefined,
        source: "WEB_FORM",
        status: "NEW",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      store.leads.unshift(newLead);

      // Log activity
      addLeadActivity(
        newLead.id,
        "SYSTEM_AUDIT",
        `Public enquiry submitted via Web Portal: ${newLead.interested_capacity_kw} kW ${newLead.system_topology} system. Roof: ${newLead.roof_availability}. Monthly bill: ₹${newLead.monthly_bill_amount}. Subsidy: ${newLead.is_subsidy_requested ? "Yes" : "No"}.`,
        "public_user",
        "Public Customer"
      );

      // Audit Log
      addAuditLogEntry({
        performed_by: "public_customer",
        user_role: "CUSTOMER",
        table_name: "leads",
        record_id: newLead.id,
        action: "INSERT",
        new_data: { lead_code: code, fullName, phone, capacityKw, topology },
      });

      // Notification to Sales Team
      store.notifications.unshift({
        id: `notif-${Date.now()}`,
        user_id: "20000000-0000-0000-0000-000000000002", // Sales Lead
        title: `New Rooftop Solar Enquiry: ${fullName}`,
        message: `${fullName} requested a ${capacityKw} kW ${topology} system in ${city}. Phone: ${phone}.`,
        type: "INFO",
        is_read: false,
        action_url: "/leads",
        created_at: new Date().toISOString(),
      });

      setLeadCode(code);
      setSubmitted(true);
      toast({
        title: "Enquiry Submitted Successfully!",
        description: `Your enquiry reference is ${code}. Our solar specialist will reach out shortly.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit enquiry.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Public Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-950/50">
            <SunMedium className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5 leading-none">
              SunPower Solutions
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-semibold border border-emerald-500/30">
                Authorized MNRE Channel Partner
              </span>
            </span>
            <p className="text-[11px] text-slate-400 mt-1">SolarOS Customer Enquiry Portal</p>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <a
            href="tel:+919872200001"
            className="hidden sm:flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>+91 98722 00001 (Sales Desk)</span>
          </a>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition-colors"
          >
            Admin Sign-In →
          </Link>
        </div>
      </header>

      {/* Hero & Form Section */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8 my-auto">
        {!submitted ? (
          <div className="space-y-6">
            {/* Value Proposition Header */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                PM Surya Ghar: Muft Bijli Yojana Partner
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Cut Your Electricity Bill by up to 90%
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Get a free customized rooftop engineering survey and proposal with 2-year inverter replacement
                and 20-year performance warranties.
              </p>
            </div>

            {/* Main Enquiry Form Card */}
            <Card className="bg-slate-900 border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-800 bg-slate-950/40 p-5 sm:p-6">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  Rooftop Solar Feasibility & Price Quote Request
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Fill in your property and electricity details below. No upfront payment required.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 sm:p-7">
                <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                  {/* Section 1: Customer Contact Details */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px]">
                        1
                      </span>
                      Personal & Contact Information
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-slate-200 block mb-1">
                          Full Name <span className="text-emerald-400">*</span>
                        </label>
                        <Input
                          placeholder="e.g. Gurpreet Singh"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-emerald-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-200 block mb-1">
                          Phone Number (WhatsApp Active) <span className="text-emerald-400">*</span>
                        </label>
                        <Input
                          placeholder="+91 98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-200 block mb-1">
                        Email Address (Optional, for Digital Quotation PDF)
                      </label>
                      <Input
                        type="email"
                        placeholder="gurpreet@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Section 2: Property & Installation Address */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px]">
                        2
                      </span>
                      Installation Property Address
                    </p>

                    <div>
                      <label className="font-semibold text-slate-200 block mb-1">
                        House Number, Street or Landmark <span className="text-emerald-400">*</span>
                      </label>
                      <Input
                        placeholder="House No. 128, Green Avenue, Near Civil Hospital"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="font-semibold text-slate-200 block mb-1">City</label>
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-200 block mb-1">State</label>
                        <Input
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-200 block mb-1">Pincode</label>
                        <Input
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Solar System & Roof Specs */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[10px]">
                        3
                      </span>
                      System Capacity, Topology & Roof Status
                    </p>

                    <div>
                      <label className="font-semibold text-slate-200 block mb-1.5">
                        Required System Capacity (kW)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {[
                          { kw: "1", label: "1 kW", panels: "4 Panels (1-2 BHK)" },
                          { kw: "2", label: "2 kW", panels: "6 Panels (2-3 BHK)" },
                          { kw: "3", label: "3 kW", panels: "8 Panels (3-4 BHK)" },
                          { kw: "4", label: "4 kW", panels: "10 Panels (Bungalow)" },
                          { kw: "5", label: "5 kW", panels: "12 Panels (Villa/Comm)" },
                        ].map((tier) => (
                          <button
                            type="button"
                            key={tier.kw}
                            onClick={() => setCapacityKw(tier.kw)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              capacityKw === tier.kw
                                ? "bg-emerald-500/20 border-emerald-500 text-white shadow-md shadow-emerald-950/40"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <p className="font-black text-sm text-white">{tier.label}</p>
                            <p className="text-[10px] mt-0.5 leading-tight">{tier.panels}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="font-semibold text-slate-200 block mb-1">System Topology</label>
                        <select
                          value={topology}
                          onChange={(e) => setTopology(e.target.value as any)}
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="ON_GRID">On-Grid (Net Metered with Discom)</option>
                          <option value="OFF_GRID">Off-Grid (With Lithium LiFePO4 Battery)</option>
                          <option value="HYBRID">Hybrid (Grid Tied + Battery Backup)</option>
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {topology === "ON_GRID"
                            ? "Exports excess electricity to the grid via bi-directional meter. 100% eligible for PM Surya Ghar."
                            : "Independent power generation with energy storage for areas with frequent power outages."}
                        </p>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-200 block mb-1">
                          Current Monthly Electricity Bill (₹)
                        </label>
                        <Input
                          type="number"
                          placeholder="5000"
                          value={monthlyBill}
                          onChange={(e) => setMonthlyBill(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500"
                        />
                        <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                          Est. Annual Savings: {formatCurrency(estimatedAnnualSavings)} / year
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="font-semibold text-slate-200 block mb-1">Roof Availability</label>
                        <select
                          value={roofAvailability}
                          onChange={(e) => setRoofAvailability(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="IMMEDIATE">Immediate (100% Dedicated Concrete/Tin Roof)</option>
                          <option value="UNDER_CONSTRUCTION">Building Under Construction (Ready in 30 Days)</option>
                          <option value="SHARED">Shared Apartment Roof (NOC Needed)</option>
                          <option value="SHADED">Partially Shaded / Tree Obstacles</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-emerald-500/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={isSubsidyRequested}
                            onChange={(e) => setIsSubsidyRequested(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-white block">
                              Apply for PM Surya Ghar Subsidy
                            </span>
                            <span className="text-[11px] text-emerald-400 font-mono">
                              Eligible for up to {formatCurrency(eligibleSubsidy || 78000)} Direct Subsidy
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-200 block mb-1">
                        Additional Requirements or Questions
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Prefer bi-facial solar panels, elevated mounting structure, or 3-phase inverter..."
                        value={additionalRequirements}
                        onChange={(e) => setAdditionalRequirements(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span>Submitting Rooftop Enquiry...</span>
                      ) : (
                        <>
                          <span>Submit Free Rooftop Feasibility Enquiry</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                    <p className="text-center text-[11px] text-slate-500 mt-2">
                      Zero commitment. A certified SunPower technician will verify your roof azimuth and tilt.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Submission Success State */
          <Card className="bg-slate-900 border-slate-800 shadow-2xl rounded-2xl overflow-hidden max-w-xl mx-auto animate-in zoom-in-95">
            <CardContent className="p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  Enquiry Registered Successfully
                </span>
                <h2 className="text-2xl font-bold text-white pt-1">Thank You, {fullName}!</h2>
                <p className="text-xs text-slate-400">
                  Your rooftop feasibility enquiry has been registered in the SunPower Solutions operations queue.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Enquiry Tracking Reference:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{leadCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Requested Capacity:</span>
                  <span className="font-semibold text-white">{capacityKw} kW ({topology})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target Location:</span>
                  <span className="font-semibold text-white">{city}, {state}</span>
                </div>
                {eligibleSubsidy > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Estimated PM Surya Ghar Subsidy:</span>
                    <span className="font-mono font-bold text-purple-400">{formatCurrency(eligibleSubsidy)}</span>
                  </div>
                )}
              </div>

              <div className="text-left space-y-2 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> What Happens Next:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] pl-1">
                  <li>Our sales engineering team will call you within 2 working hours to confirm roof orientation.</li>
                  <li>A certified survey technician will be dispatched for physical shadow and azimuth measurements.</li>
                  <li>You will receive an automated Bill of Materials (BOM) quote with full Discom net-metering support.</li>
                </ol>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/leads"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-sm"
                >
                  View in CRM Lead Board →
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setFullName("");
                    setPhone("");
                  }}
                  className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Submit Another Enquiry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>© 2026 SunPower Solutions. Powered by SolarOS — The Complete Solar Business Operating System.</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Registered with Punjab State Power Corporation Limited (PSPCL) & MNRE National Portal.
        </p>
      </footer>
    </div>
  );
}

export default function PublicEnquiryPage() {
  return (
    <ToastProvider>
      <PublicEnquiryForm />
    </ToastProvider>
  );
}
