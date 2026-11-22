// Database TypeScript Types for all 35 SolarOS Entities

export type UserRole =
  | "SUPER_ADMIN"
  | "DIRECTOR"
  | "SALES_MANAGER"
  | "SALES_EXECUTIVE"
  | "SURVEY_TECHNICIAN"
  | "WAREHOUSE_MANAGER"
  | "INSTALLATION_MANAGER"
  | "OPERATIONS_MANAGER"
  | "FIELD_TECHNICIAN"
  | "FINANCE_MANAGER"
  | "CUSTOMER";

export type SystemTopology = "ON_GRID" | "OFF_GRID" | "HYBRID";
export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "SURVEY_SCHEDULED"
  | "SURVEY_COMPLETED"
  | "QUOTED"
  | "QUOTATION_SENT"
  | "WON"
  | "CONVERTED"
  | "LOST";
export type SurveyStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "REQUIRES_REASSESSMENT";
export type SurveyOutcome = "APPROVED" | "REJECTED" | "REQUIRES_REASSESSMENT";
export type QuotationStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "REVISED";
export type OrderStatus = "CONFIRMED" | "STAGING" | "READY_FOR_DISPATCH" | "DISPATCHED" | "INSTALLATION_SCHEDULED" | "INSTALLATION_IN_PROGRESS" | "COMMISSIONED" | "COMPLETED" | "CANCELLED";
export type SerialStatus =
  | "IN_STOCK"
  | "RESERVED"
  | "DISPATCHED"
  | "INSTALLED"
  | "UNDER_REPAIR"
  | "REPLACED"
  | "RETURNED"
  | "RETIRED"
  | "DEFECTIVE";
export type DispatchStatus = "PREPARING" | "IN_TRANSIT" | "DELIVERED" | "RETURNED";
export type InstallationStatus = "ASSIGNED" | "EN_ROUTE" | "IN_PROGRESS" | "TESTING" | "REPORT_SUBMITTED" | "CUSTOMER_SIGNED" | "APPROVED";
export type WarrantyStatus = "ACTIVE" | "CLAIM_PENDING" | "EXPIRED" | "VOIDED";
export type TicketStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "AWAITING_PARTS"
  | "RESOLVED"
  | "CUSTOMER_CONFIRMATION_PENDING"
  | "CLOSED"
  | "LOGGED"
  | "TECHNICIAN_VISITED"
  | "PARTS_PENDING"
  | "CUSTOMER_CONFIRMED";
export type SubsidyStatus = "DOCS_PENDING" | "PORTAL_SUBMITTED" | "FEASIBILITY_APPROVED" | "INSPECTED" | "NET_METER_INSTALLED" | "CLAIM_LODGED" | "DISBURSED" | "REJECTED";
export type PaymentMilestone = "BOOKING_ADVANCE" | "PRE_DISPATCH" | "DELIVERY_PROGRESS" | "POST_INSTALLATION_BALANCE" | "FULL_PAYMENT" | "SERVICE_FEE";
export type PaymentMode = "BANK_TRANSFER_NEFT" | "UPI" | "CHEQUE" | "CASH" | "ONLINE_GATEWAY";

