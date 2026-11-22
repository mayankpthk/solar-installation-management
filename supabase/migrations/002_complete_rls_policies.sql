-- ====================================================================
-- Migration: 002_complete_rls_policies.sql
-- Description: Complete Row-Level Security (RLS) policies, multi-tenant
-- isolation, RBAC permissions, and tamper-proof audit trails.
-- ====================================================================

-- 1. Helper Security Functions (SECURITY DEFINER with secure search_path)
CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('SUPER_ADMIN', 'DIRECTOR')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_org_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role != 'CUSTOMER'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_finance_or_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('SUPER_ADMIN', 'DIRECTOR', 'FINANCE_MANAGER')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Enable RLS across secondary & child tables
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 2. SITE SURVEYS RLS POLICIES
-- ====================================================================
CREATE POLICY "Staff view org site surveys"
ON site_surveys FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Technicians view assigned surveys"
ON site_surveys FOR SELECT
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND (assigned_technician_id IN (SELECT id FROM technicians WHERE profile_id = auth.uid()) OR is_org_staff())
);

CREATE POLICY "Staff insert site surveys"
ON site_surveys FOR INSERT
TO authenticated
WITH CHECK (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'SALES_MANAGER', 'SALES_EXECUTIVE')
);

CREATE POLICY "Technicians and staff update site surveys"
ON site_surveys FOR UPDATE
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND (
        auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'SALES_MANAGER', 'SURVEY_TECHNICIAN')
        OR assigned_technician_id IN (SELECT id FROM technicians WHERE profile_id = auth.uid())
    )
);

-- ====================================================================
-- 3. SOLAR PRODUCTS & RECIPES (BOM) RLS POLICIES
-- ====================================================================
CREATE POLICY "Public & authenticated view solar products"
ON solar_products FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admin manage solar products"
ON solar_products FOR ALL
TO authenticated
USING (is_org_admin())
WITH CHECK (is_org_admin());

CREATE POLICY "Staff view product components"
ON product_components FOR SELECT
TO authenticated
USING (is_org_staff());

CREATE POLICY "Admin manage product components"
ON product_components FOR ALL
TO authenticated
USING (is_org_admin())
WITH CHECK (is_org_admin());

CREATE POLICY "Staff view product recipes"
ON product_recipes FOR SELECT
TO authenticated
USING (is_org_staff());

CREATE POLICY "Admin manage product recipes"
ON product_recipes FOR ALL
TO authenticated
USING (is_org_admin())
WITH CHECK (is_org_admin());

-- ====================================================================
-- 4. QUOTATIONS & QUOTATION ITEMS RLS POLICIES
-- ====================================================================
CREATE POLICY "Staff view org quotations"
ON quotations FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Customers view their own quotations"
ON quotations FOR SELECT
TO authenticated
USING (
    auth_user_role() = 'CUSTOMER' 
    AND customer_id IN (SELECT id FROM customers WHERE portal_user_id = auth.uid())
);

CREATE POLICY "Sales and admin insert quotations"
ON quotations FOR INSERT
TO authenticated
WITH CHECK (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'SALES_EXECUTIVE')
);

CREATE POLICY "Staff update quotations"
ON quotations FOR UPDATE
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'SALES_EXECUTIVE')
);

CREATE POLICY "Customers accept their own quotations"
ON quotations FOR UPDATE
TO authenticated
USING (
    auth_user_role() = 'CUSTOMER' 
    AND customer_id IN (SELECT id FROM customers WHERE portal_user_id = auth.uid())
)
WITH CHECK (
    status IN ('ACCEPTED', 'REJECTED')
);

CREATE POLICY "Staff view quotation items"
ON quotation_items FOR SELECT
TO authenticated
USING (
    quotation_id IN (SELECT id FROM quotations WHERE organization_id = auth_user_org_id())
);

CREATE POLICY "Staff manage quotation items"
ON quotation_items FOR ALL
TO authenticated
USING (
    quotation_id IN (
        SELECT id FROM quotations 
        WHERE organization_id = auth_user_org_id() 
        AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'SALES_EXECUTIVE')
    )
);

-- ====================================================================
-- 5. ORDERS RLS POLICIES
-- ====================================================================
CREATE POLICY "Staff view org orders"
ON orders FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Customers view their own orders"
ON orders FOR SELECT
TO authenticated
USING (
    auth_user_role() = 'CUSTOMER' 
    AND customer_id IN (SELECT id FROM customers WHERE portal_user_id = auth.uid())
);

CREATE POLICY "Sales and admin create orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'OPERATIONS_MANAGER')
);

CREATE POLICY "Authorized staff update orders"
ON orders FOR UPDATE
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'INSTALLATION_MANAGER', 'SALES_MANAGER')
);

-- ====================================================================
-- 6. PAYMENTS & REFUNDS RLS POLICIES
-- ====================================================================
CREATE POLICY "Staff view payments"
ON payments FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Customers view their payments"
ON payments FOR SELECT
TO authenticated
USING (
    auth_user_role() = 'CUSTOMER' 
    AND order_id IN (
        SELECT id FROM orders 
        WHERE customer_id IN (SELECT id FROM customers WHERE portal_user_id = auth.uid())
    )
);

