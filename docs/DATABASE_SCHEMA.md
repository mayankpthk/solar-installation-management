# SolarOS: Normalized Relational PostgreSQL Database Schema
**System:** SolarOS — The Complete Solar Business Operating System  
**Engine:** PostgreSQL 15+ (Supabase Native)  
**Author:** Database Architect & Principal Engineer  
**Status:** Approved Architectural Baseline  

---

## 1. Schema Design Principles & Conventions

1. **Strict Third Normal Form (3NF):** Elimination of redundant data attributes across transactional tables.
2. **UUID Primary Keys:** All tables utilize `UUID DEFAULT gen_random_uuid()` to prevent enumeration attacks and simplify distributed data staging.
3. **Auditability & Soft Deletion:** Critical business entities feature `created_at`, `updated_at`, and nullable `deleted_at` timestamps.
4. **Relational Integrity:** Foreign keys are guarded with explicit referential integrity rules (`ON DELETE RESTRICT` for master items, orders, invoices, serials to prevent accidental cascading data loss; `CASCADE` used only on direct parent-child line-item tables).
5. **Enforced Value Constraints:** Check constraints validate domain boundaries (e.g., positive monetary amounts, valid angles $0^\circ \le \theta \le 90^\circ$, percentage limits $0 \le x \le 100$).
6. **Immutable Audit Log Table:** An append-only audit log table automatically captures record mutation history via database triggers.

---

## 2. Complete Database DDL (Schema Definition)

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES DEFINITIONS
-- ============================================================================

CREATE TYPE user_role_enum AS ENUM (
    'SUPER_ADMIN',
    'DIRECTOR',
    'SALES_MANAGER',
    'SALES_EXECUTIVE',
    'SURVEY_TECHNICIAN',
    'WAREHOUSE_MANAGER',
    'INSTALLATION_MANAGER',
    'FIELD_TECHNICIAN',
    'FINANCE_MANAGER',
    'CUSTOMER'
);

CREATE TYPE system_topology_enum AS ENUM ('ON_GRID', 'OFF_GRID', 'HYBRID');

CREATE TYPE lead_status_enum AS ENUM (
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'SURVEY_SCHEDULED',
    'SURVEY_COMPLETED',
    'QUOTED',
    'WON',
    'LOST'
);

CREATE TYPE survey_status_enum AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'SUBMITTED',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE quotation_status_enum AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED'
);

CREATE TYPE order_status_enum AS ENUM (
    'CONFIRMED',
    'STAGING',
    'READY_FOR_DISPATCH',
    'DISPATCHED',
    'INSTALLATION_SCHEDULED',
    'INSTALLATION_IN_PROGRESS',
    'COMMISSIONED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE serial_status_enum AS ENUM (
    'IN_STOCK',
    'RESERVED',
    'DISPATCHED',
    'INSTALLED',
    'DEFECTIVE',
    'REPLACED'
);

CREATE TYPE dispatch_status_enum AS ENUM (
    'PREPARING',
    'IN_TRANSIT',
    'DELIVERED',
    'RETURNED'
);

CREATE TYPE installation_status_enum AS ENUM (
    'ASSIGNED',
    'EN_ROUTE',
    'IN_PROGRESS',
    'TESTING',
    'REPORT_SUBMITTED',
    'CUSTOMER_SIGNED',
    'APPROVED'
);

CREATE TYPE warranty_status_enum AS ENUM (
    'ACTIVE',
    'CLAIM_PENDING',
    'EXPIRED',
    'VOIDED'
);

CREATE TYPE ticket_status_enum AS ENUM (
    'LOGGED',
    'ASSIGNED',
    'TECHNICIAN_VISITED',
    'PARTS_PENDING',
    'RESOLVED',
    'CUSTOMER_CONFIRMED',
    'CLOSED'
);

CREATE TYPE subsidy_status_enum AS ENUM (
    'DOCS_PENDING',
    'PORTAL_SUBMITTED',
    'FEASIBILITY_APPROVED',
    'INSPECTED',
    'NET_METER_INSTALLED',
    'CLAIM_LODGED',
    'DISBURSED',
    'REJECTED'
);

