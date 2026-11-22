// Domain Engine: SolarOS Warranty & After-Sales Service Management System
// Enforces configurable warranty policies, automated eligibility, RMA serial replacements,
// repair estimate generation, repair ledger, and strict ticket closing invariants.

import {
  getStore,
  createWarranty,
  updateWarranty,
  addStockMovement,
  addAuditLogEntry,
  addServiceTicketUpdate,
  getWarrantyActivationPolicy,
} from "@/lib/data/store";
import {
  Warranty,
  WarrantyPolicy,
  ServiceTicket,
  ServiceTicketUpdate,
  Invoice,
  SerialNumber,
  UserRole,
} from "@/lib/types/database";

// --- Custom Error Classes ---

export class InvalidSerialNumberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSerialNumberError";
  }
}

export class DuplicateTicketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateTicketError";
  }
}

export class TicketClosingConditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TicketClosingConditionError";
  }
}

export class WarrantyAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WarrantyAuthorizationError";
  }
}

export class WarrantyReplacementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WarrantyReplacementError";
  }
}

export class RepairEstimateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepairEstimateError";
  }
}

// --- Date & Claim Calculation Utilities ---

export interface WarrantyDates {
  startDate: Date;
  endDate: Date;
}

export function calculateWarrantyDates(
  deliveryDate: Date,
  durationMonths: number
): WarrantyDates {
  const startDate = new Date(deliveryDate.getTime());
  const endDate = new Date(deliveryDate.getTime());
  endDate.setMonth(endDate.getMonth() + durationMonths);
  return { startDate, endDate };
}

export function isUnderWarranty(
  startDate: Date,
  endDate: Date,
  incidentDate: Date = new Date()
): boolean {
  return incidentDate >= startDate && incidentDate <= endDate;
}

export type WarrantyBillingDecision = "WARRANTY_FREE" | "BILLABLE";

export interface WarrantyDecisionResult {
  isCovered: boolean;
  billingClassification: WarrantyBillingDecision;
  remainingDays: number;
  reason: string;
}

export function evaluateWarrantyClaim(
  warrantyStartDate: Date,
  warrantyEndDate: Date,
  incidentDate: Date = new Date()
): WarrantyDecisionResult {
  const covered = isUnderWarranty(warrantyStartDate, warrantyEndDate, incidentDate);
  const diffTime = warrantyEndDate.getTime() - incidentDate.getTime();
  const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (covered) {
    return {
      isCovered: true,
      billingClassification: "WARRANTY_FREE",
      remainingDays: Math.max(0, remainingDays),
      reason: `Component is under active manufacturer warranty (${remainingDays} days remaining). Parts and labor covered at ₹0.00 cost.`,
    };
  }

  return {
    isCovered: false,
    billingClassification: "BILLABLE",
    remainingDays: 0,
    reason: `Warranty expired on ${warrantyEndDate.toISOString().slice(0, 10)}. Standard service inspection charges, replacement parts, and labor apply.`,
  };
}

// --- Warranty Eligibility Evaluator for a Serial Number ---

export interface SerialWarrantyEvaluation {
  serialNumber: string;
  serialNumberId: string;
  componentId: string;
  componentName: string;
  componentCode: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  orderNumber?: string;
  isCovered: boolean;
  billingClassification: "WARRANTY_FREE" | "BILLABLE";
  remainingDays: number;
  customerPayableAmount: number;
  policyName?: string;
  policyTerms?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warranty?: Warranty;
  reason: string;
}

