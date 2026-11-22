// SolarOS In-Memory Relational Data Store & Execution Engine
// Backed by initial seed dataset for SunPower Solutions (~40 installations/month, 15 technicians)

import {
  Customer,
  Lead,
  LeadActivity,
  SiteSurvey,
  SolarProduct,
  ProductComponent,
  ProductRecipe,
  Quotation,
  QuotationItem,
  Order,
  Payment,
  Refund,
  InventoryLocation,
  InventoryItem,
  SerialNumber,
  StockMovement,
  Dispatch,
  Technician,
  InstallationJob,
  InstallationChecklist,
  InstallationPhoto,
  CustomerSignature,
  TechnicianTimeEntry,
  WarrantyPolicy,
  Warranty,
  ServiceTicket,
  ServiceTicketUpdate,
  Invoice,
  Expense,
  SubsidyApplication,
  Notification,
  AuditLog,
  UserRole,
} from "@/lib/types/database";

export interface DataStore {
  customers: Customer[];
  leads: Lead[];
  leadActivities: LeadActivity[];
  surveys: SiteSurvey[];
  products: SolarProduct[];
  components: ProductComponent[];
  recipes: ProductRecipe[];
  quotations: Quotation[];
  quotationItems: QuotationItem[];
  orders: Order[];
  payments: Payment[];
  refunds: Refund[];
  locations: InventoryLocation[];
  inventoryItems: InventoryItem[];
  serialNumbers: SerialNumber[];
  stockMovements: StockMovement[];
  dispatches: Dispatch[];
  technicians: (Technician & { name: string; phone: string; email: string })[];
  installations: InstallationJob[];
  installationChecklists: InstallationChecklist[];
  installationPhotos: InstallationPhoto[];
  customerSignatures: CustomerSignature[];
  technicianTimeEntries: TechnicianTimeEntry[];
  warrantyPolicies: WarrantyPolicy[];
  warranties: Warranty[];
  serviceTickets: ServiceTicket[];
  serviceTicketUpdates: ServiceTicketUpdate[];
  invoices: Invoice[];
  expenses: Expense[];
  subsidies: SubsidyApplication[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

// Initializing Real Relational Data Set matching SunPower Solutions
function initializeStore(): DataStore {
  const orgId = "00000000-0000-0000-0000-000000000001";

  // 1. Customers
  const customers: Customer[] = [
    {
      id: "90000000-0000-0000-0000-000000000001",
      organization_id: orgId,
      customer_code: "CUST-2026-0001",
      full_name: "Simranjeet Kaur",
      phone: "+919872200001",
      email: "simranjeet.kaur@example.com",
      address: "House 142, Urban Estate Phase 2",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144002",
      created_at: "2026-10-15T10:00:00Z",
      updated_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "90000000-0000-0000-0000-000000000002",
      organization_id: orgId,
      customer_code: "CUST-2026-0002",
      full_name: "Davinder Singh",
      phone: "+919872200002",
      email: "davinder.singh@example.com",
      address: "Street 4, Model Town",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144003",
      created_at: "2026-04-10T10:00:00Z",
      updated_at: "2026-05-15T10:00:00Z",
    },
    {
      id: "90000000-0000-0000-0000-000000000003",
      organization_id: orgId,
      customer_code: "CUST-2024-0089",
      full_name: "Harpreet Bajwa",
      phone: "+919872200003",
      email: "harpreet.bajwa@example.com",
      address: "Green Avenue, Civil Lines",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144001",
      created_at: "2025-05-01T10:00:00Z",
      updated_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "90000000-0000-0000-0000-000000000004",
      organization_id: orgId,
      customer_code: "CUST-2026-0004",
      full_name: "Jaswant Rai",
      phone: "+919872200004",
      email: "jaswant.rai@example.com",
      address: "12 GT Road, Phagwara Gate",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144001",
      created_at: "2024-05-10T10:00:00Z",
      updated_at: "2026-11-18T10:00:00Z",
    },
    {
      id: "90000000-0000-0000-0000-000000000005",
      organization_id: orgId,
      customer_code: "CUST-2026-0005",
      full_name: "Gurinder Dhillon",
      phone: "+919872200005",
      email: "gurinder.dhillon@example.com",
      address: "Industrial Complex 9, Focal Point",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144004",
      created_at: "2026-11-01T10:00:00Z",
      updated_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "90000000-0000-0000-0000-000000000006",
      organization_id: orgId,
      customer_code: "CUST-2026-0006",
      full_name: "Kuldeep Chawla",
      phone: "+919872200006",
      email: "kuldeep.c@example.com",
      address: "88 Defence Colony",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144005",
      created_at: "2026-09-12T10:00:00Z",
      updated_at: "2026-11-21T10:00:00Z",
    },
  ];

  // 2. Leads (The Funnel)
  const leads: Lead[] = [
    {
      id: "70000000-0000-0000-0000-000000000001",
      organization_id: orgId,
      customer_id: customers[0].id,
      lead_code: "LED-2026-0101",
      full_name: "Simranjeet Kaur",
      phone: "+919872200001",
      address: "House 142, Urban Estate Phase 2",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144002",
      monthly_bill_amount: 4500,
      avg_monthly_consumption_kwh: 520,
      shadow_free_area_sqft: 450,
      sanctioned_load_kw: 5.0,
      grid_connection_type: "SINGLE_PHASE",
      discom_name: "PSPCL",
      interested_capacity_kw: 3.0,
      system_topology: "ON_GRID",
      is_subsidy_requested: true,
      status: "WON",
      source: "WEB_FORM",
      created_at: "2026-10-01T09:00:00Z",
      updated_at: "2026-10-15T12:00:00Z",
    },
    {
      id: "70000000-0000-0000-0000-000000000002",
      organization_id: orgId,
      customer_id: customers[4].id,
      lead_code: "LED-2026-0102",
      full_name: "Gurinder Dhillon",
      phone: "+919872200005",
      address: "Industrial Complex 9, Focal Point",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144004",
      monthly_bill_amount: 14000,
      avg_monthly_consumption_kwh: 1600,
      shadow_free_area_sqft: 900,
      sanctioned_load_kw: 10.0,
      grid_connection_type: "THREE_PHASE",
      discom_name: "PSPCL",
      interested_capacity_kw: 5.0,
      system_topology: "ON_GRID",
      is_subsidy_requested: true,
      status: "QUOTED",
      source: "WHATSAPP",
      created_at: "2026-11-05T11:00:00Z",
      updated_at: "2026-11-18T14:00:00Z",
    },
    {
      id: "70000000-0000-0000-0000-000000000003",
      organization_id: orgId,
      lead_code: "LED-2026-0103",
      full_name: "Pooja Batra",
      phone: "+919872200010",
      address: "71 Surya Enclave",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144009",
      monthly_bill_amount: 3200,
      avg_monthly_consumption_kwh: 380,
      shadow_free_area_sqft: 320,
      sanctioned_load_kw: 3.0,
      grid_connection_type: "SINGLE_PHASE",
      discom_name: "PSPCL",
      interested_capacity_kw: 2.0,
      system_topology: "ON_GRID",
      is_subsidy_requested: true,
      status: "SURVEY_SCHEDULED",
      source: "PHONE_INQUIRY",
      created_at: "2026-11-15T14:30:00Z",
      updated_at: "2026-11-19T10:00:00Z",
    },
    {
      id: "70000000-0000-0000-0000-000000000004",
      organization_id: orgId,
      lead_code: "LED-2026-0104",
      full_name: "Rameshwar Sen",
      phone: "+919872200011",
      address: "44 Cantt Road",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144005",
      monthly_bill_amount: 8500,
      avg_monthly_consumption_kwh: 980,
      shadow_free_area_sqft: 600,
      sanctioned_load_kw: 7.0,
      grid_connection_type: "THREE_PHASE",
      discom_name: "PSPCL",
      interested_capacity_kw: 3.0,
      system_topology: "OFF_GRID",
      is_subsidy_requested: false,
      status: "QUALIFIED",
      source: "WEB_FORM",
      created_at: "2026-11-18T16:00:00Z",
      updated_at: "2026-11-20T11:00:00Z",
    },
    {
      id: "70000000-0000-0000-0000-000000000005",
      organization_id: orgId,
      lead_code: "LED-2026-0105",
      full_name: "Anil Kapoor",
      phone: "+919872200012",
      address: "18 Lajpat Nagar",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144001",
      monthly_bill_amount: 2100,
      avg_monthly_consumption_kwh: 240,
      shadow_free_area_sqft: 180,
      sanctioned_load_kw: 2.0,
      grid_connection_type: "SINGLE_PHASE",
      discom_name: "PSPCL",
      interested_capacity_kw: 1.0,
      system_topology: "ON_GRID",
      is_subsidy_requested: true,
      status: "NEW",
      source: "WEB_FORM",
      created_at: "2026-11-21T08:30:00Z",
      updated_at: "2026-11-21T08:30:00Z",
    },
  ];

  // 3. Site Surveys
  const surveys: SiteSurvey[] = [
    {
      id: "60000000-0000-0000-0000-000000000001",
      organization_id: orgId,
      survey_code: "SRV-2026-0041",
      lead_id: leads[0].id,
      assigned_technician_id: "30000000-0000-0000-0000-000000000006",
      scheduled_date: "2026-10-04T10:00:00Z",
      completed_date: "2026-10-04T12:00:00Z",
      roof_azimuth_direction: "SOUTH",
      roof_tilt_angle_deg: 28.0,
      usable_area_sqft: 450,
      roof_type: "RCC_FLAT",
      structural_integrity: "EXCELLENT",
      dc_cable_distance_meters: 25.0,
      ac_cable_distance_meters: 15.0,
      recommended_capacity_kw: 3.0,
      recommended_topology: "ON_GRID",
      photo_urls: [
        "/photos/roof_array.jpg",
        "/photos/inverter.jpg",
        "/photos/dcdb.jpg",
        "/photos/earthing.jpg",
      ],
      status: "APPROVED",
      review_comments: "Excellent south-facing RCC roof with zero shadows. 3 kW system fully cleared.",
      reviewed_at: "2026-10-05T09:00:00Z",
      created_at: "2026-10-02T10:00:00Z",
      updated_at: "2026-10-05T09:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000002",
      organization_id: orgId,
      survey_code: "SRV-2026-0042",
      lead_id: leads[1].id,
      assigned_technician_id: "30000000-0000-0000-0000-000000000007",
      scheduled_date: "2026-11-08T11:00:00Z",
      completed_date: "2026-11-08T13:30:00Z",
      roof_azimuth_direction: "SOUTH_WEST",
      roof_tilt_angle_deg: 25.0,
      usable_area_sqft: 850,
      roof_type: "TIN_SHED",
      structural_integrity: "EXCELLENT",
      dc_cable_distance_meters: 40.0,
      ac_cable_distance_meters: 20.0,
      recommended_capacity_kw: 5.0,
      recommended_topology: "ON_GRID",
      photo_urls: ["/photos/roof1.jpg", "/photos/roof2.jpg", "/photos/meter.jpg", "/photos/earth.jpg"],
      status: "APPROVED",
      review_comments: "Factory shed reinforced with purlins. 5 kW three-phase cleared.",
      reviewed_at: "2026-11-09T10:00:00Z",
      created_at: "2026-11-06T10:00:00Z",
      updated_at: "2026-11-09T10:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000003",
      organization_id: orgId,
      survey_code: "SRV-2026-0043",
      lead_id: leads[2].id,
      assigned_technician_id: "30000000-0000-0000-0000-000000000006",
      scheduled_date: "2026-11-22T10:00:00Z",
      status: "SCHEDULED",
      recommended_capacity_kw: 2.0,
      recommended_topology: "ON_GRID",
      photo_urls: [],
      created_at: "2026-11-19T10:00:00Z",
      updated_at: "2026-11-19T10:00:00Z",
    },
  ];

  // 4. Products & Components
  const components: ProductComponent[] = [
    {
      id: "50000000-0000-0000-0000-000000000001",
      organization_id: orgId,
      component_code: "PV-PANEL-540W",
      name: "540W Mono-PERC Solar PV Module",
      category: "PANEL",
      unit_of_measure: "PIECE",
      is_serial_tracked: true,
      default_warranty_months: 240,
      unit_cost: 13500,
      base_selling_price: 16500,
      gst_rate_percent: 12,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000002",
      organization_id: orgId,
      component_code: "INV-1KW-OG",
      name: "1 kW Grid-Tied Inverter",
      category: "INVERTER",
      unit_of_measure: "PIECE",
      is_serial_tracked: true,
      default_warranty_months: 24,
      unit_cost: 18000,
      base_selling_price: 22000,
      gst_rate_percent: 12,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000003",
      organization_id: orgId,
      component_code: "INV-2KW-OG",
      name: "2 kW Grid-Tied Inverter",
      category: "INVERTER",
      unit_of_measure: "PIECE",
      is_serial_tracked: true,
      default_warranty_months: 24,
      unit_cost: 24000,
      base_selling_price: 29000,
      gst_rate_percent: 12,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000004",
      organization_id: orgId,
      component_code: "INV-3KW-OG",
      name: "3 kW Single-Phase Grid Inverter",
      category: "INVERTER",
      unit_of_measure: "PIECE",
      is_serial_tracked: true,
      default_warranty_months: 24,
      unit_cost: 32000,
      base_selling_price: 39000,
      gst_rate_percent: 12,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000005",
      organization_id: orgId,
      component_code: "INV-5KW-OG",
      name: "5 kW Three-Phase Grid Inverter",
      category: "INVERTER",
      unit_of_measure: "PIECE",
      is_serial_tracked: true,
      default_warranty_months: 24,
      unit_cost: 52000,
      base_selling_price: 62000,
      gst_rate_percent: 12,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000007",
      organization_id: orgId,
      component_code: "BATT-5KWH",
      name: "5.12 kWh LiFePO4 Lithium Battery Bank",
      category: "BATTERY",
      unit_of_measure: "PIECE",
      is_serial_tracked: true,
      default_warranty_months: 24,
      unit_cost: 85000,
      base_selling_price: 105000,
      gst_rate_percent: 12,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000008",
      organization_id: orgId,
      component_code: "EARTH-ROD-CHEM",
      name: "Chemical Earthing Rod Kit",
      category: "SAFETY",
      unit_of_measure: "SET",
      is_serial_tracked: false,
      default_warranty_months: 12,
      unit_cost: 1800,
      base_selling_price: 2400,
      gst_rate_percent: 12,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000010",
      organization_id: orgId,
      component_code: "STR-GI-MODULAR",
      name: "Hot Dip Galvanized Mounting Structure Module",
      category: "STRUCTURE",
      unit_of_measure: "SET",
      is_serial_tracked: false,
      default_warranty_months: 60,
      unit_cost: 4000,
      base_selling_price: 5500,
      gst_rate_percent: 18,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000011",
      organization_id: orgId,
      component_code: "CABLE-DC-4SQMM",
      name: "Solar DC Cable 4 sq mm UV-Resistant",
      category: "CABLE",
      unit_of_measure: "METER",
      is_serial_tracked: false,
      default_warranty_months: 60,
      unit_cost: 45,
      base_selling_price: 65,
      gst_rate_percent: 18,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000012",
      organization_id: orgId,
      component_code: "CABLE-AC-6SQMM",
      name: "3-Core Copper AC Cable 6 sq mm",
      category: "CABLE",
      unit_of_measure: "METER",
      is_serial_tracked: false,
      default_warranty_months: 60,
      unit_cost: 95,
      base_selling_price: 135,
      gst_rate_percent: 18,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000013",
      organization_id: orgId,
      component_code: "DCDB-1IN-1OUT",
      name: "DC Distribution Box with 1000V SPD",
      category: "SAFETY",
      unit_of_measure: "PIECE",
      is_serial_tracked: false,
      default_warranty_months: 24,
      unit_cost: 3200,
      base_selling_price: 4200,
      gst_rate_percent: 18,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000014",
      organization_id: orgId,
      component_code: "ACDB-1PH",
      name: "Single-Phase AC Distribution Box with SPD",
      category: "SAFETY",
      unit_of_measure: "PIECE",
      is_serial_tracked: false,
      default_warranty_months: 24,
      unit_cost: 2800,
      base_selling_price: 3800,
      gst_rate_percent: 18,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000020",
      organization_id: orgId,
      component_code: "SRV-INSTALL-STD",
      name: "Rooftop Mechanical & Electrical Installation Service",
      category: "SERVICE",
      unit_of_measure: "KW",
      is_serial_tracked: false,
      default_warranty_months: 12,
      unit_cost: 2500,
      base_selling_price: 4000,
      supplier_name: "SunPower Internal EPC Team",
      gst_rate_percent: 18,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000030",
      organization_id: orgId,
      component_code: "CHARGE-CTRL-60A",
      name: "MPPT Solar Charge Controller 60A 150VDC",
      category: "CHARGE_CONTROLLER",
      unit_of_measure: "PIECE",
      is_serial_tracked: true,
      default_warranty_months: 36,
      unit_cost: 7500,
      base_selling_price: 9500,
      supplier: "SmartSolar Power Systems",
      supplier_name: "SmartSolar Power Systems",
      gst_rate_percent: 18,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000031",
      organization_id: orgId,
      component_code: "MC4-CONN-PAIR",
      name: "MC4 Solar PV Connector Pair (Male/Female IP68)",
      category: "CONNECTOR",
      unit_of_measure: "SET",
      is_serial_tracked: false,
      default_warranty_months: 24,
      unit_cost: 85,
      base_selling_price: 130,
      supplier: "ConnectPro Components",
      supplier_name: "ConnectPro Components",
      gst_rate_percent: 18,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "50000000-0000-0000-0000-000000000032",
      organization_id: orgId,
      component_code: "SW-ISOLATOR-32A",
      name: "4-Pole 32A 1000V DC Rotary Isolator Switch",
      category: "SWITCH",
      unit_of_measure: "PIECE",
      is_serial_tracked: false,
      default_warranty_months: 24,
      unit_cost: 1250,
      base_selling_price: 1750,
      supplier: "SafeGrid Electric",
      supplier_name: "SafeGrid Electric",
      gst_rate_percent: 18,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  const products: SolarProduct[] = [
    {
      id: "60000000-0000-0000-0000-000000000001",
      organization_id: orgId,
      product_code: "SYS-1KW-OG",
      name: "1 kW Residential On-Grid Solar System",
      capacity_kw: 1.0,
      topology: "ON_GRID",
      base_price: 75000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000002",
      organization_id: orgId,
      product_code: "SYS-2KW-OG",
      name: "2 kW Residential On-Grid Solar System",
      capacity_kw: 2.0,
      topology: "ON_GRID",
      base_price: 135000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000003",
      organization_id: orgId,
      product_code: "SYS-3KW-OG",
      name: "3 kW Residential On-Grid Solar System",
      capacity_kw: 3.0,
      topology: "ON_GRID",
      base_price: 178000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000004",
      organization_id: orgId,
      product_code: "SYS-4KW-OG",
      name: "4 kW Residential On-Grid Solar System",
      capacity_kw: 4.0,
      topology: "ON_GRID",
      base_price: 225000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000005",
      organization_id: orgId,
      product_code: "SYS-5KW-OG",
      name: "5 kW Three-Phase On-Grid Solar System",
      capacity_kw: 5.0,
      topology: "ON_GRID",
      base_price: 280000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000006",
      organization_id: orgId,
      product_code: "SYS-1KW-OFF",
      name: "1 kW Off-Grid Solar System with Lithium BESS",
      capacity_kw: 1.0,
      topology: "OFF_GRID",
      base_price: 165000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000007",
      organization_id: orgId,
      product_code: "SYS-2KW-OFF",
      name: "2 kW Off-Grid Solar System with Lithium BESS",
      capacity_kw: 2.0,
      topology: "OFF_GRID",
      base_price: 245000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000008",
      organization_id: orgId,
      product_code: "SYS-3KW-OFF",
      name: "3 kW Off-Grid Solar System with Lithium BESS",
      capacity_kw: 3.0,
      topology: "OFF_GRID",
      base_price: 325000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000009",
      organization_id: orgId,
      product_code: "SYS-4KW-OFF",
      name: "4 kW Off-Grid Solar System with Lithium BESS",
      capacity_kw: 4.0,
      topology: "OFF_GRID",
      base_price: 410000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000010",
      organization_id: orgId,
      product_code: "SYS-5KW-OFF",
      name: "5 kW Off-Grid Solar System with High-Capacity Lithium BESS",
      capacity_kw: 5.0,
      topology: "OFF_GRID",
      base_price: 495000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000011",
      organization_id: orgId,
      product_code: "PROD-PANEL-SET-4",
      name: "Solar Panel Set (4x 540W Mono-PERC Modules)",
      capacity_kw: 2.16,
      topology: "ON_GRID",
      base_price: 66000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000012",
      organization_id: orgId,
      product_code: "PROD-PANEL-SET-8",
      name: "Solar Panel Set (8x 540W Mono-PERC Modules)",
      capacity_kw: 4.32,
      topology: "ON_GRID",
      base_price: 132000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "60000000-0000-0000-0000-000000000013",
      organization_id: orgId,
      product_code: "SRV-INSTALL-STD",
      name: "Certified Rooftop Solar Installation & Commissioning Service",
      capacity_kw: 1.0,
      topology: "ON_GRID",
      base_price: 4000,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  // Configurable Product Recipes
  const recipes: ProductRecipe[] = [
    {
      id: "rec-1",
      product_id: products[2].id, // 3kW On-Grid
      component_id: components[0].id, // 540W Panel
      component_code: "PV-PANEL-540W",
      component_name: "540W Mono-PERC Solar PV Module",
      unit_of_measure: "PIECE",
      default_quantity: 6,
      quantity_rule: "PANEL_CALC",
      is_mandatory: true,
      applicable_system_type: "ALL",
      is_dynamic_cable: false,
      notes: "Formula: ceil((3 * 1000) / 540) = 6 panels",
    },
    {
      id: "rec-2",
      product_id: products[2].id,
      component_id: components[3].id, // 3kW Inverter
      component_code: "INV-3KW-OG",
      component_name: "3 kW Single-Phase Grid Inverter",
      unit_of_measure: "PIECE",
      default_quantity: 1,
      quantity_rule: "FIXED",
      is_mandatory: true,
      applicable_system_type: "ON_GRID",
      is_dynamic_cable: false,
    },
    {
      id: "rec-3",
      product_id: products[2].id,
      component_id: components[6].id, // Structure
      component_code: "STR-GI-MODULAR",
      component_name: "Hot Dip Galvanized Mounting Structure Module",
      unit_of_measure: "SET",
      default_quantity: 3,
      quantity_rule: "PER_KW",
      quantity_multiplier: 1,
      is_mandatory: true,
      applicable_system_type: "ALL",
      is_dynamic_cable: false,
    },
    {
      id: "rec-4",
      product_id: products[2].id,
      component_id: components[7].id, // DC Cable
      component_code: "CABLE-DC-4SQMM",
      component_name: "Solar DC Cable 4 sq mm UV-Resistant",
      unit_of_measure: "METER",
      default_quantity: 46,
      quantity_rule: "DYNAMIC_SURVEY",
      is_mandatory: true,
      applicable_system_type: "ALL",
      is_dynamic_cable: true,
    },
    {
      id: "rec-5",
      product_id: products[2].id,
      component_id: components[8].id, // AC Cable
      component_code: "CABLE-AC-6SQMM",
      component_name: "3-Core Copper AC Cable 6 sq mm",
      unit_of_measure: "METER",
      default_quantity: 12,
      quantity_rule: "DYNAMIC_SURVEY",
      is_mandatory: true,
      applicable_system_type: "ALL",
      is_dynamic_cable: true,
    },
    {
      id: "rec-6",
      product_id: products[2].id,
      component_id: components[5].id, // Earthing kit
      component_code: "EARTH-ROD-CHEM",
      component_name: "Chemical Earthing Rod Kit",
      unit_of_measure: "SET",
      default_quantity: 2,
      quantity_rule: "EARTHING_CALC",
      is_mandatory: true,
      applicable_system_type: "ALL",
      is_dynamic_cable: false,
    },
    {
      id: "rec-7",
      product_id: products[7].id, // 3kW Off-Grid
      component_id: components[4].id, // Battery
      component_code: "BATT-5KWH",
      component_name: "5.12 kWh LiFePO4 Lithium Battery Bank",
      unit_of_measure: "PIECE",
      default_quantity: 1,
      quantity_rule: "BATTERY_CALC",
      is_mandatory: true,
      applicable_system_type: "OFF_GRID",
      is_dynamic_cable: false,
    },
  ];

  // 5. Quotations
  const quotations: Quotation[] = [
    {
      id: "40000000-0000-0000-0000-000000000001",
      organization_id: orgId,
      quotation_number: "QUO-2026-0041",
      version: 1,
      lead_id: leads[0].id,
      survey_id: surveys[0].id,
      product_id: products[2].id,
      system_capacity_kw: 3.0,
      system_topology: "ON_GRID",
      hardware_total: 145000,
      installation_charges: 12000,
      logistics_charges: 2500,
      discount_amount: 0,
      taxable_amount: 159500,
      tax_amount: 19140,
      gross_total: 178640,
      estimated_subsidy_amount: 78000,
      net_payable_by_customer: 100640,
      status: "ACCEPTED",
      valid_until: "2026-10-31",
      created_by: "20000000-0000-0000-0000-000000000003",
      created_at: "2026-10-06T10:00:00Z",
      updated_at: "2026-10-12T14:00:00Z",
    },
    {
      id: "40000000-0000-0000-0000-000000000002",
      organization_id: orgId,
      quotation_number: "QUO-2026-0042",
      version: 1,
      lead_id: leads[1].id,
      survey_id: surveys[1].id,
      product_id: products[4].id,
      system_capacity_kw: 5.0,
      system_topology: "ON_GRID",
      hardware_total: 232000,
      installation_charges: 20000,
      logistics_charges: 3500,
      discount_amount: 5000,
      taxable_amount: 250500,
      tax_amount: 30060,
      gross_total: 280560,
      estimated_subsidy_amount: 78000,
      net_payable_by_customer: 202560,
      status: "APPROVED",
      valid_until: "2026-11-30",
      created_by: "20000000-0000-0000-0000-000000000003",
      created_at: "2026-11-10T11:00:00Z",
      updated_at: "2026-11-12T15:00:00Z",
    },
  ];

  // 6. Orders
  const orders: Order[] = [
    {
      id: "30000000-0000-0000-0000-000000000001",
      organization_id: orgId,
      order_number: "ORD-2026-0089",
      quotation_id: quotations[0].id,
      customer_id: customers[0].id,
      lead_id: leads[0].id,
      idempotency_key: "IDEM-ORD-2026-0089",
      system_capacity_kw: 3.0,
      system_topology: "ON_GRID",
      total_contract_value: 178640,
      advance_amount_required: 35728, // 20%
      advance_amount_paid: 40000,
      status: "INSTALLATION_IN_PROGRESS",
      created_at: "2026-10-15T12:00:00Z",
      updated_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "30000000-0000-0000-0000-000000000002",
      organization_id: orgId,
      order_number: "ORD-2026-0088",
      quotation_id: "40000000-0000-0000-0000-000000000099",
      customer_id: customers[1].id,
      lead_id: "70000000-0000-0000-0000-000000000099",
      idempotency_key: "IDEM-ORD-2026-0088",
      system_capacity_kw: 3.0,
      system_topology: "ON_GRID",
      total_contract_value: 178000,
      advance_amount_required: 35600,
      advance_amount_paid: 178000, // Full payment
      status: "COMPLETED",
      created_at: "2026-04-12T10:00:00Z",
      updated_at: "2026-05-15T16:00:00Z",
    },
    {
      id: "30000000-0000-0000-0000-000000000003",
      organization_id: orgId,
      order_number: "ORD-2024-0089",
      quotation_id: "40000000-0000-0000-0000-000000000088",
      customer_id: customers[2].id,
      lead_id: "70000000-0000-0000-0000-000000000088",
      idempotency_key: "IDEM-ORD-2024-0089",
      system_capacity_kw: 3.0,
      system_topology: "ON_GRID",
      total_contract_value: 175000,
      advance_amount_required: 35000,
      advance_amount_paid: 175000,
      status: "COMPLETED",
      created_at: "2025-05-10T10:00:00Z",
      updated_at: "2025-05-25T16:00:00Z",
    },
  ];

  // 7. Payments
  const payments: Payment[] = [
    {
      id: "20000000-0000-0000-0000-000000000001",
      organization_id: orgId,
      order_id: orders[0].id,
      payment_reference_code: "UTR9948218491",
      milestone: "BOOKING_ADVANCE",
      amount: 40000,
      payment_mode: "BANK_TRANSFER_NEFT",
      payment_date: "2026-10-15T14:30:00Z",
      verified_by: "20000000-0000-0000-0000-000000000009",
      created_at: "2026-10-15T14:30:00Z",
    },
    {
      id: "20000000-0000-0000-0000-000000000002",
      organization_id: orgId,
      order_id: orders[1].id,
      payment_reference_code: "UPI88124991002",
      milestone: "BOOKING_ADVANCE",
      amount: 50000,
      payment_mode: "UPI",
      payment_date: "2026-04-12T11:00:00Z",
      verified_by: "20000000-0000-0000-0000-000000000009",
      created_at: "2026-04-12T11:00:00Z",
    },
    {
      id: "20000000-0000-0000-0000-000000000003",
      organization_id: orgId,
      order_id: orders[1].id,
      payment_reference_code: "UTR77319940122",
      milestone: "POST_INSTALLATION_BALANCE",
      amount: 128000,
      payment_mode: "BANK_TRANSFER_NEFT",
      payment_date: "2026-05-16T12:00:00Z",
      verified_by: "20000000-0000-0000-0000-000000000009",
      created_at: "2026-05-16T12:00:00Z",
    },
  ];

  // 8. Inventory Locations & Balances
  const locations: InventoryLocation[] = [
    {
      id: "10000000-0000-0000-0000-000000000001",
      organization_id: orgId,
      name: "Main Central Logistics Hub - Jalandhar",
      location_type: "WAREHOUSE",
      address: "Plot 48, Focal Point, Jalandhar",
    },
    {
      id: "10000000-0000-0000-0000-000000000002",
      organization_id: orgId,
      name: "Van Stock - Fleet Unit 01 (PB-08-AX-9912)",
      location_type: "TRANSIT_VEHICLE",
      address: "Mobile Field Unit",
    },
  ];

  const inventoryItems: InventoryItem[] = [
    {
      id: "i1",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "PV-PANEL-540W")?.id || "50000000-0000-0000-0000-000000000001",
      component_code: "PV-PANEL-540W",
      component_name: "540W Mono-PERC Solar PV Module",
      category: "PANEL",
      supplier_name: "Waaree Energies Ltd",
      unit_cost: 13500,
      base_selling_price: 16500,
      quantity_on_hand: 240,
      quantity_reserved: 36,
      reorder_threshold: 60,
    },
    {
      id: "i2",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "INV-1KW-OG")?.id || "50000000-0000-0000-0000-000000000002",
      component_code: "INV-1KW-OG",
      component_name: "1 kW Grid-Tied Inverter",
      category: "INVERTER",
      supplier_name: "Growatt New Energy",
      unit_cost: 18000,
      base_selling_price: 22000,
      quantity_on_hand: 12,
      quantity_reserved: 2,
      reorder_threshold: 5,
    },
    {
      id: "i3",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "INV-2KW-OG")?.id || "50000000-0000-0000-0000-000000000003",
      component_code: "INV-2KW-OG",
      component_name: "2 kW Grid-Tied Inverter",
      category: "INVERTER",
      supplier_name: "Growatt New Energy",
      unit_cost: 24000,
      base_selling_price: 29000,
      quantity_on_hand: 8,
      quantity_reserved: 2,
      reorder_threshold: 4,
    },
    {
      id: "i4",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "INV-3KW-OG")?.id || "50000000-0000-0000-0000-000000000004",
      component_code: "INV-3KW-OG",
      component_name: "3 kW Single-Phase Grid Inverter",
      category: "INVERTER",
      supplier_name: "Growatt New Energy",
      unit_cost: 32000,
      base_selling_price: 39000,
      quantity_on_hand: 14,
      quantity_reserved: 4,
      reorder_threshold: 5,
    },
    {
      id: "i5",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "INV-5KW-OG")?.id || "50000000-0000-0000-0000-000000000005",
      component_code: "INV-5KW-OG",
      component_name: "5 kW Three-Phase Grid Inverter",
      category: "INVERTER",
      supplier_name: "Growatt New Energy",
      unit_cost: 52000,
      base_selling_price: 62000,
      quantity_on_hand: 3, // LOW STOCK ALERT
      quantity_reserved: 2,
      reorder_threshold: 5,
    },
    {
      id: "i6",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "BATT-5KWH")?.id || "50000000-0000-0000-0000-000000000007",
      component_code: "BATT-5KWH",
      component_name: "5.12 kWh LiFePO4 Lithium Battery Bank",
      category: "BATTERY",
      supplier_name: "Exide Technologies",
      unit_cost: 85000,
      base_selling_price: 105000,
      quantity_on_hand: 2, // LOW STOCK ALERT
      quantity_reserved: 1,
      reorder_threshold: 4,
    },
    {
      id: "i7",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "EARTH-ROD-CHEM")?.id || "50000000-0000-0000-0000-000000000008",
      component_code: "EARTH-ROD-CHEM",
      component_name: "Chemical Earthing Rod Kit",
      category: "SAFETY",
      supplier_name: "TruePower Earthings",
      unit_cost: 1800,
      base_selling_price: 2400,
      quantity_on_hand: 45,
      quantity_reserved: 12,
      reorder_threshold: 20,
    },
    {
      id: "i8",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "STR-GI-MODULAR")?.id || "50000000-0000-0000-0000-000000000010",
      component_code: "STR-GI-MODULAR",
      component_name: "Hot Dip Galvanized Mounting Structure Module",
      category: "STRUCTURE",
      supplier_name: "Metalkraft Galvanizers",
      unit_cost: 4000,
      base_selling_price: 5500,
      quantity_on_hand: 50,
      quantity_reserved: 15,
      reorder_threshold: 20,
    },
    {
      id: "i9",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "CABLE-DC-4SQMM")?.id || "50000000-0000-0000-0000-000000000011",
      component_code: "CABLE-DC-4SQMM",
      component_name: "Solar DC Cable 4 sq mm UV-Resistant",
      category: "CABLE",
      supplier_name: "Polycab Wires Ltd",
      unit_cost: 45,
      base_selling_price: 65,
      quantity_on_hand: 850,
      quantity_reserved: 150,
      reorder_threshold: 200,
    },
    {
      id: "i10",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "CABLE-AC-6SQMM")?.id || "50000000-0000-0000-0000-000000000012",
      component_code: "CABLE-AC-6SQMM",
      component_name: "3-Core Copper AC Cable 6 sq mm",
      category: "CABLE",
      supplier_name: "Polycab Wires Ltd",
      unit_cost: 95,
      base_selling_price: 135,
      quantity_on_hand: 320,
      quantity_reserved: 60,
      reorder_threshold: 100,
    },
    {
      id: "i11",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "DCDB-1IN-1OUT")?.id || "50000000-0000-0000-0000-000000000013",
      component_code: "DCDB-1IN-1OUT",
      component_name: "DC Distribution Box with 1000V SPD",
      category: "SAFETY",
      supplier_name: "Havells India Ltd",
      unit_cost: 3200,
      base_selling_price: 4200,
      quantity_on_hand: 28,
      quantity_reserved: 6,
      reorder_threshold: 10,
    },
    {
      id: "i12",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "ACDB-1PH")?.id || "50000000-0000-0000-0000-000000000014",
      component_code: "ACDB-1PH",
      component_name: "Single-Phase AC Distribution Box with SPD",
      category: "SAFETY",
      supplier_name: "Havells India Ltd",
      unit_cost: 2800,
      base_selling_price: 3800,
      quantity_on_hand: 32,
      quantity_reserved: 6,
      reorder_threshold: 10,
    },
    {
      id: "i13",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "CHARGE-CTRL-60A")?.id || "50000000-0000-0000-0000-000000000030",
      component_code: "CHARGE-CTRL-60A",
      component_name: "MPPT Solar Charge Controller 60A 150VDC",
      category: "CHARGE_CONTROLLER",
      supplier_name: "SmartSolar Power Systems",
      unit_cost: 7500,
      base_selling_price: 9500,
      quantity_on_hand: 15,
      quantity_reserved: 3,
      reorder_threshold: 5,
    },
    {
      id: "i14",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "MC4-CONN-PAIR")?.id || "50000000-0000-0000-0000-000000000031",
      component_code: "MC4-CONN-PAIR",
      component_name: "MC4 Solar PV Connector Pair (Male/Female IP68)",
      category: "CONNECTOR",
      supplier_name: "ConnectPro Components",
      unit_cost: 85,
      base_selling_price: 130,
      quantity_on_hand: 500,
      quantity_reserved: 100,
      reorder_threshold: 150,
    },
    {
      id: "i15",
      location_id: locations[0].id,
      location_name: locations[0].name,
      component_id: components.find((c) => c.component_code === "SW-ISOLATOR-32A")?.id || "50000000-0000-0000-0000-000000000032",
      component_code: "SW-ISOLATOR-32A",
      component_name: "4-Pole 32A 1000V DC Rotary Isolator Switch",
      category: "SWITCH",
      supplier_name: "SafeGrid Electric",
      unit_cost: 1250,
      base_selling_price: 1750,
      quantity_on_hand: 40,
      quantity_reserved: 10,
      reorder_threshold: 15,
    },
  ];

  // 9. Serial Numbers - Covering all required lifecycle statuses
  const inv3kw = components.find((c) => c.component_code === "INV-3KW-OG") || components[2];
  const inv5kw = components.find((c) => c.component_code === "INV-5KW-OG") || components[3];
  const batt5kwh = components.find((c) => c.component_code === "BATT-5KWH") || components[4];
  const ctrl60a = components.find((c) => c.component_code === "CHARGE-CTRL-60A") || components[components.length - 3];
  const panel540 = components.find((c) => c.component_code === "PV-PANEL-540W") || components[0];

  const serialNumbers: SerialNumber[] = [
    {
      id: "s1",
      organization_id: orgId,
      component_id: inv3kw.id,
      component_code: "INV-3KW-OG",
      component_name: "3 kW Single-Phase Grid Inverter",
      location_id: locations[0].id,
      location_name: locations[0].name,
      serial_number: "INV-3KW-2026-0041",
      status: "IN_STOCK",
      supplier_name: "Growatt New Energy",
      purchase_date: "2026-10-01",
      purchase_invoice_ref: "PO-GRO-2026-901",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "s2",
      organization_id: orgId,
      component_id: inv3kw.id,
      component_code: "INV-3KW-OG",
      component_name: "3 kW Single-Phase Grid Inverter",
      location_id: locations[0].id,
      location_name: locations[0].name,
      serial_number: "INV-3KW-2026-0042",
      status: "RESERVED",
      order_id: orders[0].id,
      order_number: "ORD-2026-0089",
      customer_id: customers[0].id,
      customer_name: "Simranjeet Kaur",
      supplier_name: "Growatt New Energy",
      purchase_date: "2026-10-01",
      purchase_invoice_ref: "PO-GRO-2026-901",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-15T00:00:00Z",
    },
    {
      id: "s3",
      organization_id: orgId,
      component_id: inv3kw.id,
      component_code: "INV-3KW-OG",
      component_name: "3 kW Single-Phase Grid Inverter",
      serial_number: "INV-2024-884912",
      status: "INSTALLED",
      order_id: orders[1].id,
      order_number: "ORD-2026-0088",
      customer_id: customers[1].id,
      customer_name: "Davinder Singh",
      installation_id: "job-completed-01",
      warranty_id: "war-inv-001",
      supplier_name: "Growatt New Energy",
      purchase_date: "2025-05-01",
      purchase_invoice_ref: "PO-GRO-2024-110",
      created_at: "2025-05-01T00:00:00Z",
      updated_at: "2025-05-25T00:00:00Z",
    },
    {
      id: "s4",
      organization_id: orgId,
      component_id: inv3kw.id,
      component_code: "INV-3KW-OG",
      component_name: "3 kW Single-Phase Grid Inverter",
      serial_number: "INV-2023-112490",
      status: "INSTALLED",
      order_id: orders[2].id,
      order_number: "ORD-2024-0089",
      customer_id: customers[2].id,
      customer_name: "Harpreet Bajwa",
      installation_id: "job-completed-02",
      warranty_id: "war-inv-002",
      supplier_name: "Growatt New Energy",
      purchase_date: "2024-05-01",
      purchase_invoice_ref: "PO-GRO-2023-050",
      created_at: "2024-05-01T00:00:00Z",
      updated_at: "2024-05-20T00:00:00Z",
    },
    {
      id: "s5",
      organization_id: orgId,
      component_id: inv5kw.id,
      component_code: "INV-5KW-OG",
      component_name: "5 kW Three-Phase Grid Inverter",
      serial_number: "INV-5KW-2026-0089",
      status: "DISPATCHED",
      order_id: orders[0].id,
      order_number: "ORD-2026-0089",
      dispatch_id: "dsp1",
      dispatch_reference: "DSP-2026-0041",
      customer_id: customers[0].id,
      customer_name: "Simranjeet Kaur",
      supplier_name: "Growatt New Energy",
      purchase_date: "2026-09-15",
      purchase_invoice_ref: "PO-GRO-2026-880",
      created_at: "2026-09-15T00:00:00Z",
      updated_at: "2026-10-18T08:00:00Z",
    },
    {
      id: "s6",
      organization_id: orgId,
      component_id: batt5kwh.id,
      component_code: "BATT-5KWH",
      component_name: "5.12 kWh LiFePO4 Lithium Battery Bank",
      location_id: locations[0].id,
      location_name: "Main Warehouse - Damaged/Repair Bay",
      serial_number: "BATT-5KWH-2026-0012",
      status: "UNDER_REPAIR",
      supplier_name: "Exide Technologies",
      purchase_date: "2026-08-20",
      purchase_invoice_ref: "PO-EXI-2026-441",
      notes: "Cell voltage imbalance detected during staging. Scheduled for vendor BMS firmware flash.",
      created_at: "2026-08-20T00:00:00Z",
      updated_at: "2026-10-05T00:00:00Z",
    },
    {
      id: "s7",
      organization_id: orgId,
      component_id: inv3kw.id,
      component_code: "INV-3KW-OG",
      component_name: "3 kW Single-Phase Grid Inverter",
      serial_number: "INV-3KW-2025-0099",
      status: "REPLACED",
      order_id: orders[1].id,
      order_number: "ORD-2026-0088",
      customer_id: customers[1].id,
      customer_name: "Davinder Singh",
      supplier_name: "Growatt New Energy",
      purchase_date: "2025-04-10",
      purchase_invoice_ref: "PO-GRO-2025-101",
      notes: "Replaced under warranty service ticket SRV-2026-0014 after MPPT internal ground fault.",
      created_at: "2025-04-10T00:00:00Z",
      updated_at: "2026-05-18T00:00:00Z",
    },
    {
      id: "s8",
      organization_id: orgId,
      component_id: ctrl60a.id,
      component_code: "CHARGE-CTRL-60A",
      component_name: "MPPT Solar Charge Controller 60A 150VDC",
      location_id: locations[0].id,
      location_name: locations[0].name,
      serial_number: "CTRL-60A-2026-0055",
      status: "RETURNED",
      supplier_name: "SmartSolar Power Systems",
      purchase_date: "2026-07-15",
      purchase_invoice_ref: "PO-SMP-2026-210",
      notes: "Returned from site survey cancellation. Tested, recalibrated, and inspected by warehouse QA.",
      created_at: "2026-07-15T00:00:00Z",
      updated_at: "2026-09-10T00:00:00Z",
    },
    {
      id: "s9",
      organization_id: orgId,
      component_id: inv3kw.id,
      component_code: "INV-1KW-OG",
      component_name: "1 kW Grid-Tied Inverter",
      serial_number: "INV-1KW-2022-0010",
      status: "RETIRED",
      supplier_name: "Growatt New Energy",
      purchase_date: "2022-03-01",
      purchase_invoice_ref: "PO-GRO-2022-010",
      notes: "Decommissioned after 4 years of operational service. High capacitor degradation, retired for recycling.",
      created_at: "2022-03-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    },
    // Ready in-stock panel serials for scanning during dispatch workflows
    {
      id: "s10",
      organization_id: orgId,
      component_id: panel540.id,
      component_code: "PV-PANEL-540W",
      component_name: "540W Mono-PERC Solar PV Module",
      location_id: locations[0].id,
      location_name: locations[0].name,
      serial_number: "PV-540W-2026-0101",
      status: "IN_STOCK",
      supplier_name: "Waaree Energies Ltd",
      purchase_date: "2026-10-01",
      purchase_invoice_ref: "PO-WAR-2026-701",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "s11",
      organization_id: orgId,
      component_id: panel540.id,
      component_code: "PV-PANEL-540W",
      component_name: "540W Mono-PERC Solar PV Module",
      location_id: locations[0].id,
      location_name: locations[0].name,
      serial_number: "PV-540W-2026-0102",
      status: "IN_STOCK",
      supplier_name: "Waaree Energies Ltd",
      purchase_date: "2026-10-01",
      purchase_invoice_ref: "PO-WAR-2026-701",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "s12",
      organization_id: orgId,
      component_id: panel540.id,
      component_code: "PV-PANEL-540W",
      component_name: "540W Mono-PERC Solar PV Module",
      location_id: locations[0].id,
      location_name: locations[0].name,
      serial_number: "PV-540W-2026-0103",
      status: "IN_STOCK",
      supplier_name: "Waaree Energies Ltd",
      purchase_date: "2026-10-01",
      purchase_invoice_ref: "PO-WAR-2026-701",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "s13",
      organization_id: orgId,
      component_id: panel540.id,
      component_code: "PV-PANEL-540W",
      component_name: "540W Mono-PERC Solar PV Module",
      location_id: locations[0].id,
      location_name: locations[0].name,
      serial_number: "PV-540W-2026-0104",
      status: "IN_STOCK",
      supplier_name: "Waaree Energies Ltd",
      purchase_date: "2026-10-01",
      purchase_invoice_ref: "PO-WAR-2026-701",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "s14",
      organization_id: orgId,
      component_id: panel540.id,
      component_code: "PV-PANEL-540W",
      component_name: "540W Mono-PERC Solar PV Module",
      location_id: locations[0].id,
      location_name: locations[0].name,
      serial_number: "PV-540W-2026-0105",
      status: "IN_STOCK",
      supplier_name: "Waaree Energies Ltd",
      purchase_date: "2026-10-01",
      purchase_invoice_ref: "PO-WAR-2026-701",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "s15",
      organization_id: orgId,
      component_id: panel540.id,
      component_code: "PV-PANEL-540W",
      component_name: "540W Mono-PERC Solar PV Module",
      location_id: locations[0].id,
      location_name: locations[0].name,
      serial_number: "PV-540W-2026-0106",
      status: "IN_STOCK",
      supplier_name: "Waaree Energies Ltd",
      purchase_date: "2026-10-01",
      purchase_invoice_ref: "PO-WAR-2026-701",
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "s16",
      organization_id: orgId,
      component_id: inv3kw.id,
      component_code: "INV-3KW-OG",
      component_name: "3 kW Single-Phase Grid Inverter",
      location_id: locations[0].id,
      location_name: locations[0].name,
      serial_number: "INV-3KW-2026-0099",
      status: "IN_STOCK",
      supplier_name: "Growatt New Energy",
      purchase_date: "2026-10-15",
      purchase_invoice_ref: "PO-GRO-2026-950",
      created_at: "2026-10-15T00:00:00Z",
      updated_at: "2026-10-15T00:00:00Z",
    },
  ];

  // 10. Immutable Stock Movements History
  const stockMovements: StockMovement[] = [
    {
      id: "sm-01",
      organization_id: orgId,
      component_id: panel540.id,
      component_code: "PV-PANEL-540W",
      component_name: "540W Mono-PERC Solar PV Module",
      to_location_id: locations[0].id,
      to_location_name: locations[0].name,
      quantity: 300,
      movement_type: "PURCHASE_RECEIPT",
      reference_id: "PO-WAR-2026-701",
      notes: "Received bulk shipment from Waaree Energies Ltd under manifest TRK-8812.",
      performed_by: "20000000-0000-0000-0000-000000000004",
      created_at: "2026-10-01T09:00:00Z",
    },
    {
      id: "sm-02",
      organization_id: orgId,
      component_id: inv3kw.id,
      component_code: "INV-3KW-OG",
      component_name: "3 kW Single-Phase Grid Inverter",
      to_location_id: locations[0].id,
      to_location_name: locations[0].name,
      quantity: 20,
      movement_type: "PURCHASE_RECEIPT",
      reference_id: "PO-GRO-2026-901",
      notes: "Received batch of 20 Growatt grid-tied inverters.",
      performed_by: "20000000-0000-0000-0000-000000000004",
      created_at: "2026-10-01T10:30:00Z",
    },
    {
      id: "sm-03",
      organization_id: orgId,
      component_id: inv3kw.id,
      component_code: "INV-3KW-OG",
      component_name: "3 kW Single-Phase Grid Inverter",
      serial_number: "INV-3KW-2026-0042",
      quantity: 1,
      movement_type: "RESERVATION",
      reference_id: orders[0].id,
      notes: "Reserved 1x 3kW Inverter for Order ORD-2026-0089 (Customer: Simranjeet Kaur).",
      performed_by: "20000000-0000-0000-0000-000000000004",
      created_at: "2026-10-15T15:00:00Z",
    },
    {
      id: "sm-04",
      organization_id: orgId,
      component_id: panel540.id,
      component_code: "PV-PANEL-540W",
      component_name: "540W Mono-PERC Solar PV Module",
      quantity: 6,
      movement_type: "RESERVATION",
      reference_id: orders[0].id,
      notes: "Reserved 6x 540W Solar Modules for Order ORD-2026-0089.",
      performed_by: "20000000-0000-0000-0000-000000000004",
      created_at: "2026-10-15T15:05:00Z",
    },
    {
      id: "sm-05",
      organization_id: orgId,
      component_id: inv5kw.id,
      component_code: "INV-5KW-OG",
      component_name: "5 kW Three-Phase Grid Inverter",
      serial_number: "INV-5KW-2026-0089",
      from_location_id: locations[0].id,
      from_location_name: locations[0].name,
      quantity: 1,
      movement_type: "DISPATCH",
      reference_id: "DSP-2026-0041",
      notes: "Dispatched unit to job site in vehicle PB-08-AX-9912.",
      performed_by: "20000000-0000-0000-0000-000000000004",
      created_at: "2026-10-18T08:00:00Z",
    },
    {
      id: "sm-06",
      organization_id: orgId,
      component_id: components.find((c) => c.component_code === "EARTH-ROD-CHEM")?.id || "50000000-0000-0000-0000-000000000008",
      component_code: "EARTH-ROD-CHEM",
      component_name: "Chemical Earthing Rod Kit",
      from_location_id: locations[0].id,
      from_location_name: locations[0].name,
      to_location_id: locations[1].id,
      to_location_name: locations[1].name,
      quantity: 5,
      movement_type: "TRANSFER",
      reference_id: "TRF-2026-0012",
      notes: "Transferred 5 earthing kits to Mobile Fleet Unit 01.",
      performed_by: "20000000-0000-0000-0000-000000000004",
      created_at: "2026-10-20T08:30:00Z",
    },
  ];

  // 10. The 15 Technicians
  const technicians = [
    {
      id: "t1",
      profile_id: "30000000-0000-0000-0000-000000000001",
      organization_id: orgId,
      name: "Manpreet Singh",
      email: "manpreet.tech@sunpowersolutions.com",
      phone: "+919811100001",
      hourly_rate: 350,
      skills: ["THREE_PHASE_COMMISSIONING", "INVERTER_SYNC", "LEAD_RIGGING"],
      certifications: ["NABCEP_EQUIVALENT", "DISCOM_CERTIFIED"],
      is_available: true,
    },
    {
      id: "t2",
      profile_id: "30000000-0000-0000-0000-000000000002",
      organization_id: orgId,
      name: "Harpreet Singh",
      email: "harpreet.tech@sunpowersolutions.com",
      phone: "+919811100002",
      hourly_rate: 320,
      skills: ["OFF_GRID_BESS", "LITHIUM_SETUP", "CHARGERS"],
      certifications: ["BATTERY_SAFETY_CERT"],
      is_available: true,
    },
    {
      id: "t3",
      profile_id: "30000000-0000-0000-0000-000000000003",
      organization_id: orgId,
      name: "Rahul Kumar",
      email: "rahul.kumar@sunpowersolutions.com",
      phone: "+919811100003",
      hourly_rate: 250,
      skills: ["ROOF_ANCHORING", "GI_STANDS", "ALIGNMENT"],
      certifications: ["HEIGHT_SAFETY"],
      is_available: true,
    },
    {
      id: "t4",
      profile_id: "30000000-0000-0000-0000-000000000004",
      organization_id: orgId,
      name: "Sandeep Verma",
      email: "sandeep.verma@sunpowersolutions.com",
      phone: "+919811100004",
      hourly_rate: 280,
      skills: ["DC_CABLING", "ACDB_DCDB", "MC4_CRIMPING"],
      certifications: ["ELECTRICAL_SAFETY"],
      is_available: true,
    },
    {
      id: "t5",
      profile_id: "30000000-0000-0000-0000-000000000005",
      organization_id: orgId,
      name: "Deepak Sharma",
      email: "deepak.sharma@sunpowersolutions.com",
      phone: "+919811100005",
      hourly_rate: 260,
      skills: ["EARTHING_TEST", "LIGHTNING_ARRESTOR", "SOIL_OHMS"],
      certifications: ["EARTHING_SPECIALIST"],
      is_available: true,
    },
    {
      id: "t6",
      profile_id: "30000000-0000-0000-0000-000000000006",
      organization_id: orgId,
      name: "Ajay Yadav",
      email: "ajay.yadav@sunpowersolutions.com",
      phone: "+919811100006",
      hourly_rate: 300,
      skills: ["AZIMUTH_MAPPING", "SHADOW_ANALYSIS", "ROOF_STRUCTURAL"],
      certifications: ["SOLAR_SURVEYOR"],
      is_available: false,
    },
    {
      id: "t7",
      profile_id: "30000000-0000-0000-0000-000000000007",
      organization_id: orgId,
      name: "Sunil Joshi",
      email: "sunil.joshi@sunpowersolutions.com",
      phone: "+919811100007",
      hourly_rate: 290,
      skills: ["ROOF_STRENGTH", "ELECTRICAL_LOAD_AUDIT"],
      certifications: ["CIVIL_SAFETY"],
      is_available: true,
    },
    {
      id: "t8",
      profile_id: "30000000-0000-0000-0000-000000000008",
      organization_id: orgId,
      name: "Balwinder Singh",
      email: "balwinder.singh@sunpowersolutions.com",
      phone: "+919811100008",
      hourly_rate: 220,
      skills: ["PANEL_MOUNTING", "CONDUIT_ROUTING"],
      certifications: [],
      is_available: true,
    },
    {
      id: "t9",
      profile_id: "30000000-0000-0000-0000-000000000009",
      organization_id: orgId,
      name: "Jagdish Lal",
      email: "jagdish.lal@sunpowersolutions.com",
      phone: "+919811100009",
      hourly_rate: 220,
      skills: ["MECHANICAL_ASSEMBLY", "FASTENERS"],
      certifications: [],
      is_available: true,
    },
    {
      id: "t10",
      profile_id: "30000000-0000-0000-0000-000000000010",
      organization_id: orgId,
      name: "Rohit Mehra",
      email: "rohit.mehra@sunpowersolutions.com",
      phone: "+919811100010",
      hourly_rate: 260,
      skills: ["INVERTER_COMMISSIONING", "FIRMWARE_CONFIG"],
      certifications: [],
      is_available: true,
    },
    {
      id: "t11",
      profile_id: "30000000-0000-0000-0000-000000000011",
      organization_id: orgId,
      name: "Kamaljeet Kaur",
      email: "kamaljeet.kaur@sunpowersolutions.com",
      phone: "+919811100011",
      hourly_rate: 240,
      skills: ["MULTIMETER_TESTING", "GENERATION_AUDIT"],
      certifications: [],
      is_available: true,
    },
    {
      id: "t12",
      profile_id: "30000000-0000-0000-0000-000000000012",
      organization_id: orgId,
      name: "Pankaj Tiwari",
      email: "pankaj.tiwari@sunpowersolutions.com",
      phone: "+919811100012",
      hourly_rate: 210,
      skills: ["ARRAY_CLAMPING", "WIRE_DRESSING"],
      certifications: [],
      is_available: true,
    },
    {
      id: "t13",
      profile_id: "30000000-0000-0000-0000-000000000013",
      organization_id: orgId,
      name: "Tarun Batra",
      email: "tarun.batra@sunpowersolutions.com",
      phone: "+919811100013",
      hourly_rate: 210,
      skills: ["DC_GLANDS", "ISOLATORS"],
      certifications: [],
      is_available: true,
    },
    {
      id: "t14",
      profile_id: "30000000-0000-0000-0000-000000000014",
      organization_id: orgId,
      name: "Gurinder Pal",
      email: "gurinder.pal@sunpowersolutions.com",
      phone: "+919811100014",
      hourly_rate: 310,
      skills: ["SAFETY_AUDIT", "QUALITY_SIGN_OFF"],
      certifications: ["SAFETY_OFFICER"],
      is_available: true,
    },
    {
      id: "t15",
      profile_id: "30000000-0000-0000-0000-000000000015",
      organization_id: orgId,
      name: "Mohit Saini",
      email: "mohit.saini@sunpowersolutions.com",
      phone: "+919811100015",
      hourly_rate: 180,
      skills: ["BASIC_TOOLING", "MATERIAL_HANDLING"],
      certifications: [],
      is_available: true,
    },
  ];

  // 11. Dispatches
  const dispatches: Dispatch[] = [
    {
      id: "dsp1",
      organization_id: orgId,
      dispatch_number: "DSP-2026-0041",
      order_id: orders[0].id,
      location_id: locations[0].id,
      vehicle_registration_number: "PB-08-AX-9912",
      driver_name: "Balwant Singh",
      driver_phone: "+919876544321",
      dispatch_status: "DELIVERED",
      dispatched_at: "2026-10-18T08:00:00Z",
      delivered_at: "2026-10-18T10:30:00Z",
      receiver_name: "Simranjeet Kaur",
      created_by: "20000000-0000-0000-0000-000000000004",
      created_at: "2026-10-18T07:30:00Z",
    },
  ];

  // 12. Installations & Commissioning
  const installations: InstallationJob[] = [
    {
      id: "job1",
      organization_id: orgId,
      order_id: orders[0].id,
      order_number: orders[0].order_number,
      customer_id: customers[0].id,
      customer_name: customers[0].full_name,
      customer_phone: customers[0].phone,
      customer_address: `${customers[0].address}, ${customers[0].city}, ${customers[0].state}`,
      lead_technician_id: technicians[0].profile_id,
      team_technician_ids: [technicians[2].profile_id, technicians[3].profile_id], // Rahul & Sandeep
      scheduled_date: "2026-10-19",
      scheduled_time_slot: "09:00 - 15:00",
      status: "IN_PROGRESS",
      system_capacity_kw: orders[0].system_capacity_kw,
      system_topology: orders[0].system_topology,
      dispatch_id: "dsp1",
      dispatch_number: "DSP-2026-0041",
      technician_notes: "Array anchoring completed on RCC flat roof with chemical anchor fasteners. String inverter mounted on north shaded wall.",
      measured_dc_voltage: 245.5,
      measured_dc_current: 9.8,
      measured_ac_voltage: 232.0,
      measured_instantaneous_power_kw: 2.25,
      earthing_resistance_ohms: 2.1,
      start_time: "2026-10-19T09:00:00Z",
      created_at: "2026-10-18T11:00:00Z",
      updated_at: "2026-10-19T14:00:00Z",
    },
    {
      id: "job2",
      organization_id: orgId,
      order_id: orders[1].id,
      order_number: orders[1].order_number,
      customer_id: customers[1].id,
      customer_name: customers[1].full_name,
      customer_phone: customers[1].phone,
      customer_address: `${customers[1].address}, ${customers[1].city}, ${customers[1].state}`,
      lead_technician_id: technicians[0].profile_id,
      team_technician_ids: [technicians[1].profile_id],
      scheduled_date: "2026-05-14",
      scheduled_time_slot: "08:30 - 16:00",
      status: "APPROVED",
      system_capacity_kw: orders[1].system_capacity_kw,
      system_topology: orders[1].system_topology,
      technician_notes: "Full 3kW On-Grid commissioned. Bidirectional net meter synchronized with PSPCL sub-station.",
      measured_dc_voltage: 260.0,
      measured_dc_current: 11.2,
      measured_ac_voltage: 235.0,
      measured_instantaneous_power_kw: 2.85,
      earthing_resistance_ohms: 1.8,
      start_time: "2026-05-14T08:30:00Z",
      finish_time: "2026-05-15T15:00:00Z",
      created_at: "2026-05-10T11:00:00Z",
      updated_at: "2026-05-15T16:00:00Z",
    },
  ];

  const installationChecklists: InstallationChecklist[] = [
    {
      id: "chk-job1",
      installation_job_id: "job1",
      mounting_structures_fitted: true,
      solar_panels_installed: true,
      inverter_installed: true,
      wiring_completed: true,
      electrical_safety_checks_completed: false,
      earthing_completed: true,
      system_testing_performed: false,
      power_generation_verified: false,
      structure_anchored: true,
      panels_mounted: true,
      dc_wiring_connected: true,
      inverter_mounted: true,
      ac_wiring_connected: true,
      earthing_pit_completed: true,
      net_meter_ready: false,
      updated_at: "2026-10-19T13:30:00Z",
    },
    {
      id: "chk-job2",
      installation_job_id: "job2",
      mounting_structures_fitted: true,
      solar_panels_installed: true,
      inverter_installed: true,
      wiring_completed: true,
      electrical_safety_checks_completed: true,
      earthing_completed: true,
      system_testing_performed: true,
      power_generation_verified: true,
      structure_anchored: true,
      panels_mounted: true,
      dc_wiring_connected: true,
      inverter_mounted: true,
      ac_wiring_connected: true,
      earthing_pit_completed: true,
      net_meter_ready: true,
      updated_at: "2026-05-15T14:45:00Z",
    },
  ];

  const installationPhotos: InstallationPhoto[] = [
    {
      id: "pho-1",
      installation_job_id: "job1",
      photo_type: "ROOF_ARRAY",
      photo_url: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800",
      captured_at: "2026-10-19T10:15:00Z",
      gps_latitude: 31.326,
      gps_longitude: 75.5762,
    },
    {
      id: "pho-2",
      installation_job_id: "job1",
      photo_type: "INVERTER_MOUNT",
      photo_url: "https://images.unsplash.com/photo-1548337138-e87d889cc369?w=800",
      captured_at: "2026-10-19T11:45:00Z",
      gps_latitude: 31.326,
      gps_longitude: 75.5762,
    },
    {
      id: "pho-3",
      installation_job_id: "job1",
      photo_type: "EARTHING_PIT",
      photo_url: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800",
      captured_at: "2026-10-19T12:30:00Z",
      gps_latitude: 31.326,
      gps_longitude: 75.5762,
    },
  ];

  const customerSignatures: CustomerSignature[] = [
    {
      id: "sig-job2",
      installation_job_id: "job2",
      signer_name: "Davinder Singh",
      signature_svg: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M 10 30 Q 50 10 90 30 T 170 30' stroke='black' fill='transparent'/></svg>",
      signoff_timestamp: "2026-05-15T15:00:00Z",
      feedback_rating: 5,
      feedback_comments: "Excellent professional installation. Clean wiring and clean roof site.",
    },
  ];

  const technicianTimeEntries: TechnicianTimeEntry[] = [
    {
      id: "time-1",
      organization_id: orgId,
      installation_job_id: "job1",
      technician_id: technicians[0].id,
      start_time: "2026-10-19T09:00:00Z",
      end_time: "2026-10-19T14:00:00Z",
      total_hours: 5,
      hourly_rate_snapshot: 350,
      total_labor_cost: 1750,
    },
    {
      id: "time-2",
      organization_id: orgId,
      installation_job_id: "job2",
      technician_id: technicians[0].id,
      start_time: "2026-05-14T08:30:00Z",
      end_time: "2026-05-15T15:00:00Z",
      total_hours: 14.5,
      hourly_rate_snapshot: 350,
      total_labor_cost: 5075,
    },
  ];

  // 12. Warranty Policies
  const warrantyPolicies: WarrantyPolicy[] = [
    {
      id: "40000000-0000-0000-0000-000000000001",
      organization_id: orgId,
      name: "Tier-1 Mono PERC Solar PV Performance Warranty",
      component_category: "PANEL",
      duration_months: 240, // 20 years
      terms:
        "Guaranteed 80% linear power output at 20 years. Covers cell degradation, busbar micro-cracks, and junction box defects. ₹0.00 customer payable for approved claims.",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "40000000-0000-0000-0000-000000000002",
      organization_id: orgId,
      name: "Grid-Tied & Hybrid Inverter Full Replacement Warranty",
      component_category: "INVERTER",
      duration_months: 24, // 2 years
      terms:
        "Full replacement or OEM board repair for IGBT power stage failure, MPPT tracker faults, and monsoon grid overvoltage breakdown. Free labor and parts (₹0.00 customer cost).",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "40000000-0000-0000-0000-000000000003",
      organization_id: orgId,
      name: "LiFePO4 Lithium Battery Bank Cycle & Capacity Warranty",
      component_category: "BATTERY",
      duration_months: 24, // 2 years
      terms:
        "3000 cycles at 80% DoD or 2 years replacement warranty. Covers BMS circuitry breakdown and cell balance failure. ₹0.00 customer payable.",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "40000000-0000-0000-0000-000000000004",
      organization_id: orgId,
      name: "MPPT Solar Charge Controller Limited Warranty",
      component_category: "CHARGE_CONTROLLER",
      duration_months: 36, // 3 years
      terms: "Covers buck converter switching failures and digital display controller faults.",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "40000000-0000-0000-0000-000000000005",
      organization_id: orgId,
      name: "Galvanized High-Wind Mounting Structure Anti-Corrosion Warranty",
      component_category: "STRUCTURE",
      duration_months: 60, // 5 years
      terms: "Anti-rust and structural integrity guarantee under 150 km/h wind loads.",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
    },
  ];

  // 13. Warranties
  const warranties: Warranty[] = [
    {
      id: "w1",
      organization_id: orgId,
      order_id: orders[1].id,
      order_number: orders[1].order_number,
      customer_id: customers[1].id,
      customer_name: customers[1].full_name,
      customer_phone: customers[1].phone,
      customer_email: customers[1].email,
      component_id: components[2].id,
      component_name: "3 kW Single-Phase Grid Inverter",
      component_code: "INV-3KW-OG",
      serial_number_id: "s3",
      serial_number: "INV-2024-884912",
      policy_id: "40000000-0000-0000-0000-000000000002",
      warranty_start_date: "2025-05-15",
      warranty_end_date: "2027-05-15",
      duration_months: 24,
      status: "ACTIVE",
      activation_trigger: "ON_COMMISSIONING",
      certificate_pdf_url: "/api/warranties/cert-w1.pdf",
      created_at: "2025-05-15T16:00:00Z",
    },
    {
      id: "w2",
      organization_id: orgId,
      order_id: orders[1].id,
      order_number: orders[1].order_number,
      customer_id: customers[1].id,
      customer_name: customers[1].full_name,
      customer_phone: customers[1].phone,
      customer_email: customers[1].email,
      component_id: components[0].id,
      component_name: "540W Mono PERC Solar PV Module",
      component_code: "PV-PANEL-540W",
      serial_number_id: "s1",
      serial_number: "INV-3KW-2026-0041",
      policy_id: "40000000-0000-0000-0000-000000000001",
      warranty_start_date: "2024-05-15",
      warranty_end_date: "2044-05-15",
      duration_months: 240,
      status: "ACTIVE",
      activation_trigger: "ON_COMMISSIONING",
      certificate_pdf_url: "/api/warranties/cert-w2.pdf",
      created_at: "2024-05-15T16:00:00Z",
    },
    {
      id: "w3",
      organization_id: orgId,
      order_id: orders[2].id,
      order_number: orders[2].order_number,
      customer_id: customers[2].id,
      customer_name: customers[2].full_name,
      customer_phone: customers[2].phone,
      customer_email: customers[2].email,
      component_id: components[2].id,
      component_name: "3 kW Single-Phase Grid Inverter",
      component_code: "INV-3KW-OG",
      serial_number_id: "s3",
      serial_number: "INV-2024-884912",
      policy_id: "40000000-0000-0000-0000-000000000002",
      warranty_start_date: "2025-05-20",
      warranty_end_date: "2027-05-20",
      duration_months: 24,
      status: "ACTIVE",
      activation_trigger: "ON_COMMISSIONING",
      certificate_pdf_url: "/api/warranties/cert-w3.pdf",
      created_at: "2025-05-20T16:00:00Z",
    },
    {
      id: "w-exp-01",
      organization_id: orgId,
      order_id: orders[2].id,
      order_number: orders[2].order_number,
      customer_id: customers[2].id,
      customer_name: customers[2].full_name,
      customer_phone: customers[2].phone,
      customer_email: customers[2].email,
      component_id: components[2].id,
      component_name: "3 kW Single-Phase Grid Inverter",
      component_code: "INV-3KW-OG",
      serial_number_id: "s4",
      serial_number: "INV-2023-112490",
      policy_id: "40000000-0000-0000-0000-000000000002",
      warranty_start_date: "2024-05-01",
      warranty_end_date: "2026-05-01", // Expired
      duration_months: 24,
      status: "EXPIRED",
      activation_trigger: "ON_DELIVERY",
      certificate_pdf_url: "/api/warranties/cert-w-exp-01.pdf",
      created_at: "2024-05-01T16:00:00Z",
    },
  ];

  // 14. Service Tickets
  const serviceTickets: ServiceTicket[] = [
    {
      id: "st1",
      organization_id: orgId,
      ticket_number: "TKT-2026-0012",
      order_id: orders[2].id,
      customer_id: customers[2].id,
      customer_name: customers[2].full_name,
      customer_phone: customers[2].phone,
      customer_email: customers[2].email,
      serial_number_id: "s3",
      serial_number: "INV-2024-884912",
      component_name: "3 kW Single-Phase Grid Inverter",
      component_code: "INV-3KW-OG",
      reported_fault_code: "E04",
      symptom_description:
        "Heavy monsoon rain; inverter displaying error code E04 (Grid Overvoltage) with zero power generation.",
      is_under_warranty: true,
      billing_classification: "WARRANTY_FREE",
      priority: "HIGH",
      assigned_technician_id: technicians[0].profile_id,
      status: "ASSIGNED",
      created_at: "2026-11-20T08:00:00Z",
      updated_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "st2",
      organization_id: orgId,
      ticket_number: "TKT-2026-0011",
      order_id: orders[1].id,
      customer_id: customers[1].id,
      customer_name: customers[1].full_name,
      customer_phone: customers[1].phone,
      customer_email: customers[1].email,
      serial_number_id: "s3",
      serial_number: "INV-2024-884912",
      component_name: "3 kW Single-Phase Grid Inverter",
      component_code: "INV-3KW-OG",
      reported_fault_code: "INFO_AC_DRIFT",
      symptom_description: "Routine 6-month preventive maintenance inspection and terminal torque check.",
      is_under_warranty: true,
      billing_classification: "WARRANTY_FREE",
      priority: "LOW",
      assigned_technician_id: technicians[3].profile_id,
      status: "RESOLVED",
      resolution_notes: "Cleaned DC isolator terminals, verified 232V AC voltage and 2.8kW generation.",
      resolved_at: "2026-11-18T16:00:00Z",
      customer_confirmed_at: "2026-11-19T09:00:00Z",
      created_at: "2026-11-17T09:00:00Z",
      updated_at: "2026-11-19T09:00:00Z",
    },
    {
      id: "st3",
      organization_id: orgId,
      ticket_number: "TKT-2026-0010",
      order_id: orders[2].id,
      customer_id: customers[2].id,
      customer_name: customers[2].full_name,
      customer_phone: customers[2].phone,
      customer_email: customers[2].email,
      serial_number_id: "s4",
      serial_number: "INV-2023-112490",
      component_name: "3 kW Single-Phase Grid Inverter",
      component_code: "INV-3KW-OG",
      reported_fault_code: "E08",
      symptom_description: "Inverter overheating and shutting down daily at peak noon generation.",
      is_under_warranty: false,
      billing_classification: "BILLABLE",
      priority: "MEDIUM",
      parts_cost: 4500,
      labor_cost: 1500,
      total_estimate: 6000,
      customer_approved_estimate: true,
      customer_estimate_approved_at: "2026-11-15T11:00:00Z",
      assigned_technician_id: technicians[1].profile_id,
      status: "IN_PROGRESS",
      created_at: "2026-11-14T09:00:00Z",
      updated_at: "2026-11-15T11:30:00Z",
    },
  ];

  // 15. Service Ticket Updates (Repair History Ledger)
  const serviceTicketUpdates: ServiceTicketUpdate[] = [
    {
      id: "stu-1",
      ticket_id: "st1",
      updated_by: "system",
      updated_by_name: "SunPower Automated Triage",
      from_status: "OPEN",
      to_status: "OPEN",
      comment: "Breakdown logged by customer. Fault code E04 detected. Warranty Engine confirmed active coverage (₹0.00 Free).",
      update_type: "STATUS_CHANGE",
      created_at: "2026-11-20T08:00:00Z",
    },
    {
      id: "stu-2",
      ticket_id: "st1",
      updated_by: "u-dispatch-mgr",
      updated_by_name: "Rajesh Sharma (Lead Dispatcher)",
      from_status: "OPEN",
      to_status: "ASSIGNED",
      comment: "Assigned lead technician Amit Kumar for on-site diagnostic and lightning surge evaluation.",
      update_type: "STATUS_CHANGE",
      created_at: "2026-11-20T10:00:00Z",
    },
    {
      id: "stu-3",
      ticket_id: "st2",
      updated_by: "system",
      updated_by_name: "SunPower Automated Triage",
      from_status: "OPEN",
      to_status: "OPEN",
      comment: "Routine preventive maintenance inspection scheduled.",
      update_type: "STATUS_CHANGE",
      created_at: "2026-11-17T09:00:00Z",
    },
    {
      id: "stu-4",
      ticket_id: "st2",
      updated_by: "u-tech-4",
      updated_by_name: "Manoj Kumar (Technician)",
      from_status: "IN_PROGRESS",
      to_status: "RESOLVED",
      comment: "Cleaned DC isolator terminals, verified 232V AC voltage and 2.8kW generation.",
      update_type: "RESOLVED",
      created_at: "2026-11-18T16:00:00Z",
    },
    {
      id: "stu-5",
      ticket_id: "st2",
      updated_by: "cust-2",
      updated_by_name: "Vikram Malhotra (Customer)",
      from_status: "RESOLVED",
      to_status: "CUSTOMER_CONFIRMED",
      comment: "Customer confirmed power generation restored via SMS OTP acknowledgment.",
      update_type: "CUSTOMER_CONFIRMED",
      created_at: "2026-11-19T09:00:00Z",
    },
  ];

  // 15. Invoices & Expenses
  const invoices: Invoice[] = [
    {
      id: "inv1",
      organization_id: orgId,
      invoice_number: "INV-2026-0089",
      order_id: orders[0].id,
      customer_id: customers[0].id,
      milestone: "BOOKING_ADVANCE",
      taxable_amount: 35714.28,
      tax_amount: 4285.72,
      total_amount: 40000,
      amount_paid: 40000,
      due_date: "2026-10-20",
      is_settled: true,
      created_at: "2026-10-15T12:00:00Z",
    },
    {
      id: "inv2",
      organization_id: orgId,
      invoice_number: "INV-2026-0088",
      order_id: orders[1].id,
      customer_id: customers[1].id,
      milestone: "POST_INSTALLATION_BALANCE",
      taxable_amount: 114285.71,
      tax_amount: 13714.29,
      total_amount: 128000,
      amount_paid: 128000,
      due_date: "2026-05-20",
      is_settled: true,
      created_at: "2026-05-16T12:00:00Z",
    },
  ];

  const expenses: Expense[] = [
    {
      id: "e1",
      organization_id: orgId,
      order_id: orders[0].id,
      category: "HARDWARE",
      amount: 112000,
      description: "Warehouse stock withdrawal for 3 kW On-Grid installation (ORD-2026-0089)",
      incurred_date: "2026-10-18",
      recorded_by: "20000000-0000-0000-0000-000000000004",
    },
    {
      id: "e2",
      organization_id: orgId,
      order_id: orders[0].id,
      category: "LOGISTICS",
      amount: 2500,
      description: "Truck transit fuel and driver surcharge for PB-08-AX-9912",
      incurred_date: "2026-10-18",
      recorded_by: "20000000-0000-0000-0000-000000000004",
    },
    {
      id: "e3",
      organization_id: orgId,
      category: "MISC",
      amount: 8500,
      description: "Discom net meter processing & safety test fee",
      incurred_date: "2026-11-02",
      recorded_by: "20000000-0000-0000-0000-000000000009",
    },
  ];

  // 16. Subsidies
  const subsidies: SubsidyApplication[] = [
    {
      id: "sub1",
      organization_id: orgId,
      order_id: orders[1].id,
      customer_id: customers[1].id,
      portal_application_number: "PMSGY-PB-2024-88912",
      discom_name: "PSPCL",
      subsidy_amount_eligible: 78000,
      status: "NET_METER_INSTALLED",
      created_at: "2026-05-20T10:00:00Z",
      updated_at: "2026-11-15T12:00:00Z",
    },
    {
      id: "sub2",
      organization_id: orgId,
      order_id: orders[0].id,
      customer_id: customers[0].id,
      portal_application_number: "PMSGY-PB-2026-00412",
      discom_name: "PSPCL",
      subsidy_amount_eligible: 78000,
      status: "FEASIBILITY_APPROVED",
      created_at: "2026-10-20T10:00:00Z",
      updated_at: "2026-11-10T12:00:00Z",
    },
  ];

  // 17. Notifications
  const notifications: Notification[] = [
    {
      id: "n1",
      user_id: "20000000-0000-0000-0000-000000000002",
      title: "New Rooftop Inquiry Received",
      message: "Anil Kapoor requested a 1 kW system online for Lajpat Nagar.",
      type: "INFO",
      is_read: false,
      action_url: "/leads",
      created_at: "2026-11-21T08:30:00Z",
    },
    {
      id: "n2",
      user_id: "20000000-0000-0000-0000-000000000001",
      title: "Low Stock Alert: 5kW Inverters",
      message: "Only 3 units remaining in Main Warehouse (threshold is 5).",
      type: "WARNING",
      is_read: false,
      action_url: "/inventory",
      created_at: "2026-11-21T09:00:00Z",
    },
    {
      id: "n3",
      user_id: "20000000-0000-0000-0000-000000000007",
      title: "Warranty Inverter Fault Logged",
      message: "Harpreet Bajwa reported fault code E04. Covered under ₹0 warranty.",
      type: "ALERT",
      is_read: false,
      action_url: "/tickets",
      created_at: "2026-11-20T08:15:00Z",
    },
  ];

  // 18. Lead Activities
  const leadActivities: LeadActivity[] = [
    {
      id: "act-1",
      lead_id: leads[0].id,
      activity_type: "SYSTEM_AUDIT",
      performed_by: "system",
      performer_name: "Web Portal",
      details: "Inquiry registered for 3 kW On-Grid system.",
      created_at: "2026-10-01T09:00:00Z",
    },
    {
      id: "act-2",
      lead_id: leads[0].id,
      activity_type: "ASSIGNMENT",
      performed_by: "20000000-0000-0000-0000-000000000002",
      performer_name: "Amit Sharma (Sales Lead)",
      details: "Assigned account to Amit Sharma for technical qualification.",
      follow_up_date: "2026-10-05",
      created_at: "2026-10-02T10:00:00Z",
    },
    {
      id: "act-3",
      lead_id: leads[0].id,
      activity_type: "CALL",
      performed_by: "20000000-0000-0000-0000-000000000002",
      performer_name: "Amit Sharma",
      details: "Homeowner confirmed monthly electricity bill of ₹4,500. Requested PM Surya Ghar subsidy details.",
      created_at: "2026-10-03T11:30:00Z",
    },
    {
      id: "act-4",
      lead_id: leads[0].id,
      activity_type: "SURVEY_SCHEDULED",
      performed_by: "20000000-0000-0000-0000-000000000002",
      performer_name: "Amit Sharma",
      details: "Site survey scheduled with technician Manpreet Singh.",
      created_at: "2026-10-06T14:00:00Z",
    },
    {
      id: "act-5",
      lead_id: leads[4].id,
      activity_type: "SYSTEM_AUDIT",
      performed_by: "system",
      performer_name: "Public Enquiry Form",
      details: "Public enquiry registered for 1 kW On-Grid rooftop.",
      created_at: "2026-11-21T08:30:00Z",
    },
  ];

  // 19. Audit Logs
  const auditLogs: AuditLog[] = [
    {
      id: 1,
      organization_id: orgId,
      performed_by: "20000000-0000-0000-0000-000000000001",
      user_role: "DIRECTOR",
      table_name: "quotations",
      record_id: quotations[0]?.id || "q1",
      action: "INSERT",
      new_data: { quotation_number: "QT-2026-0001", margin: 27.8 },
      created_at: "2026-10-14T11:00:00Z",
    },
    {
      id: 2,
      organization_id: orgId,
      performed_by: "20000000-0000-0000-0000-000000000006",
      user_role: "SURVEY_TECHNICIAN",
      table_name: "site_surveys",
      record_id: surveys[0]?.id || "srv1",
      action: "UPDATE",
      new_data: { status: "APPROVED", cable_distance: 18 },
      created_at: "2026-10-10T15:30:00Z",
    },
  ];

  return {
    customers,
    leads,
    leadActivities,
    surveys,
    products,
    components,
    recipes,
    quotations,
    quotationItems: [],
    orders,
    payments,
    refunds: [],
    locations,
    inventoryItems,
    serialNumbers,
    stockMovements,
    dispatches,
    technicians,
    installations,
    installationChecklists,
    installationPhotos,
    customerSignatures,
    technicianTimeEntries,
    warrantyPolicies,
    warranties,
    serviceTickets,
    serviceTicketUpdates,
    invoices,
    expenses,
    subsidies,
    notifications,
    auditLogs,
  };
}