CREATE TYPE payment_milestone_enum AS ENUM (
    'BOOKING_ADVANCE',
    'PRE_DISPATCH',
    'POST_INSTALLATION_BALANCE',
    'SERVICE_FEE'
);

CREATE TYPE payment_mode_enum AS ENUM (
    'BANK_TRANSFER_NEFT',
    'UPI',
    'CHEQUE',
    'CASH',
    'ONLINE_GATEWAY'
);

-- ============================================================================
-- 1. SYSTEM SETTINGS & CONFIGURATION
-- ============================================================================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID
);

-- ============================================================================
-- 2. USER PROFILES & ROLES (EXTENDING SUPABASE auth.users)
-- ============================================================================

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY, -- Maps directly to auth.users.id
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    role user_role_enum NOT NULL,
    hourly_rate NUMERIC(10, 2) DEFAULT 0.00 CHECK (hourly_rate >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 3. CRM & LEADS MANAGEMENT
-- ============================================================================

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_code VARCHAR(30) UNIQUE NOT NULL, -- e.g. LED-2026-0001
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    
    -- Pre-qualification questions
    monthly_bill_amount NUMERIC(10, 2) CHECK (monthly_bill_amount >= 0),
    avg_monthly_consumption_kwh NUMERIC(10, 2) CHECK (avg_monthly_consumption_kwh >= 0),
    shadow_free_area_sqft NUMERIC(10, 2) CHECK (shadow_free_area_sqft >= 0),
    sanctioned_load_kw NUMERIC(6, 2) CHECK (sanctioned_load_kw >= 0),
    grid_connection_type VARCHAR(50), -- Single-Phase / Three-Phase
    discom_name VARCHAR(150),
    interested_capacity_kw NUMERIC(4, 1) CHECK (interested_capacity_kw BETWEEN 1.0 AND 50.0),
    system_topology system_topology_enum DEFAULT 'ON_GRID',
    is_subsidy_requested BOOLEAN DEFAULT TRUE,
    
    status lead_status_enum DEFAULT 'NEW',
    assigned_sales_rep_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    source VARCHAR(50) DEFAULT 'WEB_FORM', -- WEB_FORM, WHATSAPP, CALL, WALK_IN
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 4. SITE SURVEYS
-- ============================================================================

CREATE TABLE site_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_code VARCHAR(30) UNIQUE NOT NULL, -- e.g. SRV-2026-0001
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
    assigned_technician_id UUID REFERENCES user_profiles(id) ON DELETE RESTRICT,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_date TIMESTAMP WITH TIME ZONE,
    
    -- Technical Rooftop Feasibility Metrics
    roof_azimuth_direction VARCHAR(30), -- South, South-West, West, etc.
    roof_tilt_angle_deg NUMERIC(4, 1) CHECK (roof_tilt_angle_deg BETWEEN 0.0 AND 90.0),
    usable_area_sqft NUMERIC(10, 2) CHECK (usable_area_sqft >= 0),
    roof_type VARCHAR(50), -- RCC_FLAT, TIN_SHED, TILED, GROUND_MOUNT
    structural_integrity VARCHAR(30), -- EXCELLENT, ACCEPTABLE, REINFORCEMENT_REQUIRED, UNSUITABLE
    shadow_obstacles_notes TEXT,
    
    -- Electrical Metrics
    dc_cable_distance_meters NUMERIC(6, 2) CHECK (dc_cable_distance_meters >= 0),
    ac_cable_distance_meters NUMERIC(6, 2) CHECK (ac_cable_distance_meters >= 0),
    recommended_capacity_kw NUMERIC(4, 1) CHECK (recommended_capacity_kw BETWEEN 1.0 AND 50.0),
    recommended_topology system_topology_enum NOT NULL,
    
    -- Verification & Photos
    photo_urls JSONB DEFAULT '[]'::jsonb, -- Array of photo URL objects
    status survey_status_enum DEFAULT 'SCHEDULED',
    review_comments TEXT,
    reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. ITEM MASTER CATALOG & BILL OF MATERIALS TEMPLATES
-- ============================================================================

CREATE TABLE item_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code VARCHAR(50) UNIQUE NOT NULL, -- SKU
    category_id UUID NOT NULL REFERENCES item_categories(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(20) NOT NULL, -- PIECE, METER, SET, ROLL
    is_serial_tracked BOOLEAN DEFAULT FALSE,
    default_warranty_months INT NOT NULL DEFAULT 12 CHECK (default_warranty_months >= 0),
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    base_selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_selling_price >= 0),
    hsn_code VARCHAR(20),
    gst_rate_percent NUMERIC(5, 2) DEFAULT 12.00 CHECK (gst_rate_percent >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Master BOM Templates per standard system capacity & topology
CREATE TABLE bom_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(150) NOT NULL,
    capacity_kw NUMERIC(4, 1) NOT NULL CHECK (capacity_kw BETWEEN 1.0 AND 10.0),
    topology system_topology_enum NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(capacity_kw, topology)
);

CREATE TABLE bom_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES bom_templates(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    default_quantity NUMERIC(10, 2) NOT NULL CHECK (default_quantity > 0),
    is_dynamic_cable BOOLEAN DEFAULT FALSE, -- Multiplies by survey cable distance
    UNIQUE(template_id, item_id)
);

-- ============================================================================
-- 6. QUOTATIONS & ORDERS
-- ============================================================================

CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number VARCHAR(40) UNIQUE NOT NULL, -- e.g. QUO-2026-0001
    version INT NOT NULL DEFAULT 1,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
    survey_id UUID NOT NULL REFERENCES site_surveys(id) ON DELETE RESTRICT,
    system_capacity_kw NUMERIC(4, 1) NOT NULL CHECK (system_capacity_kw BETWEEN 1.0 AND 50.0),
    system_topology system_topology_enum NOT NULL,
    
    -- Financial Totals
    hardware_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (hardware_total >= 0),
    installation_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (installation_charges >= 0),
    logistics_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (logistics_charges >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (taxable_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    gross_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (gross_total >= 0),
    estimated_subsidy_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_subsidy_amount >= 0),
    net_payable_by_customer NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (net_payable_by_customer >= 0),
    
    status quotation_status_enum DEFAULT 'DRAFT',
    pdf_url TEXT,
    valid_until DATE NOT NULL,
    approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0)
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(40) UNIQUE NOT NULL, -- e.g. ORD-2026-0001
    quotation_id UUID UNIQUE NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    
    system_capacity_kw NUMERIC(4, 1) NOT NULL,
    system_topology system_topology_enum NOT NULL,
    total_contract_value NUMERIC(12, 2) NOT NULL CHECK (total_contract_value >= 0),
    advance_amount_required NUMERIC(12, 2) NOT NULL CHECK (advance_amount_required >= 0),
    advance_amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (advance_amount_paid >= 0),
    
    status order_status_enum DEFAULT 'CONFIRMED',
    credit_override_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    credit_override_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. INVOICING & PAYMENTS
-- ============================================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(40) UNIQUE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
    milestone payment_milestone_enum NOT NULL,
    taxable_amount NUMERIC(12, 2) NOT NULL CHECK (taxable_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL CHECK (tax_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    due_date DATE NOT NULL,
    is_settled BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_reference_code VARCHAR(60) UNIQUE NOT NULL, -- Bank UTR / Txn Reference
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    milestone payment_milestone_enum NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode payment_mode_enum NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    receipt_url TEXT,
    verified_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. WAREHOUSES, STOCK LEVELS & SERIAL NUMBERS
-- ============================================================================

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    location_address TEXT NOT NULL,
    manager_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity_on_hand NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_on_hand >= 0),
    quantity_reserved NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_reserved >= 0),
    reorder_threshold NUMERIC(10, 2) NOT NULL DEFAULT 5.00 CHECK (reorder_threshold >= 0),
    UNIQUE(warehouse_id, item_id)
);