export function evaluateSerialWarrantyEligibility(
  serialNumberOrId: string,
  asOfDate: Date = new Date()
): SerialWarrantyEvaluation {
  const store = getStore();
  const clean = serialNumberOrId.trim();

  // Find serial number record
  const serial = store.serialNumbers.find(
    (s) =>
      s.serial_number.toLowerCase() === clean.toLowerCase() ||
      s.id.toLowerCase() === clean.toLowerCase()
  );

  if (!serial) {
    throw new InvalidSerialNumberError(
      `Serial number '${serialNumberOrId}' does not exist in the system hardware register.`
    );
  }

  // Look for matching warranty records (prioritizing active warranty covering the date)
  const candidateWarranties = store.warranties.filter(
    (w) =>
      w.serial_number_id === serial.id ||
      (w.serial_number && w.serial_number.toLowerCase() === serial.serial_number.toLowerCase())
  );

  let warranty = candidateWarranties.find((w) => {
    if (w.status !== "ACTIVE") return false;
    const start = new Date(w.warranty_start_date);
    const end = new Date(w.warranty_end_date);
    return asOfDate >= start && asOfDate <= end;
  });

  if (!warranty && candidateWarranties.length > 0) {
    warranty = candidateWarranties.sort(
      (a, b) => new Date(b.warranty_end_date).getTime() - new Date(a.warranty_end_date).getTime()
    )[0];
  }

  // Look for matching policy
  const policy = warranty
    ? store.warrantyPolicies.find((p) => p.id === warranty.policy_id)
    : undefined;

  if (warranty && warranty.status === "ACTIVE") {
    const startDate = new Date(warranty.warranty_start_date);
    const endDate = new Date(warranty.warranty_end_date);
    const claim = evaluateWarrantyClaim(startDate, endDate, asOfDate);

    if (claim.isCovered) {
      return {
        serialNumber: serial.serial_number,
        serialNumberId: serial.id,
        componentId: serial.component_id,
        componentName: serial.component_name || "Solar System Component",
        componentCode: serial.component_code || "COMP-GEN",
        customerId: serial.customer_id || warranty.customer_id,
        customerName: serial.customer_name || warranty.customer_name,
        orderId: serial.order_id || warranty.order_id,
        orderNumber: serial.order_number || warranty.order_number,
        isCovered: true,
        billingClassification: "WARRANTY_FREE",
        remainingDays: claim.remainingDays,
        customerPayableAmount: 0.0,
        policyName: policy?.name || "Manufacturer Standard Warranty",
        policyTerms: policy?.terms || "Covers parts and labor at zero cost.",
        warrantyStartDate: warranty.warranty_start_date,
        warrantyEndDate: warranty.warranty_end_date,
        warranty,
        reason: claim.reason,
      };
    }
  }

  // If expired, voided, or no warranty found
  const expiredDateStr = warranty?.warranty_end_date || "N/A";
  return {
    serialNumber: serial.serial_number,
    serialNumberId: serial.id,
    componentId: serial.component_id,
    componentName: serial.component_name || "Solar System Component",
    componentCode: serial.component_code || "COMP-GEN",
    customerId: serial.customer_id || warranty?.customer_id,
    customerName: serial.customer_name || warranty?.customer_name,
    orderId: serial.order_id || warranty?.order_id,
    orderNumber: serial.order_number || warranty?.order_number,
    isCovered: false,
    billingClassification: "BILLABLE",
    remainingDays: 0,
    customerPayableAmount: 0.0, // Billable items will have an estimate calculated
    policyName: policy?.name,
    policyTerms: policy?.terms,
    warrantyStartDate: warranty?.warranty_start_date,
    warrantyEndDate: warranty?.warranty_end_date,
    warranty,
    reason: warranty
      ? `Warranty expired on ${expiredDateStr} (status: ${warranty.status}). Customer is liable for service inspection, replacement parts, and technician labor.`
      : `No registered warranty found for hardware serial '${serial.serial_number}'. Service visits are classified as billable.`,
  };
}

// --- Warranty Activation Engine ---

export interface ActivateOrderWarrantiesParams {
  orderId: string;
  activationTrigger?: "ON_DELIVERY" | "ON_COMMISSIONING";
  activationDate?: Date;
  userRole?: UserRole;
  userId?: string;
}

