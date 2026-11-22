// Domain Engine: SolarOS National Solar Rooftop Subsidy Tracking Engine
// Implements MNRE / PM Surya Ghar Muft Bijli Yojana rules, statutory document verification,
// DISCOM utility workflow progression, and Direct Benefit Transfer (DBT) disbursement tracking.

import { getStore, addAuditLogEntry } from "@/lib/data/store";
import { SubsidyApplication, SubsidyStatus, UserRole } from "@/lib/types/database";

export const GOVERNMENT_INTEGRATION_DISCLAIMER =
  "SolarOS manages local statutory document readiness, consumer verification, and DISCOM dossier preparation. Direct government portal API integration requires official nodal agency authentication credentials.";

// PM Surya Ghar Muft Bijli Yojana Central Financial Assistance (CFA) Rule Engine
export function calculateEligibleSubsidy(systemCapacityKw: number, topology: string): number {
  if (topology !== "ON_GRID") {
    // Only grid-tied residential solar is eligible under PM Surya Ghar
    return 0;
  }

  if (systemCapacityKw <= 0) return 0;

  if (systemCapacityKw <= 1) {
    return 30000;
  } else if (systemCapacityKw <= 2) {
    return 60000;
  } else {
    // 3 kW and above is capped at ₹78,000 maximum Central Financial Assistance
    return 78000;
  }
}

export interface DocumentVerificationStatus {
  hasElectricityBill: boolean;
  hasIdProof: boolean;
  hasPropertyTax: boolean;
  hasBankPassbook: boolean;
  isComplete: boolean;
  missingDocuments: string[];
}

export function verifySubsidyDocuments(app: SubsidyApplication): DocumentVerificationStatus {
  const hasElectricityBill = Boolean(app.electricity_bill_doc_url);
  const hasIdProof = Boolean(app.id_proof_doc_url);
  const hasPropertyTax = Boolean(app.property_tax_doc_url);
  const hasBankPassbook = Boolean(app.bank_passbook_doc_url);

  const missing: string[] = [];
  if (!hasElectricityBill) missing.push("Latest Paid Electricity Bill");
  if (!hasIdProof) missing.push("Aadhaar Card / Government Photo ID");
  if (!hasPropertyTax) missing.push("Property Ownership / Municipal Tax Receipt");
  if (!hasBankPassbook) missing.push("Bank Passbook / Cancelled Cheque (DBT Account)");

  return {
    hasElectricityBill,
    hasIdProof,
    hasPropertyTax,
    hasBankPassbook,
    isComplete: missing.length === 0,
    missingDocuments: missing,
  };
}

export const SUBSIDY_PIPELINE_STAGES: SubsidyStatus[] = [
  "DOCS_PENDING",
  "PORTAL_SUBMITTED",
  "FEASIBILITY_APPROVED",
  "INSPECTED",
  "NET_METER_INSTALLED",
  "CLAIM_LODGED",
  "DISBURSED",
];

export function createSubsidyApplication(params: {
  orderId: string;
  customerId?: string;
  discomName: string;
  electricityBillUrl?: string;
  idProofUrl?: string;
  propertyTaxUrl?: string;
  bankPassbookUrl?: string;
  userRole?: UserRole;
  userId?: string;
}): SubsidyApplication {
  const store = getStore();
  const order = store.orders.find((o) => o.id === params.orderId);
  if (!order) throw new Error(`Order '${params.orderId}' not found.`);

  const customerId = params.customerId || order.customer_id;
  const eligibleAmount = calculateEligibleSubsidy(order.system_capacity_kw, order.system_topology);

  const nextSeq = store.subsidies.length + 1;
  const applicationNumber = `PMSGY-${params.discomName.substring(0, 3).toUpperCase()}-2026-${String(nextSeq).padStart(5, "0")}`;

  const hasAllDocs = Boolean(
    params.electricityBillUrl &&
      params.idProofUrl &&
      params.propertyTaxUrl &&
      params.bankPassbookUrl
  );

  const initialStatus: SubsidyStatus = hasAllDocs ? "PORTAL_SUBMITTED" : "DOCS_PENDING";

  const app: SubsidyApplication = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    organization_id: order.organization_id,
    order_id: order.id,
    customer_id: customerId,
    portal_application_number: applicationNumber,
    discom_name: params.discomName,
    subsidy_amount_eligible: eligibleAmount,
    status: initialStatus,
    electricity_bill_doc_url: params.electricityBillUrl,
    id_proof_doc_url: params.idProofUrl,
    property_tax_doc_url: params.propertyTaxUrl,
    bank_passbook_doc_url: params.bankPassbookUrl,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  store.subsidies.unshift(app);

  addAuditLogEntry({
    performed_by: params.userId || "system",
    user_role: params.userRole,
    table_name: "subsidy_applications",
    record_id: app.id,
    action: "INSERT",
    new_data: {
      application_number: app.portal_application_number,
      discom: app.discom_name,
      eligible_amount: app.subsidy_amount_eligible,
      status: app.status,
    },
  });

  return app;
}

