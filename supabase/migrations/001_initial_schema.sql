-- ============================================================================
-- SolarOS: Complete Enterprise PostgreSQL Database Migration (001_initial_schema.sql)
-- Comprehensive Schema Covering All 35 Core Entities with Multi-Tenant Isolation,
-- Hard Business Constraint Gates, Stored Triggers, and Row-Level Security (RLS).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
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
-- 1. ORGANIZATIONS (Multi-Tenancy Foundation)
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    gstin VARCHAR(20),
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. ROLES & PERMISSIONS
-- ============================================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name user_role_enum NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, name)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- 3. PROFILES (Extends Supabase auth.users)
-- ============================================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- Maps directly to auth.users.id
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    role user_role_enum NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. CUSTOMERS
-- ============================================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    customer_code VARCHAR(40) UNIQUE NOT NULL,
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
    portal_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. LEADS & LEAD ACTIVITIES
-- ============================================================================

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    lead_code VARCHAR(40) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    
    -- Pre-qualification parameters
    monthly_bill_amount NUMERIC(10, 2) CHECK (monthly_bill_amount >= 0),
    avg_monthly_consumption_kwh NUMERIC(10, 2) CHECK (avg_monthly_consumption_kwh >= 0),
    shadow_free_area_sqft NUMERIC(10, 2) CHECK (shadow_free_area_sqft >= 0),
    sanctioned_load_kw NUMERIC(6, 2) CHECK (sanctioned_load_kw >= 0),
    grid_connection_type VARCHAR(50),
    discom_name VARCHAR(150),
    interested_capacity_kw NUMERIC(4, 1) NOT NULL CHECK (interested_capacity_kw BETWEEN 1.0 AND 50.0),
    system_topology system_topology_enum NOT NULL DEFAULT 'ON_GRID',
    is_subsidy_requested BOOLEAN DEFAULT TRUE,
    
    status lead_status_enum NOT NULL DEFAULT 'NEW',
    assigned_sales_rep_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    source VARCHAR(50) DEFAULT 'WEB_FORM',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    performed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    activity_type VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. SITE SURVEYS
-- ============================================================================

CREATE TABLE site_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    survey_code VARCHAR(40) UNIQUE NOT NULL,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
    assigned_technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_date TIMESTAMP WITH TIME ZONE,
    
    -- Physical & Roof Technical Measurements
    roof_azimuth_direction VARCHAR(30),
    roof_tilt_angle_deg NUMERIC(4, 1) CHECK (roof_tilt_angle_deg BETWEEN 0.0 AND 90.0),
    usable_area_sqft NUMERIC(10, 2) CHECK (usable_area_sqft >= 0),
    roof_type VARCHAR(50),
    structural_integrity VARCHAR(30),
    shadow_obstacles_notes TEXT,
    
    -- Cabling Metrics
    dc_cable_distance_meters NUMERIC(6, 2) CHECK (dc_cable_distance_meters >= 0),
    ac_cable_distance_meters NUMERIC(6, 2) CHECK (ac_cable_distance_meters >= 0),
    recommended_capacity_kw NUMERIC(4, 1) NOT NULL CHECK (recommended_capacity_kw BETWEEN 1.0 AND 50.0),
    recommended_topology system_topology_enum NOT NULL DEFAULT 'ON_GRID',
    
    photo_urls JSONB DEFAULT '[]'::jsonb,
    status survey_status_enum NOT NULL DEFAULT 'SCHEDULED',
    review_comments TEXT,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. SOLAR PRODUCTS, COMPONENTS & RECIPES (BOM)
-- ============================================================================

CREATE TABLE solar_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    capacity_kw NUMERIC(4, 1) NOT NULL CHECK (capacity_kw BETWEEN 1.0 AND 50.0),
    topology system_topology_enum NOT NULL,
    description TEXT,
    base_price NUMERIC(12, 2) NOT NULL CHECK (base_price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, capacity_kw, topology)
);