export function activateOrderWarranties(
  params: ActivateOrderWarrantiesParams
): {
  activatedWarranties: Warranty[];
  orderId: string;
  trigger: "ON_DELIVERY" | "ON_COMMISSIONING";
} {
  const store = getStore();
  const configuredPolicy = getWarrantyActivationPolicy();
  const trigger = params.activationTrigger || configuredPolicy;

  const order = store.orders.find((o) => o.id === params.orderId);
  if (!order) {
    throw new Error(`Order '${params.orderId}' not found.`);
  }

  const customer = store.customers.find((c) => c.id === order.customer_id);

  // Find all serials allocated to this order
  const orderSerials = store.serialNumbers.filter(
    (s) => s.order_id === order.id && (s.status === "DISPATCHED" || s.status === "INSTALLED")
  );

  const activationDate = params.activationDate || new Date();
  const activatedWarranties: Warranty[] = [];

  for (const serial of orderSerials) {
    // Avoid duplicate warranty activation for the same serial number
    const existingWar = store.warranties.find((w) => w.serial_number_id === serial.id);
    if (existingWar) {
      continue;
    }

    const component = store.components.find((c) => c.id === serial.component_id);
    const category = component?.category || "INVERTER";

    // Match policy by model_code or category
    const policy =
      store.warrantyPolicies.find(
        (p) => p.is_active !== false && p.model_code === serial.component_code
      ) ||
      store.warrantyPolicies.find(
        (p) => p.is_active !== false && p.component_category === category
      ) ||
      store.warrantyPolicies[0];

    const durationMonths = policy ? policy.duration_months : 24;
    const { startDate, endDate } = calculateWarrantyDates(activationDate, durationMonths);

    const newWarranty = createWarranty({
      organization_id: order.organization_id,
      order_id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      customer_name: customer?.full_name || serial.customer_name,
      customer_phone: customer?.phone,
      customer_email: customer?.email,
      component_id: serial.component_id,
      component_name: serial.component_name || component?.name,
      component_code: serial.component_code || component?.component_code,
      serial_number_id: serial.id,
      serial_number: serial.serial_number,
      policy_id: policy ? policy.id : "default-policy",
      warranty_start_date: startDate.toISOString().slice(0, 10),
      warranty_end_date: endDate.toISOString().slice(0, 10),
      duration_months: durationMonths,
      status: "ACTIVE",
      activation_trigger: trigger,
      certificate_pdf_url: `/api/warranties/cert-${order.order_number}-${serial.serial_number}.pdf`,
    });

    // Link warranty id onto the serial number
    serial.warranty_id = newWarranty.id;
    activatedWarranties.push(newWarranty);
  }

  addAuditLogEntry({
    performed_by: params.userId || "system",
    user_role: params.userRole,
    table_name: "warranties",
    record_id: order.id,
    action: "INSERT",
    new_data: {
      order_id: order.id,
      trigger,
      warranties_created: activatedWarranties.length,
      activation_date: activationDate.toISOString(),
    },
  });

  return {
    activatedWarranties,
    orderId: order.id,
    trigger,
  };
}

// --- Customer Complaint Submission & Triage ---

export interface SubmitComplaintParams {
  customerId?: string;
  serialNumber: string;
  reportedFaultCode: string;
  symptomDescription: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  photoUrls?: string[];
  assignedTechnicianId?: string;
  userRole?: UserRole;
  userId?: string;
}