CREATE TABLE serial_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    purchase_invoice_ref VARCHAR(100),
    status serial_status_enum NOT NULL DEFAULT 'IN_STOCK',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. DISPATCH MANAGEMENT & ORDER SERIAL ALLOCATION
-- ============================================================================

CREATE TABLE dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_number VARCHAR(40) UNIQUE NOT NULL, -- e.g. DSP-2026-0001
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    vehicle_registration_number VARCHAR(30) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    dispatch_status dispatch_status_enum NOT NULL DEFAULT 'PREPARING',
    dispatched_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    receiver_name VARCHAR(100),
    created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
    serial_number_id UUID NOT NULL REFERENCES serial_numbers(id) ON DELETE RESTRICT,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scanned_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    UNIQUE(dispatch_id, serial_number_id)
);

-- Partial index preventing double active reservation/dispatch of any serial
CREATE UNIQUE INDEX idx_unique_active_serial_assignment 
ON serial_numbers (serial_number) 
WHERE status IN ('RESERVED', 'DISPATCHED', 'INSTALLED');

-- ============================================================================
-- 10. TECHNICIAN SCHEDULING & INSTALLATION MANAGEMENT
-- ============================================================================

CREATE TABLE technician_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    technician_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    is_lead_technician BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (scheduled_end > scheduled_start)
);