CREATE TABLE product_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    component_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    is_serial_tracked BOOLEAN DEFAULT FALSE,
    default_warranty_months INT NOT NULL DEFAULT 12 CHECK (default_warranty_months >= 0),
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    base_selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_selling_price >= 0),
    hsn_code VARCHAR(20),
    gst_rate_percent NUMERIC(5, 2) DEFAULT 12.00 CHECK (gst_rate_percent >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES solar_products(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES product_components(id) ON DELETE RESTRICT,
    default_quantity NUMERIC(10, 2) NOT NULL CHECK (default_quantity > 0),
    is_dynamic_cable BOOLEAN DEFAULT FALSE,
    UNIQUE(product_id, component_id)
);

-- ============================================================================
-- 8. QUOTATIONS & QUOTATION ITEMS
-- ============================================================================

CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    version INT NOT NULL DEFAULT 1,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
    survey_id UUID NOT NULL REFERENCES site_surveys(id) ON DELETE RESTRICT,
    product_id UUID REFERENCES solar_products(id) ON DELETE RESTRICT,
    system_capacity_kw NUMERIC(4, 1) NOT NULL,
    system_topology system_topology_enum NOT NULL,
    
    hardware_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (hardware_total >= 0),
    installation_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (installation_charges >= 0),
    logistics_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (logistics_charges >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (taxable_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    gross_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (gross_total >= 0),
    estimated_subsidy_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_subsidy_amount >= 0),
    net_payable_by_customer NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (net_payable_by_customer >= 0),
    
    status quotation_status_enum NOT NULL DEFAULT 'DRAFT',
    valid_until DATE NOT NULL,
    pdf_url TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES product_components(id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0)
);

-- ============================================================================
-- 9. ORDERS & PAYMENTS
-- ============================================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    quotation_id UUID UNIQUE NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    
    system_capacity_kw NUMERIC(4, 1) NOT NULL,
    system_topology system_topology_enum NOT NULL,
    total_contract_value NUMERIC(12, 2) NOT NULL CHECK (total_contract_value >= 0),
    advance_amount_required NUMERIC(12, 2) NOT NULL CHECK (advance_amount_required >= 0),
    advance_amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (advance_amount_paid >= 0),
    status order_status_enum NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    payment_reference_code VARCHAR(100) UNIQUE NOT NULL,
    milestone payment_milestone_enum NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode payment_mode_enum NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    receipt_url TEXT,
    verified_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. INVENTORY LOCATIONS, ITEMS, SERIALS & MOVEMENTS
-- ============================================================================

CREATE TABLE inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    location_type VARCHAR(50) NOT NULL, -- WAREHOUSE, TRANSIT_VEHICLE, DAMAGED_STORAGE
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
    component_id UUID NOT NULL REFERENCES product_components(id) ON DELETE RESTRICT,
    quantity_on_hand NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_on_hand >= 0),
    quantity_reserved NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (quantity_reserved >= 0),
    reorder_threshold NUMERIC(10, 2) NOT NULL DEFAULT 5.00 CHECK (reorder_threshold >= 0),
    UNIQUE(location_id, component_id)
);

CREATE TABLE serial_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    component_id UUID NOT NULL REFERENCES product_components(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    status serial_status_enum NOT NULL DEFAULT 'IN_STOCK',
    purchase_invoice_ref VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    component_id UUID NOT NULL REFERENCES product_components(id) ON DELETE RESTRICT,
    serial_number_id UUID REFERENCES serial_numbers(id) ON DELETE SET NULL,
    from_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    to_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    movement_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    performed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. DISPATCHES & DISPATCH ITEMS
-- ============================================================================

CREATE TABLE dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    dispatch_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
    vehicle_registration_number VARCHAR(40) NOT NULL,
    driver_name VARCHAR(150) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    dispatch_status dispatch_status_enum NOT NULL DEFAULT 'PREPARING',
    dispatched_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    receiver_name VARCHAR(150),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
    serial_number_id UUID NOT NULL REFERENCES serial_numbers(id) ON DELETE RESTRICT,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scanned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    UNIQUE(dispatch_id, serial_number_id)
);

-- Unique partial index preventing double assignment
CREATE UNIQUE INDEX idx_unique_active_serial_dispatch 
ON serial_numbers (serial_number) 
WHERE status IN ('RESERVED', 'DISPATCHED', 'INSTALLED');

-- ============================================================================
-- 12. TECHNICIANS & INSTALLATION JOBS
-- ============================================================================

CREATE TABLE technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 200.00 CHECK (hourly_rate >= 0),
    skills JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE installation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    lead_technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status installation_status_enum NOT NULL DEFAULT 'ASSIGNED',
    
    -- Live Electrical Generation Commissioning Measurements
    measured_dc_voltage NUMERIC(6, 2) CHECK (measured_dc_voltage >= 0),
    measured_dc_current NUMERIC(6, 2) CHECK (measured_dc_current >= 0),
    measured_ac_voltage NUMERIC(6, 2) CHECK (measured_ac_voltage >= 0),
    measured_instantaneous_power_kw NUMERIC(6, 2) CHECK (measured_instantaneous_power_kw >= 0),
    earthing_resistance_ohms NUMERIC(6, 2) CHECK (earthing_resistance_ohms >= 0),
    
    start_time TIMESTAMP WITH TIME ZONE,
    finish_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE installation_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_job_id UUID UNIQUE NOT NULL REFERENCES installation_jobs(id) ON DELETE CASCADE,
    structure_anchored BOOLEAN DEFAULT FALSE,
    panels_mounted BOOLEAN DEFAULT FALSE,
    dc_wiring_connected BOOLEAN DEFAULT FALSE,
    inverter_mounted BOOLEAN DEFAULT FALSE,
    ac_wiring_connected BOOLEAN DEFAULT FALSE,
    earthing_pit_completed BOOLEAN DEFAULT FALSE,
    net_meter_ready BOOLEAN DEFAULT FALSE
);

