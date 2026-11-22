// Domain Engine: Payments, Order Confirmation, Balance Reconciliation & Refunds
// Enforces:
// 1. Accepted quotation required before order confirmation
// 2. Approved site survey required
// 3. Strict idempotency & duplicate payment protection
// 4. Configurable advance payment thresholds (e.g. 20%)
// 5. Historical price freezing on order creation
// 6. Verified / Labeled simulated payment gateway integration

import {
  Order,
  Payment,
  Refund,
  PaymentMilestone,
  PaymentMode,
  UserRole,
} from "@/lib/types/database";
import { getStore, addLeadActivity, addAuditLogEntry } from "@/lib/data/store";
import { verifyQuotationEligibility } from "@/domain/workflow/survey-gate";

export interface ConfirmOrderInput {
  quotationId: string;
  advancePaymentReference?: string;
  advanceAmountPaid?: number;
  paymentMode?: PaymentMode;
  idempotencyKey: string;
  minAdvancePercent?: number; // Configurable condition, default 20%
  userRole?: UserRole;
  userId?: string;
  userName?: string;
  notes?: string;
}

export interface ProcessPaymentInput {
  orderId: string;
  amount: number;
  milestone: PaymentMilestone;
  paymentMode: PaymentMode;
  paymentReferenceCode: string; // Bank UTR or Gateway Transaction ID
  idempotencyKey?: string;
  gatewayProvider?: string;
  gatewayTransactionId?: string;
  isSimulated?: boolean;
  verifiedBy?: string;
  userRole?: UserRole;
  notes?: string;
}

export interface ProcessRefundInput {
  paymentId: string;
  amount: number;
  reason: string;
  processedBy?: string;
  userRole: UserRole;
}

/**
 * Confirms an Order from an Accepted Quotation.
 * Enforces:
 * - Approved site survey
 * - Accepted quotation status
 * - Historical pricing snapshot (freezing prices)
 * - Configurable advance payment
 * - Idempotency
 */
