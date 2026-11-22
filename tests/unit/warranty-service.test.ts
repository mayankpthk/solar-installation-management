import { describe, it, expect, beforeEach } from "vitest";
import { resetStore, getStore, setWarrantyActivationPolicy, createWarrantyPolicy } from "@/lib/data/store";
import {
  evaluateSerialWarrantyEligibility,
  submitServiceComplaint,
  assignServiceTicket,
  startServiceTicket,
  requestPartsForTicket,
  createRepairEstimate,
  approveRepairEstimate,
  generateServiceInvoice,
  executeWarrantyReplacement,
  resolveServiceTicket,
  closeServiceTicket,
  activateOrderWarranties,
  InvalidSerialNumberError,
  DuplicateTicketError,
  TicketClosingConditionError,
  WarrantyReplacementError,
  RepairEstimateError,
} from "@/domain/warranty/warranty-service-engine";

describe("SolarOS Warranty & After-Sales Service Management System", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("1. Warranty Eligibility Engine", () => {
    it("evaluates an active warranty as WARRANTY_FREE with ₹0.00 customer payable", () => {
      // s3: INV-2024-884912 has active warranty valid until 2027-05-20
      const evaluation = evaluateSerialWarrantyEligibility("INV-2024-884912");

      expect(evaluation.isCovered).toBe(true);
      expect(evaluation.billingClassification).toBe("WARRANTY_FREE");
      expect(evaluation.customerPayableAmount).toBe(0);
      expect(evaluation.remainingDays).toBeGreaterThan(0);
      expect(evaluation.policyName).toContain("Inverter");
    });

    it("evaluates an expired warranty as BILLABLE", () => {
      // s4: INV-2023-112490 expired on 2026-05-01
      const evaluation = evaluateSerialWarrantyEligibility("INV-2023-112490");

      expect(evaluation.isCovered).toBe(false);
      expect(evaluation.billingClassification).toBe("BILLABLE");
      expect(evaluation.remainingDays).toBe(0);
      expect(evaluation.reason).toContain("expired");
    });

    it("throws InvalidSerialNumberError for an unregistered serial number", () => {
      expect(() => {
        evaluateSerialWarrantyEligibility("INV-NONEXISTENT-9999");
      }).toThrow(InvalidSerialNumberError);
    });
  });

  describe("2. Customer Complaint Submission & Anti-Duplicate Rule", () => {
    it("submits a new breakdown complaint and auto-classifies ₹0 warranty entitlement", () => {
      // Use an in-stock or installed serial without an active ticket
      const store = getStore();
      const serial = store.serialNumbers[0]; // s1: INV-3KW-2026-0041

      const result = submitServiceComplaint({
        serialNumber: serial.serial_number,
        reportedFaultCode: "E04",
        symptomDescription: "Inverter tripped after thunderstorm; error code E04 displayed.",
        priority: "HIGH",
      });

      expect(result.ticket).toBeDefined();
      expect(result.ticket.reported_fault_code).toBe("E04");
      expect(result.ticket.status).toBe("OPEN");
      expect(result.ticket.is_under_warranty).toBe(true);
      expect(result.ticket.billing_classification).toBe("WARRANTY_FREE");
    });

    it("throws DuplicateTicketError when a ticket already exists for the same serial", () => {
      // st1 is already active for s3 (INV-2024-884912)
      expect(() => {
        submitServiceComplaint({
          serialNumber: "INV-2024-884912",
          reportedFaultCode: "E01",
          symptomDescription: "Another ground fault reported.",
        });
      }).toThrow(DuplicateTicketError);
    });

    it("throws InvalidSerialNumberError on complaint submission for invalid serial", () => {
      expect(() => {
        submitServiceComplaint({
          serialNumber: "BOGUS-SERIAL-XYZ",
          reportedFaultCode: "E04",
          symptomDescription: "Smoke coming out.",
        });
      }).toThrow(InvalidSerialNumberError);
    });
  });

  describe("3. Ticket Lifecycle Transitions", () => {
    it("transitions through OPEN -> ASSIGNED -> IN_PROGRESS -> AWAITING_PARTS", () => {
      const store = getStore();
      const serial = store.serialNumbers[0];

      const { ticket } = submitServiceComplaint({
        serialNumber: serial.serial_number,
        reportedFaultCode: "E01",
        symptomDescription: "DC earth leakage trip.",
      });

      expect(ticket.status).toBe("OPEN");

      // Assign
      const tech = store.technicians[0];
      const assigned = assignServiceTicket(ticket.id, {
        technicianId: tech.profile_id,
        technicianName: tech.name,
      });
      expect(assigned.status).toBe("ASSIGNED");
      expect(assigned.assigned_technician_id).toBe(tech.profile_id);

      // Start work
      const started = startServiceTicket(ticket.id, { userRole: "FIELD_TECHNICIAN" });
      expect(started.status).toBe("IN_PROGRESS");

      // Request parts
      const partsReq = requestPartsForTicket(ticket.id, {
        requiredParts: "DC Surge Protection Device (SPD) Type II 1000V",
      });
      expect(partsReq.status).toBe("AWAITING_PARTS");
    });
  });

  describe("4. Billable Repair Estimate & Invoice Workflow", () => {
    it("creates an estimate, requires customer approval, and generates a service invoice", () => {
      const store = getStore();
      // st3 is billable for INV-2023-112490
      const ticketId = "st3";

      // 1. Create estimate
      createRepairEstimate(ticketId, {
        partsCost: 3500,
        laborCost: 1500,
        partsList: "Cooling fan replacement + thermal paste application",
      });

      const updated = store.serviceTickets.find((t) => t.id === ticketId)!;
      expect(updated.parts_cost).toBe(3500);
      expect(updated.labor_cost).toBe(1500);
      expect(updated.total_estimate).toBe(5000);
      expect(updated.customer_approved_estimate).toBe(false);

      // Attempt invoice before approval should fail
      expect(() => {
        generateServiceInvoice(ticketId);
      }).toThrow(RepairEstimateError);

      // 2. Customer approves
      approveRepairEstimate(ticketId, { approvedByCustomer: true });
      expect(updated.customer_approved_estimate).toBe(true);

      // 3. Generate Invoice
      const invoice = generateServiceInvoice(ticketId, { dueDateDays: 7 });
      expect(invoice).toBeDefined();
      expect(invoice.milestone).toBe("SERVICE_FEE");
      expect(invoice.taxable_amount).toBe(5000);
      expect(invoice.tax_amount).toBe(900); // 18% GST on 5000
      expect(invoice.total_amount).toBe(5900);
      expect(updated.service_invoice_id).toBe(invoice.id);
    });

    it("rejects negative repair estimate values", () => {
      expect(() => {
        createRepairEstimate("st3", { partsCost: -100, laborCost: 500 });
      }).toThrow(RepairEstimateError);
    });
  });

  describe("5. RMA Warranty Replacement Workflow", () => {
    it("executes serial replacement: marks old as REPLACED, new as INSTALLED, and transfers warranty", () => {
      const store = getStore();

      // Old serial under repair/replacement: s3 (INV-2024-884912)
      // Available in-stock unit: s1 (INV-3KW-2026-0041)
      const oldSerialNum = "INV-2024-884912";
      const newSerialNum = "INV-3KW-2026-0041";

      const oldSerial = store.serialNumbers.find((s) => s.serial_number === oldSerialNum)!;
      const newSerial = store.serialNumbers.find((s) => s.serial_number === newSerialNum)!;
      expect(newSerial.status).toBe("IN_STOCK");

      const result = executeWarrantyReplacement("st1", {
        oldSerialNumber: oldSerialNum,
        newSerialNumber: newSerialNum,
        technicianId: "tech-1",
        notes: "Internal IGBT short-circuit confirmed. Complete inverter unit swapped.",
      });

      expect(result.oldSerial.status).toBe("REPLACED");
      expect(result.newSerial.status).toBe("INSTALLED");
      expect(result.newSerial.customer_id).toBe(oldSerial.customer_id);
      expect(result.transferredWarranty).toBeDefined();
      expect(result.transferredWarranty?.serial_number).toBe(newSerialNum);
      expect(result.ticket.replaced_serial_number).toBe(oldSerialNum);
      expect(result.ticket.new_serial_number).toBe(newSerialNum);
    });

    it("fails replacement if target unit is not IN_STOCK", () => {
      // s2 is RESERVED, not IN_STOCK
      expect(() => {
        executeWarrantyReplacement("st1", {
          oldSerialNumber: "INV-2024-884912",
          newSerialNumber: "INV-3KW-2026-0042", // status: RESERVED
          technicianId: "tech-1",
        });
      }).toThrow(WarrantyReplacementError);
    });
  });

  describe("6. Ticket Closing Condition Invariants", () => {
    it("rejects closing a ticket if technical resolution notes are missing", () => {
      const store = getStore();
      const ticket = store.serviceTickets.find((t) => t.id === "st1")!;
      ticket.resolution_notes = undefined;

      expect(() => {
        closeServiceTicket(ticket.id, { customerConfirmed: true });
      }).toThrow(TicketClosingConditionError);
    });

    it("rejects closing a ticket if customer confirmation is missing and no director override is provided", () => {
      const store = getStore();
      const ticket = store.serviceTickets.find((t) => t.id === "st1")!;
      ticket.resolution_notes = "Replaced blown SPD.";
      ticket.customer_confirmed_at = undefined;

      expect(() => {
        closeServiceTicket(ticket.id, {
          customerConfirmed: false,
          userRole: "OPERATIONS_MANAGER",
        });
      }).toThrow(TicketClosingConditionError);
    });

    it("rejects non-director roles from applying an admin override", () => {
      const store = getStore();
      const ticket = store.serviceTickets.find((t) => t.id === "st1")!;
      ticket.resolution_notes = "Repaired loose junction terminal.";
      ticket.customer_confirmed_at = undefined;

      expect(() => {
        closeServiceTicket(ticket.id, {
          customerConfirmed: false,
          adminOverrideReason: "Customer unreachable on vacation",
          userRole: "OPERATIONS_MANAGER", // Not authorized for director override
        });
      }).toThrow(TicketClosingConditionError);
    });

    it("successfully closes a ticket when customer confirmation is received", () => {
      const store = getStore();
      const ticket = store.serviceTickets.find((t) => t.id === "st1")!;
      ticket.resolution_notes = "Inverter restarted, 2.9 kW active generation confirmed.";

      const closed = closeServiceTicket(ticket.id, {
        customerConfirmed: true,
        customerFeedbackRating: 5,
        customerFeedbackComments: "Prompt service during monsoon!",
      });

      expect(closed.status).toBe("CLOSED");
      expect(closed.customer_confirmed_at).toBeDefined();
      expect(closed.customer_feedback_rating).toBe(5);
    });

    it("successfully closes a ticket when an authorized director documents an override reason", () => {
      const store = getStore();
      const ticket = store.serviceTickets.find((t) => t.id === "st1")!;
      ticket.resolution_notes = "Emergency repair completed on-site; grid sync confirmed.";
      ticket.customer_confirmed_at = undefined;

      const closed = closeServiceTicket(ticket.id, {
        customerConfirmed: false,
        adminOverrideReason: "Customer out of country for 3 weeks; WhatsApp voice consent obtained.",
        userRole: "DIRECTOR",
        userId: "director-01",
      });

      expect(closed.status).toBe("CLOSED");
      expect(closed.admin_override_by).toBe("director-01");
      expect(closed.admin_override_reason).toContain("WhatsApp voice consent");
    });
  });

  describe("7. Configurable Warranty Policies & Activation Events", () => {
    it("allows administrators to configure warranty activation policy trigger", () => {
      setWarrantyActivationPolicy("ON_DELIVERY", "DIRECTOR");
      const store = getStore();
      const order = store.orders[0];

      const activation = activateOrderWarranties({
        orderId: order.id,
        activationTrigger: "ON_DELIVERY",
      });

      expect(activation.trigger).toBe("ON_DELIVERY");
    });

    it("allows creating and applying custom warranty policies", () => {
      const newPolicy = createWarrantyPolicy(
        {
          organization_id: "00000000-0000-0000-0000-000000000001",
          name: "Microinverter 10-Year Extended Warranty",
          component_category: "INVERTER",
          model_code: "MICRO-INV-800W",
          duration_months: 120,
          terms: "10-year repair or swap against manufacturing defects.",
          is_active: true,
        },
        "SUPER_ADMIN"
      );

      expect(newPolicy.id).toBeDefined();
      expect(newPolicy.duration_months).toBe(120);

      const store = getStore();
      const found = store.warrantyPolicies.find((p) => p.id === newPolicy.id);
      expect(found).toBeDefined();
    });
  });
});
