import { describe, it, expect, beforeEach } from "vitest";
import { getStore, resetStore } from "@/lib/data/store";
import {
  generateMaterialPickingList,
  reserveInventoryForOrder,
  validateSerialForDispatch,
  executeAtomicDispatch,
  confirmDispatchDelivery,
  InvalidSerialError,
  SerialMismatchError,
  SerialAlreadyDispatchedError,
  SerialReservedForOtherOrderError,
  DuplicateSerialInDispatchError,
  InsufficientStockError,
  ConcurrentDispatchError,
  DispatchError,
} from "@/domain/inventory/dispatch-engine";

describe("Warehouse & Inventory Management with Serial Number Tracking & Dispatch Workflow", () => {
  beforeEach(() => {
    resetStore();
  });

  // 1. INVENTORY TRACKING: 9 Required Hardware Categories
  it("tracks all 9 required hardware categories with SKU, cost, selling price, and supplier", () => {
    const store = getStore();

    const expectedCategories = [
      "PANEL",
      "INVERTER",
      "BATTERY",
      "CHARGE_CONTROLLER",
      "STRUCTURE",
      "CONNECTOR",
      "WIRING",
      "SWITCH",
      "SAFETY",
    ];

    const presentCategories = new Set(
      store.components.map((c) => (c.category === "CABLE" ? "WIRING" : c.category))
    );

    for (const cat of expectedCategories) {
      expect(presentCategories.has(cat as any)).toBe(true);
    }

    // Verify inventory items have all required business attributes
    for (const item of store.inventoryItems) {
      expect(item.component_code).toBeDefined();
      expect(item.component_name).toBeDefined();
      expect(item.supplier_name).toBeDefined();
      expect(item.unit_cost).toBeGreaterThan(0);
      expect(item.base_selling_price).toBeGreaterThan(0);
      expect(item.quantity_on_hand).toBeGreaterThanOrEqual(0);
      expect(item.reorder_threshold).toBeGreaterThan(0);
      expect(item.location_name).toBeDefined();
    }
  });

  // 2. SERIAL NUMBER MANAGEMENT: 8 Lifecycle Statuses
  it("tracks all 8 required serial number lifecycle statuses with complete traceability", () => {
    const store = getStore();

    const requiredStatuses = [
      "IN_STOCK",
      "RESERVED",
      "DISPATCHED",
      "INSTALLED",
      "UNDER_REPAIR",
      "REPLACED",
      "RETURNED",
      "RETIRED",
    ];

    const presentStatuses = new Set(store.serialNumbers.map((s) => s.status));

    for (const status of requiredStatuses) {
      expect(presentStatuses.has(status as any)).toBe(true);
    }

    // Verify each serial number has product, supplier, purchase date, location
    for (const serial of store.serialNumbers) {
      expect(serial.serial_number).toBeDefined();
      expect(serial.component_id).toBeDefined();
      expect(serial.supplier_name).toBeDefined();
      expect(serial.purchase_date).toBeDefined();
      expect(serial.status).toBeDefined();
    }
  });

  // 3. STEP 2: Generate Material Picking List from BOM
  it("generates material picking list accurately from confirmed order BOM", () => {
    const store = getStore();
    const order = store.orders[0]; // 3 kW On-Grid
    const pickingList = generateMaterialPickingList(order.id);

    expect(pickingList.order_id).toBe(order.id);
    expect(pickingList.order_number).toBe(order.order_number);
    expect(pickingList.customer_name).toBe("Simranjeet Kaur");
    expect(pickingList.system_capacity_kw).toBe(3.0);
    expect(pickingList.items.length).toBeGreaterThanOrEqual(3);

    // 3kW On-Grid requires: 6 panels (ceil(3000 / 540) = 6), 1 inverter, structure, cables
    const panelItem = pickingList.items.find((i) => i.category === "PANEL");
    const inverterItem = pickingList.items.find((i) => i.category === "INVERTER");

    expect(panelItem?.required_quantity).toBe(6);
    expect(panelItem?.is_serial_tracked).toBe(true);
    expect(inverterItem?.required_quantity).toBe(1);
    expect(inverterItem?.is_serial_tracked).toBe(true);
  });

  // 4. STEP 3: Reserve Required Inventory
  it("reserves required inventory atomically when stock is sufficient", () => {
    const store = getStore();
    const order = store.orders[0];

    const initialReservedMovementsCount = store.stockMovements.filter(
      (m) => m.movement_type === "RESERVATION"
    ).length;

    const result = reserveInventoryForOrder(
      order.id,
      "WAREHOUSE_MANAGER",
      "user-wm-01",
      "Warehouse Manager"
    );

    expect(result.success).toBe(true);
    expect(result.reservedItems.length).toBeGreaterThanOrEqual(3);

    // Verify stock movements logged
    const finalReservedMovements = store.stockMovements.filter(
      (m) => m.movement_type === "RESERVATION"
    );
    expect(finalReservedMovements.length).toBeGreaterThan(initialReservedMovementsCount);
  });

  // 5. CRITICAL INVARIANT: Insufficient stock atomic rollback (all-or-nothing)
  it("aborts reservation atomically when stock is insufficient (all-or-nothing rollback)", () => {
    const store = getStore();
    const order = store.orders[0];

    // Artificially deplete inverters to zero available
    const inverterComp = store.components.find((c) => c.component_code === "INV-3KW-OG");
    const invItem = store.inventoryItems.find((i) => i.component_id === inverterComp?.id);
    if (invItem) {
      invItem.quantity_on_hand = 0;
      invItem.quantity_reserved = 0;
    }

    // Take snapshot of panel reservations before call
    const panelComp = store.components.find((c) => c.component_code === "PV-PANEL-540W");
    const panelInv = store.inventoryItems.find((i) => i.component_id === panelComp?.id);
    const initialPanelReserved = panelInv?.quantity_reserved || 0;

    // Expect InsufficientStockError
    expect(() =>
      reserveInventoryForOrder(order.id, "WAREHOUSE_MANAGER", "user-wm-01")
    ).toThrowError(InsufficientStockError);

    // INVARIANT CHECK: Panels must NOT be partially reserved!
    expect(panelInv?.quantity_reserved).toBe(initialPanelReserved);
  });

  // 6. VALIDATION: Detects invalid or non-existent serial numbers
  it("validates serial numbers against warehouse registry and detects non-existent serials", () => {
    const store = getStore();
    const order = store.orders[0];

    expect(() =>
      validateSerialForDispatch({
        serialNumber: "NON-EXISTENT-SN-99999",
        orderId: order.id,
      })
    ).toThrowError(InvalidSerialError);
  });

  // 7. VALIDATION: Detects component SKU mismatch
  it("rejects serial number when assigned to wrong component SKU", () => {
    const store = getStore();
    const order = store.orders[0];

    // INV-3KW-2026-0041 is a 3kW inverter, try passing it as a Solar Panel
    expect(() =>
      validateSerialForDispatch({
        serialNumber: "INV-3KW-2026-0041",
        expectedComponentCode: "PV-PANEL-540W",
        orderId: order.id,
      })
    ).toThrowError(SerialMismatchError);
  });

  // 8. CRITICAL INVARIANT: A serial number cannot be dispatched twice
  it("enforces critical invariant: a serial number cannot be dispatched twice", () => {
    const store = getStore();
    const order = store.orders[0];

    // s5 (INV-5KW-2026-0089) is already marked DISPATCHED in seed data
    const dispatchedSerial = store.serialNumbers.find((s) => s.status === "DISPATCHED");
    expect(dispatchedSerial).toBeDefined();

    expect(() =>
      validateSerialForDispatch({
        serialNumber: dispatchedSerial!.serial_number,
        orderId: order.id,
      })
    ).toThrowError(SerialAlreadyDispatchedError);
  });

  // 9. CRITICAL INVARIANT: A reserved item cannot be allocated to another order
  it("enforces critical invariant: a reserved item cannot be allocated to another order", () => {
    const store = getStore();
    // s2 (INV-3KW-2026-0042) is reserved for order 0 (ORD-2026-0089)
    const reservedSerial = store.serialNumbers.find((s) => s.status === "RESERVED");
    expect(reservedSerial).toBeDefined();
    expect(reservedSerial?.order_id).toBe(store.orders[0].id);

    // Attempt to dispatch it for a DIFFERENT order (orders[1].id)
    expect(() =>
      validateSerialForDispatch({
        serialNumber: reservedSerial!.serial_number,
        orderId: store.orders[1].id,
      })
    ).toThrowError(SerialReservedForOtherOrderError);

    // But for the correct order, it must pass validation!
    const validResult = validateSerialForDispatch({
      serialNumber: reservedSerial!.serial_number,
      orderId: store.orders[0].id,
    });
    expect(validResult.valid).toBe(true);
  });

  // 10. CRITICAL INVARIANT: Duplicate serials in same dispatch are blocked
  it("enforces critical invariant: rejects duplicate serial numbers in the same dispatch scan list", () => {
    const store = getStore();

    // Create a new order ready for dispatch
    const testOrder = {
      ...store.orders[0],
      id: "ord-test-dup",
      order_number: "ORD-TEST-DUP",
      status: "READY_FOR_DISPATCH" as const,
    };
    store.orders.unshift(testOrder);

    expect(() =>
      executeAtomicDispatch({
        orderId: testOrder.id,
        vehicleRegistrationNumber: "PB-08-AX-9912",
        driverName: "Balwant Singh",
        driverPhone: "+919876544321",
        scannedSerials: [
          {
            componentCode: "INV-3KW-OG",
            // Duplicate serial in same list!
            serialNumbers: ["INV-3KW-2026-0041", "INV-3KW-2026-0041"],
          },
        ],
        performedBy: "user-wm-01",
        userRole: "WAREHOUSE_MANAGER",
      })
    ).toThrowError(DuplicateSerialInDispatchError);
  });

  // 11. CRITICAL INVARIANT: Failed dispatch does not partially reduce inventory (atomic rollback)
  it("enforces critical invariant: failed dispatch does not partially reduce inventory (atomic rollback)", () => {
    const store = getStore();

    const testOrder = {
      ...store.orders[0],
      id: "ord-test-rollback",
      order_number: "ORD-TEST-ROLLBACK",
      status: "READY_FOR_DISPATCH" as const,
    };
    store.orders.unshift(testOrder);

    // Snapshot pre-dispatch inventory balances
    const preInventorySnapshot = store.inventoryItems.map((i) => ({
      id: i.id,
      onHand: i.quantity_on_hand,
      reserved: i.quantity_reserved,
    }));

    // Trigger dispatch with invalid / missing panels (will fail validation)
    expect(() =>
      executeAtomicDispatch({
        orderId: testOrder.id,
        vehicleRegistrationNumber: "PB-08-AX-9912",
        driverName: "Balwant Singh",
        driverPhone: "+919876544321",
        scannedSerials: [
          {
            componentCode: "INV-3KW-OG",
            serialNumbers: ["INV-3KW-2026-0041"], // Valid inverter
          },
          {
            componentCode: "PV-PANEL-540W",
            serialNumbers: ["PV-540W-2026-0101"], // Only 1 panel scanned, but 6 required!
          },
        ],
        performedBy: "user-wm-01",
        userRole: "WAREHOUSE_MANAGER",
      })
    ).toThrowError(DispatchError);

    // INVARIANT CHECK: Inventory balances must remain 100% UNCHANGED
    for (const snap of preInventorySnapshot) {
      const current = store.inventoryItems.find((i) => i.id === snap.id);
      expect(current?.quantity_on_hand).toBe(snap.onHand);
      expect(current?.quantity_reserved).toBe(snap.reserved);
    }
  });

  // 12. FULL 10-STEP WORKFLOW: Successful atomic dispatch & Gate Pass generation
  it("successfully executes 10-step atomic dispatch and generates official Gate Pass manifest", () => {
    const store = getStore();

    const testOrder = {
      ...store.orders[0],
      id: "ord-test-success",
      order_number: "ORD-TEST-SUCCESS",
      status: "CONFIRMED" as const,
    };
    store.orders.unshift(testOrder);

    const panelItem = store.inventoryItems.find((i) => i.component_code === "PV-PANEL-540W");
    const inverterItem = store.inventoryItems.find((i) => i.component_code === "INV-3KW-OG");
    const prePanelOnHand = panelItem?.quantity_on_hand || 0;
    const preInverterOnHand = inverterItem?.quantity_on_hand || 0;

    const result = executeAtomicDispatch({
      orderId: testOrder.id,
      vehicleRegistrationNumber: "PB-08-AX-9912",
      driverName: "Balwant Singh",
      driverPhone: "+919876544321",
      scannedSerials: [
        {
          componentCode: "INV-3KW-OG",
          serialNumbers: ["INV-3KW-2026-0041"],
        },
        {
          componentCode: "PV-PANEL-540W",
          serialNumbers: [
            "PV-540W-2026-0101",
            "PV-540W-2026-0102",
            "PV-540W-2026-0103",
            "PV-540W-2026-0104",
            "PV-540W-2026-0105",
            "PV-540W-2026-0106",
          ],
        },
      ],
      performedBy: "user-wm-01",
      performerName: "Warehouse Supervisor",
      userRole: "WAREHOUSE_MANAGER",
    });

    expect(result.success).toBe(true);
    expect(result.dispatch).toBeDefined();
    expect(result.dispatch.dispatch_status).toBe("IN_TRANSIT");
    expect(result.gatePassToken).toBeDefined();

    // 1. Check inventory decremented atomically
    expect(panelItem?.quantity_on_hand).toBe(prePanelOnHand - 6);
    expect(inverterItem?.quantity_on_hand).toBe(preInverterOnHand - 1);

    // 2. Check serial numbers updated to DISPATCHED
    const dispatchedInverter = store.serialNumbers.find((s) => s.serial_number === "INV-3KW-2026-0041");
    expect(dispatchedInverter?.status).toBe("DISPATCHED");
    expect(dispatchedInverter?.dispatch_reference).toBe(result.dispatch.dispatch_number);
    expect(dispatchedInverter?.order_id).toBe(testOrder.id);

    // 3. Check immutable stock movements created
    const dispatchMovements = store.stockMovements.filter(
      (m) => m.reference_id === result.dispatch.dispatch_number
    );
    expect(dispatchMovements.length).toBeGreaterThanOrEqual(1);

    // 4. Check order status updated
    expect(testOrder.status).toBe("DISPATCHED");
  });

  // 13. DELIVERY CONFIRMATION & WARRANTY ACTIVATION
  it("confirms job site delivery and activates automatic warranty clock", () => {
    const store = getStore();
    const manifest = store.dispatches[0];

    const delivered = confirmDispatchDelivery(
      manifest.id,
      "Simranjeet Kaur",
      "WAREHOUSE_MANAGER",
      "user-wm-01"
    );

    expect(delivered.dispatch_status).toBe("DELIVERED");
    expect(delivered.receiver_name).toBe("Simranjeet Kaur");
    expect(delivered.delivered_at).toBeDefined();

    // Check associated order status transitioned
    const order = store.orders.find((o) => o.id === delivered.order_id);
    expect(order?.status).toBe("INSTALLATION_IN_PROGRESS");
  });

  // 14. AUTHORIZATION: Unauthorized roles rejected
  it("enforces role-based access control on warehouse reservation and dispatch operations", () => {
    const store = getStore();
    const order = store.orders[0];

    expect(() =>
      reserveInventoryForOrder(order.id, "CUSTOMER", "cust-01")
    ).toThrowError(/Forbidden/);

    expect(() =>
      executeAtomicDispatch({
        orderId: order.id,
        vehicleRegistrationNumber: "PB-08-AX-9912",
        driverName: "Balwant Singh",
        driverPhone: "+919876544321",
        scannedSerials: [],
        performedBy: "cust-01",
        userRole: "CUSTOMER",
      })
    ).toThrowError(/Forbidden/);
  });
});