// 1. Organization
export interface Organization {
  id: string;
  name: string;
  slug: string;
  gstin?: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

// 2. Roles & Permissions
export interface Role {
  id: string;
  organization_id: string;
  name: UserRole;
  description?: string;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  module: string;
  description?: string;
}

// 3. Profiles
export interface Profile {
  id: string;
  organization_id: string;
  role_id: string;
  role: UserRole;
  email: string;
  full_name: string;
  phone_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 4. Customers
export interface Customer {
  id: string;
  organization_id: string;
  customer_code: string;
  full_name: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

// 5. Leads & Lead Activities
export interface Lead {
  id: string;
  organization_id: string;
  customer_id?: string;
  lead_code: string;
  full_name: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  monthly_bill_amount?: number;
  avg_monthly_consumption_kwh?: number;
  shadow_free_area_sqft?: number;
  roof_availability?: string;
  additional_requirements?: string;
  sanctioned_load_kw?: number;
  grid_connection_type?: string;
  discom_name?: string;
  interested_capacity_kw: number;
  system_topology: SystemTopology;
  is_subsidy_requested: boolean;
  status: LeadStatus;
  assigned_sales_rep_id?: string;
  assigned_sales_rep_name?: string;
  follow_up_date?: string;
  source: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  performed_by: string;
  performer_name?: string;
  activity_type: "CALL" | "NOTE" | "STATUS_CHANGE" | "ASSIGNMENT" | "SURVEY_SCHEDULED" | "QUOTATION_GENERATED" | "SYSTEM_AUDIT" | string;
  details: string;
  follow_up_date?: string;
  created_at: string;
}

// 6. Site Surveys
export interface SiteSurvey {
  id: string;
  organization_id: string;
  survey_code: string;
  lead_id: string;
  customer_id?: string;
  assigned_technician_id: string;
  assigned_technician_name?: string;
  scheduled_date: string;
  completed_date?: string;
  roof_area_sqft?: number;
  usable_area_sqft?: number;
  shadow_free_area_sqft?: number;
  roof_azimuth_direction?: string;
  roof_tilt_angle_deg?: number;
  roof_type?: string;
  structural_integrity?: string;
  structural_observations?: string;
  shadow_obstacles_notes?: string;
  technician_notes?: string;
  dc_cable_distance_meters?: number;
  ac_cable_distance_meters?: number;
  electrical_connection_details?: string;
  grid_suitability?: string;
  sanctioned_load_kw?: number;
  recommended_capacity_kw: number;
  recommended_topology: SystemTopology;
  photo_urls: string[];
  status: SurveyStatus;
  feasibility_status?: SurveyOutcome;
  review_comments?: string;
  reviewed_by?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  admin_override_by?: string;
  admin_override_reason?: string;
  admin_override_at?: string;
  created_at: string;
  updated_at: string;
}

// 7. Products, Components & Recipes (BOM)
export interface SolarProduct {
  id: string;
  organization_id: string;
  product_code: string;
  name: string;
  capacity_kw: number;
  topology: SystemTopology;
  description?: string;
  base_price: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductComponent {
  id: string;
  organization_id: string;
  component_code: string; // SKU
  name: string;
  category:
    | "PANEL"
    | "INVERTER"
    | "BATTERY"
    | "CHARGE_CONTROLLER"
    | "STRUCTURE"
    | "CONNECTOR"
    | "WIRING"
    | "CABLE"
    | "SWITCH"
    | "SAFETY"
    | "SERVICE";
  unit_of_measure: string;
  is_serial_tracked: boolean;
  default_warranty_months: number;
  unit_cost: number;
  base_selling_price: number;
  supplier?: string;
  supplier_name?: string;
  hsn_code?: string;
  gst_rate_percent: number;
  created_at: string;
}

export interface ProductRecipe {
  id: string;
  product_id: string;
  component_id: string;
  component_code?: string;
  component_name?: string;
  unit_of_measure?: string;
  default_quantity: number;
  quantity_rule?: "FIXED" | "PER_KW" | "PANEL_CALC" | "DYNAMIC_SURVEY" | "BATTERY_CALC" | "EARTHING_CALC";
  quantity_multiplier?: number;
  is_mandatory?: boolean;
  applicable_system_type?: SystemTopology | "ALL" | "SOLAR_PANEL_SET" | "SERVICE";
  is_dynamic_cable: boolean;
  notes?: string;
}

// 8. Quotations & Items
export interface Quotation {
  id: string;
  organization_id: string;
  quotation_number: string;
  version: number;
  parent_quotation_id?: string;
  revision_reason?: string;
  lead_id: string;
  survey_id: string;
  product_id?: string;
  system_capacity_kw: number;
  system_topology: SystemTopology;
  hardware_total: number;
  installation_charges: number;
  logistics_charges: number;
  discount_amount: number;
  taxable_amount: number;
  tax_amount: number;
  gross_total: number;
  estimated_subsidy_amount: number;
  net_payable_by_customer: number;
  status: QuotationStatus;
  valid_until: string;
  pdf_url?: string;
  customer_acceptance_token?: string;
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  inventory_availability_status?: "FULL_STOCK" | "PARTIAL_STOCK" | "OUT_OF_STOCK";
  inventory_shortages?: { componentCode: string; name: string; required: number; available: number }[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  component_id: string;
  component_code?: string;
  component_name?: string;
  unit_of_measure?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_serial_tracked?: boolean;
}

// 9. Orders & Payments
export interface Order {
  id: string;
  organization_id: string;
  order_number: string;
  quotation_id: string;
  customer_id: string;
  lead_id: string;
  idempotency_key: string;
  system_capacity_kw: number;
  system_topology: SystemTopology;
  total_contract_value: number;
  advance_amount_required: number;
  advance_amount_paid: number;
  outstanding_balance?: number;
  payment_status?: "UNPAID" | "PARTIALLY_PAID" | "PAID_IN_FULL" | "REFUNDED";
  advance_payment_percent?: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  order_id: string;
  invoice_id?: string;
  payment_reference_code: string;
  receipt_number?: string;
  idempotency_key?: string;
  milestone: PaymentMilestone;
  amount: number;
  payment_mode: PaymentMode;
  status?: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  gateway_provider?: string;
  gateway_transaction_id?: string;
  is_simulated?: boolean;
  payment_date: string;
  verified_by: string;
  created_at: string;
}

export interface Refund {
  id: string;
  organization_id: string;
  order_id: string;
  payment_id: string;
  amount: number;
  refund_reference: string;
  reason: string;
  refund_date: string;
  status: "PROCESSED" | "FAILED";
  processed_by: string;
  created_at: string;
}

// 10. Inventory, Serials & Dispatches
export interface InventoryLocation {
  id: string;
  organization_id: string;
  name: string;
  location_type: "WAREHOUSE" | "TRANSIT_VEHICLE" | "DAMAGED_STORAGE";
  address?: string;
}

export interface InventoryItem {
  id: string;
  location_id: string;
  location_name?: string;
  component_id: string;
  component_code?: string; // SKU
  component_name?: string;
  category?: string;
  supplier_name?: string;
  unit_cost?: number;
  base_selling_price?: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_threshold: number;
}

export interface SerialNumber {
  id: string;
  organization_id: string;
  component_id: string;
  component_code?: string;
  component_name?: string;
  location_id?: string;
  location_name?: string;
  serial_number: string;
  status: SerialStatus;
  supplier_name?: string;
  purchase_date?: string;
  purchase_invoice_ref?: string;
  dispatch_id?: string;
  dispatch_reference?: string;
  order_id?: string;
  order_number?: string;
  customer_id?: string;
  customer_name?: string;
  installation_id?: string;
  warranty_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  organization_id: string;
  component_id: string;
  component_code?: string;
  component_name?: string;
  serial_number_id?: string;
  serial_number?: string;
  from_location_id?: string;
  from_location_name?: string;
  to_location_id?: string;
  to_location_name?: string;
  quantity: number;
  movement_type:
    | "PURCHASE_RECEIPT"
    | "TRANSFER"
    | "RESERVATION"
    | "RELEASE_RESERVATION"
    | "DISPATCH"
    | "RETURN"
    | "ADJUSTMENT";
  reference_id?: string;
  notes?: string;
  performed_by: string;
  created_at: string;
}

export interface PickingListItem {
  component_id: string;
  component_code: string;
  component_name: string;
  category: string;
  required_quantity: number;
  reserved_quantity: number;
  scanned_serials: string[];
  unit_of_measure: string;
  is_serial_tracked: boolean;
  is_satisfied: boolean;
  available_in_stock: number;
}

export interface MaterialPickingList {
  order_id: string;
  order_number: string;
  customer_name: string;
  shipping_address: string;
  system_capacity_kw: number;
  system_topology: SystemTopology;
  items: PickingListItem[];
  all_satisfied: boolean;
  total_required_items: number;
  total_scanned_items: number;
  generated_at: string;
}

export interface DispatchItem {
  component_id: string;
  component_code: string;
  component_name: string;
  quantity: number;
  serial_numbers: string[];
}

export interface Dispatch {
  id: string;
  organization_id: string;
  dispatch_number: string;
  order_id: string;
  order_number?: string;
  customer_name?: string;
  shipping_address?: string;
  location_id: string;
  vehicle_registration_number: string;
  driver_name: string;
  driver_phone: string;
  dispatch_status: DispatchStatus;
  items?: DispatchItem[];
  scanned_serials?: string[];
  gate_pass_token?: string;
  dispatched_at?: string;
  delivered_at?: string;
  receiver_name?: string;
  created_by: string;
  created_at: string;
}

// 11. Technicians & Installation Jobs
export interface Technician {
  id: string;
  profile_id: string;
  organization_id: string;
  name?: string;
  phone?: string;
  email?: string;
  hourly_rate: number;
  skills: string[];
  certifications?: string[];
  is_available: boolean;
  availability_status?: "AVAILABLE" | "ON_JOB" | "ON_LEAVE" | "REST_DAY";
  completed_jobs_count?: number;
  customer_rating?: number;
  active_job_id?: string;
}

export interface InstallationJob {
  id: string;
  organization_id: string;
  order_id: string;
  order_number?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  lead_technician_id: string;
  team_technician_ids?: string[];
  scheduled_date?: string;
  scheduled_time_slot?: string;
  status: InstallationStatus;
  system_capacity_kw?: number;
  system_topology?: SystemTopology;
  dispatch_id?: string;
  dispatch_number?: string;
  technician_notes?: string;
  measured_dc_voltage?: number;
  measured_dc_current?: number;
  measured_ac_voltage?: number;
  measured_instantaneous_power_kw?: number;
  earthing_resistance_ohms?: number;
  start_time?: string;
  finish_time?: string;
  idempotency_key?: string;
  completion_report_url?: string;
  offline_cached?: boolean;
  rescheduled_reason?: string;
  rescheduled_by?: string;
  rescheduled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InstallationChecklist {
  id: string;
  installation_job_id: string;
  mounting_structures_fitted: boolean;
  solar_panels_installed: boolean;
  inverter_installed: boolean;
  wiring_completed: boolean;
  electrical_safety_checks_completed: boolean;
  earthing_completed: boolean;
  system_testing_performed: boolean;
  power_generation_verified: boolean;
  structure_anchored?: boolean;
  panels_mounted?: boolean;
  dc_wiring_connected?: boolean;
  inverter_mounted?: boolean;
  ac_wiring_connected?: boolean;
  earthing_pit_completed?: boolean;
  net_meter_ready?: boolean;
  updated_at?: string;
}

export interface InstallationPhoto {
  id: string;
  installation_job_id: string;
  photo_type: "ROOF_ARRAY" | "INVERTER_MOUNT" | "DISTRIBUTION_BOX" | "EARTHING_PIT" | "GENERATION_METER" | "MISC";
  photo_url: string;
  captured_at: string;
  gps_latitude?: number;
  gps_longitude?: number;
}

export interface CustomerSignature {
  id: string;
  installation_job_id: string;
  signer_name: string;
  signature_svg: string;
  signoff_timestamp: string;
  feedback_rating?: number;
  feedback_comments?: string;
  ip_address?: string;
}

// 12. Warranties & Policies
export interface WarrantyPolicy {
  id: string;
  organization_id: string;
  name: string;
  component_category: string;
  model_code?: string;
  duration_months: number;
  terms: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Warranty {
  id: string;
  organization_id: string;
  order_id: string;
  customer_id: string;
  component_id: string;
  serial_number_id: string;
  policy_id: string;
  warranty_start_date: string;
  warranty_end_date: string;
  status: WarrantyStatus;
  certificate_pdf_url?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  component_name?: string;
  component_code?: string;
  serial_number?: string;
  order_number?: string;
  duration_months?: number;
  activation_trigger?: "ON_DELIVERY" | "ON_COMMISSIONING";
  created_at: string;
  updated_at?: string;
}

// 13. Service Tickets & Updates
export interface ServiceTicket {
  id: string;
  organization_id: string;
  ticket_number: string;
  order_id: string;
  customer_id: string;
  serial_number_id?: string;
  reported_fault_code?: string;
  symptom_description: string;
  is_under_warranty: boolean;
  billing_classification: "WARRANTY_FREE" | "BILLABLE";
  service_invoice_id?: string;
  assigned_technician_id?: string;
  status: TicketStatus;
  resolution_notes?: string;
  resolved_at?: string;
  customer_confirmed_at?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  component_name?: string;
  component_code?: string;
  serial_number?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  photo_urls?: string[];
  parts_cost?: number;
  labor_cost?: number;
  total_estimate?: number;
  customer_approved_estimate?: boolean;
  customer_estimate_approved_at?: string;
  replaced_serial_number?: string;
  new_serial_number?: string;
  replacement_date?: string;
  admin_override_by?: string;
  admin_override_reason?: string;
  customer_feedback_rating?: number;
  customer_feedback_comments?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceTicketUpdate {
  id: string;
  ticket_id: string;
  updated_by: string;
  updated_by_name?: string;
  from_status: TicketStatus;
  to_status: TicketStatus;
  comment: string;
  update_type?:
    | "STATUS_CHANGE"
    | "ESTIMATE_CREATED"
    | "ESTIMATE_APPROVED"
    | "PARTS_REPLACED"
    | "RESOLVED"
    | "CUSTOMER_CONFIRMED"
    | "ADMIN_OVERRIDE"
    | "CLOSED";
  metadata?: Record<string, unknown>;
  created_at: string;
}

// 14. Invoices, Expenses & Time Entries
export interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  order_id?: string;
  customer_id: string;
  milestone: PaymentMilestone;
  taxable_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  due_date: string;
  is_settled: boolean;
  pdf_url?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  order_id?: string;
  category: "HARDWARE" | "LOGISTICS" | "LABOR" | "PERMITS" | "MISC";
  amount: number;
  description: string;
  incurred_date: string;
  recorded_by: string;
}

export interface TechnicianTimeEntry {
  id: string;
  organization_id: string;
  installation_job_id: string;
  technician_id: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  hourly_rate_snapshot: number;
  total_labor_cost: number;
}

// 15. Subsidies, Notifications & Audit Logs
export interface SubsidyApplication {
  id: string;
  organization_id: string;
  order_id: string;
  customer_id: string;
  portal_application_number?: string;
  discom_name: string;
  subsidy_amount_eligible: number;
  status: SubsidyStatus;
  electricity_bill_doc_url?: string;
  id_proof_doc_url?: string;
  property_tax_doc_url?: string;
  bank_passbook_doc_url?: string;
  disbursed_date?: string;
  disbursed_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ALERT";
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  organization_id?: string;
  performed_by?: string;
  user_role?: UserRole;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE" | "SECURITY_OVERRIDE";
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
