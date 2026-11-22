// Domain Engine: Quotation Generation, Versioning & Customer Tokenized Review
// Implements the exact 9-step Quotation Creation Pipeline and Immutable Revision History

import {
  Quotation,
  QuotationItem,
  SystemTopology,
  UserRole,
} from "@/lib/types/database";
import { resolveConfiguredBOM, SurveyDimensions } from "@/domain/products/recipe-engine";
import { calculateQuotationPricing, PricingResult } from "@/domain/pricing/calculator";
import { verifyInventoryAvailability, InventoryCheckResult } from "@/domain/inventory/checker";
import { getStore, addLeadActivity, addAuditLogEntry } from "@/lib/data/store";
import { verifyQuotationEligibility } from "@/domain/workflow/survey-gate";

export interface CreateQuotationInput {
  leadId: string;
  surveyId: string;
  systemCapacityKw: number;
  systemTopology: SystemTopology;
  discountAmount?: number;
  gstRatePercent?: number;
  laborRatePerKw?: number;
  logisticsCharges?: number;
  validityDays?: number;
  adminOverrideReason?: string;
  createdByRole?: UserRole;
  createdById?: string;
  createdByName?: string;
}

export interface QuotationExecutionResult {
  quotation: Quotation;
  items: QuotationItem[];
  pricing: PricingResult;
  inventoryCheck: InventoryCheckResult;
  customerPortalUrl: string;
}

/**
 * 9-Step Quotation Generation Pipeline
 */