export function advanceSubsidyStage(
  applicationId: string,
  params: {
    nextStage: SubsidyStatus;
    notes?: string;
    userRole?: UserRole;
    userId?: string;
  }
): SubsidyApplication {
  const store = getStore();
  const app = store.subsidies.find((s) => s.id === applicationId);
  if (!app) throw new Error(`Subsidy application '${applicationId}' not found.`);

  // Validation: cannot move to PORTAL_SUBMITTED if documents are missing
  if (params.nextStage === "PORTAL_SUBMITTED") {
    const docs = verifySubsidyDocuments(app);
    if (!docs.isComplete) {
      throw new Error(
        `Cannot submit application to DISCOM portal. Missing documents: ${docs.missingDocuments.join(", ")}.`
      );
    }
  }

  const prevStatus = app.status;
  app.status = params.nextStage;
  app.updated_at = new Date().toISOString();

  addAuditLogEntry({
    performed_by: params.userId || "system",
    user_role: params.userRole,
    table_name: "subsidy_applications",
    record_id: app.id,
    action: "UPDATE",
    old_data: { status: prevStatus },
    new_data: {
      status: app.status,
      notes: params.notes,
    },
  });

  return app;
}

export function recordSubsidyDisbursement(
  applicationId: string,
  params: {
    amount: number;
    disbursedDate?: string;
    dbtTransactionRef?: string;
    userRole?: UserRole;
    userId?: string;
  }
): SubsidyApplication {
  const store = getStore();
  const app = store.subsidies.find((s) => s.id === applicationId);
  if (!app) throw new Error(`Subsidy application '${applicationId}' not found.`);

  if (params.amount <= 0) {
    throw new Error("Disbursed subsidy amount must be greater than zero.");
  }

  app.disbursed_amount = params.amount;
  app.disbursed_date = params.disbursedDate || new Date().toISOString().slice(0, 10);
  app.status = "DISBURSED";
  app.updated_at = new Date().toISOString();

  addAuditLogEntry({
    performed_by: params.userId || "system",
    user_role: params.userRole,
    table_name: "subsidy_applications",
    record_id: app.id,
    action: "UPDATE",
    new_data: {
      status: "DISBURSED",
      disbursed_amount: app.disbursed_amount,
      disbursed_date: app.disbursed_date,
      transaction_ref: params.dbtTransactionRef,
    },
  });

  return app;
}

export function rejectSubsidyApplication(
  applicationId: string,
  params: {
    rejectionReason: string;
    userRole?: UserRole;
    userId?: string;
  }
): SubsidyApplication {
  const store = getStore();
  const app = store.subsidies.find((s) => s.id === applicationId);
  if (!app) throw new Error(`Subsidy application '${applicationId}' not found.`);

  app.status = "REJECTED";
  app.updated_at = new Date().toISOString();

  addAuditLogEntry({
    performed_by: params.userId || "system",
    user_role: params.userRole,
    table_name: "subsidy_applications",
    record_id: app.id,
    action: "UPDATE",
    new_data: {
      status: "REJECTED",
      rejection_reason: params.rejectionReason,
    },
  });

  return app;
}