CREATE POLICY "Finance and admin record payments"
ON payments FOR INSERT
TO authenticated
WITH CHECK (
    organization_id = auth_user_org_id() 
    AND is_finance_or_admin()
);

CREATE POLICY "Finance and admin update payments"
ON payments FOR UPDATE
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND is_finance_or_admin()
);

CREATE POLICY "Finance view refunds"
ON refunds FOR SELECT
TO authenticated
USING (
    payment_id IN (SELECT id FROM payments WHERE organization_id = auth_user_org_id())
    AND is_finance_or_admin()
);

CREATE POLICY "Finance create refunds"
ON refunds FOR INSERT
TO authenticated
WITH CHECK (
    is_finance_or_admin()
);

-- ====================================================================
-- 7. INVENTORY, SERIAL NUMBERS & DISPATCHES RLS POLICIES
-- ====================================================================
CREATE POLICY "Staff view inventory locations"
ON inventory_locations FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Staff view inventory items"
ON inventory_items FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Warehouse staff manage inventory"
ON inventory_items FOR ALL
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'WAREHOUSE_MANAGER')
);

CREATE POLICY "Staff view serial numbers"
ON serial_numbers FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Warehouse & tech manage serial numbers"
ON serial_numbers FOR ALL
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'WAREHOUSE_MANAGER', 'FIELD_TECHNICIAN')
);

CREATE POLICY "Staff view stock movements"
ON stock_movements FOR SELECT
TO authenticated
USING (
    inventory_item_id IN (SELECT id FROM inventory_items WHERE organization_id = auth_user_org_id())
    AND is_org_staff()
);

CREATE POLICY "Staff view dispatches"
ON dispatches FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Warehouse staff manage dispatches"
ON dispatches FOR ALL
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'WAREHOUSE_MANAGER')
);

-- ====================================================================
-- 8. TECHNICIANS & INSTALLATION JOBS RLS POLICIES
-- ====================================================================
CREATE POLICY "Staff view technicians"
ON technicians FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Operations manage technicians"
ON technicians FOR ALL
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'INSTALLATION_MANAGER')
);

CREATE POLICY "Staff view installation jobs"
ON installation_jobs FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Installation managers & techs manage jobs"
ON installation_jobs FOR ALL
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'INSTALLATION_MANAGER', 'FIELD_TECHNICIAN')
);

-- ====================================================================
-- 9. SERVICE TICKETS RLS POLICIES
-- ====================================================================
CREATE POLICY "Staff view all service tickets"
ON service_tickets FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Customers view their own tickets"
ON service_tickets FOR SELECT
TO authenticated
USING (
    auth_user_role() = 'CUSTOMER' 
    AND customer_id IN (SELECT id FROM customers WHERE portal_user_id = auth.uid())
);

CREATE POLICY "Customers create service tickets"
ON service_tickets FOR INSERT
TO authenticated
WITH CHECK (
    auth_user_role() = 'CUSTOMER' 
    AND customer_id IN (SELECT id FROM customers WHERE portal_user_id = auth.uid())
);

CREATE POLICY "Technicians and staff update tickets"
ON service_tickets FOR UPDATE
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'FIELD_TECHNICIAN', 'INSTALLATION_MANAGER')
);

-- ====================================================================
-- 10. INVOICES & SUBSIDIES RLS POLICIES
-- ====================================================================
CREATE POLICY "Staff view invoices"
ON invoices FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Customers view their invoices"
ON invoices FOR SELECT
TO authenticated
USING (
    auth_user_role() = 'CUSTOMER' 
    AND customer_id IN (SELECT id FROM customers WHERE portal_user_id = auth.uid())
);

CREATE POLICY "Finance manage invoices"
ON invoices FOR ALL
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND is_finance_or_admin()
);

CREATE POLICY "Staff view subsidy applications"
ON subsidy_applications FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND is_org_staff());

CREATE POLICY "Customers view their subsidy application"
ON subsidy_applications FOR SELECT
TO authenticated
USING (
    auth_user_role() = 'CUSTOMER' 
    AND customer_id IN (SELECT id FROM customers WHERE portal_user_id = auth.uid())
);

CREATE POLICY "Finance and operations manage subsidies"
ON subsidy_applications FOR ALL
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER')
);

-- ====================================================================
-- 11. AUDIT LOGS: TAMPER-PROOF APPEND-ONLY POLICIES
-- ====================================================================
-- No UPDATE or DELETE permitted for ANY role on audit logs
CREATE POLICY "Directors view audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND is_org_admin()
);

CREATE POLICY "System and staff insert audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- ====================================================================
-- 12. HIGH-PERFORMANCE B-TREE INDEXES FOR FREQUENT QUERIES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);
CREATE INDEX IF NOT EXISTS idx_orders_org ON orders (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_quotations_lead ON quotations (lead_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_status ON serial_numbers (status);
CREATE INDEX IF NOT EXISTS idx_surveys_lead ON site_surveys (lead_id);
CREATE INDEX IF NOT EXISTS idx_installation_jobs_order ON installation_jobs (order_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_serial ON service_tickets (serial_number_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_table ON audit_logs (organization_id, table_name);
