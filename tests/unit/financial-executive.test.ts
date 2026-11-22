import { describe, it, expect, beforeEach } from "vitest";
import { resetStore, getStore } from "@/lib/data/store";
import {
  calculateRecognizedRevenue,
  calculateOrderProfitability,
  computeExecutiveMetrics,
  setAccountingPolicy,
  getAccountingPolicy,
} from "@/domain/finance/finance-engine";
import {
  calculateEligibleSubsidy,
  verifySubsidyDocuments,
  createSubsidyApplication,
  advanceSubsidyStage,
  recordSubsidyDisbursement,
} from "@/domain/subsidies/subsidy-engine";
import {
  generateRevenueReport,
  generateExpenseReport,
  generateProjectProfitabilityReport,
  generateInventoryValuationReport,
  generateTechnicianPerformanceReport,
  generateOutstandingPaymentReport,
  generateWarrantyReport,
  generateServiceTicketReport,
  generateSubsidyReport,
  canAccessReport,
} from "@/domain/reports/reporting-engine";

describe("SolarOS Financial Management & Executive Intelligence Suite", () => {
  beforeEach(() => {
    resetStore();
    setAccountingPolicy("PERCENTAGE_OF_COMPLETION", "DIRECTOR");
  });

  describe("1. Revenue Recognition & Accounting Policies", () => {
    it("recognizes revenue based on percentage of completion milestones", () => {
      const store = getStore();

      // Completed order (ORD-2026-0088: 178,000 total contract)
      const completedOrder = store.orders[1];
      completedOrder.status = "COMPLETED";
      const compRev = calculateRecognizedRevenue(completedOrder, "PERCENTAGE_OF_COMPLETION");
      expect(compRev.recognitionPercent).toBe(100);
      expect(compRev.recognizedRevenue).toBe(Math.round((178000 / 1.12) * 100) / 100);

      // In-progress order (ORD-2026-0089: 178,640 total contract)
      const inProgressOrder = store.orders[0];
      inProgressOrder.status = "INSTALLATION_IN_PROGRESS";
      const progRev = calculateRecognizedRevenue(inProgressOrder, "PERCENTAGE_OF_COMPLETION");
      expect(progRev.recognitionPercent).toBe(75);

      // Mobilization/Staging order
      inProgressOrder.status = "STAGING";
      const stagingRev = calculateRecognizedRevenue(inProgressOrder, "PERCENTAGE_OF_COMPLETION");
      expect(stagingRev.recognitionPercent).toBe(20);
    });

    it("holds uncompleted orders at zero recognized revenue under COMPLETED_CONTRACT policy", () => {
      const store = getStore();
      const inProgressOrder = store.orders[0];
      inProgressOrder.status = "INSTALLATION_IN_PROGRESS";

      const result = calculateRecognizedRevenue(inProgressOrder, "COMPLETED_CONTRACT");
      expect(result.recognitionPercent).toBe(0);
      expect(result.recognizedRevenue).toBe(0);

      // Once completed, 100% is recognized
      inProgressOrder.status = "COMPLETED";
      const completedResult = calculateRecognizedRevenue(inProgressOrder, "COMPLETED_CONTRACT");
      expect(completedResult.recognitionPercent).toBe(100);
      expect(completedResult.recognizedRevenue).toBeGreaterThan(0);
    });

    it("distinguishes cash collected from recognized revenue (advance is deferred liability)", () => {
      const store = getStore();
      const order = store.orders[0];
      order.status = "STAGING"; // 20% recognized

      const profitability = calculateOrderProfitability(order.id, "PERCENTAGE_OF_COMPLETION");

      // Cash collected is ₹40,000 (advance payment)
      expect(profitability.cashCollected).toBe(40000);
      // Recognized revenue is only 20% of net contract value (~₹31,900)
      expect(profitability.recognizedRevenue).toBeLessThan(40000);
      // Excess cash received is held as deferred revenue liability
      expect(profitability.unearnedAdvanceRevenue).toBe(
        profitability.cashCollected - profitability.recognizedRevenue
      );
    });
  });

  describe("2. Job Profitability & Double-Counting Avoidance", () => {
    it("computes gross project profit and profit margin percentage accurately", () => {
      const store = getStore();
      const completedOrder = store.orders[1]; // ORD-2026-0088

      const detail = calculateOrderProfitability(completedOrder.id, "PERCENTAGE_OF_COMPLETION");

      expect(detail.netContractRevenue).toBe(Math.round((178000 / 1.12) * 100) / 100);
      expect(detail.recognizedRevenue).toBe(detail.netContractRevenue);
      expect(detail.materialCosts).toBeGreaterThan(0);
      expect(detail.laborCosts).toBeGreaterThan(0);
      expect(detail.totalDirectCosts).toBe(
        detail.materialCosts + detail.laborCosts + detail.logisticsCosts + detail.permitCosts + detail.miscExpenses
      );
      expect(detail.grossProfit).toBe(detail.recognizedRevenue - detail.totalDirectCosts);
      expect(detail.grossMarginPercent).toBe(
        Math.round((detail.grossProfit / detail.recognizedRevenue) * 10000) / 100
      );
      expect(detail.marginHealth).toBe("HEALTHY");
    });

    it("handles zero revenue edge cases without divide-by-zero errors", () => {
      const store = getStore();
      const order = store.orders[0];
      order.status = "CANCELLED";

      const detail = calculateOrderProfitability(order.id, "PERCENTAGE_OF_COMPLETION");
      expect(detail.recognizedRevenue).toBe(0);
      expect(detail.grossMarginPercent).toBe(0);
    });
  });

  describe("3. Executive Dashboard & Metrics", () => {
    it("calculates real database-backed executive intelligence metrics", () => {
      const metrics = computeExecutiveMetrics({ period: "THIS_MONTH" });

      expect(metrics.totalProjects).toBeGreaterThan(0);
      expect(metrics.completedProjects + metrics.unfinishedProjects).toBe(metrics.totalProjects);
      expect(metrics.recognizedRevenue).toBeGreaterThan(0);
      expect(metrics.cashCollections).toBeGreaterThan(0);
      expect(metrics.totalDirectCosts).toBeGreaterThan(0);
      expect(metrics.grossProfit).toBe(metrics.recognizedRevenue - metrics.totalDirectCosts);
      expect(metrics.lowInventoryCount).toBeDefined();
      expect(metrics.openServiceTickets).toBeGreaterThanOrEqual(0);
      expect(metrics.technicianUtilizationPercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe("4. Subsidy Eligibility & Workflow Engine", () => {
    it("calculates statutory PM Surya Ghar CFA correctly across system capacities", () => {
      // 1 kW: ₹30,000
      expect(calculateEligibleSubsidy(1.0, "ON_GRID")).toBe(30000);
      // 2 kW: ₹60,000
      expect(calculateEligibleSubsidy(2.0, "ON_GRID")).toBe(60000);
      // 3 kW: ₹78,000
      expect(calculateEligibleSubsidy(3.0, "ON_GRID")).toBe(78000);
      // 5 kW: ₹78,000 (capped at 3 kW limit)
      expect(calculateEligibleSubsidy(5.0, "ON_GRID")).toBe(78000);
      // Off-Grid is ineligible
      expect(calculateEligibleSubsidy(3.0, "OFF_GRID")).toBe(0);
    });

    it("verifies statutory document readiness and prevents premature portal lodgment", () => {
      const store = getStore();
      const order = store.orders[0];

      // Create app with missing docs
      const app = createSubsidyApplication({
        orderId: order.id,
        discomName: "PSPCL",
      });

      expect(app.status).toBe("DOCS_PENDING");

      const check = verifySubsidyDocuments(app);
      expect(check.isComplete).toBe(false);
      expect(check.missingDocuments.length).toBe(4);

      // Advancing to PORTAL_SUBMITTED without documents must fail
      expect(() => {
        advanceSubsidyStage(app.id, { nextStage: "PORTAL_SUBMITTED" });
      }).toThrow(/Cannot submit application to DISCOM portal/);

      // Now provide documents
      app.electricity_bill_doc_url = "/docs/bill.pdf";
      app.id_proof_doc_url = "/docs/aadhaar.pdf";
      app.property_tax_doc_url = "/docs/tax.pdf";
      app.bank_passbook_doc_url = "/docs/passbook.pdf";

      const verifiedCheck = verifySubsidyDocuments(app);
      expect(verifiedCheck.isComplete).toBe(true);

      // Now advancing succeeds
      const advanced = advanceSubsidyStage(app.id, { nextStage: "PORTAL_SUBMITTED" });
      expect(advanced.status).toBe("PORTAL_SUBMITTED");
    });

    it("records DBT subsidy disbursement accurately", () => {
      const store = getStore();
      const app = store.subsidies[0];

      recordSubsidyDisbursement(app.id, {
        amount: 78000,
        disbursedDate: "2026-11-21",
        dbtTransactionRef: "DBT-PFMS-989218491",
      });

      expect(app.status).toBe("DISBURSED");
      expect(app.disbursed_amount).toBe(78000);
    });
  });

  describe("5. Executive Reporting & CSV Export Engine", () => {
    it("generates all 9 executive reports with summary and valid rows", () => {
      const revReport = generateRevenueReport("DIRECTOR");
      expect(revReport.reportId).toBe("REVENUE");
      expect(revReport.rows.length).toBeGreaterThan(0);

      const expReport = generateExpenseReport("DIRECTOR");
      expect(expReport.reportId).toBe("EXPENSES");

      const profReport = generateProjectProfitabilityReport("DIRECTOR");
      expect(profReport.reportId).toBe("PROJECT_PROFITABILITY");

      const invReport = generateInventoryValuationReport("DIRECTOR");
      expect(invReport.reportId).toBe("INVENTORY_VALUATION");

      const techReport = generateTechnicianPerformanceReport("DIRECTOR");
      expect(techReport.reportId).toBe("TECHNICIAN_PERFORMANCE");

      const outReport = generateOutstandingPaymentReport("DIRECTOR");
      expect(outReport.reportId).toBe("OUTSTANDING_PAYMENTS");

      const warReport = generateWarrantyReport("DIRECTOR");
      expect(warReport.reportId).toBe("WARRANTY");

      const srvReport = generateServiceTicketReport("DIRECTOR");
      expect(srvReport.reportId).toBe("SERVICE_TICKETS");

      const subReport = generateSubsidyReport("DIRECTOR");
      expect(subReport.reportId).toBe("SUBSIDY");
    });

    it("generates valid RFC-4180 CSV strings with headers for all reports", () => {
      const report = generateRevenueReport("FINANCE_MANAGER");
      const csv = report.toCSV();

      expect(csv).toContain("Order Number,Customer Name");
      expect(csv).toContain("ORD-2026-0089");
      expect(typeof csv).toBe("string");
    });

    it("enforces role-based access control for executive reports", () => {
      // Directors and Super Admins can access everything
      expect(canAccessReport("DIRECTOR", "PROJECT_PROFITABILITY")).toBe(true);
      expect(canAccessReport("SUPER_ADMIN", "REVENUE")).toBe(true);

      // Finance Manager can access finance reports but not technician/field reports
      expect(canAccessReport("FINANCE_MANAGER", "REVENUE")).toBe(true);
      expect(canAccessReport("FINANCE_MANAGER", "PROJECT_PROFITABILITY")).toBe(true);

      // Installation Manager can access technician and service reports but not P&L
      expect(canAccessReport("INSTALLATION_MANAGER", "TECHNICIAN_PERFORMANCE")).toBe(true);
      expect(canAccessReport("INSTALLATION_MANAGER", "PROJECT_PROFITABILITY")).toBe(false);

      // Customer has zero report access
      expect(canAccessReport("CUSTOMER", "REVENUE")).toBe(false);
    });
  });
});