// Global persistent instance for this application process
declare global {
  var __solaros_store: DataStore | undefined;
}

export function getStore(): DataStore {
  if (!globalThis.__solaros_store) {
    globalThis.__solaros_store = initializeStore();
  }
  return globalThis.__solaros_store;
}

export function resetStore(): DataStore {
  globalThis.__solaros_store = initializeStore();
  return globalThis.__solaros_store;
}

// ==========================================
// WORKFLOW MUTATIONS (SINGLE SOURCE OF TRUTH)
// ==========================================

export function addLeadActivity(
  leadId: string,
  activityType: LeadActivity["activity_type"],
  details: string,
  performedBy: string = "system",
  performerName: string = "Sales Rep",
  followUpDate?: string
): LeadActivity {
  const store = getStore();
  const activity: LeadActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    lead_id: leadId,
    activity_type: activityType,
    details,
    performed_by: performedBy,
    performer_name: performerName,
    follow_up_date: followUpDate,
    created_at: new Date().toISOString(),
  };
  store.leadActivities.unshift(activity);
  return activity;
}

export function assignSalesperson(
  leadId: string,
  repId: string,
  repName: string,
  followUpDate?: string,
  notes?: string,
  performedBy: string = "system"
): Lead {
  const store = getStore();
  const lead = store.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error(`Lead with ID '${leadId}' not found.`);

  lead.assigned_sales_rep_id = repId;
  lead.assigned_sales_rep_name = repName;
  if (followUpDate) lead.follow_up_date = followUpDate;
  if (notes) lead.notes = notes;
  if (lead.status === "NEW") {
    lead.status = "CONTACTED";
  }
  lead.updated_at = new Date().toISOString();

  addLeadActivity(
    leadId,
    "ASSIGNMENT",
    `Assigned to salesperson ${repName}.${followUpDate ? ` Scheduled follow-up on ${followUpDate}.` : ""}${notes ? ` Notes: ${notes}` : ""}`,
    performedBy,
    repName,
    followUpDate
  );

  addAuditLogEntry({
    performed_by: performedBy,
    user_role: "SALES_MANAGER",
    table_name: "leads",
    record_id: leadId,
    action: "UPDATE",
    new_data: { assigned_sales_rep_id: repId, repName, followUpDate },
  });

  return lead;
}

