"use client";

import * as React from "react";
import {
  Warehouse,
  Plus,
  AlertTriangle,
  PackageCheck,
  Layers,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  ShieldCheck,
  Building2,
  Tag,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/shared/toast-context";
import { formatCurrency } from "@/lib/utils";
import { getStore, addStockMovement } from "@/lib/data/store";
import { InventoryItem, ProductComponent, StockMovement } from "@/lib/types/database";

type CategoryFilter =
  | "ALL"
  | "PANEL"
  | "INVERTER"
  | "BATTERY"
  | "CHARGE_CONTROLLER"
  | "STRUCTURE"
  | "CONNECTOR"
  | "WIRING"
  | "SWITCH"
  | "SAFETY";

export default function InventoryPage() {
  const { toast } = useToast();
  const [items, setItems] = React.useState<
    (InventoryItem & { component?: ProductComponent; locationName?: string })[]
  >([]);
  const [activeCategory, setActiveCategory] = React.useState<CategoryFilter>("ALL");
  const [showOnlyLowStock, setShowOnlyLowStock] = React.useState(false);

  // Restock State
  const [isRestockOpen, setIsRestockOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<
    (InventoryItem & { component?: ProductComponent }) | null
  >(null);
  const [restockQty, setRestockQty] = React.useState("10");
  const [supplierInvoiceRef, setSupplierInvoiceRef] = React.useState("INV-SUPP-2026-");

  // Stock Movement History State
  const [isMovementHistoryOpen, setIsMovementHistoryOpen] = React.useState(false);
  const [stockMovements, setStockMovements] = React.useState<StockMovement[]>([]);

  const loadData = React.useCallback(() => {
    const store = getStore();
    const enriched = store.inventoryItems.map((item) => {
      const comp = store.components.find((c) => c.id === item.component_id);
      const loc = store.locations.find((l) => l.id === item.location_id);
      return {
        ...item,
        component: comp,
        component_code: item.component_code || comp?.component_code,
        component_name: item.component_name || comp?.name,
        category: item.category || comp?.category,
        supplier_name: item.supplier_name || comp?.supplier_name || comp?.supplier || "Approved Supplier",
        unit_cost: item.unit_cost || comp?.unit_cost || 0,
        base_selling_price: item.base_selling_price || comp?.base_selling_price || 0,
        locationName: loc ? loc.name : item.location_name || "Main Warehouse",
      };
    });
    setItems(enriched);
    setStockMovements([...store.stockMovements]);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const store = getStore();
    const target = store.inventoryItems.find((i) => i.id === selectedItem.id);
    const added = Number(restockQty) || 0;

    if (target && added > 0) {
      target.quantity_on_hand += added;

      // Log immutable stock movement
      addStockMovement({
        component_id: target.component_id,
        component_code: selectedItem.component_code,
        component_name: selectedItem.component_name,
        to_location_id: target.location_id,
        to_location_name: "Main Central Logistics Hub - Jalandhar",
        quantity: added,
        movement_type: "PURCHASE_RECEIPT",
        reference_id: supplierInvoiceRef.trim() || `PO-${Date.now()}`,
        notes: `Recorded procurement restock of ${added} units from ${selectedItem.supplier_name || "supplier"}.`,
        performed_by: "20000000-0000-0000-0000-000000000004", // Warehouse Manager
      });

      loadData();
      setIsRestockOpen(false);

      toast({
        title: "Inventory Restocked & Ledger Updated",
        description: `Added ${added} units to ${selectedItem.component?.name || "item"}. Stock movement recorded.`,
        variant: "success",
      });
    }
  };

  const totalValuation = items.reduce(
    (sum, i) => sum + (i.unit_cost || i.component?.unit_cost || 0) * i.quantity_on_hand,
    0
  );
  const lowStockCount = items.filter((i) => i.quantity_on_hand <= i.reorder_threshold).length;

  // Filter items by category & low-stock toggle
  const filteredItems = items.filter((item) => {
    const matchesCategory =
      activeCategory === "ALL" ||
      (activeCategory === "WIRING"
        ? item.category === "WIRING" || item.category === "CABLE"
        : item.category === activeCategory);

    const matchesLowStock = !showOnlyLowStock || item.quantity_on_hand <= item.reorder_threshold;

    return matchesCategory && matchesLowStock;
  });

  const columns: Column<InventoryItem & { component?: ProductComponent; locationName?: string }>[] = [
    {
      header: "Hardware SKU / Part",
      accessorKey: "component_code",
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-bold text-foreground text-xs">{row.component_name || row.component?.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
              {row.component_code || row.component?.component_code}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
              {row.category || row.component?.category}
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
        <div className="text-xs">
          <p className="font-medium text-foreground flex items-center gap-1">
            <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
            {row.supplier_name || row.component?.supplier_name || "OEM Partner"}
          </p>
        </div>
      ),
    },
    {
      header: "Warehouse Bay",
      accessorKey: "locationName",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-medium text-foreground">{row.locationName}</span>
      ),
    },
    {
      header: "Quantity on Hand",
      accessorKey: "quantity_on_hand",
      sortable: true,
      cell: (row) => {
        const isLow = row.quantity_on_hand <= row.reorder_threshold;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-foreground">
              {row.quantity_on_hand}
            </span>
            {row.quantity_reserved > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {row.quantity_reserved} Rsvd
              </span>
            )}
            {isLow && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-red-500/20 text-red-500 border border-red-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Low
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Reorder Min",
      accessorKey: "reorder_threshold",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-mono text-muted-foreground">{row.reorder_threshold} Units</span>
      ),
    },
    {
      header: "Cost / Selling Price",
      cell: (row) => {
        const unitCost = row.unit_cost || row.component?.unit_cost || 0;
        const sellPrice = row.base_selling_price || row.component?.base_selling_price || 0;
        return (
          <div className="text-xs font-mono">
            <p className="font-bold text-foreground">Cost: {formatCurrency(unitCost)}</p>
            <p className="text-[10px] text-muted-foreground">Sell: {formatCurrency(sellPrice)}</p>
          </div>
        );
      },
    },
    {
      header: "Actions",
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 font-semibold"
          onClick={() => {
            setSelectedItem(row);
            setRestockQty("10");
            setSupplierInvoiceRef(`INV-SUPP-${Date.now().toString().slice(-6)}`);
            setIsRestockOpen(true);
          }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Restock
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
            <Warehouse className="w-6 h-6 text-primary" />
            Warehouse & Inventory Control
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time stock ledger across all 9 solar hardware categories and mobile transit van fleets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5 border-border"
            onClick={() => {
              loadData();
              setIsMovementHistoryOpen(true);
            }}
          >
            <History className="w-3.5 h-3.5 text-primary" />
            Movement Ledger ({stockMovements.length})
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Total Inventory Valuation</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{formatCurrency(totalValuation)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <PackageCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Tracked SKUs</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{items.length} Components</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border cursor-pointer transition-colors ${
            showOnlyLowStock ? "border-red-500 bg-red-500/5" : "border-border"
          }`}
          onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
          title="Click to filter low stock items"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Low-Stock Warnings</p>
              <p className="text-2xl font-extrabold text-red-500 mt-1">{lowStockCount} SKUs</p>
              <span className="text-[10px] text-muted-foreground">
                {showOnlyLowStock ? "Filtered (Click to reset)" : "Click to isolate warnings"}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 9 Required Hardware Categories Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
          <Filter className="w-3.5 h-3.5" />
          Filter by Hardware Category (9 Tracked Categories):
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "ALL", label: "All Hardware" },
            { id: "PANEL", label: "Solar Panels" },
            { id: "INVERTER", label: "Inverters" },
            { id: "BATTERY", label: "Batteries" },
            { id: "CHARGE_CONTROLLER", label: "Charge Controllers" },
            { id: "STRUCTURE", label: "Mounting Structures" },
            { id: "CONNECTOR", label: "Connectors (MC4)" },
            { id: "WIRING", label: "Wiring & Cables" },
            { id: "SWITCH", label: "Switches & Isolators" },
            { id: "SAFETY", label: "Earthing & Safety" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as CategoryFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Data Table */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Stock Ledger Register</CardTitle>
              <CardDescription className="text-xs">
                Monitoring inventory balances, safety thresholds, and valuation across physical warehouse locations.
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              Showing {filteredItems.length} of {items.length} items
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <DataTable
            data={filteredItems}
            columns={columns}
            searchPlaceholder="Search inventory by SKU, component name, or supplier..."
          />
        </CardContent>
      </Card>

      {/* Restock Dialog */}
      {selectedItem && (
        <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Procurement Restock</DialogTitle>
              <DialogDescription>
                Record incoming supplier shipment for {selectedItem.component_name || selectedItem.component?.name}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRestock} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <p className="text-foreground font-semibold">{selectedItem.component_name || selectedItem.component?.name}</p>
                <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px]">
                  <span>SKU: {selectedItem.component_code}</span>
                  <span>Supplier: {selectedItem.supplier_name}</span>
                </div>
                <p className="text-muted-foreground font-mono text-[11px]">
                  Current Stock: <strong>{selectedItem.quantity_on_hand} Units</strong> (Threshold: {selectedItem.reorder_threshold})
                </p>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Quantity Received *</label>
                <Input
                  type="number"
                  placeholder="10"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Supplier Invoice / PO Ref *</label>
                <Input
                  type="text"
                  placeholder="PO-WAR-2026-901"
                  value={supplierInvoiceRef}
                  onChange={(e) => setSupplierInvoiceRef(e.target.value)}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRestockOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                  Confirm Restock & Record Movement
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Immutable Stock Movements History Dialog */}
      <Dialog open={isMovementHistoryOpen} onOpenChange={setIsMovementHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Immutable Stock Movements Ledger
            </DialogTitle>
            <DialogDescription>
              Complete audit trail of all warehouse receipts, reservations, dispatches, and transfers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {stockMovements.map((sm) => (
              <div
                key={sm.id}
                className="p-3 rounded-lg border border-border bg-card/60 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        sm.movement_type === "PURCHASE_RECEIPT"
                          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                          : sm.movement_type === "DISPATCH"
                          ? "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                          : sm.movement_type === "RESERVATION"
                          ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                          : "bg-purple-500/15 text-purple-600 border border-purple-500/30"
                      }`}
                    >
                      {sm.movement_type}
                    </span>
                    <span className="font-bold text-foreground">{sm.component_name || sm.component_code}</span>
                    {sm.serial_number && (
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground">
                        SN: {sm.serial_number}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground">{sm.notes || "Stock movement processed."}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Ref: {sm.reference_id || "N/A"} • Time: {new Date(sm.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-extrabold text-sm text-foreground">
                    {sm.movement_type === "PURCHASE_RECEIPT" || sm.movement_type === "RETURN"
                      ? `+${sm.quantity}`
                      : `-${sm.quantity}`}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Units</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
