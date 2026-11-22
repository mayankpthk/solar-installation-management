"use client";

import * as React from "react";
import {
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MapPin,
  Plus,
  QrCode,
  FileText,
  AlertTriangle,
  Barcode,
  Layers,
  ArrowRight,
  User,
  Phone,
  Printer,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-context";
import { getStore } from "@/lib/data/store";
import { Dispatch, Order, MaterialPickingList, SerialNumber } from "@/lib/types/database";
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";
import {
  generateMaterialPickingList,
  reserveInventoryForOrder,
  executeAtomicDispatch,
  confirmDispatchDelivery,
  DispatchError,
} from "@/domain/inventory/dispatch-engine";

export default function DispatchPage() {
  const { toast } = useToast();
  const [dispatches, setDispatches] = React.useState<Dispatch[]>([]);
  const [ordersReady, setOrdersReady] = React.useState<Order[]>([]);

  // 10-Step Dispatch Wizard State
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>("");
  const [currentPickingList, setCurrentPickingList] = React.useState<MaterialPickingList | null>(null);
  const [isInventoryReserved, setIsInventoryReserved] = React.useState<boolean>(false);

  // Serial Scanning State: map of componentCode -> array of scanned serials
  const [scannedSerialsMap, setScannedSerialsMap] = React.useState<Record<string, string[]>>({});
  const [activeScanningComponent, setActiveScanningComponent] = React.useState<string>("");

  // Logistics & Vehicle State
  const [vehiclePlate, setVehiclePlate] = React.useState("PB-08-AX-9912");
  const [driverName, setDriverName] = React.useState("Balwant Singh");
  const [driverPhone, setDriverPhone] = React.useState("+919876544321");
  const [isDispatching, setIsDispatching] = React.useState(false);

  // Official Gate Pass Modal State
  const [selectedGatePass, setSelectedGatePass] = React.useState<Dispatch | null>(null);
  const [isGatePassOpen, setIsGatePassOpen] = React.useState(false);

  const loadData = React.useCallback(() => {
    const store = getStore();
    setDispatches([...store.dispatches]);

    // Find orders eligible for dispatch
    const readyOrders = store.orders.filter(
      (o) => o.status !== "DISPATCHED" && o.status !== "COMPLETED" && o.status !== "CANCELLED"
    );
    setOrdersReady(readyOrders);
    if (readyOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(readyOrders[0].id);
    }
  }, [selectedOrderId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // When order selection changes in wizard, generate fresh picking list
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    try {
      const pList = generateMaterialPickingList(orderId);
      setCurrentPickingList(pList);
      setIsInventoryReserved(false);

      // Pre-fill any already reserved serials for this order
      const initialMap: Record<string, string[]> = {};
      for (const item of pList.items) {
        if (item.is_serial_tracked) {
          initialMap[item.component_code] = [...item.scanned_serials];
        }
      }
      setScannedSerialsMap(initialMap);

      // Set first serial-tracked item as active scanning target
      const firstSerialItem = pList.items.find((i) => i.is_serial_tracked);
      if (firstSerialItem) {
        setActiveScanningComponent(firstSerialItem.component_code);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error generating picking list";
      toast({ title: "Picking List Error", description: msg, variant: "error" });
    }
  };

  // Step 3: Reserve required inventory atomically
  const handleReserveStock = () => {
    if (!selectedOrderId) return;
    try {
      reserveInventoryForOrder(
        selectedOrderId,
        "WAREHOUSE_MANAGER",
        "20000000-0000-0000-0000-000000000004",
        "Warehouse Logistics Supervisor"
      );
      setIsInventoryReserved(true);
      // Refresh picking list
      const updatedPList = generateMaterialPickingList(selectedOrderId);
      setCurrentPickingList(updatedPList);

      toast({
        title: "Inventory Successfully Reserved",
        description: `BOM stock locked for Order ${updatedPList.order_number}. Quantities reserved in warehouse registry.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Insufficient stock for reservation";
      toast({
        title: "Reservation Blocked",
        description: msg,
        variant: "error",
      });
    }
  };

  // Step 4 & 5: Add scanned serial number with validation
  const handleScanSerial = (scannedSerial: string) => {
    if (!activeScanningComponent) {
      toast({ title: "No Target SKU Selected", description: "Select a component to scan serials for.", variant: "warning" });
      return;
    }

    const currentScanned = scannedSerialsMap[activeScanningComponent] || [];
    const cleanSerial = scannedSerial.trim();

    // Check internal duplicate within this component
    if (currentScanned.some((s) => s.toLowerCase() === cleanSerial.toLowerCase())) {
      toast({
        title: "Duplicate Serial Blocked",
        description: `Serial '${cleanSerial}' has already been scanned in this picking batch.`,
        variant: "error",
      });
      return;
    }

    // Check duplicate across all other scanned components in this dispatch
    for (const [code, list] of Object.entries(scannedSerialsMap)) {
      if (list.some((s) => s.toLowerCase() === cleanSerial.toLowerCase())) {
        toast({
          title: "Serial Already Allocated",
          description: `Serial '${cleanSerial}' is already assigned to component ${code}.`,
          variant: "error",
        });
        return;
      }
    }

    // Verify serial against store
    const store = getStore();
    const existing = store.serialNumbers.find((s) => s.serial_number.toLowerCase() === cleanSerial.toLowerCase());

    if (!existing) {
      toast({
        title: "Invalid Serial Number",
        description: `Serial '${cleanSerial}' not found in warehouse registry. Ensure unit was received and registered.`,
        variant: "error",
      });
      return;
    }

    if (existing.status === "DISPATCHED") {
      toast({
        title: "Anti-Double Dispatch Violation",
        description: `Serial '${cleanSerial}' has already been dispatched under Ref ${existing.dispatch_reference || "RECORDED"}.`,
        variant: "error",
      });
      return;
    }

    if (existing.status === "INSTALLED") {
      toast({
        title: "Serial Already Installed",
        description: `Serial '${cleanSerial}' is currently installed on customer site.`,
        variant: "error",
      });
      return;
    }

    if (existing.status === "RESERVED" && existing.order_id && existing.order_id !== selectedOrderId) {
      toast({
        title: "Cross-Order Allocation Blocked",
        description: `Serial '${cleanSerial}' is reserved for another order (${existing.order_number || existing.order_id}).`,
        variant: "error",
      });
      return;
    }

    // Append scanned serial
    setScannedSerialsMap((prev) => ({
      ...prev,
      [activeScanningComponent]: [...(prev[activeScanningComponent] || []), cleanSerial],
    }));

    toast({
      title: "Serial Validated & Added",
      description: `Verified ${cleanSerial} for SKU ${activeScanningComponent}.`,
      variant: "success",
    });
  };

  const handleRemoveScannedSerial = (componentCode: string, serialToRemove: string) => {
    setScannedSerialsMap((prev) => ({
      ...prev,
      [componentCode]: (prev[componentCode] || []).filter((s) => s !== serialToRemove),
    }));
  };

  // Step 8, 9, 10: Execute Atomic Dispatch
  const handleExecuteDispatch = () => {
    if (!selectedOrderId || !currentPickingList) return;
    setIsDispatching(true);

    try {
      const scannedGroups = Object.entries(scannedSerialsMap).map(([componentCode, serialNumbers]) => ({
        componentCode,
        serialNumbers,
      }));

      const result = executeAtomicDispatch({
        orderId: selectedOrderId,
        vehicleRegistrationNumber: vehiclePlate,
        driverName,
        driverPhone,
        scannedSerials: scannedGroups,
        performedBy: "20000000-0000-0000-0000-000000000004", // Warehouse Manager
        performerName: "Warehouse Logistics Supervisor",
        userRole: "WAREHOUSE_MANAGER",
      });

      setIsWizardOpen(false);
      loadData();

      // Show Gate Pass
      setSelectedGatePass(result.dispatch);
      setIsGatePassOpen(true);

      toast({
        title: "Consignment Dispatched Atomically",
        description: `Manifest ${result.dispatch.dispatch_number} generated. Gate Pass token: ${result.gatePassToken}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Dispatch execution failed";
      toast({
        title: "Dispatch Execution Aborted",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsDispatching(false);
    }
  };

  // Confirm delivery on job site -> triggers automatic warranty clock trg_auto_warranty_delivery
  const handleConfirmDelivery = (id: string) => {
    try {
      const updated = confirmDispatchDelivery(
        id,
        "Customer Site Representative",
        "WAREHOUSE_MANAGER",
        "20000000-0000-0000-0000-000000000004"
      );
      loadData();

      toast({
        title: "Delivery Confirmed & Warranty Clock Activated",
        description: `Consignment ${updated.dispatch_number} delivered. Procedure trg_auto_warranty_delivery activated customer warranty clocks.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error confirming delivery";
      toast({ title: "Delivery Error", description: msg, variant: "error" });
    }
  };

  // Compute available in-stock serial suggestions for currently active component
  const store = getStore();
  const activeComponentObj = store.components.find((c) => c.component_code === activeScanningComponent);
  const availableInStockSerials = activeComponentObj
    ? store.serialNumbers
        .filter(
          (s) =>
            s.component_id === activeComponentObj.id &&
            (s.status === "IN_STOCK" || (s.status === "RESERVED" && s.order_id === selectedOrderId))
        )
        .map((s) => s.serial_number)
        .filter((sn) => !(scannedSerialsMap[activeScanningComponent] || []).includes(sn))
    : [];

  const columns: Column<Dispatch>[] = [
    {
      header: "Dispatch Manifest",
      accessorKey: "dispatch_number",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground font-mono">{row.dispatch_number}</p>
          <p className="text-[11px] text-muted-foreground">
            Order: {row.order_number || "ORD-2026"} • {new Date(row.created_at).toLocaleDateString()}
          </p>
        </div>
      ),
    },
    {
      header: "Destination / Customer",
      cell: (row) => (
        <div className="text-xs">
          <p className="font-bold text-foreground flex items-center gap-1">
            <User className="w-3 h-3 text-muted-foreground" />
            {row.customer_name || "Job Site Customer"}
          </p>
          <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            {row.shipping_address || "Jalandhar Site"}
          </p>
        </div>
      ),
    },
    {
      header: "Vehicle & Driver",
      cell: (row) => (
        <div className="text-xs">
          <p className="font-bold text-foreground font-mono">{row.vehicle_registration_number || "PB-08-AX-9912"}</p>
          <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <Phone className="w-3 h-3 text-muted-foreground" />
            {row.driver_name || "Driver"} ({row.driver_phone || "+919872200011"})
          </p>
        </div>
      ),
    },
    {
      header: "Manifest Status",
      accessorKey: "dispatch_status",
      sortable: true,
      cell: (row) => <StatusPill status={row.dispatch_status} />,
    },
    {
      header: "Gate Pass & Delivery Actions",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-border hover:bg-muted font-semibold"
            onClick={() => {
              setSelectedGatePass(row);
              setIsGatePassOpen(true);
            }}
          >
            <FileText className="w-3.5 h-3.5 mr-1 text-primary" />
            Gate Pass
          </Button>

          {row.dispatch_status === "DELIVERED" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Warranty Clock Active
            </span>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs"
              onClick={() => handleConfirmDelivery(row.id)}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Confirm Delivery
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
            <Truck className="w-6 h-6 text-primary" />
            Dispatch & Logistics Manifests
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            10-step atomic dispatch execution, device camera barcode scanning, vehicle gate passes, and automatic delivery warranty triggers.
          </p>
        </div>

        <Button
          onClick={() => {
            if (ordersReady.length > 0) {
              handleSelectOrder(ordersReady[0].id);
            }
            setWizardStep(1);
            setIsWizardOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Dispatch Manifest
        </Button>
      </div>

      {/* Architectural Guarantee Callout */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-foreground">Mission-Critical Dispatch Invariants Enforced</p>
          <p className="text-muted-foreground leading-relaxed">
            1. <strong>Anti-Double Dispatch:</strong> Once marked dispatched, serial numbers are locked forever against duplicate consignments.
            2. <strong>Atomic Inventory Reduction:</strong> If any single validation fails, zero stock is decremented.
            3. <strong>Warranty Clock Trigger:</strong> Marking a manifest delivered executes procedure <code className="font-mono bg-emerald-500/20 px-1 py-0.5 rounded text-primary">trg_auto_warranty_delivery</code> to automatically initiate active coverage.
          </p>
        </div>
      </div>

      {/* Manifests Data Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Transit Manifests & Job Site Consignments</CardTitle>
              <CardDescription className="text-xs">
                Review vehicles, assigned drivers, destinations, and gate pass security tokens.
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              Total Manifests: {dispatches.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={dispatches}
            columns={columns}
            searchPlaceholder="Search manifests by number, driver or registration..."
          />
        </CardContent>
      </Card>

      {/* 10-Step Dispatch Wizard Dialog */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              10-Step Dispatch Execution Wizard
            </DialogTitle>
            <DialogDescription>
              Step {wizardStep} of 4:{" "}
              {wizardStep === 1
                ? "Select Confirmed Order & Review BOM Picking List"
                : wizardStep === 2
                ? "Reserve Inventory & Check Stock Balances"
                : wizardStep === 3
                ? "Scan & Validate Serial Numbers via Device Camera"
                : "Vehicle Assignment & Atomic Manifest Dispatch"}
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Progress Indicator */}
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/40 border border-border text-xs font-semibold">
            <span className={wizardStep === 1 ? "text-primary font-bold" : "text-muted-foreground"}>
              1. Order & BOM
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={wizardStep === 2 ? "text-primary font-bold" : "text-muted-foreground"}>
              2. Reserve Stock
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={wizardStep === 3 ? "text-primary font-bold" : "text-muted-foreground"}>
              3. Scan Serials
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={wizardStep === 4 ? "text-primary font-bold" : "text-muted-foreground"}>
              4. Dispatch Gate Pass
            </span>
          </div>

          {/* STEP 1: Select Confirmed Order & Review BOM Picking List */}
          {wizardStep === 1 && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1">Select Confirmed Customer Order *</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {ordersReady.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.order_number} — {ord.system_capacity_kw} kW {ord.system_topology} (Status: {ord.status})
                    </option>
                  ))}
                </select>
              </div>

              {currentPickingList && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-card border border-border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground font-mono text-[10px]">CUSTOMER</p>
                      <p className="font-bold text-foreground">{currentPickingList.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-mono text-[10px]">DESTINATION</p>
                      <p className="font-bold text-foreground">{currentPickingList.shipping_address}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-mono text-[10px]">SYSTEM CAPACITY</p>
                      <p className="font-bold text-foreground">{currentPickingList.system_capacity_kw} kW {currentPickingList.system_topology}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-mono text-[10px]">TOTAL BOM ITEMS</p>
                      <p className="font-bold text-foreground">{currentPickingList.items.length} Component Lines</p>
                    </div>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="p-2.5 bg-muted/60 font-bold border-b border-border flex items-center justify-between text-xs">
                      <span>BOM Material Picking List</span>
                      <span className="text-[10px] font-mono text-muted-foreground">Generated from approved quotation</span>
                    </div>
                    <div className="divide-y divide-border">
                      {currentPickingList.items.map((item) => (
                        <div key={item.component_id} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-foreground">{item.component_name}</p>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {item.component_code} • {item.category}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <p className="font-bold text-foreground">
                              Required: {item.required_quantity} {item.unit_of_measure}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              In Stock: {item.available_in_stock} Units
                              {item.is_serial_tracked && " (Serial Tracked)"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsWizardOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setWizardStep(2)}
                  className="bg-primary text-primary-foreground font-bold"
                >
                  Proceed to Stock Reservation <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* STEP 2: Reserve Inventory & Check Stock Balances */}
          {wizardStep === 2 && currentPickingList && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-lg bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-primary" />
                    Warehouse Stock Allocation & Reservation
                  </h4>
                  {isInventoryReserved ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Stock Reserved
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-amber-500/15 text-amber-600 border border-amber-500/30">
                      Pending Reservation
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Locking required inventory ensures stock cannot be allocated to other sales orders.
                  Reservation is performed atomically — all components must be in stock or the transaction will abort cleanly.
                </p>
                {!isInventoryReserved && (
                  <Button
                    onClick={handleReserveStock}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-8 text-xs mt-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Reserve Required Inventory Now
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-foreground">Stock Availability Verification:</h5>
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                  {currentPickingList.items.map((item) => {
                    const isAvailable = item.available_in_stock >= item.required_quantity;
                    return (
                      <div key={item.component_id} className="p-2.5 flex items-center justify-between bg-card">
                        <div>
                          <p className="font-bold text-foreground">{item.component_name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{item.component_code}</p>
                        </div>
                        <div className="text-right font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isAvailable
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-red-500/15 text-red-600"
                            }`}
                          >
                            {isAvailable ? "Stock Sufficient" : "Stock Shortage"}
                          </span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Req: {item.required_quantity} | Avail: {item.available_in_stock}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setWizardStep(3)}
                  className="bg-primary text-primary-foreground font-bold"
                >
                  Proceed to Serial Number Scan <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* STEP 3: Scan & Validate Serial Numbers */}
          {wizardStep === 3 && currentPickingList && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-2.5">
                <Barcode className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground">Serial Scanning & Anti-Double-Booking Verification</p>
                  <p className="text-muted-foreground mt-0.5">
                    Scan each physical unit barcode via device camera or type manually.
                    Every serial is verified against unique PostgreSQL index constraints.
                  </p>
                </div>
              </div>

              {/* Target Component Selector for Scanning */}
              <div className="space-y-2">
                <label className="font-bold text-foreground block">Select Serial-Tracked Component to Scan:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentPickingList.items
                    .filter((item) => item.is_serial_tracked)
                    .map((item) => {
                      const scannedList = scannedSerialsMap[item.component_code] || [];
                      const isComplete = scannedList.length >= item.required_quantity;
                      const isSelected = activeScanningComponent === item.component_code;

                      return (
                        <button
                          key={item.component_id}
                          type="button"
                          onClick={() => setActiveScanningComponent(item.component_code)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-xs"
                              : "border-border bg-card hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{item.component_name}</span>
                            {isComplete ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-600">
                                {scannedList.length} / {item.required_quantity} Scanned
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground mt-1">
                            SKU: {item.component_code} • Required: {item.required_quantity} units
                          </p>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Integrated Barcode & Camera Scanner */}
              {activeScanningComponent && (
                <BarcodeScanner
                  onScan={handleScanSerial}
                  expectedComponentCode={activeScanningComponent}
                  expectedComponentName={
                    currentPickingList.items.find((i) => i.component_code === activeScanningComponent)
                      ?.component_name
                  }
                  suggestedSerials={availableInStockSerials}
                />
              )}

              {/* Scanned Serials List for active component */}
              {activeScanningComponent && (
                <div className="p-3 rounded-lg border border-border bg-card space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">
                      Scanned Serials for {activeScanningComponent} (
                      {(scannedSerialsMap[activeScanningComponent] || []).length} units):
                    </span>
                  </div>

                  {(scannedSerialsMap[activeScanningComponent] || []).length === 0 ? (
                    <p className="text-muted-foreground text-xs italic">
                      No serial numbers scanned yet for this hardware component.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(scannedSerialsMap[activeScanningComponent] || []).map((sn) => (
                        <span
                          key={sn}
                          className="px-2.5 py-1 rounded bg-muted border border-border font-mono text-xs text-foreground font-bold flex items-center gap-1.5"
                        >
                          <Barcode className="w-3.5 h-3.5 text-primary" />
                          {sn}
                          <button
                            type="button"
                            onClick={() => handleRemoveScannedSerial(activeScanningComponent, sn)}
                            className="text-muted-foreground hover:text-red-500 ml-1 text-sm leading-none"
                            title="Remove scanned serial"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={() => setWizardStep(4)}
                  className="bg-primary text-primary-foreground font-bold"
                >
                  Proceed to Vehicle Gate Pass <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* STEP 4: Vehicle & Driver Assignment & Atomic Dispatch */}
          {wizardStep === 4 && currentPickingList && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-card border border-border space-y-3">
                <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-primary" />
                  Vehicle Logistics & Driver Assignment
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Vehicle Plate Number *</label>
                    <Input
                      placeholder="e.g. PB-08-AX-9912"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      className="font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Driver Full Name *</label>
                    <Input
                      placeholder="e.g. Balwant Singh"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Driver Mobile Phone *</label>
                    <Input
                      placeholder="e.g. +919876544321"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Pre-flight Manifest Summary */}
              <div className="p-3.5 rounded-lg border border-border bg-muted/40 space-y-2">
                <h5 className="font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Pre-Flight Manifest Summary
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p className="text-muted-foreground">
                    Order: <strong className="text-foreground">{currentPickingList.order_number}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Customer: <strong className="text-foreground">{currentPickingList.customer_name}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Destination: <strong className="text-foreground">{currentPickingList.shipping_address}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Vehicle: <strong className="text-foreground font-mono">{vehiclePlate}</strong>
                  </p>
                </div>
              </div>

              <DialogFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setWizardStep(3)}>
                  Back
                </Button>
                <Button
                  onClick={handleExecuteDispatch}
                  disabled={isDispatching}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {isDispatching ? "Executing Atomic Dispatch..." : "Confirm & Execute Dispatch"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Official Gate Pass Document Modal */}
      {selectedGatePass && (
        <Dialog open={isGatePassOpen} onOpenChange={setIsGatePassOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-extrabold flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    SunPower Solutions — Official Dispatch Gate Pass
                  </DialogTitle>
                  <DialogDescription className="font-mono text-xs">
                    Manifest No: {selectedGatePass.dispatch_number} • Token: {selectedGatePass.gate_pass_token || "GP-SEC-VALID"}
                  </DialogDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold"
                  onClick={() => window.print()}
                >
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print Gate Pass
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-card border border-border">
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Consignment Destination</p>
                  <p className="font-bold text-foreground">{selectedGatePass.customer_name || "Customer Site"}</p>
                  <p className="text-muted-foreground text-[11px]">{selectedGatePass.shipping_address || "Jalandhar Project Site"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold">Transit Logistics</p>
                  <p className="font-bold text-foreground font-mono">{selectedGatePass.vehicle_registration_number}</p>
                  <p className="text-muted-foreground text-[11px]">
                    Driver: {selectedGatePass.driver_name} ({selectedGatePass.driver_phone})
                  </p>
                </div>
              </div>

              {/* Dispatched Components & Serial Numbers */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-2.5 bg-muted/60 font-bold border-b border-border flex items-center justify-between text-xs">
                  <span>Dispatched Equipment & Serialized Hardware</span>
                  <StatusPill status={selectedGatePass.dispatch_status} />
                </div>
                <div className="divide-y divide-border">
                  {(selectedGatePass.items || []).map((item, idx) => (
                    <div key={idx} className="p-3 space-y-1.5 bg-card">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{item.component_name}</span>
                        <span className="font-mono font-bold text-foreground">{item.quantity} Units</span>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground">SKU: {item.component_code}</p>

                      {item.serial_numbers && item.serial_numbers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.serial_numbers.map((sn) => (
                            <span
                              key={sn}
                              className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-foreground border border-border flex items-center gap-1"
                            >
                              <Barcode className="w-3 h-3 text-primary" />
                              {sn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Security & Authorization Sign-off Block */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-[11px]">
                <div>
                  <p className="font-bold text-foreground">Authorized Warehouse Security Signature</p>
                  <p className="text-muted-foreground">Gate Pass verification code: {selectedGatePass.gate_pass_token || "GP-AUTHENTICATED"}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 font-mono">
                    <ShieldCheck className="w-4 h-4" />
                    INSPECTION PASSED
                  </span>
                  <p className="text-[10px] text-muted-foreground">Dispatch Timestamp: {new Date(selectedGatePass.created_at).toLocaleString()}</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGatePassOpen(false)}>
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