export function scheduleLeadFollowUp(
  leadId: string,
  followUpDate: string,
  notes: string,
  performedBy: string = "system",
  performerName: string = "Sales Rep"
): Lead {
  const store = getStore();
  const lead = store.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error(`Lead with ID '${leadId}' not found.`);

  lead.follow_up_date = followUpDate;
  lead.notes = notes;
  lead.updated_at = new Date().toISOString();

  addLeadActivity(
    leadId,
    "NOTE",
    `Follow-up scheduled for ${followUpDate}: ${notes}`,
    performedBy,
    performerName,
    followUpDate
  );

  return lead;
}

export function updateLeadStatus(
  leadId: string,
  newStatus: Lead["status"],
  performedBy: string = "system",
  performerName: string = "Staff",
  reason?: string
): Lead {
  const store = getStore();
  const lead = store.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error(`Lead with ID '${leadId}' not found.`);

  const oldStatus = lead.status;
  lead.status = newStatus;
  lead.updated_at = new Date().toISOString();

  addLeadActivity(
    leadId,
    "STATUS_CHANGE",
    `Lead status changed from ${oldStatus} to ${newStatus}.${reason ? ` Reason: ${reason}` : ""}`,
    performedBy,
    performerName
  );

  addAuditLogEntry({
    performed_by: performedBy,
    user_role: "SALES_EXECUTIVE",
    table_name: "leads",
    record_id: leadId,
    action: "UPDATE",
    old_data: { status: oldStatus },
    new_data: { status: newStatus, reason },
  });

  return lead;
}