export function confirmOrderFromQuotation(input: ConfirmOrderInput): {
  order: Order;
  initialPayment?: Payment;
} {
  const store = getStore();

  // 1. Retrieve Quotation
  const quotation = store.quotations.find((q) => q.id === input.quotationId);
  if (!quotation) {
    throw new Error(`Quotation '${input.quotationId}' not found.`);
  }

  // 2. Critical Business Rule: Accepted quotation required before order confirmation
  if (quotation.status !== "ACCEPTED") {
    throw new Error(
      `Cannot confirm order: Quotation ${quotation.quotation_number} has status '${quotation.status}'. The customer must review and accept the quotation before an order can be created.`
    );
  }

  // 3. Critical Business Rule: Approved site survey required
  const survey = store.surveys.find((s) => s.id === quotation.survey_id);
  const eligibility = verifyQuotationEligibility({
    survey,
    userRole: input.userRole || "DIRECTOR",
    overrideReason: survey?.admin_override_reason,
  });

  if (!eligibility.isEligible) {
    throw new Error(
      `Order confirmation blocked by site survey gate: ${eligibility.rejectionReason}`
    );
  }

  // 4. Idempotency Check (Prevent duplicate orders)
  const existingOrderByQuotation = store.orders.find((o) => o.quotation_id === quotation.id);
  if (existingOrderByQuotation) {
    throw new Error(
      `Order already exists for quotation ${quotation.quotation_number}: Order ${existingOrderByQuotation.order_number}`
    );
  }

  const existingOrderByIdempotency = store.orders.find((o) => o.idempotency_key === input.idempotencyKey);
  if (existingOrderByIdempotency) {
    return { order: existingOrderByIdempotency };
  }

  // 5. Configurable Advance Payment Condition
  const advancePercent = input.minAdvancePercent ?? 20; // 20% default
  const advanceRequired = Math.round((quotation.gross_total * advancePercent) / 100);
  const advancePaid = input.advanceAmountPaid ?? 0;

  // 6. Frozen Pricing Snapshot onto Order
  const orderNumber = `ORD-2026-${String(store.orders.length + 1).padStart(4, "0")}`;
  const lead = store.leads.find((l) => l.id === quotation.lead_id);
  const customerId = lead?.customer_id || store.customers[0]?.id || "cust-001";

  const order: Order = {
    id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    organization_id: quotation.organization_id,
    order_number: orderNumber,
    quotation_id: quotation.id,
    customer_id: customerId,
    lead_id: quotation.lead_id,
    idempotency_key: input.idempotencyKey,
    system_capacity_kw: quotation.system_capacity_kw,
    system_topology: quotation.system_topology,
    total_contract_value: quotation.gross_total, // Frozen price
    advance_amount_required: advanceRequired,
    advance_amount_paid: advancePaid,
    outstanding_balance: Math.max(0, quotation.gross_total - advancePaid),
    advance_payment_percent: advancePercent,
    payment_status: advancePaid >= quotation.gross_total
      ? "PAID_IN_FULL"
      : advancePaid > 0
      ? "PARTIALLY_PAID"
      : "UNPAID",
    status: advancePaid >= advanceRequired ? "READY_FOR_DISPATCH" : "CONFIRMED",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  store.orders.unshift(order);

  // 7. Process Initial Advance Payment if provided
  let initialPayment: Payment | undefined;
  if (advancePaid > 0 && input.advancePaymentReference) {
    initialPayment = processPayment({
      orderId: order.id,
      amount: advancePaid,
      milestone: "BOOKING_ADVANCE",
      paymentMode: input.paymentMode || "BANK_TRANSFER_NEFT",
      paymentReferenceCode: input.advancePaymentReference,
      idempotencyKey: `idem-pay-${input.idempotencyKey}`,
      isSimulated: true,
      verifiedBy: input.userId || "finance_desk",
      userRole: input.userRole,
      notes: "Advance booking payment received on order confirmation.",
    });
  }

  // 8. Lead transitions to CONVERTED
  if (lead) {
    lead.status = "CONVERTED";
    lead.updated_at = new Date().toISOString();

    addLeadActivity(
      lead.id,
      "STATUS_CHANGE",
      `Lead successfully converted into Order ${orderNumber}. Contract value: ₹${quotation.gross_total.toLocaleString("en-IN")}. Advance required (${advancePercent}%): ₹${advanceRequired.toLocaleString("en-IN")}.`,
      input.userId || "system",
      input.userName || "Sales & Finance"
    );
  }

  addAuditLogEntry({
    performed_by: input.userId || "system",
    user_role: input.userRole || "DIRECTOR",
    table_name: "orders",
    record_id: order.id,
    action: "INSERT",
    new_data: {
      orderNumber,
      quotationNumber: quotation.quotation_number,
      contractTotal: order.total_contract_value,
      advanceRequired: order.advance_amount_required,
      advancePaid: order.advance_amount_paid,
      initialStatus: order.status,
    },
  });

  return { order, initialPayment };
}

/**
 * Processes a Payment with strict duplicate detection and balance reconciliation.
 */
export function processPayment(input: ProcessPaymentInput): Payment {
  const store = getStore();

  // Validate amount
  if (!input.amount || input.amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  // Security Check: Reference required
  if (!input.paymentReferenceCode || input.paymentReferenceCode.trim().length < 4) {
    throw new Error(
      "Payment rejected: Valid bank UTR or gateway transaction reference required. Payments cannot be confirmed without verifiable financial proof."
    );
  }

  // Idempotency & Duplicate Reference Check
  const duplicateRef = store.payments.find(
    (p) =>
      p.payment_reference_code.toLowerCase() === input.paymentReferenceCode.trim().toLowerCase() ||
      (input.idempotencyKey && p.idempotency_key === input.idempotencyKey)
  );

  if (duplicateRef) {
    throw new Error(
      `Duplicate payment rejected: Reference '${input.paymentReferenceCode}' has already been processed on ${new Date(duplicateRef.created_at).toLocaleDateString()}.`
    );
  }

  // Retrieve Order
  const order = store.orders.find((o) => o.id === input.orderId);
  if (!order) {
    throw new Error(`Order '${input.orderId}' not found.`);
  }

  if (order.status === "CANCELLED") {
    throw new Error("Cannot process payment for a cancelled order.");
  }

  // Check if order is already paid in full
  const existingPayments = store.payments.filter(
    (p) => p.order_id === order.id && p.status !== "FAILED" && p.status !== "REFUNDED"
  );
  const currentTotalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

  if (currentTotalPaid >= order.total_contract_value) {
    throw new Error(
      `Order ${order.order_number} is already paid in full (₹${order.total_contract_value.toLocaleString("en-IN")}). No outstanding balance.`
    );
  }

  const receiptNumber = `RCPT-2026-${String(store.payments.length + 1).padStart(4, "0")}`;

  const payment: Payment = {
    id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    organization_id: order.organization_id,
    order_id: order.id,
    payment_reference_code: input.paymentReferenceCode.trim(),
    receipt_number: receiptNumber,
    idempotency_key: input.idempotencyKey,
    milestone: input.milestone,
    amount: input.amount,
    payment_mode: input.paymentMode,
    status: "COMPLETED",
    gateway_provider: input.gatewayProvider || (input.isSimulated ? "SIMULATED_GATEWAY_HACKATHON" : "BANK_NEFT_OFFLINE"),
    gateway_transaction_id: input.gatewayTransactionId || input.paymentReferenceCode,
    is_simulated: input.isSimulated ?? false,
    payment_date: new Date().toISOString(),
    verified_by: input.verifiedBy || "finance_controller",
    created_at: new Date().toISOString(),
  };

  store.payments.unshift(payment);

  // Recalculate Order Balances
  const newTotalPaid = currentTotalPaid + input.amount;
  order.advance_amount_paid = newTotalPaid;
  order.outstanding_balance = Math.max(0, order.total_contract_value - newTotalPaid);

  if (newTotalPaid >= order.total_contract_value) {
    order.payment_status = "PAID_IN_FULL";
  } else if (newTotalPaid > 0) {
    order.payment_status = "PARTIALLY_PAID";
  }

  // If advance milestone met, unlock order for dispatch/staging
  if (
    input.milestone === "BOOKING_ADVANCE" &&
    newTotalPaid >= order.advance_amount_required &&
    order.status === "CONFIRMED"
  ) {
    order.status = "READY_FOR_DISPATCH";
  }

  order.updated_at = new Date().toISOString();

  // Audit Logging
  addAuditLogEntry({
    performed_by: input.verifiedBy || "finance_controller",
    user_role: input.userRole || "FINANCE_MANAGER",
    table_name: "payments",
    record_id: payment.id,
    action: "INSERT",
    new_data: {
      receiptNumber,
      orderNumber: order.order_number,
      amount: payment.amount,
      milestone: payment.milestone,
      referenceCode: payment.payment_reference_code,
      remainingOutstanding: order.outstanding_balance,
      isSimulated: payment.is_simulated,
    },
  });

  return payment;
}

/**
 * Processes a Refund for an authorized payment.
 */
export function processRefund(input: ProcessRefundInput): Refund {
  // Authorization check
  const authorizedRoles: UserRole[] = ["SUPER_ADMIN", "DIRECTOR", "FINANCE_MANAGER"];
  if (!authorizedRoles.includes(input.userRole)) {
    throw new Error(
      `Forbidden: User role '${input.userRole}' is not authorized to execute refunds. Requires Director or Finance Manager.`
    );
  }

  const store = getStore();
  const payment = store.payments.find((p) => p.id === input.paymentId);
  if (!payment) {
    throw new Error(`Payment '${input.paymentId}' not found.`);
  }

  if (input.amount <= 0 || input.amount > payment.amount) {
    throw new Error(
      `Invalid refund amount. Refund amount must be between ₹1 and ₹${payment.amount.toLocaleString("en-IN")}.`
    );
  }

  const order = store.orders.find((o) => o.id === payment.order_id);
  if (!order) {
    throw new Error(`Associated order for payment '${payment.id}' not found.`);
  }

  const refundReference = `REF-2026-${String(store.refunds.length + 1).padStart(4, "0")}`;

  const refund: Refund = {
    id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    organization_id: payment.organization_id,
    order_id: order.id,
    payment_id: payment.id,
    amount: input.amount,
    refund_reference: refundReference,
    reason: input.reason.trim(),
    refund_date: new Date().toISOString(),
    status: "PROCESSED",
    processed_by: input.processedBy || "finance_officer",
    created_at: new Date().toISOString(),
  };

  store.refunds.unshift(refund);

  if (input.amount === payment.amount) {
    payment.status = "REFUNDED";
  }

  // Adjust order balances
  order.advance_amount_paid = Math.max(0, (order.advance_amount_paid || 0) - input.amount);
  order.outstanding_balance = Math.min(order.total_contract_value, (order.outstanding_balance || 0) + input.amount);
  order.payment_status = order.advance_amount_paid <= 0 ? "UNPAID" : "PARTIALLY_PAID";
  order.updated_at = new Date().toISOString();

  addAuditLogEntry({
    performed_by: input.processedBy || "finance_controller",
    user_role: input.userRole,
    table_name: "refunds",
    record_id: refund.id,
    action: "INSERT",
    new_data: {
      refundReference,
      paymentId: payment.id,
      orderNumber: order.order_number,
      amount: refund.amount,
      reason: refund.reason,
    },
  });

  return refund;
}