export function submitServiceComplaint(params: SubmitComplaintParams): {
  ticket: ServiceTicket;
  eligibility: SerialWarrantyEvaluation;
} {
  const store = getStore();
  const cleanSerial = params.serialNumber.trim();

  // 1. Validate serial number exists in register
  const serial = store.serialNumbers.find(
    (s) => s.serial_number.toLowerCase() === cleanSerial.toLowerCase()
  );

  if (!serial) {
    throw new InvalidSerialNumberError(
      `Serial number '${params.serialNumber}' does not exist in the system hardware register.`
    );
  }

  // 2. Anti-duplicate invariant: prevent multiple active tickets for the same serial unit
  const activeTicketStatuses = [
    "OPEN",
    "ASSIGNED",
    "IN_PROGRESS",
    "AWAITING_PARTS",
    "CUSTOMER_CONFIRMATION_PENDING",
    "LOGGED",
    "TECHNICIAN_VISITED",
    "PARTS_PENDING",
  ];

  const existingActiveTicket = store.serviceTickets.find(
    (t) =>
      (t.serial_number_id === serial.id ||
        (t.serial_number && t.serial_number.toLowerCase() === cleanSerial.toLowerCase())) &&
      activeTicketStatuses.includes(t.status)
  );

  if (existingActiveTicket) {
    throw new DuplicateTicketError(
      `An active service ticket (${existingActiveTicket.ticket_number}) already exists for serial number '${params.serialNumber}' in status '${existingActiveTicket.status}'. Duplicate service requests are prohibited until the prior ticket is closed.`
    );
  }

  // 3. Auto-evaluate warranty eligibility
  const eligibility = evaluateSerialWarrantyEligibility(serial.serial_number);

  // 4. Resolve customer
  const customerId = params.customerId || serial.customer_id || store.customers[0].id;
  const customer = store.customers.find((c) => c.id === customerId);

  // 5. Generate ticket number
  const nextSeq = store.serviceTickets.length + 1;
  const ticketNumber = `TKT-2026-${String(nextSeq).padStart(4, "0")}`;

  const initialStatus = params.assignedTechnicianId ? "ASSIGNED" : "OPEN";

  const newTicket: ServiceTicket = {
    id: `tkt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    organization_id: "00000000-0000-0000-0000-000000000001",
    ticket_number: ticketNumber,
    order_id: serial.order_id || store.orders[0]?.id || "ord-1",
    customer_id: customerId,
    customer_name: customer?.full_name || serial.customer_name || "Customer",
    customer_phone: customer?.phone,
    customer_email: customer?.email,
    serial_number_id: serial.id,
    serial_number: serial.serial_number,
    component_name: serial.component_name,
    component_code: serial.component_code,
    reported_fault_code: params.reportedFaultCode.trim().toUpperCase(),
    symptom_description: params.symptomDescription.trim(),
    is_under_warranty: eligibility.isCovered,
    billing_classification: eligibility.billingClassification,
    priority: params.priority || "MEDIUM",
    photo_urls: params.photoUrls || [],
    assigned_technician_id: params.assignedTechnicianId,
    status: initialStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  store.serviceTickets.unshift(newTicket);

  // 6. Record repair history ledger update
  addServiceTicketUpdate({
    ticket_id: newTicket.id,
    updated_by: params.userId || "customer_portal",
    updated_by_name: customer?.full_name || "Customer Intake",
    from_status: "OPEN",
    to_status: initialStatus,
    comment: `Service complaint lodged for serial ${serial.serial_number}. Fault code: ${newTicket.reported_fault_code}. Warranty Engine evaluated coverage as ${newTicket.billing_classification} (Customer payable: ₹${eligibility.customerPayableAmount.toFixed(2)}).`,
    update_type: "STATUS_CHANGE",
  });

  addAuditLogEntry({
    performed_by: params.userId || "system",
    user_role: params.userRole,
    table_name: "service_tickets",
    record_id: newTicket.id,
    action: "INSERT",
    new_data: {
      ticket_number: newTicket.ticket_number,
      serial_number: serial.serial_number,
      fault_code: newTicket.reported_fault_code,
      billing_classification: newTicket.billing_classification,
    },
  });

  return { ticket: newTicket, eligibility };
}

// --- Lifecycle State Transitions ---

export function assignServiceTicket(
  ticketId: string,
  params: {
    technicianId: string;
    technicianName?: string;
    notes?: string;
    userRole?: UserRole;
    userId?: string;
  }
): ServiceTicket {
  const store = getStore();
  const ticket = store.serviceTickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Service ticket '${ticketId}' not found.`);

  const tech = store.technicians.find(
    (t) => t.profile_id === params.technicianId || t.id === params.technicianId
  );
  const techName = params.technicianName || tech?.name || "Technician";

  const prevStatus = ticket.status;
  ticket.assigned_technician_id = params.technicianId;
  ticket.status = "ASSIGNED";
  ticket.updated_at = new Date().toISOString();

  addServiceTicketUpdate({
    ticket_id: ticket.id,
    updated_by: params.userId || "dispatcher",
    updated_by_name: "Dispatch Operations",
    from_status: prevStatus,
    to_status: "ASSIGNED",
    comment: `Assigned technician ${techName}. ${params.notes || "Field inspection scheduled."}`,
    update_type: "STATUS_CHANGE",
  });

  return ticket;
}

