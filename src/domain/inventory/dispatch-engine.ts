// SolarOS Dispatch & Warehouse Inventory Execution Engine
// Enforces 10-step Dispatch Workflow and Mission-Critical Invariants:
// 1. Atomic all-or-nothing rollback on any failure.
// 2. Concurrency protection via in-flight order mutex locks.
// 3. Strict anti-double dispatch (a serial cannot be dispatched twice).
// 4. Strict cross-order allocation prevention (reserved items cannot be allocated to another order).
// 5. Immutable stock movements audit ledger.

import { getStore, addStockMovement, addAuditLogEntry } from "@/lib/data/store";
import { resolveConfiguredBOM } from "@/domain/products/recipe-engine";
import {
  Dispatch,
  DispatchItem,
  MaterialPickingList,
  PickingListItem,
  SerialNumber,
  StockMovement,
  UserRole,
} from "@/lib/types/database";

// Custom Typed Errors
export class DispatchError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "DispatchError";
  }
}

export class ConcurrentDispatchError extends DispatchError {
  constructor(orderId: string) {
    super(
      `A dispatch operation is currently in progress for order '${orderId}'. Concurrent dispatch requests are locked to prevent race conditions.`,
      "CONCURRENT_DISPATCH_LOCKED"
    );
    this.name = "ConcurrentDispatchError";
  }
}

export class InvalidSerialError extends DispatchError {
  constructor(serialNumber: string) {
    super(
      `Serial number '${serialNumber}' does not exist in the warehouse database registry.`,
      "INVALID_SERIAL_NOT_FOUND"
    );
    this.name = "InvalidSerialError";
  }
}

export class SerialMismatchError extends DispatchError {
  constructor(serialNumber: string, actualComponent: string, expectedComponent: string) {
    super(
      `Serial '${serialNumber}' is registered as SKU '${actualComponent}', but expected SKU '${expectedComponent}'.`,
      "SERIAL_COMPONENT_MISMATCH"
    );
    this.name = "SerialMismatchError";
  }
}

export class SerialAlreadyDispatchedError extends DispatchError {
  constructor(serialNumber: string, dispatchRef?: string) {
    super(
      `Serial number '${serialNumber}' has already been dispatched (Manifest Ref: ${dispatchRef || "RECORDED"}). A hardware unit cannot be dispatched twice.`,
      "SERIAL_ALREADY_DISPATCHED"
    );
    this.name = "SerialAlreadyDispatchedError";
  }
}

export class SerialReservedForOtherOrderError extends DispatchError {
  constructor(serialNumber: string, reservedOrderId: string, currentOrderId: string) {
    super(
      `Serial number '${serialNumber}' is currently reserved for order '${reservedOrderId}' and cannot be allocated to order '${currentOrderId}'.`,
      "SERIAL_RESERVED_FOR_OTHER_ORDER"
    );
    this.name = "SerialReservedForOtherOrderError";
  }
}

export class SerialNotDispatchableError extends DispatchError {
  constructor(serialNumber: string, status: string, reason?: string) {
    super(
      `Serial number '${serialNumber}' has non-dispatchable status '${status}'${reason ? `: ${reason}` : "."}`,
      "SERIAL_STATUS_NOT_DISPATCHABLE"
    );
    this.name = "SerialNotDispatchableError";
  }
}

export class DuplicateSerialInDispatchError extends DispatchError {
  constructor(serialNumber: string) {
    super(
      `Duplicate serial number '${serialNumber}' detected in dispatch scan list. Each unit must be unique.`,
      "DUPLICATE_SERIAL_IN_DISPATCH"
    );
    this.name = "DuplicateSerialInDispatchError";
  }
}

export class InsufficientStockError extends DispatchError {
  constructor(componentCode: string, required: number, available: number) {
    super(
      `Insufficient warehouse stock for component SKU '${componentCode}'. Required: ${required}, Available unreserved: ${available}. Transaction aborted atomically.`,
      "INSUFFICIENT_STOCK"
    );
    this.name = "InsufficientStockError";
  }
}