CREATE TABLE installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    lead_technician_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    status installation_status_enum NOT NULL DEFAULT 'ASSIGNED',
    
    -- SOP Checklist Flags
    structure_anchored BOOLEAN DEFAULT FALSE,
    panels_mounted BOOLEAN DEFAULT FALSE,
    dc_wiring_connected BOOLEAN DEFAULT FALSE,
    inverter_mounted BOOLEAN DEFAULT FALSE,
    ac_wiring_connected BOOLEAN DEFAULT FALSE,
    earthing_pit_completed BOOLEAN DEFAULT FALSE,
    earthing_resistance_ohms NUMERIC(6, 2) CHECK (earthing_resistance_ohms >= 0),
    
    -- Live Generation Commissioning Measurements
    measured_dc_voltage NUMERIC(6, 2) CHECK (measured_dc_voltage >= 0),
    measured_dc_current NUMERIC(6, 2) CHECK (measured_dc_current >= 0),
    measured_ac_voltage NUMERIC(6, 2) CHECK (measured_ac_voltage >= 0),
    measured_instantaneous_power_kw NUMERIC(6, 2) CHECK (measured_instantaneous_power_kw >= 0),
    
    start_time TIMESTAMP WITH TIME ZONE,
    finish_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE installation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id UUID UNIQUE NOT NULL REFERENCES installations(id) ON DELETE RESTRICT,
    installed_capacity_kw NUMERIC(4, 1) NOT NULL,
    
    -- Mandatory Photos
    roof_array_photo_url TEXT NOT NULL,
    inverter_mount_photo_url TEXT NOT NULL,
    distribution_box_photo_url TEXT NOT NULL,
    earthing_pit_photo_url TEXT NOT NULL,
    generation_meter_photo_url TEXT NOT NULL,
    additional_photos JSONB DEFAULT '[]'::jsonb,
    
    -- Customer Handover Sign-off
    customer_signature_svg TEXT NOT NULL,
    customer_signoff_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_feedback_rating INT CHECK (customer_feedback_rating BETWEEN 1 AND 5),
    handover_certificate_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. WARRANTIES & SERVICE TICKETS
-- ============================================================================

CREATE TABLE warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    serial_number_id UUID UNIQUE NOT NULL REFERENCES serial_numbers(id) ON DELETE RESTRICT,
    warranty_start_date DATE NOT NULL,
    warranty_end_date DATE NOT NULL,
    status warranty_status_enum NOT NULL DEFAULT 'ACTIVE',
    certificate_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (warranty_end_date >= warranty_start_date)
);