export function startServiceTicket(
  ticketId: string,
  params: { userRole?: UserRole; userId?: string }
): ServiceTicket {
  const store = getStore();
  const ticket = store.serviceTickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Service ticket '${ticketId}' not found.`);

  const prevStatus = ticket.status;
  ticket.status = "IN_PROGRESS";
  ticket.updated_at = new Date().toISOString();

  addServiceTicketUpdate({
    ticket_id: ticket.id,
    updated_by: params.userId || "technician",
    updated_by_name: "Field Technician",
    from_status: prevStatus,
    to_status: "IN_PROGRESS",
    comment: "Technician arrived on-site and commenced diagnostics.",
    update_type: "STATUS_CHANGE",
  });

  return ticket;
}

export function requestPartsForTicket(
  ticketId: string,
  params: {
    requiredParts: string;
    userRole?: UserRole;
    userId?: string;
  }
): ServiceTicket {
  const store = getStore();
  const ticket = store.serviceTickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Service ticket '${ticketId}' not found.`);

  const prevStatus = ticket.status;
  ticket.status = "AWAITING_PARTS";
  ticket.updated_at = new Date().toISOString();

  addServiceTicketUpdate({
    ticket_id: ticket.id,
    updated_by: params.userId || "technician",
    updated_by_name: "Field Technician",
    from_status: prevStatus,
    to_status: "AWAITING_PARTS",
    comment: `Technician requisitioned warehouse spare parts: ${params.requiredParts}`,
    update_type: "STATUS_CHANGE",
  });

  return ticket;
}

// --- Billable Repair Estimate & Customer Approval Workflow ---

export function createRepairEstimate(
  ticketId: string,
  params: {
    partsCost: number;
    laborCost: number;
    partsList?: string;
    userRole?: UserRole;
    userId?: string;
  }
): ServiceTicket {
  if (params.partsCost < 0 || params.laborCost < 0) {
    throw new RepairEstimateError("Parts and labor costs cannot be negative.");
  }

  const store = getStore();
  const ticket = store.serviceTickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Service ticket '${ticketId}' not found.`);

  ticket.parts_cost = params.partsCost;
  ticket.labor_cost = params.laborCost;
  ticket.total_estimate = params.partsCost + params.laborCost;
  ticket.customer_approved_estimate = false;
  ticket.updated_at = new Date().toISOString();

  addServiceTicketUpdate({
    ticket_id: ticket.id,
    updated_by: params.userId || "estimator",
    updated_by_name: "Service Estimation Desk",
    from_status: ticket.status,
    to_status: ticket.status,
    comment: `Generated billable repair estimate: Parts ₹${params.partsCost.toFixed(2)}, Labor ₹${params.laborCost.toFixed(2)}, Total ₹${ticket.total_estimate.toFixed(2)}. Requires customer approval before proceeding.`,
    update_type: "ESTIMATE_CREATED",
    metadata: {
      partsCost: params.partsCost,
      laborCost: params.laborCost,
      totalEstimate: ticket.total_estimate,
      partsList: params.partsList,
    },
  });

  return ticket;
}

export function approveRepairEstimate(
  ticketId: string,
  params: {
    approvedByCustomer: boolean;
    customerNotes?: string;
    userRole?: UserRole;
    userId?: string;
  }
): ServiceTicket {
  const store = getStore();
  const ticket = store.serviceTickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Service ticket '${ticketId}' not found.`);

  if (ticket.billing_classification === "WARRANTY_FREE") {
    // Under warranty, customer pays ₹0 anyway
    ticket.customer_approved_estimate = true;
    ticket.customer_estimate_approved_at = new Date().toISOString();
    return ticket;
  }

  if (!params.approvedByCustomer) {
    ticket.customer_approved_estimate = false;
    ticket.updated_at = new Date().toISOString();
    addServiceTicketUpdate({
      ticket_id: ticket.id,
      updated_by: params.userId || "customer",
      updated_by_name: ticket.customer_name || "Customer",
      from_status: ticket.status,
      to_status: ticket.status,
      comment: `Customer rejected the repair estimate of ₹${(ticket.total_estimate || 0).toFixed(2)}. ${params.customerNotes || ""}`,
      update_type: "ESTIMATE_APPROVED",
    });
    return ticket;
  }

  ticket.customer_approved_estimate = true;
  ticket.customer_estimate_approved_at = new Date().toISOString();
  ticket.updated_at = new Date().toISOString();

  addServiceTicketUpdate({
    ticket_id: ticket.id,
    updated_by: params.userId || "customer",
    updated_by_name: ticket.customer_name || "Customer",
    from_status: ticket.status,
    to_status: ticket.status,
    comment: `Customer formally approved repair estimate of ₹${(ticket.total_estimate || 0).toFixed(2)}. Technician authorized to proceed with repairs.`,
    update_type: "ESTIMATE_APPROVED",
  });

  return ticket;
}

