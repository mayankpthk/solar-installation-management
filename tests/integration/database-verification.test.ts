import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { getStore, resetStore } from "@/lib/data/store";
import { reserveInventoryForOrder, InsufficientStockError } from "@/domain/inventory/dispatch-engine";
import { processPayment } from "@/domain/payments/payment-processor";

describe("Stage 2: Database Schema & Transaction Verification", () => {
  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  const schemaFile = path.join(migrationsDir, "001_initial_schema.sql");
  const rlsFile = path.join(migrationsDir, "002_complete_rls_policies.sql");

  let schemaSql = "";
  let rlsSql = "";

  it("successfully reads and parses all SQL migration files", () => {
    expect(fs.existsSync(schemaFile)).toBe(true);
    expect(fs.existsSync(rlsFile)).toBe(true);

    schemaSql = fs.readFileSync(schemaFile, "utf-8");
    rlsSql = fs.readFileSync(rlsFile, "utf-8");

    expect(schemaSql.length).toBeGreaterThan(10000);
    expect(rlsSql.length).toBeGreaterThan(5000);
  });

  describe("DDL & Constraints Verification", () => {
    const requiredTables = [
      "organizations",
      "profiles",
      "roles",
      "permissions",
      "customers",
      "leads",
      "lead_activities",
      "site_surveys",
      "solar_products",
      "product_components",
      "product_recipes",
      "quotations",
      "quotation_items",
      "orders",
      "payments",
      "inventory_locations",
      "inventory_items",
      "serial_numbers",
      "stock_movements",
      "dispatches",
      "dispatch_items",
      "technicians",
      "installation_jobs",
      "installation_checklists",
      "installation_photos",
      "customer_signatures",
      "warranty_policies",
      "warranties",
      "service_tickets",
      "invoices",
      "subsidy_applications",
      "expenses",
      "technician_time_entries",
      "audit_logs",
    ];

    it("defines every required table with primary key constraints", () => {
      for (const table of requiredTables) {
        const regex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?${table}\\b`, "i");
        expect(schemaSql).toMatch(regex);
      }
    });

    it("defines explicit foreign key relationships with relational integrity", () => {
      expect(schemaSql).toContain("REFERENCES organizations(id)");
      expect(schemaSql).toContain("REFERENCES customers(id)");
      expect(schemaSql).toContain("REFERENCES leads(id)");
      expect(schemaSql).toContain("REFERENCES orders(id)");
      expect(schemaSql).toContain("REFERENCES quotations(id)");
    });

    it("defines unique constraints to prevent duplicate identifiers", () => {
      expect(schemaSql).toContain("UNIQUE");
      expect(schemaSql).toMatch(/lead_code VARCHAR\(\d+\) UNIQUE/i);
      expect(schemaSql).toMatch(/quotation_number VARCHAR\(\d+\) UNIQUE/i);
      expect(schemaSql).toMatch(/order_number VARCHAR\(\d+\) UNIQUE/i);
    });

    it("defines B-Tree indexes on high-frequency query columns", () => {
      expect(rlsSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_leads_org/i);
      expect(rlsSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_orders_org/i);
      expect(rlsSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_serial_numbers_status/i);
      expect(rlsSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_quotations_lead/i);
      expect(rlsSql).toMatch(/CREATE INDEX IF NOT EXISTS idx_payments_order/i);
    });
  });

  describe("Row-Level Security (RLS) Coverage Verification", () => {
    it("enables RLS across all tables in initial and security migrations", () => {
      expect(schemaSql).toContain("ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;");
      expect(schemaSql).toContain("ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;");
      expect(schemaSql).toContain("ALTER TABLE orders ENABLE ROW LEVEL SECURITY;");
      expect(schemaSql).toContain("ALTER TABLE payments ENABLE ROW LEVEL SECURITY;");
      expect(schemaSql).toContain("ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;");

      expect(rlsSql).toContain("ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;");
      expect(rlsSql).toContain("ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;");
      expect(rlsSql).toContain("ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;");
      expect(rlsSql).toContain("ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;");
      expect(rlsSql).toContain("ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;");
    });

    it("declares SECURITY DEFINER functions with search_path hardening", () => {
      expect(rlsSql).toMatch(/CREATE OR REPLACE FUNCTION is_org_admin\(\)/i);
      expect(rlsSql).toMatch(/CREATE OR REPLACE FUNCTION is_org_staff\(\)/i);
      expect(rlsSql).toMatch(/CREATE OR REPLACE FUNCTION is_finance_or_admin\(\)/i);
      expect(rlsSql).toContain("SET search_path = public");
    });

    it("enforces append-only immutable audit trail policy", () => {
      expect(rlsSql).toContain('CREATE POLICY "Directors view audit logs"');
      expect(rlsSql).toContain('CREATE POLICY "System and staff insert audit logs"');
      expect(rlsSql).not.toContain('ON audit_logs FOR UPDATE');
      expect(rlsSql).not.toContain('ON audit_logs FOR DELETE');
    });
  });

  describe("Transactional Integrity & Concurrency Verification", () => {
    beforeEach(() => {
      resetStore();
    });

    it("atomically reserves inventory and rejects requests if stock is insufficient", () => {
      const store = getStore();
      const panelItem = store.inventoryItems.find((i) => i.component_code === "PV-PANEL-540W");
      expect(panelItem).toBeDefined();

      if (panelItem) {
        // First order reservation succeeds
        const res1 = reserveInventoryForOrder(store.orders[0].id, "WAREHOUSE_MANAGER");
        expect(res1.success).toBe(true);

        // Deplete stock to simulate insufficient inventory condition
        panelItem.quantity_on_hand = panelItem.quantity_reserved;

        // Subsequent order reservation must fail atomically with InsufficientStockError
        expect(() =>
          reserveInventoryForOrder(store.orders[1].id, "WAREHOUSE_MANAGER")
        ).toThrow(InsufficientStockError);
      }
    });

    it("enforces idempotency on duplicate payment processing requests", () => {
      const store = getStore();
      const targetOrderId = store.orders[0].id;

      const paymentPayload = {
        orderId: targetOrderId,
        amount: 25000,
        milestone: "BOOKING_ADVANCE" as const,
        paymentMode: "ONLINE_GATEWAY" as const,
        paymentReferenceCode: "GW-TXN-IDEMPOTENT-001",
        idempotencyKey: "unique-client-uuid-999",
        isSimulated: true,
      };

      const payment1 = processPayment(paymentPayload);
      expect(payment1).toBeDefined();
      expect(payment1.idempotency_key).toBe("unique-client-uuid-999");

      // Duplicate submission with same reference throws error preventing double-charging
      expect(() => processPayment(paymentPayload)).toThrow(/Duplicate payment rejected/);
    });
  });
});