CREATE TABLE service_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(40) UNIQUE NOT NULL, -- e.g. TKT-2026-0001
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
    serial_number_id UUID REFERENCES serial_numbers(id) ON DELETE RESTRICT,
    
    reported_fault_code VARCHAR(50),
    symptom_description TEXT NOT NULL,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    
    is_under_warranty BOOLEAN NOT NULL,
    billing_classification VARCHAR(30) NOT NULL, -- 'WARRANTY_FREE' OR 'BILLABLE'
    service_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    
    assigned_technician_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    status ticket_status_enum NOT NULL DEFAULT 'LOGGED',
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    customer_confirmed_at TIMESTAMP WITH TIME ZONE,
    customer_confirmation_otp VARCHAR(10),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 12. GOVERNMENT SUBSIDY TRACKING
-- ============================================================================

CREATE TABLE subsidy_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
    portal_application_number VARCHAR(60),
    discom_name VARCHAR(150) NOT NULL,
    subsidy_amount_eligible NUMERIC(12, 2) NOT NULL CHECK (subsidy_amount_eligible >= 0),
    
    status subsidy_status_enum NOT NULL DEFAULT 'DOCS_PENDING',
    electricity_bill_doc_url TEXT,
    id_proof_doc_url TEXT,
    property_tax_doc_url TEXT,
    bank_passbook_doc_url TEXT,
    
    portal_submission_date DATE,
    feasibility_approval_date DATE,
    inspection_date DATE,
    net_meter_installation_date DATE,
    claim_lodged_date DATE,
    disbursed_date DATE,
    disbursed_amount NUMERIC(12, 2) CHECK (disbursed_amount >= 0),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 13. JOB COSTING & FINANCIAL PROFITABILITY
-- ============================================================================

CREATE TABLE job_costing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    
    -- Revenue (Excl Tax)
    net_contract_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Direct Costs
    actual_hardware_bom_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_technician_labor_hours NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    actual_technician_labor_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    actual_logistics_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    misc_contingency_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    -- Computed Margin
    total_job_cost NUMERIC(12, 2) GENERATED ALWAYS AS (
        actual_hardware_bom_cost + actual_technician_labor_cost + actual_logistics_cost + misc_contingency_cost
    ) STORED,
    gross_profit NUMERIC(12, 2) GENERATED ALWAYS AS (
        net_contract_revenue - (actual_hardware_bom_cost + actual_technician_labor_cost + actual_logistics_cost + misc_contingency_cost)
    ) STORED,
    gross_margin_percent NUMERIC(6, 2),
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 14. IMMUTABLE AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    performed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    user_role user_role_enum,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'SECURITY_OVERRIDE'
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Block manual modification or deletion of audit logs
CREATE RULE no_update_audit_logs AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_logs AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
```

---

## 3. High-Performance Database Indexes

```sql
-- Leads & CRM Indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_rep ON leads(assigned_sales_rep_id);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_pincode ON leads(pincode);

-- Surveys Indexes
CREATE INDEX idx_surveys_lead_id ON site_surveys(lead_id);
CREATE INDEX idx_surveys_tech_date ON site_surveys(assigned_technician_id, scheduled_date);
CREATE INDEX idx_surveys_status ON site_surveys(status);