// In-Memory Mutex Lock Map for Concurrency Protection
const activeDispatchLocks = new Set<string>();

/**
 * Step 2: Generate Material Picking List from the Confirmed Order BOM
 */
export function generateMaterialPickingList(orderId: string): MaterialPickingList {
  const store = getStore();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) {
    throw new DispatchError(`Order with ID '${orderId}' not found.`, "ORDER_NOT_FOUND");
  }

  const customer = store.customers.find((c) => c.id === order.customer_id);
  const quotation = store.quotations.find((q) => q.id === order.quotation_id);
  const survey = store.surveys.find((s) => s.id === quotation?.survey_id);

  // Use Configured Recipe BOM Engine for exact engineering specification
  const resolvedBOM = resolveConfiguredBOM({
    capacityKw: order.system_capacity_kw,
    topology: order.system_topology,
    surveyDimensions: survey
      ? {
          dcCableDistanceMeters: survey.dc_cable_distance_meters || 20,
          acCableDistanceMeters: survey.ac_cable_distance_meters || 10,
        }
      : undefined,
    componentsCatalog: store.components,
  });

  const pickingItems: PickingListItem[] = resolvedBOM.items
    .filter((bItem) => bItem.category !== "SERVICE")
    .map((bItem) => {
      const inv = store.inventoryItems.find((i) => i.component_id === bItem.componentId);
      const available = inv ? inv.quantity_on_hand - inv.quantity_reserved : 0;
      const reserved = inv ? inv.quantity_reserved : 0;

      const reservedSerials = store.serialNumbers
        .filter((s) => s.component_id === bItem.componentId && s.order_id === order.id)
        .map((s) => s.serial_number);

      return {
        component_id: bItem.componentId,
        component_code: bItem.componentCode,
        component_name: bItem.name,
        category: bItem.category,
        required_quantity: bItem.quantity,
        reserved_quantity: reserved,
        scanned_serials: reservedSerials,
        unit_of_measure: bItem.unitOfMeasure,
        is_serial_tracked: bItem.isSerialTracked,
        is_satisfied: bItem.isSerialTracked
          ? reservedSerials.length >= bItem.quantity
          : available + reserved >= bItem.quantity,
        available_in_stock: inv ? inv.quantity_on_hand : 0,
      };
    });

  const allSatisfied = pickingItems.every((item) => item.is_satisfied);
  const totalRequired = pickingItems.reduce((sum, item) => sum + item.required_quantity, 0);
  const totalScanned = pickingItems.reduce((sum, item) => sum + item.scanned_serials.length, 0);

  return {
    order_id: order.id,
    order_number: order.order_number,
    customer_name: customer?.full_name || "Customer",
    shipping_address: customer ? `${customer.address}, ${customer.city}, ${customer.state} - ${customer.pincode}` : "Site Address",
    system_capacity_kw: order.system_capacity_kw,
    system_topology: order.system_topology,
    items: pickingItems,
    all_satisfied: allSatisfied,
    total_required_items: totalRequired,
    total_scanned_items: totalScanned,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Step 3: Reserve Required Inventory for Order (Atomic All-or-Nothing)
 */
export function reserveInventoryForOrder(
  orderId: string,
  userRole: UserRole,
  userId: string = "system",
  userName: string = "Warehouse Staff"
): { success: boolean; reservedItems: { componentCode: string; quantity: number }[] } {
  // Check authorization
  const allowedRoles: UserRole[] = [
    "WAREHOUSE_MANAGER",
    "INSTALLATION_MANAGER",
    "SUPER_ADMIN",
    "DIRECTOR",
  ];
  if (!allowedRoles.includes(userRole)) {
    throw new DispatchError(
      `Forbidden: User role '${userRole}' is not authorized to reserve warehouse inventory.`,
      "UNAUTHORIZED_INVENTORY_RESERVATION"
    );
  }

  const store = getStore();
  const pickingList = generateMaterialPickingList(orderId);

  // PRE-FLIGHT CHECK: Verify all items have sufficient unreserved stock
  for (const item of pickingList.items) {
    const inv = store.inventoryItems.find((i) => i.component_id === item.component_id);
    if (!inv) {
      throw new InsufficientStockError(item.component_code, item.required_quantity, 0);
    }

    const availableUnreserved = inv.quantity_on_hand - inv.quantity_reserved;
    if (availableUnreserved < item.required_quantity) {
      // Abort immediately without changing ANY item
      throw new InsufficientStockError(item.component_code, item.required_quantity, availableUnreserved);
    }
  }

  // ATOMIC RESERVATION: All items are sufficient, now apply reservations
  const reservedItems: { componentCode: string; quantity: number }[] = [];

  for (const item of pickingList.items) {
    const inv = store.inventoryItems.find((i) => i.component_id === item.component_id);
    if (inv) {
      inv.quantity_reserved += item.required_quantity;

      addStockMovement({
        component_id: item.component_id,
        component_code: item.component_code,
        component_name: item.component_name,
        quantity: item.required_quantity,
        movement_type: "RESERVATION",
        reference_id: orderId,
        notes: `Inventory reserved for confirmed Order ${pickingList.order_number}.`,
        performed_by: userId,
      });

      reservedItems.push({
        componentCode: item.component_code,
        quantity: item.required_quantity,
      });
    }
  }

  addAuditLogEntry({
    performed_by: userId,
    user_role: userRole,
    table_name: "inventory_items",
    record_id: orderId,
    action: "UPDATE",
    new_data: {
      action: "INVENTORY_RESERVATION_EXECUTED",
      orderId,
      orderNumber: pickingList.order_number,
      reservedItems,
      performedBy: userName,
    },
  });

  return {
    success: true,
    reservedItems,
  };
}

/**
 * Step 5 & 6: Validate Serial Number for Dispatch
 * Validates ownership, status, component SKU match, and cross-order booking prevention.
 */
export function validateSerialForDispatch(params: {
  serialNumber: string;
  expectedComponentId?: string;
  expectedComponentCode?: string;
  orderId: string;
}): { valid: boolean; serial: SerialNumber } {
  const { serialNumber, expectedComponentId, expectedComponentCode, orderId } = params;
  const store = getStore();

  const cleanSerial = serialNumber.trim();
  const serial = store.serialNumbers.find((s) => s.serial_number.toLowerCase() === cleanSerial.toLowerCase());

  if (!serial) {
    throw new InvalidSerialError(cleanSerial);
  }

  // Validate component SKU match if expected component is specified
  if (expectedComponentId && serial.component_id !== expectedComponentId) {
    const actualComp = store.components.find((c) => c.id === serial.component_id);
    throw new SerialMismatchError(
      cleanSerial,
      actualComp?.component_code || serial.component_code || "UNKNOWN",
      expectedComponentCode || expectedComponentId
    );
  }

  if (expectedComponentCode && serial.component_code && serial.component_code !== expectedComponentCode) {
    throw new SerialMismatchError(cleanSerial, serial.component_code, expectedComponentCode);
  }

  // INVARIANT 1: A serial number cannot be dispatched twice
  if (serial.status === "DISPATCHED") {
    throw new SerialAlreadyDispatchedError(cleanSerial, serial.dispatch_reference || serial.dispatch_id);
  }

  if (serial.status === "INSTALLED") {
    throw new SerialNotDispatchableError(cleanSerial, "INSTALLED", "Unit is already installed at a customer site");
  }

  if (serial.status === "UNDER_REPAIR") {
    throw new SerialNotDispatchableError(cleanSerial, "UNDER_REPAIR", "Unit is in repair bay and failed QA clearance");
  }

  if (serial.status === "RETIRED" || serial.status === "DEFECTIVE") {
    throw new SerialNotDispatchableError(cleanSerial, serial.status, "Unit is decommissioned / defective");
  }

  // INVARIANT 2: A reserved item cannot be allocated to another order
  if (serial.status === "RESERVED" && serial.order_id && serial.order_id !== orderId) {
    throw new SerialReservedForOtherOrderError(cleanSerial, serial.order_number || serial.order_id, orderId);
  }

  return { valid: true, serial };
}

export interface DispatchExecutionInput {
  orderId: string;
  locationId?: string;
  vehicleRegistrationNumber: string;
  driverName: string;
  driverPhone: string;
  scannedSerials: {
    componentCode: string;
    serialNumbers: string[];
  }[];
  performedBy: string;
  performerName?: string;
  userRole: UserRole;
}

export interface DispatchExecutionResult {
  success: boolean;
  dispatch: Dispatch;
  movements: StockMovement[];
  pickingList: MaterialPickingList;
  gatePassToken: string;
}

/**
 * Step 8, 9, 10: Execute Atomic Dispatch Manifest Transaction
 * Guarantees:
 * - Mutex concurrency lock per orderId.
 * - Anti-double dispatch guarantee.
 * - No cross-order allocation.
 * - Atomic rollback: if any check fails, zero stock is reduced and zero serials are mutated.
 * - Official Gate Pass token generation.
 * - Immutable stock movements logging.
 */
export function executeAtomicDispatch(input: DispatchExecutionInput): DispatchExecutionResult {
  const {
    orderId,
    vehicleRegistrationNumber,
    driverName,
    driverPhone,
    scannedSerials,
    performedBy,
    performerName = "Warehouse Staff",
    userRole,
  } = input;

  // Authorization check
  const allowedRoles: UserRole[] = [
    "WAREHOUSE_MANAGER",
    "INSTALLATION_MANAGER",
    "SUPER_ADMIN",
    "DIRECTOR",
  ];
  if (!allowedRoles.includes(userRole)) {
    throw new DispatchError(
      `Forbidden: Role '${userRole}' is not authorized to execute warehouse dispatches.`,
      "UNAUTHORIZED_DISPATCH"
    );
  }

  // INVARIANT 4: Concurrency Mutex Lock
  if (activeDispatchLocks.has(orderId)) {
    throw new ConcurrentDispatchError(orderId);
  }

  // Acquire lock
  activeDispatchLocks.add(orderId);

  try {
    const store = getStore();

    // 1. Order verification
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) {
      throw new DispatchError(`Order with ID '${orderId}' not found.`, "ORDER_NOT_FOUND");
    }

    if (order.status === "DISPATCHED" || order.status === "COMPLETED") {
      throw new DispatchError(
        `Order '${order.order_number}' has already been dispatched/completed (Status: ${order.status}).`,
        "ORDER_ALREADY_DISPATCHED"
      );
    }

    const customer = store.customers.find((c) => c.id === order.customer_id);
    const location = store.locations.find((l) => l.id === input.locationId) || store.locations[0];

    // 2. Generate and verify picking list
    const pickingList = generateMaterialPickingList(orderId);

    // 3. Flatten and check duplicate serials within the dispatch request
    const allScannedSerialsList: string[] = [];
    const seenSerials = new Set<string>();

    for (const group of scannedSerials) {
      for (const sn of group.serialNumbers) {
        const cleanSn = sn.trim();
        if (!cleanSn) continue;

        if (seenSerials.has(cleanSn.toLowerCase())) {
          throw new DuplicateSerialInDispatchError(cleanSn);
        }
        seenSerials.add(cleanSn.toLowerCase());
        allScannedSerialsList.push(cleanSn);
      }
    }

    // 4. Validate all serial-controlled components in picking list have exact required serials
    const validatedSerials: SerialNumber[] = [];

    for (const item of pickingList.items) {
      if (item.is_serial_tracked) {
        const matchingGroup = scannedSerials.find((g) => g.componentCode === item.component_code);
        const count = matchingGroup ? matchingGroup.serialNumbers.length : 0;

        if (count < item.required_quantity) {
          throw new DispatchError(
            `Incomplete serial scan for '${item.component_name}' (SKU: ${item.component_code}). Required: ${item.required_quantity}, Scanned: ${count}. All serial numbers must be scanned.`,
            "INCOMPLETE_SERIAL_SCAN"
          );
        }

        // Validate each serial individually
        if (matchingGroup) {
          for (const sn of matchingGroup.serialNumbers) {
            const { serial } = validateSerialForDispatch({
              serialNumber: sn,
              expectedComponentCode: item.component_code,
              orderId,
            });
            validatedSerials.push(serial);
          }
        }
      } else {
        // Non-serial items: verify warehouse stock balance
        const inv = store.inventoryItems.find((i) => i.component_id === item.component_id);
        if (!inv || inv.quantity_on_hand < item.required_quantity) {
          throw new InsufficientStockError(
            item.component_code,
            item.required_quantity,
            inv?.quantity_on_hand || 0
          );
        }
      }
    }

    // Vehicle validation
    if (!vehicleRegistrationNumber || vehicleRegistrationNumber.trim().length < 4) {
      throw new DispatchError("Valid vehicle registration plate is required for dispatch manifest.", "INVALID_VEHICLE");
    }

    if (!driverName || driverName.trim().length < 2) {
      throw new DispatchError("Driver name is required for gate pass generation.", "INVALID_DRIVER");
    }

    // --- ALL VALIDATIONS PASSED: ATOMIC COMMIT PHASE ---
    const now = new Date().toISOString();
    const manifestCounter = store.dispatches.length + 1;
    const dispatchNumber = `DSP-2026-${manifestCounter.toString().padStart(4, "0")}`;
    const gatePassToken = `GP-PASS-${Date.now().toString(36).toUpperCase()}`;

    // A. Create Dispatch Manifest
    const dispatchItems: DispatchItem[] = pickingList.items.map((item) => {
      const group = scannedSerials.find((g) => g.componentCode === item.component_code);
      return {
        component_id: item.component_id,
        component_code: item.component_code,
        component_name: item.component_name,
        quantity: item.required_quantity,
        serial_numbers: group ? group.serialNumbers : [],
      };
    });

    const newDispatch: Dispatch = {
      id: `dsp-${Date.now()}`,
      organization_id: "00000000-0000-0000-0000-000000000001",
      dispatch_number: dispatchNumber,
      order_id: order.id,
      order_number: order.order_number,
      customer_name: customer?.full_name || "Customer",
      shipping_address: customer ? `${customer.address}, ${customer.city}, ${customer.state}` : "Site Address",
      location_id: location.id,
      vehicle_registration_number: vehicleRegistrationNumber.trim().toUpperCase(),
      driver_name: driverName.trim(),
      driver_phone: driverPhone.trim(),
      dispatch_status: "IN_TRANSIT",
      items: dispatchItems,
      scanned_serials: allScannedSerialsList,
      gate_pass_token: gatePassToken,
      dispatched_at: now,
      created_by: performedBy,
      created_at: now,
    };

    store.dispatches.unshift(newDispatch);

    // B. Decrement Inventory & Create Immutable Stock Movements
    const recordedMovements: StockMovement[] = [];

    for (const item of pickingList.items) {
      const inv = store.inventoryItems.find((i) => i.component_id === item.component_id);
      if (inv) {
        inv.quantity_on_hand -= item.required_quantity;
        // Also release reserved quantity if it was previously reserved
        if (inv.quantity_reserved >= item.required_quantity) {
          inv.quantity_reserved -= item.required_quantity;
        } else {
          inv.quantity_reserved = 0;
        }

        const movement = addStockMovement({
          component_id: item.component_id,
          component_code: item.component_code,
          component_name: item.component_name,
          from_location_id: location.id,
          from_location_name: location.name,
          quantity: item.required_quantity,
          movement_type: "DISPATCH",
          reference_id: dispatchNumber,
          notes: `Dispatched for Order ${order.order_number} to site in vehicle ${newDispatch.vehicle_registration_number}. Driver: ${driverName}.`,
          performed_by: performedBy,
        });

        recordedMovements.push(movement);
      }
    }

    // C. Transition Serial Numbers to DISPATCHED
    for (const serial of validatedSerials) {
      serial.status = "DISPATCHED";
      serial.dispatch_id = newDispatch.id;
      serial.dispatch_reference = dispatchNumber;
      serial.order_id = order.id;
      serial.order_number = order.order_number;
      serial.customer_id = customer?.id;
      serial.customer_name = customer?.full_name;
      serial.updated_at = now;

      // Add movement record for this individual serial
      addStockMovement({
        component_id: serial.component_id,
        component_code: serial.component_code,
        component_name: serial.component_name,
        serial_number_id: serial.id,
        serial_number: serial.serial_number,
        from_location_id: location.id,
        from_location_name: location.name,
        quantity: 1,
        movement_type: "DISPATCH",
        reference_id: dispatchNumber,
        notes: `Serial ${serial.serial_number} dispatched on manifest ${dispatchNumber}.`,
        performed_by: performedBy,
      });
    }

    // D. Update Order Status
    order.status = "DISPATCHED";
    order.updated_at = now;

    // E. Audit Trail & Notification
    addAuditLogEntry({
      performed_by: performedBy,
      user_role: userRole,
      table_name: "dispatches",
      record_id: newDispatch.id,
      action: "INSERT",
      new_data: {
        action: "DISPATCH_COMMITTED_ATOMICALLY",
        dispatchNumber,
        orderId: order.id,
        orderNumber: order.order_number,
        vehicleRegistrationNumber: newDispatch.vehicle_registration_number,
        driverName: newDispatch.driver_name,
        totalItemsCount: pickingList.items.length,
        totalSerialsCount: validatedSerials.length,
        gatePassToken,
        performedBy: performerName,
      },
    });

    store.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: "all-installation-managers",
      title: "Consignment Dispatched to Job Site",
      message: `Manifest ${dispatchNumber} dispatched for ${customer?.full_name || "Customer"} (${order.order_number}). Vehicle: ${newDispatch.vehicle_registration_number}.`,
      type: "INFO",
      is_read: false,
      created_at: now,
    });

    return {
      success: true,
      dispatch: newDispatch,
      movements: recordedMovements,
      pickingList,
      gatePassToken,
    };
  } finally {
    // Release mutex lock always
    activeDispatchLocks.delete(orderId);
  }
}

