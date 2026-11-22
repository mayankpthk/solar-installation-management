import { ShieldCheck, LifeBuoy, FileText, CheckCircle2, Zap, Calendar, Wrench } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/shared/status-pill";

export default function CustomerPortalPage() {
  const customerSystem = {
    customerName: "Davinder Singh",
    installationAddress: "Street 4, Model Town, Jalandhar, Punjab",
    systemCapacity: "3.0 kW Rooftop On-Grid",
    commissionedDate: "15 May 2024",
    installedPanels: "6x 540W Mono-PERC Bifacial (3.24 kWp)",
    inverterModel: "3 kW Single-Phase String Inverter",
    inverterSerial: "INV-2024-884912",
    discomProvider: "PSPCL (Punjab State Power Corp)",
    subsidyApplicationNo: "PMSGY-PB-2024-88912",
  };

  const warranties = [
    {
      component: "Solar PV Modules (6 Panels)",
      serialLot: "LOT-PANEL-2024-05",
      duration: "20 Years (240 Months)",
      validUntil: "15 May 2044",
      status: "ACTIVE",
    },
    {
      component: "Grid-Tied String Inverter",
      serialLot: "INV-2024-884912",
      duration: "2 Years (24 Months)",
      validUntil: "15 May 2026",
      status: "ACTIVE",
    },
    {
      component: "Installation & Workmanship",
      serialLot: "CERT-INST-2024-0089",
      duration: "1 Year (12 Months)",
      validUntil: "15 May 2025",
      status: "EXPIRED",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">
            Welcome to your Solar Portal
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">{customerSystem.customerName}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{customerSystem.installationAddress}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            System Live & Generating
          </span>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">System Capacity</p>
              <p className="text-xl font-bold text-slate-900">{customerSystem.systemCapacity}</p>
              <p className="text-xs text-slate-500 mt-0.5">{customerSystem.installedPanels}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Inverter Serial</p>
              <p className="text-lg font-bold font-mono text-slate-900">{customerSystem.inverterSerial}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">Under Active Warranty</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Commissioned Date</p>
              <p className="text-lg font-bold text-slate-900">{customerSystem.commissionedDate}</p>
              <p className="text-xs text-slate-500 mt-0.5">Discom: {customerSystem.discomProvider}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warranties Table */}
      <Card id="warranty" className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Digital Warranty Certificates
              </CardTitle>
              <CardDescription className="text-xs">
                Your hardware is registered in the SunPower Solutions tamper-evident registry.
              </CardDescription>
            </div>
            <button className="text-xs text-amber-600 font-semibold hover:underline flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Download All Certificates (PDF)
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-xs font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Serial / Lot Number</th>
                <th className="py-3 px-4">Warranty Duration</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {warranties.map((w, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{w.component}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{w.serialLot}</td>
                  <td className="py-3 px-4 text-slate-600">{w.duration}</td>
                  <td className="py-3 px-4 text-slate-900 font-medium">{w.validUntil}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusPill status={w.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Service Request & Subsidy Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instant Service Request (Scene 5) */}
        <Card id="service" className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-amber-600" />
              Need Service or Maintenance?
            </CardTitle>
            <CardDescription className="text-xs">
              Experiencing an inverter error code or reduced power generation? Log a service ticket instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="font-semibold text-amber-950">Active Warranty Protection</p>
              <p className="text-amber-800 mt-0.5">
                Your inverter is under full replacement warranty. In-warranty repairs and technician visits are covered at <span className="font-bold">₹0.00 billable cost</span>.
              </p>
            </div>
            <button className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5">
              <Wrench className="w-4 h-4 text-amber-400" />
              File In-Warranty Service Request
            </button>
          </CardContent>
        </Card>

        {/* Subsidy Progress Tracker */}
        <Card id="subsidy" className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              PM Surya Ghar Subsidy Tracker
            </CardTitle>
            <CardDescription className="text-xs">
              Application Ref: <span className="font-mono font-semibold text-slate-800">{customerSystem.subsidyApplicationNo}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-700">
                <span>Eligible Subsidy:</span>
                <span className="font-bold text-slate-900">₹78,000.00</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>Current Stage:</span>
                <span className="font-semibold text-purple-700">Net Meter Installed & Inspected</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                <div className="bg-purple-600 h-2 rounded-full w-4/5" />
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Next Step: Direct Benefit Transfer (DBT) claim lodged with ministry; disbursement expected within 14 banking days.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