export function generateServiceInvoice(
  ticketId: string,
  params: {
    dueDateDays?: number;
    userRole?: UserRole;
    userId?: string;
  } = {}
): Invoice {
  const store = getStore();
  const ticket = store.serviceTickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Service ticket '${ticketId}' not found.`);

  if (ticket.billing_classification === "WARRANTY_FREE") {
    throw new Error(
      "Cannot generate a billable service invoice for a ₹0.00 WARRANTY_FREE service ticket."
    );
  }

  if (!ticket.customer_approved_estimate) {
    throw new RepairEstimateError(
      "Customer must explicitly approve the repair estimate before a service invoice can be issued."
    );
  }

  const taxableAmount = ticket.total_estimate || (ticket.parts_cost || 0) + (ticket.labor_cost || 0);
  const taxAmount = Math.round(taxableAmount * 0.18 * 100) / 100;
  const totalAmount = taxableAmount + taxAmount;

  const dueDays = params.dueDateDays || 7;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  const nextInvNum = store.invoices.length + 1;
  const invoiceNumber = `INV-SRV-${String(nextInvNum).padStart(4, "0")}`;

  const invoice: Invoice = {
    id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    organization_id: ticket.organization_id,
    invoice_number: invoiceNumber,
    order_id: ticket.order_id,
    customer_id: ticket.customer_id,
    milestone: "SERVICE_FEE",
    taxable_amount: taxableAmount,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    amount_paid: 0,
    due_date: dueDate.toISOString().slice(0, 10),
    is_settled: false,
    pdf_url: `/api/invoices/${invoiceNumber}.pdf`,
    created_at: new Date().toISOString(),
  };

  store.invoices.unshift(invoice);
  ticket.service_invoice_id = invoice.id;
  ticket.updated_at = new Date().toISOString();

  addServiceTicketUpdate({
    ticket_id: ticket.id,
    updated_by: params.userId || "billing",
    updated_by_name: "Billing Department",
    from_status: ticket.status,
    to_status: ticket.status,
    comment: `Generated Service Invoice ${invoiceNumber} for ₹${totalAmount.toFixed(2)} (Taxable: ₹${taxableAmount.toFixed(2)}, GST 18%: ₹${taxAmount.toFixed(2)}).`,
    update_type: "STATUS_CHANGE",
  });

  return invoice;
}

// --- RMA Warranty Replacement Workflow ---

export interface ExecuteWarrantyReplacementParams {
  oldSerialNumber: string;
  newSerialNumber: string;
  technicianId: string;
  notes?: string;
  userRole?: UserRole;
  userId?: string;
}

export function executeWarrantyReplacement(
  ticketId: string,
  params: ExecuteWarrantyReplacementParams
): {
  ticket: ServiceTicket;
  oldSerial: SerialNumber;
  newSerial: SerialNumber;
  transferredWarranty?: Warranty;
} {
  const store = getStore();
  const ticket = store.serviceTickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Service ticket '${ticketId}' not found.`);

  const oldClean = params.oldSerialNumber.trim();
  const newClean = params.newSerialNumber.trim();

  // 1. Validate old serial
  const oldSerial = store.serialNumbers.find(
    (s) => s.serial_number.toLowerCase() === oldClean.toLowerCase()
  );
  if (!oldSerial) {
    throw new WarrantyReplacementError(
      `Old serial number '${params.oldSerialNumber}' not found in hardware register.`
    );
  }

  // 2. Validate new serial exists and is IN_STOCK
  const newSerial = store.serialNumbers.find(
    (s) => s.serial_number.toLowerCase() === newClean.toLowerCase()
  );
  if (!newSerial) {
    throw new WarrantyReplacementError(
      `Replacement serial number '${params.newSerialNumber}' does not exist in inventory.`
    );
  }

  if (newSerial.status !== "IN_STOCK") {
    throw new WarrantyReplacementError(
      `Replacement serial '${newSerial.serial_number}' is not available in warehouse stock (current status: '${newSerial.status}'). Only 'IN_STOCK' units can be allocated for RMA replacement.`
    );
  }

  // 3. Validate components are matching type
  if (oldSerial.component_id !== newSerial.component_id && oldSerial.component_code !== newSerial.component_code) {
    throw new WarrantyReplacementError(
      `Component mismatch: Replacement serial '${newSerial.serial_number}' (${newSerial.component_code}) does not match defective serial '${oldSerial.serial_number}' (${oldSerial.component_code}).`
    );
  }

  // 4. Atomically transition serial numbers
  oldSerial.status = "REPLACED";
  oldSerial.updated_at = new Date().toISOString();

  newSerial.status = "INSTALLED";
  newSerial.customer_id = oldSerial.customer_id;
  newSerial.customer_name = oldSerial.customer_name;
  newSerial.order_id = oldSerial.order_id;
  newSerial.order_number = oldSerial.order_number;
  newSerial.installation_id = oldSerial.installation_id;
  newSerial.updated_at = new Date().toISOString();

  // 5. Transfer / update existing warranty coverage to new serial
  const existingWarranty = store.warranties.find(
    (w) =>
      w.serial_number_id === oldSerial.id ||
      (w.serial_number && w.serial_number.toLowerCase() === oldSerial.serial_number.toLowerCase())
  );

  let transferredWarranty: Warranty | undefined;

  if (existingWarranty) {
    existingWarranty.serial_number_id = newSerial.id;
    existingWarranty.serial_number = newSerial.serial_number;
    existingWarranty.updated_at = new Date().toISOString();
    newSerial.warranty_id = existingWarranty.id;
    transferredWarranty = existingWarranty;
  }

  // 6. Record stock movements
  addStockMovement({
    component_id: newSerial.component_id,
    component_code: newSerial.component_code,
    component_name: newSerial.component_name,
    serial_number_id: newSerial.id,
    serial_number: newSerial.serial_number,
    movement_type: "DISPATCH",
    notes: `Allocated for warranty RMA replacement against defective unit ${oldSerial.serial_number}. Ticket ${ticket.ticket_number}.`,
    performed_by: params.userId || "technician",
    quantity: 1,
  });

  addStockMovement({
    component_id: oldSerial.component_id,
    component_code: oldSerial.component_code,
    component_name: oldSerial.component_name,
    serial_number_id: oldSerial.id,
    serial_number: oldSerial.serial_number,
    movement_type: "RETURN",
    notes: `Defective unit returned for OEM root-cause analysis / RMA under Ticket ${ticket.ticket_number}.`,
    performed_by: params.userId || "technician",
    quantity: 1,
  });

  // 7. Update ticket
  ticket.replaced_serial_number = oldSerial.serial_number;
  ticket.new_serial_number = newSerial.serial_number;
  ticket.replacement_date = new Date().toISOString();
  ticket.updated_at = new Date().toISOString();

  addServiceTicketUpdate({
    ticket_id: ticket.id,
    updated_by: params.userId || "technician",
    updated_by_name: "Field Technician",
    from_status: ticket.status,
    to_status: ticket.status,
    comment: `RMA Warranty Replacement executed: Defective serial ${oldSerial.serial_number} replaced with warehouse unit ${newSerial.serial_number}. Remaining warranty coverage transferred. ${params.notes || ""}`,
    update_type: "PARTS_REPLACED",
    metadata: {
      defectiveSerial: oldSerial.serial_number,
      replacementSerial: newSerial.serial_number,
      warrantyId: existingWarranty?.id,
    },
  });

  return {
    ticket,
    oldSerial,
    newSerial,
    transferredWarranty,
  };
}