export function scheduleSurvey(
  leadId: string,
  assignedTechnicianId: string,
  technicianNameOrDate: string = "Technician",
  dateOrNotes?: string,
  notesParam?: string,
  performedBy: string = "system",
  performerName: string = "Staff"
): SiteSurvey {
  const store = getStore();
  const lead = store.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error(`Lead with ID '${leadId}' not found.`);

  let assignedTechnicianName = technicianNameOrDate;
  let scheduledDate = dateOrNotes || new Date().toISOString();
  let notes = notesParam;

  // Handle flexible signature if 3rd argument is an ISO date string
  if (technicianNameOrDate.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(technicianNameOrDate)) {
    scheduledDate = technicianNameOrDate;
    notes = dateOrNotes;
    const tech = store.technicians.find((t) => t.id === assignedTechnicianId);
    assignedTechnicianName = tech?.name || "Field Technician";
  } else if (!assignedTechnicianName || assignedTechnicianName === "Technician") {
    const tech = store.technicians.find((t) => t.id === assignedTechnicianId);
    if (tech) assignedTechnicianName = tech.name || "Field Technician";
  }

  const surveyCode = `SRV-2026-${String(store.surveys.length + 1).padStart(4, "0")}`;
  const survey: SiteSurvey = {
    id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    organization_id: lead.organization_id,
    survey_code: surveyCode,
    lead_id: leadId,
    assigned_technician_id: assignedTechnicianId,
    assigned_technician_name: assignedTechnicianName,
    scheduled_date: scheduledDate,
    roof_azimuth_direction: "SOUTH",
    roof_tilt_angle_deg: 28,
    roof_area_sqft: 650,
    usable_area_sqft: 550,
    shadow_free_area_sqft: 500,
    dc_cable_distance_meters: 18,
    ac_cable_distance_meters: 10,
    recommended_capacity_kw: lead.interested_capacity_kw || 3,
    recommended_topology: lead.system_topology || "ON_GRID",
    photo_urls: [],
    structural_integrity: "SOUND",
    technician_notes: notes,
    status: "SCHEDULED",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  store.surveys.unshift(survey);
  lead.status = "SURVEY_SCHEDULED";
  lead.updated_at = new Date().toISOString();

  addLeadActivity(
    leadId,
    "SURVEY_SCHEDULED",
    `Site survey ${surveyCode} scheduled for ${scheduledDate} with ${assignedTechnicianName}.${notes ? ` Instructions: ${notes}` : ""}`,
    performedBy,
    performerName
  );

  store.notifications.unshift({
    id: `n-${Date.now()}`,
    user_id: assignedTechnicianId,
    title: "New Site Survey Assigned",
    message: `Survey ${surveyCode} scheduled at ${lead.address}, ${lead.city} on ${scheduledDate}.`,
    type: "INFO",
    is_read: false,
    action_url: "/surveys",
    created_at: new Date().toISOString(),
  });

  addAuditLogEntry({
    performed_by: performedBy,
    user_role: "SALES_MANAGER",
    table_name: "site_surveys",
    record_id: survey.id,
    action: "INSERT",
    new_data: { surveyCode, leadId, assignedTechnicianId, scheduledDate },
  });

  return survey;
}

export function submitSurvey(
  surveyId: string,
  data: Partial<SiteSurvey>,
  performedBy: string = "system",
  performerName: string = "Technician"
): SiteSurvey {
  const store = getStore();
  const survey = store.surveys.find((s) => s.id === surveyId);
  if (!survey) throw new Error(`Survey with ID '${surveyId}' not found.`);

  Object.assign(survey, data);
  survey.status = "SUBMITTED";
  survey.completed_date = new Date().toISOString().split("T")[0];
  survey.updated_at = new Date().toISOString();

  const lead = store.leads.find((l) => l.id === survey.lead_id);
  if (lead) {
    lead.status = "SURVEY_COMPLETED";
    lead.updated_at = new Date().toISOString();

    addLeadActivity(
      lead.id,
      "NOTE",
      `Technician ${performerName} completed and submitted roof survey measurements (${survey.survey_code}). Feasibility initial: ${survey.feasibility_status || "PENDING"}.`,
      performedBy,
      performerName
    );
  }

  store.notifications.unshift({
    id: `n-${Date.now()}`,
    user_id: "20000000-0000-0000-0000-000000000001",
    title: `Survey Submitted for Review (${survey.survey_code})`,
    message: `${survey.survey_code} ready for engineering manager review. Usable area: ${survey.usable_area_sqft} sqft.`,
    type: "INFO",
    is_read: false,
    action_url: "/surveys",
    created_at: new Date().toISOString(),
  });

  addAuditLogEntry({
    performed_by: performedBy,
    user_role: "SURVEY_TECHNICIAN",
    table_name: "site_surveys",
    record_id: surveyId,
    action: "UPDATE",
    new_data: { status: "SUBMITTED", completed_date: survey.completed_date },
  });

  return survey;
}

export function reviewSurvey(
  surveyId: string,
  outcome: "APPROVED" | "REJECTED" | "REQUIRES_REASSESSMENT",
  reviewComments: string,
  reviewerRole: UserRole,
  reviewerName: string = "Manager",
  reviewerId: string = "20000000-0000-0000-0000-000000000001"
): SiteSurvey {
  // Authorization check
  const allowedRoles: UserRole[] = ["SUPER_ADMIN", "DIRECTOR", "SALES_MANAGER"];
  if (!allowedRoles.includes(reviewerRole)) {
    throw new Error(`Forbidden: User role '${reviewerRole}' is not permitted to review or approve site surveys.`);
  }

  const store = getStore();
  const survey = store.surveys.find((s) => s.id === surveyId);
  if (!survey) throw new Error(`Survey with ID '${surveyId}' not found.`);

  survey.status = outcome;
  survey.feasibility_status = outcome;
  survey.review_comments = reviewComments;
  survey.reviewed_by = reviewerId;
  survey.reviewer_name = reviewerName;
  survey.reviewed_at = new Date().toISOString();
  survey.updated_at = new Date().toISOString();

  const lead = store.leads.find((l) => l.id === survey.lead_id);
  if (lead) {
    if (outcome === "APPROVED") {
      lead.status = "SURVEY_COMPLETED";
    } else if (outcome === "REJECTED") {
      lead.status = "LOST";
    } else if (outcome === "REQUIRES_REASSESSMENT") {
      lead.status = "SURVEY_SCHEDULED";
    }
    lead.updated_at = new Date().toISOString();

    addLeadActivity(
      lead.id,
      "STATUS_CHANGE",
      `Site survey ${survey.survey_code} reviewed by ${reviewerName} (${reviewerRole}). Outcome: ${outcome}. Notes: ${reviewComments}`,
      reviewerId,
      reviewerName
    );
  }

  store.notifications.unshift({
    id: `n-${Date.now()}`,
    user_id: survey.assigned_technician_id,
    title: `Survey Review: ${survey.survey_code} ${outcome}`,
    message: `${reviewerName} (${reviewerRole}) marked survey as ${outcome}: ${reviewComments}`,
    type: outcome === "APPROVED" ? "INFO" : outcome === "REJECTED" ? "ALERT" : "WARNING",
    is_read: false,
    action_url: "/surveys",
    created_at: new Date().toISOString(),
  });

  addAuditLogEntry({
    performed_by: reviewerId,
    user_role: reviewerRole,
    table_name: "site_surveys",
    record_id: surveyId,
    action: "UPDATE",
    new_data: { outcome, reviewComments, reviewed_by: reviewerId },
  });

  return survey;
}

export function recordAdminOverride(
  surveyId: string,
  quotationId: string | undefined,
  reason: string,
  adminRole: UserRole,
  adminName: string = "Director",
  adminId: string = "20000000-0000-0000-0000-000000000001"
): SiteSurvey {
  if (adminRole !== "SUPER_ADMIN" && adminRole !== "DIRECTOR") {
    throw new Error(`Forbidden: Only Super Admin and Company Director can execute an administrative survey gate override.`);
  }

  if (!reason || reason.trim().length < 10) {
    throw new Error("A documented override reason of at least 10 characters is required.");
  }

  const store = getStore();
  const survey = store.surveys.find((s) => s.id === surveyId);
  if (!survey) throw new Error(`Survey with ID '${surveyId}' not found.`);

  survey.admin_override_by = adminId;
  survey.admin_override_reason = reason.trim();
  survey.admin_override_at = new Date().toISOString();
  survey.updated_at = new Date().toISOString();

  addAuditLogEntry({
    performed_by: adminId,
    user_role: adminRole,
    table_name: "site_surveys",
    record_id: surveyId,
    action: "SECURITY_OVERRIDE",
    new_data: {
      action: "SURVEY_GATE_OVERRIDE",
      quotationId,
      adminName,
      adminRole,
      reason: reason.trim(),
      timestamp: survey.admin_override_at,
    },
  });

  const lead = store.leads.find((l) => l.id === survey.lead_id);
  if (lead) {
    addLeadActivity(
      lead.id,
      "SYSTEM_AUDIT",
      `CRITICAL OVERRIDE: Survey gate explicitly bypassed by ${adminName} (${adminRole}). Reason: ${reason.trim()}`,
      adminId,
      adminName
    );
  }

  return survey;
}

export function addAuditLogEntry(entry: {
  performed_by?: string;
  user_role?: UserRole;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE" | "SECURITY_OVERRIDE";
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
}): AuditLog {
  const store = getStore();
  const auditLog: AuditLog = {
    id: store.auditLogs.length + 1,
    organization_id: "00000000-0000-0000-0000-000000000001",
    performed_by: entry.performed_by || "system",
    user_role: entry.user_role || "DIRECTOR",
    table_name: entry.table_name,
    record_id: entry.record_id,
    action: entry.action,
    old_data: entry.old_data,
    new_data: entry.new_data,
    created_at: new Date().toISOString(),
  };
  store.auditLogs.unshift(auditLog);
  return auditLog;
}

export function updateRecipeComponentQuantity(
  recipeId: string,
  newQuantity: number,
  userRole: UserRole,
  userId: string = "system",
  userName: string = "Administrator"
): ProductRecipe {
  if (userRole !== "SUPER_ADMIN" && userRole !== "DIRECTOR" && userRole !== "SALES_MANAGER") {
    throw new Error(`Forbidden: User role '${userRole}' is not authorized to configure company product recipes.`);
  }

  if (newQuantity < 0) {
    throw new Error("Recipe component quantity cannot be negative.");
  }

  const store = getStore();
  const recipe = store.recipes.find((r) => r.id === recipeId);
  if (!recipe) {
    throw new Error(`Recipe with ID '${recipeId}' not found.`);
  }

  const oldQuantity = recipe.default_quantity;
  recipe.default_quantity = newQuantity;

  addAuditLogEntry({
    performed_by: userId,
    user_role: userRole,
    table_name: "product_recipes",
    record_id: recipeId,
    action: "UPDATE",
    old_data: { default_quantity: oldQuantity },
    new_data: { default_quantity: newQuantity, updated_by: userName },
  });

  return recipe;
}

export function addStockMovement(entry: {
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
}): StockMovement {
  const store = getStore();
  const comp = store.components.find((c) => c.id === entry.component_id);
  const movement: StockMovement = {
    id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    organization_id: "00000000-0000-0000-0000-000000000001",
    component_id: entry.component_id,
    component_code: entry.component_code || comp?.component_code,
    component_name: entry.component_name || comp?.name,
    serial_number_id: entry.serial_number_id,
    serial_number: entry.serial_number,
    from_location_id: entry.from_location_id,
    from_location_name: entry.from_location_name,
    to_location_id: entry.to_location_id,
    to_location_name: entry.to_location_name,
    quantity: entry.quantity,
    movement_type: entry.movement_type,
    reference_id: entry.reference_id,
    notes: entry.notes,
    performed_by: entry.performed_by,
    created_at: new Date().toISOString(),
  };

  store.stockMovements.unshift(movement);
  return movement;
}

// Company-wide Warranty Activation Configuration
let __warrantyActivationPolicy: "ON_DELIVERY" | "ON_COMMISSIONING" = "ON_COMMISSIONING";

export function getWarrantyActivationPolicy(): "ON_DELIVERY" | "ON_COMMISSIONING" {
  return __warrantyActivationPolicy;
}

export function setWarrantyActivationPolicy(
  policy: "ON_DELIVERY" | "ON_COMMISSIONING",
  userRole: UserRole,
  userId: string = "system"
): "ON_DELIVERY" | "ON_COMMISSIONING" {
  if (userRole !== "SUPER_ADMIN" && userRole !== "DIRECTOR" && userRole !== "OPERATIONS_MANAGER") {
    throw new Error(`Forbidden: User role '${userRole}' is not authorized to modify warranty activation policy.`);
  }
  const oldPolicy = __warrantyActivationPolicy;
  __warrantyActivationPolicy = policy;
  addAuditLogEntry({
    performed_by: userId,
    user_role: userRole,
    table_name: "company_settings",
    record_id: "warranty_activation_policy",
    action: "UPDATE",
    old_data: { warranty_activation_policy: oldPolicy },
    new_data: { warranty_activation_policy: policy },
  });
  return __warrantyActivationPolicy;
}

export function createWarranty(
  data: Omit<Warranty, "id" | "created_at"> & { id?: string }
): Warranty {
  const store = getStore();
  const warranty: Warranty = {
    ...data,
    id: data.id || `war-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.warranties.unshift(warranty);
  return warranty;
}

export function updateWarranty(id: string, updates: Partial<Warranty>): Warranty {
  const store = getStore();
  const war = store.warranties.find((w) => w.id === id);
  if (!war) {
    throw new Error(`Warranty certificate '${id}' not found.`);
  }
  Object.assign(war, updates, { updated_at: new Date().toISOString() });
  return war;
}

export function createWarrantyPolicy(
  data: Omit<WarrantyPolicy, "id"> & { id?: string },
  userRole?: UserRole
): WarrantyPolicy {
  if (userRole && userRole !== "SUPER_ADMIN" && userRole !== "DIRECTOR" && userRole !== "OPERATIONS_MANAGER") {
    throw new Error(`Forbidden: User role '${userRole}' is not authorized to create warranty policies.`);
  }
  const store = getStore();
  const policy: WarrantyPolicy = {
    ...data,
    id: data.id || `pol-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    is_active: data.is_active ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.warrantyPolicies.unshift(policy);
  return policy;
}

export function updateWarrantyPolicy(
  id: string,
  updates: Partial<WarrantyPolicy>,
  userRole?: UserRole
): WarrantyPolicy {
  if (userRole && userRole !== "SUPER_ADMIN" && userRole !== "DIRECTOR" && userRole !== "OPERATIONS_MANAGER") {
    throw new Error(`Forbidden: User role '${userRole}' is not authorized to edit warranty policies.`);
  }
  const store = getStore();
  const policy = store.warrantyPolicies.find((p) => p.id === id);
  if (!policy) {
    throw new Error(`Warranty policy '${id}' not found.`);
  }
  Object.assign(policy, updates, { updated_at: new Date().toISOString() });
  return policy;
}

export function addServiceTicketUpdate(
  data: Omit<ServiceTicketUpdate, "id" | "created_at"> & { id?: string }
): ServiceTicketUpdate {
  const store = getStore();
  const update: ServiceTicketUpdate = {
    ...data,
    id: data.id || `stu-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  store.serviceTicketUpdates.unshift(update);
  return update;
}