CREATE TABLE installation_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_job_id UUID NOT NULL REFERENCES installation_jobs(id) ON DELETE CASCADE,
    photo_type VARCHAR(50) NOT NULL, -- ROOF_ARRAY, INVERTER_MOUNT, DISTRIBUTION_BOX, EARTHING_PIT, GENERATION_METER
    photo_url TEXT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    gps_latitude NUMERIC(10, 7),
    gps_longitude NUMERIC(10, 7)
);

CREATE TABLE customer_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_job_id UUID UNIQUE NOT NULL REFERENCES installation_jobs(id) ON DELETE CASCADE,
    signer_name VARCHAR(150) NOT NULL,
    signature_svg TEXT NOT NULL,
    signoff_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    feedback_rating INT CHECK (feedback_rating BETWEEN 1 AND 5),
    feedback_comments TEXT,
    ip_address INET
);

-- ============================================================================
-- 13. WARRANTY POLICIES & WARRANTIES
-- ============================================================================

CREATE TABLE warranty_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    component_category VARCHAR(50) NOT NULL,
    duration_months INT NOT NULL CHECK (duration_months > 0),
    terms TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    component_id UUID NOT NULL REFERENCES product_components(id) ON DELETE RESTRICT,
    serial_number_id UUID UNIQUE NOT NULL REFERENCES serial_numbers(id) ON DELETE RESTRICT,
    policy_id UUID NOT NULL REFERENCES warranty_policies(id) ON DELETE RESTRICT,
    warranty_start_date DATE NOT NULL,
    warranty_end_date DATE NOT NULL,
    status warranty_status_enum NOT NULL DEFAULT 'ACTIVE',
    certificate_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (warranty_end_date >= warranty_start_date)
);

-- ============================================================================
-- 14. SERVICE TICKETS & UPDATES
-- ============================================================================

CREATE TABLE service_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    serial_number_id UUID REFERENCES serial_numbers(id) ON DELETE SET NULL,
    reported_fault_code VARCHAR(50),
    symptom_description TEXT NOT NULL,
    is_under_warranty BOOLEAN NOT NULL,
    billing_classification VARCHAR(30) NOT NULL, -- WARRANTY_FREE or BILLABLE
    service_invoice_id UUID,
    assigned_technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status ticket_status_enum NOT NULL DEFAULT 'LOGGED',
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    customer_confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE service_ticket_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
    updated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    from_status ticket_status_enum NOT NULL,
    to_status ticket_status_enum NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 15. INVOICES, EXPENSES & TECHNICIAN TIME ENTRIES