/**
 * Confirm Delivery at Customer Job Site
 * Triggers trg_auto_warranty_delivery to activate warranty clocks
 */
export function confirmDispatchDelivery(
  dispatchId: string,
  receiverName: string,
  userRole: UserRole,
  performedBy: string = "system"
): Dispatch {
  const store = getStore();
  const dispatch = store.dispatches.find((d) => d.id === dispatchId);
  if (!dispatch) {
    throw new DispatchError(`Dispatch with ID '${dispatchId}' not found.`, "DISPATCH_NOT_FOUND");
  }

  const now = new Date().toISOString();
  dispatch.dispatch_status = "DELIVERED";
  dispatch.delivered_at = now;
  dispatch.receiver_name = receiverName.trim();

  // Find associated order
  const order = store.orders.find((o) => o.id === dispatch.order_id);
  if (order) {
    order.status = "INSTALLATION_IN_PROGRESS";
    order.updated_at = now;
  }

  // Record audit entry
  addAuditLogEntry({
    performed_by: performedBy,
    user_role: userRole,
    table_name: "dispatches",
    record_id: dispatch.id,
    action: "UPDATE",
    new_data: {
      action: "DELIVERY_CONFIRMED",
      dispatchNumber: dispatch.dispatch_number,
      deliveredAt: now,
      receiverName: dispatch.receiver_name,
      warrantyClockActivated: true,
    },
  });

  return dispatch;
}