// --- Technical Resolution & Ticket Closing Gate ---

export function resolveServiceTicket(
  ticketId: string,
  params: {
    resolutionNotes: string;
    technicianId: string;
    partsReplaced?: string;
    userRole?: UserRole;
    userId?: string;
  }
): ServiceTicket {
  if (!params.resolutionNotes || params.resolutionNotes.trim().length === 0) {
    throw new TicketClosingConditionError("Technical resolution notes are required to resolve a service ticket.");
  }

  const store = getStore();
  const ticket = store.serviceTickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Service ticket '${ticketId}' not found.`);

  const prevStatus = ticket.status;
  ticket.status = "CUSTOMER_CONFIRMATION_PENDING";
  ticket.resolution_notes = params.resolutionNotes.trim();
  ticket.resolved_at = new Date().toISOString();
  ticket.updated_at = new Date().toISOString();

  addServiceTicketUpdate({
    ticket_id: ticket.id,
    updated_by: params.userId || "technician",
    updated_by_name: "Field Technician",
    from_status: prevStatus,
    to_status: "CUSTOMER_CONFIRMATION_PENDING",
    comment: `Technical resolution recorded: ${ticket.resolution_notes}. Status moved to Customer Confirmation Pending.`,
    update_type: "RESOLVED",
    metadata: {
      partsReplaced: params.partsReplaced,
    },
  });

  return ticket;
}

export interface CloseServiceTicketParams {
  customerConfirmed?: boolean;
  customerFeedbackRating?: number;
  customerFeedbackComments?: string;
  adminOverrideReason?: string;
  userRole?: UserRole;
  userId?: string;
}

export function closeServiceTicket(
  ticketId: string,
  params: CloseServiceTicketParams
): ServiceTicket {
  const store = getStore();
  const ticket = store.serviceTickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Service ticket '${ticketId}' not found.`);

  // --- CLOSING CONDITION INVARIANT 1: Must have resolution notes ---
  if (!ticket.resolution_notes || ticket.resolution_notes.trim().length === 0) {
    throw new TicketClosingConditionError(
      "Ticket cannot be closed without recorded technical resolution notes."
    );
  }

  // --- CLOSING CONDITION INVARIANT 2: Must have Customer Confirmation OR Authorized Admin/Director Exception ---
  const hasCustomerConfirmation = Boolean(
    params.customerConfirmed || ticket.customer_confirmed_at
  );

  const isAuthorizedRole =
    params.userRole === "SUPER_ADMIN" || params.userRole === "DIRECTOR";

  const hasAdminOverride = Boolean(
    isAuthorizedRole &&
      params.adminOverrideReason &&
      params.adminOverrideReason.trim().length > 0
  );

  if (!hasCustomerConfirmation && !hasAdminOverride) {
    throw new TicketClosingConditionError(
      "Ticket cannot be closed until resolution is recorded AND customer confirmation is received or an authorized director exception is documented."
    );
  }

  const prevStatus = ticket.status;

  if (hasCustomerConfirmation) {
    ticket.customer_confirmed_at = ticket.customer_confirmed_at || new Date().toISOString();
    if (params.customerFeedbackRating) {
      ticket.customer_feedback_rating = params.customerFeedbackRating;
      ticket.customer_feedback_comments = params.customerFeedbackComments;
    }

    addServiceTicketUpdate({
      ticket_id: ticket.id,
      updated_by: params.userId || "customer",
      updated_by_name: ticket.customer_name || "Customer",
      from_status: prevStatus,
      to_status: "CLOSED",
      comment: `Customer confirmed satisfaction. Rating: ${params.customerFeedbackRating || 5}/5 stars. ${params.customerFeedbackComments || ""}`,
      update_type: "CUSTOMER_CONFIRMED",
    });
  } else if (hasAdminOverride) {
    ticket.admin_override_by = params.userId || "Administrator";
    ticket.admin_override_reason = params.adminOverrideReason;

    addServiceTicketUpdate({
      ticket_id: ticket.id,
      updated_by: params.userId || "admin",
      updated_by_name: `Director Override (${params.userRole})`,
      from_status: prevStatus,
      to_status: "CLOSED",
      comment: `Director override applied: ${params.adminOverrideReason}`,
      update_type: "ADMIN_OVERRIDE",
    });
  }

  ticket.status = "CLOSED";
  ticket.updated_at = new Date().toISOString();

  addServiceTicketUpdate({
    ticket_id: ticket.id,
    updated_by: params.userId || "system",
    updated_by_name: "Service Desk",
    from_status: prevStatus,
    to_status: "CLOSED",
    comment: "Service ticket permanently closed.",
    update_type: "CLOSED",
  });

  addAuditLogEntry({
    performed_by: params.userId || "system",
    user_role: params.userRole,
    table_name: "service_tickets",
    record_id: ticket.id,
    action: "UPDATE",
    old_data: { status: prevStatus },
    new_data: {
      status: "CLOSED",
      resolved_at: ticket.resolved_at,
      customer_confirmed_at: ticket.customer_confirmed_at,
      admin_override_by: ticket.admin_override_by,
      admin_override_reason: ticket.admin_override_reason,
    },
  });

  return ticket;
}