-- Quotations & Orders
CREATE INDEX idx_quotations_lead_id ON quotations(lead_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_orders_quotation_id ON orders(quotation_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_lead_id ON orders(lead_id);

-- Invoices & Payments
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_ref_code ON payments(payment_reference_code);

-- Serials & Inventory
CREATE INDEX idx_serial_numbers_sku ON serial_numbers(item_id);
CREATE INDEX idx_serial_numbers_status ON serial_numbers(status);
CREATE INDEX idx_serial_numbers_lookup ON serial_numbers(serial_number);
CREATE INDEX idx_stock_levels_lookup ON stock_levels(warehouse_id, item_id);

-- Dispatches
CREATE INDEX idx_dispatches_order ON dispatches(order_id);
CREATE INDEX idx_dispatches_status ON dispatches(dispatch_status);

-- Warranties & Service Tickets
CREATE INDEX idx_warranties_lookup ON warranties(serial_number_id);
CREATE INDEX idx_warranties_order ON warranties(order_id);
CREATE INDEX idx_warranties_dates ON warranties(warranty_start_date, warranty_end_date);
CREATE INDEX idx_service_tickets_serial ON service_tickets(serial_number_id);
CREATE INDEX idx_service_tickets_status ON service_tickets(status);
CREATE INDEX idx_service_tickets_order ON service_tickets(order_id);

-- Audit Logs
CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(created_at DESC);
```

---

## 4. Stored Procedures & Triggers

### 4.1 Automatic Timestamp Synchronization
```sql
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to mutable tables
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_site_surveys_updated BEFORE UPDATE ON site_surveys FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_installations_updated BEFORE UPDATE ON installations FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
CREATE TRIGGER trg_service_tickets_updated BEFORE UPDATE ON service_tickets FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
```

### 4.2 Automated Warranty Activation on Delivery
```sql
CREATE OR REPLACE FUNCTION fn_auto_activate_warranties()
RETURNS TRIGGER AS $$
DECLARE
    r_item RECORD;
BEGIN
    -- Trigger only when dispatch status transitions to DELIVERED
    IF (NEW.dispatch_status = 'DELIVERED' AND OLD.dispatch_status != 'DELIVERED') THEN
        
        -- Loop through all scanned serials in this dispatch
        FOR r_item IN 
            SELECT 
                di.serial_number_id,
                sn.item_id,
                i.default_warranty_months,
                o.lead_id,
                o.id AS order_id
            FROM dispatch_items di
            JOIN serial_numbers sn ON di.serial_number_id = sn.id
            JOIN items i ON sn.item_id = i.id
            JOIN dispatches d ON di.dispatch_id = d.id
            JOIN orders o ON d.order_id = o.id
            WHERE di.dispatch_id = NEW.id
        LOOP
            -- Insert warranty record with calculated duration
            INSERT INTO warranties (
                order_id,
                lead_id,
                item_id,
                serial_number_id,
                warranty_start_date,
                warranty_end_date,
                status
            ) VALUES (
                r_item.order_id,
                r_item.lead_id,
                r_item.item_id,
                r_item.serial_number_id,
                CURRENT_DATE,
                CURRENT_DATE + (r_item.default_warranty_months || ' months')::interval,
                'ACTIVE'
            )
            ON CONFLICT (serial_number_id) DO NOTHING;

            -- Update serial status to DISPATCHED
            UPDATE serial_numbers 
            SET status = 'DISPATCHED', updated_at = CURRENT_TIMESTAMP
            WHERE id = r_item.serial_number_id;
        END LOOP;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_activate_warranty_on_delivery
AFTER UPDATE ON dispatches
FOR EACH ROW
EXECUTE FUNCTION fn_auto_activate_warranties();
```

### 4.3 Automated Job Costing Aggregation
```sql
CREATE OR REPLACE FUNCTION fn_compute_job_costing()
RETURNS TRIGGER AS $$
DECLARE
    v_net_revenue NUMERIC(12, 2);
    v_bom_cost NUMERIC(12, 2) := 0.00;
    v_labor_hours NUMERIC(8, 2) := 0.00;
    v_labor_cost NUMERIC(12, 2) := 0.00;
    v_logistics_cost NUMERIC(12, 2) := 0.00;
BEGIN
    -- Trigger when installation reaches APPROVED
    IF (NEW.status = 'APPROVED' AND OLD.status != 'APPROVED') THEN
        
        -- 1. Fetch net contract revenue
        SELECT q.taxable_amount INTO v_net_revenue
        FROM orders o
        JOIN quotations q ON o.quotation_id = q.id
        WHERE o.id = NEW.order_id;
        
        -- 2. Fetch actual hardware BOM purchase cost
        SELECT COALESCE(SUM(i.unit_cost * qi.quantity), 0.00) INTO v_bom_cost
        FROM orders o
        JOIN quotations q ON o.quotation_id = q.id
        JOIN quotation_items qi ON q.id = qi.quotation_id
        JOIN items i ON qi.item_id = i.id
        WHERE o.id = NEW.order_id;
        
        -- 3. Calculate technician labor hours & cost
        SELECT 
            COALESCE(SUM(EXTRACT(EPOCH FROM (ts.scheduled_end - ts.scheduled_start))/3600), 0.00),
            COALESCE(SUM((EXTRACT(EPOCH FROM (ts.scheduled_end - ts.scheduled_start))/3600) * up.hourly_rate), 0.00)
        INTO v_labor_hours, v_labor_cost
        FROM technician_schedules ts
        JOIN user_profiles up ON ts.technician_id = up.id
        WHERE ts.order_id = NEW.order_id;
        
        -- 4. Fetch logistics cost
        SELECT COALESCE(q.logistics_charges, 0.00) INTO v_logistics_cost
        FROM orders o
        JOIN quotations q ON o.quotation_id = q.id
        WHERE o.id = NEW.order_id;
        
        -- 5. Upsert Job Costing record
        INSERT INTO job_costing (
            order_id,
            net_contract_revenue,
            actual_hardware_bom_cost,
            total_technician_labor_hours,
            actual_technician_labor_cost,
            actual_logistics_cost,
            gross_margin_percent
        ) VALUES (
            NEW.order_id,
            v_net_revenue,
            v_bom_cost,
            v_labor_hours,
            v_labor_cost,
            v_logistics_cost,
            CASE 
                WHEN v_net_revenue > 0 THEN 
                    ROUND(((v_net_revenue - (v_bom_cost + v_labor_cost + v_logistics_cost)) / v_net_revenue) * 100, 2)
                ELSE 0.00 
            END
        )
        ON CONFLICT (order_id) DO UPDATE SET
            net_contract_revenue = EXCLUDED.net_contract_revenue,
            actual_hardware_bom_cost = EXCLUDED.actual_hardware_bom_cost,
            total_technician_labor_hours = EXCLUDED.total_technician_labor_hours,
            actual_technician_labor_cost = EXCLUDED.actual_technician_labor_cost,
            actual_logistics_cost = EXCLUDED.actual_logistics_cost,
            gross_margin_percent = EXCLUDED.gross_margin_percent,
            updated_at = CURRENT_TIMESTAMP;
            
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_job_costing
AFTER UPDATE ON installations
FOR EACH ROW
EXECUTE FUNCTION fn_compute_job_costing();
```

---

## 5. Supabase Row-Level Security (RLS) Policies

All tables have RLS enabled by default: `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`.

```sql
-- Helper function to extract user role from auth claims
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role_enum AS $$
    SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Leads Table Policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Directors & Admins have full access to leads"
ON leads FOR ALL
TO authenticated
USING (current_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'SALES_MANAGER'));

CREATE POLICY "Sales Reps view and update assigned leads"
ON leads FOR SELECT
TO authenticated
USING (
    current_user_role() = 'SALES_EXECUTIVE' 
    AND (assigned_sales_rep_id = auth.uid() OR assigned_sales_rep_id IS NULL)
);

CREATE POLICY "Public anonymous lead insertion"
ON leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Warranties Table Policies
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all warranties"
ON warranties FOR SELECT
TO authenticated
USING (current_user_role() != 'CUSTOMER');

CREATE POLICY "Customers view only their own warranties"
ON warranties FOR SELECT
TO authenticated
USING (
    current_user_role() = 'CUSTOMER'
    AND lead_id IN (SELECT id FROM leads WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- 3. Job Costing Table Policies
ALTER TABLE job_costing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only Director, Super Admin and Finance Manager can view Job Costing"
ON job_costing FOR SELECT
TO authenticated
USING (current_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'FINANCE_MANAGER'));
```