export function generateQuotationPipeline(input: CreateQuotationInput): QuotationExecutionResult {
  const store = getStore();
  const lead = store.leads.find((l) => l.id === input.leadId);
  if (!lead) throw new Error(`Lead '${input.leadId}' not found.`);

  const survey = store.surveys.find((s) => s.id === input.surveyId);

  // Survey Gate Check
  const eligibility = verifyQuotationEligibility({
    survey,
    userRole: input.createdByRole || "SALES_MANAGER",
    overrideReason: input.adminOverrideReason,
  });

  if (!eligibility.isEligible) {
    throw new Error(eligibility.rejectionReason || "Survey gate rejected quotation generation.");
  }

  // 1 & 2. Retrieve approved recipe & calculate component quantities
  const surveyDimensions: SurveyDimensions = {
    dcCableDistanceMeters: survey?.dc_cable_distance_meters ?? 20,
    acCableDistanceMeters: survey?.ac_cable_distance_meters ?? 10,
    roofType: survey?.roof_type,
  };

  const resolvedBOM = resolveConfiguredBOM({
    capacityKw: input.systemCapacityKw,
    topology: input.systemTopology,
    surveyDimensions,
    componentsCatalog: store.components,
  });

  // 3 & 4. Retrieve current pricing & calculate material cost
  const materialCost = resolvedBOM.hardwareTotalCost;

  // 5, 6 & 7. Add installation charges, apply taxes (12% GST) & discounts, calculate total
  const pricing: PricingResult = calculateQuotationPricing({
    bomTotalCost: materialCost,
    capacityKw: input.systemCapacityKw,
    laborRatePerKw: input.laborRatePerKw ?? 4000,
    logisticsCost: input.logisticsCharges ?? 2500,
    discount: input.discountAmount ?? 0,
    gstRatePercent: input.gstRatePercent ?? 12,
  });

  // 8. Verify inventory availability
  const inventoryCheck: InventoryCheckResult = verifyInventoryAvailability({
    items: resolvedBOM.items,
    inventoryItems: store.inventoryItems,
    componentsCatalog: store.components,
  });

  // 9. Generate Quotation Record & PDF / Portal Token
  const quotationNumber = `QUO-2026-${String(store.quotations.length + 1).padStart(4, "0")}`;
  const acceptanceToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const validityDays = input.validityDays ?? 30;
  const validUntil = new Date(Date.now() + validityDays * 86400000).toISOString().split("T")[0];

  const quotation: Quotation = {
    id: `quo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    organization_id: lead.organization_id,
    quotation_number: quotationNumber,
    version: 1,
    lead_id: lead.id,
    survey_id: survey?.id || input.surveyId,
    product_id: resolvedBOM.productId,
    system_capacity_kw: input.systemCapacityKw,
    system_topology: input.systemTopology,
    hardware_total: pricing.hardwareTotal,
    installation_charges: pricing.installationCharges,
    logistics_charges: pricing.logisticsCharges,
    discount_amount: pricing.discountAmount,
    taxable_amount: pricing.taxableAmount,
    tax_amount: pricing.taxAmount,
    gross_total: pricing.grossTotal,
    estimated_subsidy_amount: pricing.estimatedSubsidy,
    net_payable_by_customer: pricing.netPayableByCustomer,
    status: "APPROVED",
    valid_until: validUntil,
    customer_acceptance_token: acceptanceToken,
    inventory_availability_status: inventoryCheck.status,
    inventory_shortages: inventoryCheck.shortages.map((s) => ({
      componentCode: s.componentCode,
      name: s.name,
      required: s.requiredQuantity,
      available: s.availableQuantity,
    })),
    pdf_url: `/portal/quotation/${acceptanceToken}`,
    created_by: input.createdById || "20000000-0000-0000-0000-000000000003",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Create Quotation Items
  const items: QuotationItem[] = resolvedBOM.items.map((item, idx) => ({
    id: `qi-${Date.now()}-${idx}`,
    quotation_id: quotation.id,
    component_id: item.componentId,
    component_code: item.componentCode,
    component_name: item.name,
    unit_of_measure: item.unitOfMeasure,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    is_serial_tracked: item.isSerialTracked,
  }));

  // Store quotation and items
  store.quotations.unshift(quotation);
  store.quotationItems.push(...items);

  // Update lead status to QUOTATION_SENT
  lead.status = "QUOTATION_SENT";
  lead.updated_at = new Date().toISOString();

  addLeadActivity(
    lead.id,
    "QUOTATION_GENERATED",
    `Quotation ${quotationNumber} (v1) generated. Contract total: ₹${pricing.grossTotal.toLocaleString("en-IN")}, Net payable: ₹${pricing.netPayableByCustomer.toLocaleString("en-IN")}. Stock Status: ${inventoryCheck.status}.`,
    input.createdById || "system",
    input.createdByName || "Sales Manager"
  );

  addAuditLogEntry({
    performed_by: input.createdById || "system",
    user_role: input.createdByRole || "SALES_MANAGER",
    table_name: "quotations",
    record_id: quotation.id,
    action: "INSERT",
    new_data: {
      quotationNumber,
      version: 1,
      grossTotal: pricing.grossTotal,
      subsidy: pricing.estimatedSubsidy,
      netPayable: pricing.netPayableByCustomer,
      inventoryStatus: inventoryCheck.status,
    },
  });

  return {
    quotation,
    items,
    pricing,
    inventoryCheck,
    customerPortalUrl: `/portal/quotation/${quotation.id}`,
  };
}

/**
 * Creates a revised quotation version (v2, v3, etc.) while archiving the parent revision.
 */
export function createQuotationRevision({
  quotationId,
  amendmentReason,
  modifiedCapacityKw,
  modifiedDiscountAmount,
  userRole,
  userId,
  userName = "Sales Manager",
}: {
  quotationId: string;
  amendmentReason: string;
  modifiedCapacityKw?: number;
  modifiedDiscountAmount?: number;
  userRole: UserRole;
  userId?: string;
  userName?: string;
}): QuotationExecutionResult {
  const store = getStore();
  const parentQuotation = store.quotations.find((q) => q.id === quotationId);
  if (!parentQuotation) {
    throw new Error(`Quotation '${quotationId}' not found.`);
  }

  if (parentQuotation.status === "ACCEPTED") {
    throw new Error("Cannot revise an already ACCEPTED quotation. Accepted quotations are frozen as legal contracts.");
  }

  // Mark parent quotation as REVISED
  parentQuotation.status = "REVISED";
  parentQuotation.updated_at = new Date().toISOString();

  const newVersion = parentQuotation.version + 1;
  const baseNumber = parentQuotation.quotation_number.split("-R")[0];
  const newQuotationNumber = `${baseNumber}-R${newVersion}`;

  const capacityKw = modifiedCapacityKw ?? parentQuotation.system_capacity_kw;
  const discountAmount = modifiedDiscountAmount ?? parentQuotation.discount_amount;

  const survey = store.surveys.find((s) => s.id === parentQuotation.survey_id);
  const surveyDimensions: SurveyDimensions = {
    dcCableDistanceMeters: survey?.dc_cable_distance_meters ?? 20,
    acCableDistanceMeters: survey?.ac_cable_distance_meters ?? 10,
    roofType: survey?.roof_type,
  };

  const resolvedBOM = resolveConfiguredBOM({
    capacityKw,
    topology: parentQuotation.system_topology,
    surveyDimensions,
    componentsCatalog: store.components,
  });

  const pricing = calculateQuotationPricing({
    bomTotalCost: resolvedBOM.hardwareTotalCost,
    capacityKw,
    discount: discountAmount,
    gstRatePercent: 12,
  });

  const inventoryCheck = verifyInventoryAvailability({
    items: resolvedBOM.items,
    inventoryItems: store.inventoryItems,
    componentsCatalog: store.components,
  });

  const acceptanceToken = `token_${Date.now()}_rev_${newVersion}`;

  const revisedQuotation: Quotation = {
    ...parentQuotation,
    id: `quo-${Date.now()}-v${newVersion}`,
    quotation_number: newQuotationNumber,
    version: newVersion,
    parent_quotation_id: parentQuotation.id,
    revision_reason: amendmentReason,
    system_capacity_kw: capacityKw,
    hardware_total: pricing.hardwareTotal,
    installation_charges: pricing.installationCharges,
    discount_amount: pricing.discountAmount,
    taxable_amount: pricing.taxableAmount,
    tax_amount: pricing.taxAmount,
    gross_total: pricing.grossTotal,
    estimated_subsidy_amount: pricing.estimatedSubsidy,
    net_payable_by_customer: pricing.netPayableByCustomer,
    status: "APPROVED",
    customer_acceptance_token: acceptanceToken,
    inventory_availability_status: inventoryCheck.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const items: QuotationItem[] = resolvedBOM.items.map((item, idx) => ({
    id: `qi-${Date.now()}-v${newVersion}-${idx}`,
    quotation_id: revisedQuotation.id,
    component_id: item.componentId,
    component_code: item.componentCode,
    component_name: item.name,
    unit_of_measure: item.unitOfMeasure,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    is_serial_tracked: item.isSerialTracked,
  }));

  store.quotations.unshift(revisedQuotation);
  store.quotationItems.push(...items);

  addLeadActivity(
    revisedQuotation.lead_id,
    "STATUS_CHANGE",
    `Quotation revised from v${parentQuotation.version} to v${newVersion} (${newQuotationNumber}). Reason: ${amendmentReason}`,
    userId || "system",
    userName
  );

  addAuditLogEntry({
    performed_by: userId || "system",
    user_role: userRole,
    table_name: "quotations",
    record_id: revisedQuotation.id,
    action: "INSERT",
    new_data: {
      action: "QUOTATION_REVISED",
      parentQuotationId: parentQuotation.id,
      version: newVersion,
      amendmentReason,
      newGrossTotal: pricing.grossTotal,
    },
  });

  return {
    quotation: revisedQuotation,
    items,
    pricing,
    inventoryCheck,
    customerPortalUrl: `/portal/quotation/${revisedQuotation.id}`,
  };
}

/**
 * Customer Acceptance Workflow (Authenticated or Tokenized)
 */
export function acceptCustomerQuotation({
  quotationIdOrToken,
  customerIdentifier,
  customerIp = "127.0.0.1",
}: {
  quotationIdOrToken: string;
  customerIdentifier?: string;
  customerIp?: string;
}): Quotation {
  const store = getStore();
  const quotation = store.quotations.find(
    (q) => q.id === quotationIdOrToken || q.customer_acceptance_token === quotationIdOrToken
  );

  if (!quotation) {
    throw new Error(`Quotation with reference '${quotationIdOrToken}' not found.`);
  }

  if (quotation.status === "ACCEPTED") {
    return quotation; // Idempotent return
  }

  if (quotation.status === "EXPIRED" || quotation.status === "REVISED") {
    throw new Error(`Cannot accept quotation in '${quotation.status}' state. Please request a new revision.`);
  }

  quotation.status = "ACCEPTED";
  quotation.accepted_at = new Date().toISOString();
  quotation.updated_at = new Date().toISOString();

  const lead = store.leads.find((l) => l.id === quotation.lead_id);
  if (lead) {
    addLeadActivity(
      lead.id,
      "STATUS_CHANGE",
      `Quotation ${quotation.quotation_number} accepted by customer (${customerIdentifier || "Web Portal"}). Ready for Order Confirmation.`,
      "customer",
      customerIdentifier || "Customer"
    );
  }

  addAuditLogEntry({
    performed_by: customerIdentifier || "customer_portal",
    user_role: "CUSTOMER",
    table_name: "quotations",
    record_id: quotation.id,
    action: "UPDATE",
    new_data: {
      action: "CUSTOMER_ACCEPTED",
      acceptedAt: quotation.accepted_at,
      customerIp,
      contractGrossTotal: quotation.gross_total,
    },
  });

  return quotation;
}

/**
 * Customer Rejection Workflow
 */
export function rejectCustomerQuotation({
  quotationIdOrToken,
  rejectionReason,
  customerIdentifier,
}: {
  quotationIdOrToken: string;
  rejectionReason: string;
  customerIdentifier?: string;
}): Quotation {
  const store = getStore();
  const quotation = store.quotations.find(
    (q) => q.id === quotationIdOrToken || q.customer_acceptance_token === quotationIdOrToken
  );

  if (!quotation) {
    throw new Error(`Quotation with reference '${quotationIdOrToken}' not found.`);
  }

  quotation.status = "REJECTED";
  quotation.rejected_at = new Date().toISOString();
  quotation.rejection_reason = rejectionReason;
  quotation.updated_at = new Date().toISOString();

  const lead = store.leads.find((l) => l.id === quotation.lead_id);
  if (lead) {
    addLeadActivity(
      lead.id,
      "STATUS_CHANGE",
      `Quotation ${quotation.quotation_number} rejected by customer. Reason: ${rejectionReason}`,
      "customer",
      customerIdentifier || "Customer"
    );
  }

  return quotation;
}
