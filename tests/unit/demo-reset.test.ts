import { describe, it, expect } from "vitest";
import { resetDemoEnvironment, DEMO_ACCOUNTS } from "../../scripts/reset-demo";
import { getStore } from "../../src/lib/data/store";

describe("Demonstration Environment & Persona Verification", () => {
  it("resets store and re-seeds canonical demonstration dataset", () => {
    const result = resetDemoEnvironment();
    expect(result.success).toBe(true);
    expect(result.stats.customers).toBeGreaterThan(0);
    expect(result.stats.leads).toBeGreaterThan(0);
    expect(result.stats.surveys).toBeGreaterThan(0);
    expect(result.stats.quotations).toBeGreaterThan(0);
    expect(result.stats.orders).toBeGreaterThan(0);
    expect(result.stats.inventoryItems).toBeGreaterThan(0);
    expect(result.stats.serialNumbers).toBeGreaterThan(0);
    expect(result.stats.installations).toBeGreaterThan(0);
    expect(result.stats.warranties).toBeGreaterThan(0);
    expect(result.stats.serviceTickets).toBeGreaterThan(0);
  });

  it("verifies all 6 required demo accounts are defined with correct roles", () => {
    const roles = DEMO_ACCOUNTS.map((a) => a.role);
    expect(roles).toContain("DIRECTOR");
    expect(roles).toContain("SALES_EXECUTIVE");
    expect(roles).toContain("SURVEY_TECHNICIAN");
    expect(roles).toContain("WAREHOUSE_MANAGER");
    expect(roles).toContain("FIELD_TECHNICIAN");
    expect(roles).toContain("CUSTOMER");

    DEMO_ACCOUNTS.forEach((account) => {
      expect(account.email).toMatch(/@sunpower\.demo$/);
      expect(account.name.length).toBeGreaterThan(3);
      expect(account.permissionsSummary.length).toBeGreaterThan(10);
    });
  });

  it("prevents demo reset in production without explicit ALLOW_DEMO_RESET override", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalOverride = process.env.ALLOW_DEMO_RESET;

    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.ALLOW_DEMO_RESET;

      expect(() => resetDemoEnvironment()).toThrow(/Demo reset is disabled in production environments/);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      if (originalOverride !== undefined) {
        process.env.ALLOW_DEMO_RESET = originalOverride;
      }
    }
  });

  it("permits demo reset in production when ALLOW_DEMO_RESET=true is explicitly set", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalOverride = process.env.ALLOW_DEMO_RESET;

    try {
      (process.env as any).NODE_ENV = "production";
      process.env.ALLOW_DEMO_RESET = "true";

      const res = resetDemoEnvironment();
      expect(res.success).toBe(true);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      if (originalOverride !== undefined) {
        process.env.ALLOW_DEMO_RESET = originalOverride;
      } else {
        delete process.env.ALLOW_DEMO_RESET;
      }
    }
  });

  it("verifies live seeded database metrics on executive store", () => {
    resetDemoEnvironment();
    const store = getStore();

    // Verify database backed metrics
    const totalRevenue = store.orders.reduce((sum, o) => sum + (o.total_contract_value || 0), 0);
    const collectedPayments = store.payments.reduce((sum, p) => sum + p.amount, 0);
    const activeLeads = store.leads.filter((l) => !["CONVERTED", "LOST"].includes(l.status)).length;

    expect(totalRevenue).toBeGreaterThan(0);
    expect(collectedPayments).toBeGreaterThan(0);
    expect(activeLeads).toBeGreaterThan(0);
  });
});