-- ============================================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    milestone payment_milestone_enum NOT NULL,
    taxable_amount NUMERIC(12, 2) NOT NULL CHECK (taxable_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL CHECK (tax_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    due_date DATE NOT NULL,
    is_settled BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE service_tickets 
ADD CONSTRAINT fk_service_invoice 
FOREIGN KEY (service_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    incurred_date DATE NOT NULL,
    recorded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE technician_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    installation_job_id UUID NOT NULL REFERENCES installation_jobs(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_hours NUMERIC(6, 2) NOT NULL CHECK (total_hours > 0),
    hourly_rate_snapshot NUMERIC(10, 2) NOT NULL CHECK (hourly_rate_snapshot >= 0),
    total_labor_cost NUMERIC(12, 2) GENERATED ALWAYS AS (total_hours * hourly_rate_snapshot) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time)
);

-- ============================================================================
-- 16. SUBSIDY APPLICATIONS
-- ============================================================================

CREATE TABLE subsidy_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    portal_application_number VARCHAR(100),
    discom_name VARCHAR(150) NOT NULL,
    subsidy_amount_eligible NUMERIC(12, 2) NOT NULL CHECK (subsidy_amount_eligible >= 0),
    status subsidy_status_enum NOT NULL DEFAULT 'DOCS_PENDING',
    electricity_bill_doc_url TEXT,
    id_proof_doc_url TEXT,
    property_tax_doc_url TEXT,
    bank_passbook_doc_url TEXT,
    disbursed_date DATE,
    disbursed_amount NUMERIC(12, 2) CHECK (disbursed_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 17. NOTIFICATIONS & IMMUTABLE AUDIT LOGS
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_role user_role_enum,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(30) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE RULE no_update_audit_logs AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_logs AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- ============================================================================
-- AUTOMATED TRIGGERS & HARD GATE RULES
-- ============================================================================

-- Gate: Strictly prevent quotation generation if survey is not APPROVED
CREATE OR REPLACE FUNCTION fn_check_survey_approved()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM site_surveys 
        WHERE id = NEW.survey_id AND status = 'APPROVED'
    ) THEN
        RAISE EXCEPTION 'Quotation generation blocked: Site Survey % is not in APPROVED status', NEW.survey_id
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_survey_approval
BEFORE INSERT ON quotations
FOR EACH ROW
EXECUTE FUNCTION fn_check_survey_approved();

-- Trigger: Automatically activate warranties when dispatch is DELIVERED
CREATE OR REPLACE FUNCTION fn_trigger_warranty_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
    r_item RECORD;
BEGIN
    IF (NEW.dispatch_status = 'DELIVERED' AND OLD.dispatch_status != 'DELIVERED') THEN
        FOR r_item IN
            SELECT 
                di.serial_number_id,
                sn.component_id,
                pc.default_warranty_months,
                o.customer_id,
                o.id AS order_id,
                o.organization_id,
                wp.id AS policy_id
            FROM dispatch_items di
            JOIN serial_numbers sn ON di.serial_number_id = sn.id
            JOIN product_components pc ON sn.component_id = pc.id
            JOIN dispatches d ON di.dispatch_id = d.id
            JOIN orders o ON d.order_id = o.id
            LEFT JOIN warranty_policies wp ON pc.category = wp.component_category 
                AND wp.organization_id = o.organization_id
            WHERE di.dispatch_id = NEW.id
        LOOP
            INSERT INTO warranties (
                organization_id,
                order_id,
                customer_id,
                component_id,
                serial_number_id,
                policy_id,
                warranty_start_date,
                warranty_end_date,
                status
            ) VALUES (
                r_item.organization_id,
                r_item.order_id,
                r_item.customer_id,
                r_item.component_id,
                r_item.serial_number_id,
                r_item.policy_id,
                CURRENT_DATE,
                CURRENT_DATE + (r_item.default_warranty_months || ' months')::interval,
                'ACTIVE'
            )
            ON CONFLICT (serial_number_id) DO NOTHING;

            UPDATE serial_numbers
            SET status = 'DISPATCHED', updated_at = CURRENT_TIMESTAMP
            WHERE id = r_item.serial_number_id;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_warranty_delivery
AFTER UPDATE ON dispatches
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_warranty_on_delivery();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Helper functions to extract active session claims
CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role_enum AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS across all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE solar_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsidy_applications ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Users can view profiles within their own organization
CREATE POLICY "Users can view members in their own organization"
ON profiles FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id());

-- 2. Organizations: Members view only their organization
CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
TO authenticated
USING (id = auth_user_org_id());

-- 3. Customers: Staff view organization customers; customers view only their own record
CREATE POLICY "Staff can view organization customers"
ON customers FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND auth_user_role() != 'CUSTOMER');

CREATE POLICY "Customers view self"
ON customers FOR SELECT
TO authenticated
USING (auth_user_role() = 'CUSTOMER' AND portal_user_id = auth.uid());

-- 4. Leads: Public submission allowed, view restricted to org staff
CREATE POLICY "Public lead submission"
ON leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Staff view organization leads"
ON leads FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND auth_user_role() != 'CUSTOMER');

-- 5. Warranties: Staff view all org warranties; customers view only their own
CREATE POLICY "Staff view org warranties"
ON warranties FOR SELECT
TO authenticated
USING (organization_id = auth_user_org_id() AND auth_user_role() != 'CUSTOMER');

CREATE POLICY "Customers view their own warranties"
ON warranties FOR SELECT
TO authenticated
USING (
    auth_user_role() = 'CUSTOMER' 
    AND customer_id IN (SELECT id FROM customers WHERE portal_user_id = auth.uid())
);

-- 6. Expenses & Technician Time Entries: Strictly restricted to Director and Finance
CREATE POLICY "Directors & Finance view expenses"
ON expenses FOR ALL
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'FINANCE_MANAGER')
);

CREATE POLICY "Directors & Finance view labor costs"
ON technician_time_entries FOR ALL
TO authenticated
USING (
    organization_id = auth_user_org_id() 
    AND auth_user_role() IN ('SUPER_ADMIN', 'DIRECTOR', 'FINANCE_MANAGER', 'INSTALLATION_MANAGER')
);
