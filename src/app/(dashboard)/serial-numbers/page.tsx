"use client";

import * as React from "react";
import {
  QrCode,
  Search,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Barcode,
  PackageCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Truck,
  User,
  Wrench,
  Shield,
  Layers,
  Camera,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-context";
import { getStore } from "@/lib/data/store";
import { SerialNumber, ProductComponent, SerialStatus } from "@/lib/types/database";
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";

export default function SerialNumbersPage() {
  const { toast } = useToast();
  const [serials, setSerials] = React.useState<
    (SerialNumber & { component?: ProductComponent })[]
  >([]);
  const [activeStatusFilter, setActiveStatusFilter] = React.useState<string>("ALL");

  // Registration Dialog
  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false);
  const [serialCode, setSerialCode] = React.useState("");
  const [componentType, setComponentType] = React.useState("INVERTER");
  const [supplierName, setSupplierName] = React.useState("Growatt New Energy");

  // Lifecycle Details Dialog
  const [selectedSerial, setSelectedSerial] = React.useState<
    (SerialNumber & { component?: ProductComponent }) | null
  >(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  // Quick Scanner Search
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);

  const loadData = React.useCallback(() => {
    const store = getStore();
    const enriched = store.serialNumbers.map((s) => ({
      ...s,
      component: store.components.find((c) => c.id === s.component_id),
      component_code: s.component_code || store.components.find((c) => c.id === s.component_id)?.component_code,
      component_name: s.component_name || store.components.find((c) => c.id === s.component_id)?.name,
      supplier_name: s.supplier_name || "Approved OEM",
      location_name: s.location_name || "Main Central Logistics Hub - Jalandhar",
    }));
    setSerials(enriched);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegisterSerial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialCode.trim()) return;

    const store = getStore();
    const cleanSerial = serialCode.trim();

    // Architectural check: Unique serial constraint check
    const existing = store.serialNumbers.find(
      (s) => s.serial_number.toLowerCase() === cleanSerial.toLowerCase()
    );
    if (existing) {
      toast({
        title: "Duplicate Serial Blocked",
        description: `Serial '${cleanSerial}' is already registered in the system (Constraint enforced).`,
        variant: "error",
      });
      return;
    }

    const component =
      store.components.find((c) => c.category === componentType) || store.components[2];

    const newSerial: SerialNumber = {
      id: `sn-${Date.now()}`,
      organization_id: "00000000-0000-0000-0000-000000000001",
      component_id: component.id,
      component_code: component.component_code,
      component_name: component.name,
      serial_number: cleanSerial,
      status: "IN_STOCK",
      supplier_name: supplierName.trim() || component.supplier_name || "OEM Partner",
      purchase_date: new Date().toISOString().split("T")[0],
      location_id: "10000000-0000-0000-0000-000000000001",
      location_name: "Main Central Logistics Hub - Jalandhar",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.serialNumbers.unshift(newSerial);
    loadData();
    setIsRegisterOpen(false);
    setSerialCode("");

    toast({
      title: "Serial Number Registered",
      description: `${newSerial.serial_number} recorded in Main Warehouse inventory with unique constraint.`,
      variant: "success",
    });
  };

  const handleScannerLookup = (code: string) => {
    const found = serials.find((s) => s.serial_number.toLowerCase() === code.toLowerCase());
    if (found) {
      setSelectedSerial(found);
      setIsDetailsOpen(true);
      setIsScannerOpen(false);
      toast({
        title: "Hardware Located",
        description: `Found ${found.serial_number} (${found.status}). Showing complete lifecycle.`,
        variant: "success",
      });
    } else {
      toast({
        title: "Serial Not Found",
        description: `Serial '${code}' is not present in warehouse registry. Would you like to register it?`,
        variant: "warning",
      });
      setSerialCode(code);
      setIsRegisterOpen(true);
      setIsScannerOpen(false);
    }
  };

  // Filter serials by status
  const filteredSerials = serials.filter((s) => {
    if (activeStatusFilter === "ALL") return true;
    return s.status === activeStatusFilter;
  });

  const columns: Column<SerialNumber & { component?: ProductComponent }>[] = [
    {
      header: "Serial Barcode Number",
      accessorKey: "serial_number",
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Barcode className="w-5 h-5 text-primary" />
          <div>
            <p className="font-bold text-foreground font-mono text-xs">{row.serial_number}</p>
            <p className="text-[10px] text-muted-foreground font-mono">
              Purchased: {row.purchase_date || new Date(row.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Product / Component",
      accessorKey: "component_code",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground text-xs">{row.component_name || row.component?.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
              {row.component_code || row.component?.component_code}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {row.component?.category}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Supplier",
      accessorKey: "supplier_name",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-foreground font-medium flex items-center gap-1">
          <Building2 className="w-3 h-3 text-muted-foreground" />
          {row.supplier_name || "OEM Partner"}
        </span>
      ),
    },
    {
      header: "Lifecycle Status",
      accessorKey: "status",
      sortable: true,
      cell: (row) => <StatusPill status={row.status} />,
    },
    {
      header: "Current Assignment",
      cell: (row) => {
        if (row.customer_name) {
          return (
            <div className="text-xs">
              <p className="font-semibold text-foreground flex items-center gap-1">
                <User className="w-3 h-3 text-muted-foreground" />
                {row.customer_name}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground">
                {row.order_number || row.dispatch_reference || "Allocated"}
              </p>
            </div>
          );
        }
        return (
          <span className="text-xs text-muted-foreground font-mono">
            {row.location_name || "Main Warehouse"}
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
          onClick={() => {
            setSelectedSerial(row);
            setIsDetailsOpen(true);
          }}
        >
          Lifecycle
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
            <QrCode className="w-6 h-6 text-primary" />
            Serial Number & Hardware Barcode Registry
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Zero-loss serialized tracking for inverters, panels, batteries, and charge controllers with anti-double-booking constraints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsScannerOpen(true)}
            className="h-9 text-xs font-semibold gap-1.5 border-border"
          >
            <Camera className="w-3.5 h-3.5 text-primary" />
            Scan Barcode
          </Button>

          <Button
            onClick={() => {
              setSerialCode(`INV-3KW-2026-${Math.floor(1000 + Math.random() * 9000)}`);
              setIsRegisterOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Register Serial
          </Button>
        </div>
      </div>

      {/* Safeguard Alert */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-foreground">Anti-Double-Dispatch & Unique Serial Protection Active</p>
          <p className="text-muted-foreground leading-relaxed">
            Every serial number is governed by database constraints and execution mutexes. A serialized unit cannot be
            dispatched twice, cross-allocated to an unauthorized order, or deployed without an approved gate pass.
          </p>
        </div>
      </div>

      {/* Lifecycle Status Filter Bar */}
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground font-semibold">Filter by Lifecycle Status:</div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "ALL", label: `All (${serials.length})` },
            { id: "IN_STOCK", label: `In Stock (${serials.filter((s) => s.status === "IN_STOCK").length})` },
            { id: "RESERVED", label: `Reserved (${serials.filter((s) => s.status === "RESERVED").length})` },
            { id: "DISPATCHED", label: `Dispatched (${serials.filter((s) => s.status === "DISPATCHED").length})` },
            { id: "INSTALLED", label: `Installed (${serials.filter((s) => s.status === "INSTALLED").length})` },
            { id: "UNDER_REPAIR", label: `Under Repair (${serials.filter((s) => s.status === "UNDER_REPAIR").length})` },
            { id: "REPLACED", label: `Replaced (${serials.filter((s) => s.status === "REPLACED").length})` },
            { id: "RETURNED", label: `Returned (${serials.filter((s) => s.status === "RETURNED").length})` },
            { id: "RETIRED", label: `Retired (${serials.filter((s) => s.status === "RETIRED").length})` },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setActiveStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeStatusFilter === st.id
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Serial Registry Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Tracked Serial Register</CardTitle>
              <CardDescription className="text-xs">
                Review hardware status across warehouse stock, in-transit dispatch, and commissioned rooftop installations.
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              Showing {filteredSerials.length} of {serials.length} units
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={filteredSerials}
            columns={columns}
            searchPlaceholder="Search by serial number (e.g. INV-3KW-2026-0041, PV-540W)..."
          />
        </CardContent>
      </Card>

      {/* Register Serial Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Serial Barcode</DialogTitle>
            <DialogDescription>
              Scan barcode from inverter or battery carton to enter into warehouse inventory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterSerial} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Component Category</label>
              <select
                value={componentType}
                onChange={(e) => {
                  setComponentType(e.target.value);
                  if (e.target.value === "INVERTER") setSupplierName("Growatt New Energy");
                  else if (e.target.value === "BATTERY") setSupplierName("Exide Technologies");
                  else if (e.target.value === "PANEL") setSupplierName("Waaree Energies Ltd");
                  else if (e.target.value === "CHARGE_CONTROLLER") setSupplierName("SmartSolar Power Systems");
                }}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="INVERTER">Solar Inverter (1 kW - 5 kW)</option>
                <option value="BATTERY">LiFePO4 Lithium Battery (5.12 kWh)</option>
                <option value="PANEL">Mono-PERC Solar PV Module (540W)</option>
                <option value="CHARGE_CONTROLLER">MPPT Charge Controller (60A)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Supplier Name *</label>
              <Input
                placeholder="e.g. Growatt New Energy"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Serial Number / Barcode *</label>
              <Input
                placeholder="e.g. INV-3KW-2026-0099"
                value={serialCode}
                onChange={(e) => setSerialCode(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Register Serial
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Modal */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hardware Barcode Scanner</DialogTitle>
            <DialogDescription>
              Scan hardware barcode via device camera or quick select from warehouse inventory.
            </DialogDescription>
          </DialogHeader>

          <BarcodeScanner
            onScan={handleScannerLookup}
            placeholder="Scan barcode or type serial..."
            suggestedSerials={serials.map((s) => s.serial_number)}
          />
        </DialogContent>
      </Dialog>

      {/* Serial Full Lifecycle Dialog */}
      {selectedSerial && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-primary" />
                Serial Lifecycle Traceability
              </DialogTitle>
              <DialogDescription>
                Complete immutable history for serial unit {selectedSerial.serial_number}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <p className="font-mono font-bold text-sm text-foreground">{selectedSerial.serial_number}</p>
                  <p className="text-muted-foreground mt-0.5">{selectedSerial.component_name || selectedSerial.component?.name}</p>
                </div>
                <StatusPill status={selectedSerial.status} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Supplier</p>
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedSerial.supplier_name || "OEM Partner"}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Purchase Date</p>
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedSerial.purchase_date || "2026-10-01"}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Warehouse Location</p>
                  <p className="font-semibold text-foreground">
                    {selectedSerial.location_name || "Main Jalandhar Hub"}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Dispatch Reference</p>
                  <p className="font-semibold text-foreground font-mono flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedSerial.dispatch_reference || selectedSerial.dispatch_id || "Not Dispatched"}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Customer Site</p>
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedSerial.customer_name || "Unassigned"}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Warranty Policy</p>
                  <p className="font-semibold text-foreground font-mono flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    {selectedSerial.warranty_id || "trg_auto_warranty_pending"}
                  </p>
                </div>
              </div>

              {selectedSerial.notes && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                  <p className="font-bold mb-0.5">QA & Technical Observations:</p>
                  <p>{selectedSerial.notes}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
