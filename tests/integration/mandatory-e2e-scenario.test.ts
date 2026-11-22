import { describe, it, expect, beforeEach } from "vitest";
import { getStore, resetStore, addLeadActivity, scheduleSurvey, submitSurvey, reviewSurvey } from "@/lib/data/store";
import { generateQuotationPipeline } from "@/domain/quotations/quotation-engine";
import { confirmOrderFromQuotation } from "@/domain/payments/payment-processor";
import {
  reserveInventoryForOrder,
  executeAtomicDispatch,
} from "@/domain/inventory/dispatch-engine";
import {
  scheduleInstallationJob,
  startInstallationJob,
  updateInstallationChecklist,
  recordCommissioningMeasurements,
  submitCustomerSignatureAndCommissioning,
} from "@/domain/installations/installation-engine";
import {
  activateOrderWarranties,
  submitServiceComplaint,
  evaluateSerialWarrantyEligibility,
  resolveServiceTicket,
  closeServiceTicket,
} from "@/domain/warranty/warranty-service-engine";
import { calculateOrderProfitability } from "@/domain/finance/finance-engine";
import { Lead } from "@/lib/types/database";

describe("Stage 5: Mandatory Complete 22-Step End-to-End Scenario", () => {
  beforeEach(() => {
    resetStore();
  });

  it("successfully executes the entire 22-step solar business operating lifecycle", () => {
    const store = getStore();

    // ===================================================================
    // STEP 1: Customer submits an enquiry for a 3 kW On-Grid system
    // ===================================================================
    const leadId = `lead-e2e-${Date.now()}`;
    const customerEnquiry: Lead = {
      id: leadId,
      organization_id: "00000000-0000-0000-0000-000000000001",
      lead_code: "LED-2026-E2E01",
      full_name: "Gurdeep Singh",
      phone: "+919876543210",
      email: "gurdeep@punjabsolar.in",
      address: "House 42, Model Town, Jalandhar",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144003",
      interested_capacity_kw: 3.0,
      system_topology: "ON_GRID",
      monthly_bill_amount: 4500,
      roof_availability: "AVAILABLE",
      is_subsidy_requested: true,
      additional_requirements: "PM Surya Ghar subsidy eligibility desired",
      source: "WEB_FORM",
      status: "NEW",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.leads.unshift(customerEnquiry);
    expect(store.leads[0].id).toBe(leadId);
    expect(customerEnquiry.status).toBe("NEW");

    // ===================================================================
    // STEP 2: Sales executive receives the lead
    // ===================================================================
    customerEnquiry.assigned_sales_rep_id = "20000000-0000-0000-0000-000000000002";
    customerEnquiry.assigned_sales_rep_name = "Aman Sharma";
    customerEnquiry.status = "QUALIFIED";
    addLeadActivity(
      leadId,
      "STATUS_CHANGE",
      "Lead qualified by Sales Officer Aman Sharma after initial phone discovery.",
      customerEnquiry.assigned_sales_rep_id,
      "Aman Sharma"
    );
    expect(customerEnquiry.status).toBe("QUALIFIED");

    // ===================================================================
    // STEP 3: Survey technician is assigned
    // ===================================================================
    const techProfileId = store.technicians[0].profile_id;
    const survey = scheduleSurvey(
      leadId,
      techProfileId,
      "Manpreet Singh",
      "2026-11-25T10:00:00Z",
      "Check 3-phase grid compatibility and south-facing shadow free area",
      customerEnquiry.assigned_sales_rep_id,
      "Aman Sharma"
    );
    expect(survey).toBeDefined();
    expect(survey.status).toBe("SCHEDULED");
    expect(customerEnquiry.status).toBe("SURVEY_SCHEDULED");

    // ===================================================================
    // STEP 4: Survey is completed and approved
    // ===================================================================
    submitSurvey(
      survey.id,
      {
        roof_area_sqft: 450,
        shadow_free_area_sqft: 420,
        roof_tilt_angle_deg: 28,
        roof_azimuth_direction: "SOUTH",
        sanctioned_load_kw: 5.0,
        technician_notes: "RCC roof in excellent condition. Direct South orientation, zero shadow.",
      },
      techProfileId,
      "Manpreet Singh"
    );

    const approvedSurvey = reviewSurvey(
      survey.id,
      "APPROVED",
      "Feasibility approved. Roof accommodates 6x 540W modules with optimal generation.",
      "SALES_MANAGER",
      "Aman Sharma",
      customerEnquiry.assigned_sales_rep_id
    );
    expect(approvedSurvey.feasibility_status).toBe("APPROVED");
    expect(approvedSurvey.status).toBe("APPROVED");

    // ===================================================================
    // STEP 5: Sales executive generates quotation
    // ===================================================================
    const quotationResult = generateQuotationPipeline({
      leadId: leadId,
      surveyId: survey.id,
      systemCapacityKw: 3.0,
      systemTopology: "ON_GRID",
      createdByRole: "SALES_EXECUTIVE",
      createdById: customerEnquiry.assigned_sales_rep_id,
      createdByName: "Aman Sharma",
    });
    expect(quotationResult.quotation).toBeDefined();
    expect(["DRAFT", "APPROVED"]).toContain(quotationResult.quotation.status);
    expect(quotationResult.pricing.grossTotal).toBeGreaterThan(150000);
    expect(quotationResult.pricing.netPayableByCustomer).toBeGreaterThan(80000);

    // ===================================================================
    // STEP 6: BOM is generated automatically
    // ===================================================================
    expect(quotationResult.items.length).toBeGreaterThanOrEqual(5);
    const panelItem = quotationResult.items.find((i) => i.component_code === "PV-PANEL-540W");
    expect(panelItem).toBeDefined();
    expect(panelItem?.quantity).toBe(6); // 6 panels * 540W = 3.24 kW
    const inverterItem = quotationResult.items.find((i) => i.component_code === "INV-3KW-OG");
    expect(inverterItem).toBeDefined();
    expect(inverterItem?.quantity).toBe(1);

    // ===================================================================
    // STEP 7: Customer accepts quotation
    // ===================================================================
    quotationResult.quotation.status = "ACCEPTED";
    quotationResult.quotation.accepted_at = new Date().toISOString();
    expect(quotationResult.quotation.status).toBe("ACCEPTED");

    // ===================================================================
    // STEP 8: Advance payment is recorded
    // ===================================================================
    const advanceAmount = Math.round(quotationResult.pricing.netPayableByCustomer * 0.25); // 25% advance
    const orderConfirmation = confirmOrderFromQuotation({
      quotationId: quotationResult.quotation.id,
      advancePaymentReference: "NEFT-HDFC-991244",
      advanceAmountPaid: advanceAmount,
      paymentMode: "BANK_TRANSFER_NEFT",
      idempotencyKey: `idem-order-${Date.now()}`,
      minAdvancePercent: 20,
      userRole: "FINANCE_MANAGER",
      userId: "20000000-0000-0000-0000-000000000006",
      userName: "Simran Kaur",
    });
    expect(orderConfirmation.order.status).toBe("CONFIRMED");
    expect(orderConfirmation.initialPayment?.amount).toBe(advanceAmount);

    // ===================================================================
    // STEP 9: Inventory is reserved
    // ===================================================================
    const reservation = reserveInventoryForOrder(orderConfirmation.order.id, "WAREHOUSE_MANAGER");
    expect(reservation.success).toBe(true);

    // ===================================================================
    // STEP 10 & 11: Warehouse manager scans serials and executes atomic dispatch
    // ===================================================================
    const scannedPanels = [
      "PV-540W-2026-0101",
      "PV-540W-2026-0102",
      "PV-540W-2026-0103",
      "PV-540W-2026-0104",
      "PV-540W-2026-0105",
      "PV-540W-2026-0106",
    ];
    const scannedInverter = "INV-3KW-2026-0041";

    const dispatchResult = executeAtomicDispatch({
      orderId: orderConfirmation.order.id,
      vehicleRegistrationNumber: "PB-08-AX-4412",
      driverName: "Kuldip Singh",
      driverPhone: "9876543210",
      scannedSerials: [
        { componentCode: "PV-PANEL-540W", serialNumbers: scannedPanels },
        { componentCode: "INV-3KW-OG", serialNumbers: [scannedInverter] },
      ],
      performedBy: "20000000-0000-0000-0000-000000000004",
      performerName: "Warehouse Manager",
      userRole: "WAREHOUSE_MANAGER",
    });
    expect(dispatchResult.dispatch.dispatch_status).toBe("IN_TRANSIT");
    expect(dispatchResult.gatePassToken).toBeDefined();

    // ===================================================================
    // STEP 12: Installation team receives the job
    // ===================================================================
    const job = scheduleInstallationJob({
      orderId: orderConfirmation.order.id,
      leadTechnicianId: techProfileId,
      scheduledDate: "2026-11-26",
      scheduledTimeSlot: "MORNING_09_13",
      userRole: "INSTALLATION_MANAGER",
      userId: "20000000-0000-0000-0000-000000000003",
      userName: "Harbhajan Singh",
    });
    expect(job.status).toBe("ASSIGNED");

    // ===================================================================
    // STEP 13 & 14: Technician uploads installation photos & test results
    // ===================================================================
    startInstallationJob(job.id, techProfileId);

    updateInstallationChecklist(job.id, {
      mounting_structures_fitted: true,
      solar_panels_installed: true,
      inverter_installed: true,
      wiring_completed: true,
      electrical_safety_checks_completed: true,
      earthing_completed: true,
      system_testing_performed: true,
      power_generation_verified: true,
    }, techProfileId);

    recordCommissioningMeasurements(job.id, {
      measuredDcVoltage: 242.5,
      measuredDcCurrent: 11.2,
      measuredAcVoltage: 230,
      measuredInstantaneousPowerKw: 2.92,
      earthingResistanceOhms: 2.1,
    }, techProfileId);

    // ===================================================================
    // STEP 15: Customer signs acceptance
    // ===================================================================
    const signedJob = submitCustomerSignatureAndCommissioning({
      jobId: job.id,
      signerName: "Gurdeep Singh",
      signatureSvg: "<svg>customer-signature</svg>",
      feedbackRating: 5,
      feedbackComments: "Commissioning verified cleanly. Display shows 2.92 kW generation.",
      technicianNotes: "Handover signed by owner",
      performedByRole: "FIELD_TECHNICIAN",
      technicianId: techProfileId,
    });
    expect(signedJob.status).toBe("APPROVED");

    // ===================================================================
    // STEP 16: Warranty activates according to configured policy
    // ===================================================================
    const warrantyActivation = activateOrderWarranties({
      orderId: orderConfirmation.order.id,
      activationDate: new Date(),
      activationTrigger: "ON_COMMISSIONING",
    });
    expect(warrantyActivation.activatedWarranties.length).toBeGreaterThan(0);
    const activeWarranty = store.warranties.find(
      (w) => w.serial_number === scannedInverter || w.order_id === orderConfirmation.order.id
    );
    expect(activeWarranty).toBeDefined();
    expect(activeWarranty?.status).toBe("ACTIVE");

    // ===================================================================
    // STEP 17: Customer submits a fault complaint
    // ===================================================================
    const complaint = submitServiceComplaint({
      serialNumber: scannedInverter,
      reportedFaultCode: "E04",
      symptomDescription: "Inverter error code E04 (Grid frequency transient error)",
      priority: "HIGH",
    });
    expect(complaint.ticket.status).toBe("OPEN");

    // ===================================================================
    // STEP 18 & 19: Support finds serial number & calculates warranty eligibility
    // ===================================================================
    const eligibility = evaluateSerialWarrantyEligibility(scannedInverter);
    expect(eligibility.isCovered).toBe(true);
    expect(["WARRANTY_FREE", "WARRANTY_COVERED"]).toContain(eligibility.billingClassification);

    // ===================================================================
    // STEP 20 & 21: Repair completed & Customer confirms resolution
    // ===================================================================
    const resolved = resolveServiceTicket(complaint.ticket.id, {
      resolutionNotes: "Grid sync board re-calibrated and firmware patched to v2.4",
      technicianId: techProfileId,
      partsReplaced: "Firmware EEPROM update",
    });
    expect(resolved.status).toBe("CUSTOMER_CONFIRMATION_PENDING");

    const closed = closeServiceTicket(complaint.ticket.id, {
      customerConfirmed: true,
      userRole: "OPERATIONS_MANAGER",
      userId: "20000000-0000-0000-0000-000000000003",
    });
    expect(closed.status).toBe("CLOSED");

    // ===================================================================
    // STEP 22: Director views actual job profitability
    // ===================================================================
    const profitability = calculateOrderProfitability(orderConfirmation.order.id);
    expect(profitability.totalContractValue).toBe(orderConfirmation.order.total_contract_value);
    expect(profitability.recognizedRevenue).toBeGreaterThan(0);
    expect(profitability.grossProfit).toBeDefined();
    expect(profitability.grossMarginPercent).toBeDefined();
    expect(profitability.totalDirectCosts).toBeDefined();
    expect(profitability.marginHealth).toBeDefined();
  });
});
