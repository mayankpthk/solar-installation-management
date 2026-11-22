import { describe, it, expect, beforeEach } from "vitest";
import {
  getStore,
  resetStore,
  addLeadActivity,
  assignSalesperson,
  scheduleSurvey,
  submitSurvey,
  reviewSurvey,
  recordAdminOverride,
} from "@/lib/data/store";
import {
  canApproveSurvey,
  canOverrideSurveyGate,
  verifyQuotationEligibility,
} from "@/domain/workflow/survey-gate";
import { CreateLeadSchema, SubmitSurveySchema } from "@/lib/schemas";
import { Lead, UserRole } from "@/lib/types/database";

describe("CRM & Site Survey End-to-End Workflow Engine", () => {
  beforeEach(() => {
    // Reset store before each test to ensure deterministic tests
    resetStore();
  });

  // 1. Create a new lead via public enquiry data
  it("creates a new lead with all 9 public enquiry fields and initial activity trail", () => {
    const store = getStore();

    const publicEnquiryPayload = {
      fullName: "Harpreet Singh Sandhu",
      phone: "+919814012345",
      alternatePhone: "+919814098765",
      email: "harpreet.sandhu@punjabsolar.in",
      address: "B-42 Model Town, Near Geeta Mandir",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144003",
      interestedCapacityKw: 5.0,
      systemTopology: "ON_GRID" as const,
      monthlyBillAmount: 8500,
      roofAvailability: "AVAILABLE",
      isSubsidyRequested: true,
      additionalRequirements: "Requires net-metering liaison with PSPCL and elevated structure for rooftop garden.",
      source: "WEB_FORM" as const,
    };

    // Validate with Zod schema
    const validatedInput = CreateLeadSchema.parse(publicEnquiryPayload);
    expect(validatedInput.fullName).toBe("Harpreet Singh Sandhu");
    expect(validatedInput.interestedCapacityKw).toBe(5.0);

    // Create lead record
    const newLead: Lead = {
      id: "70000000-0000-0000-0000-000000000999",
      organization_id: "00000000-0000-0000-0000-000000000001",
      lead_code: "LED-2026-9999",
      full_name: validatedInput.fullName,
      phone: validatedInput.phone,
      alternate_phone: validatedInput.alternatePhone,
      email: validatedInput.email,
      address: validatedInput.address,
      city: validatedInput.city,
      state: validatedInput.state,
      pincode: validatedInput.pincode,
      source: validatedInput.source,
      status: "NEW",
      interested_capacity_kw: validatedInput.interestedCapacityKw,
      system_topology: validatedInput.systemTopology,
      monthly_bill_amount: validatedInput.monthlyBillAmount,
      roof_availability: validatedInput.roofAvailability,
      is_subsidy_requested: validatedInput.isSubsidyRequested,
      additional_requirements: validatedInput.additionalRequirements,
      notes: "Inquiry received via online portal.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.leads.unshift(newLead);
    addLeadActivity(
      newLead.id,
      "CREATED",
      `Lead intake registered via ${newLead.source}. Proposed capacity: ${newLead.interested_capacity_kw} kW.`,
      "system",
      "Public Web Form"
    );

    // Verify lead stored
    const retrievedLead = store.leads.find((l) => l.id === newLead.id);
    expect(retrievedLead).toBeDefined();
    expect(retrievedLead?.status).toBe("NEW");
    expect(retrievedLead?.monthly_bill_amount).toBe(8500);
    expect(retrievedLead?.is_subsidy_requested).toBe(true);

    // Verify activity trail
    const activities = store.leadActivities.filter((a) => a.lead_id === newLead.id);
    expect(activities.length).toBe(1);
    expect(activities[0].activity_type).toBe("CREATED");
  });

  // 2. Assign salesperson and schedule follow-up
  it("assigns a sales representative and schedules follow-up date", () => {
    const store = getStore();
    const lead = store.leads[0];
    lead.status = "NEW";
    const initialActivityCount = store.leadActivities.filter((a) => a.lead_id === lead.id).length;

    const updatedLead = assignSalesperson(
      lead.id,
      "20000000-0000-0000-0000-000000000003",
      "Vikram Joshi",
      "2026-03-20T11:00:00Z",
      "Client contacted via telephone. Roof is flat RCC and ready for survey."
    );

    expect(updatedLead.assigned_sales_rep_id).toBe("20000000-0000-0000-0000-000000000003");
    expect(updatedLead.assigned_sales_rep_name).toBe("Vikram Joshi");
    expect(updatedLead.status).toBe("CONTACTED");
    expect(updatedLead.follow_up_date).toBe("2026-03-20T11:00:00Z");

    const activities = store.leadActivities.filter((a) => a.lead_id === lead.id);
    expect(activities.length).toBe(initialActivityCount + 1);
    expect(activities[0].activity_type).toBe("ASSIGNMENT");
    expect(activities[0].details).toContain("Vikram Joshi");
  });

  // 3. Schedule survey and assign technician
  it("schedules a site survey and assigns a field technician", () => {
    const store = getStore();
    const lead = store.leads[0];
    const technician = store.technicians[0];

    const survey = scheduleSurvey(
      lead.id,
      technician.id,
      "2026-03-22T10:00:00Z",
      "Morning site visit requested by customer. Inspect shading from eastern parapet."
    );

    expect(survey.id).toBeDefined();
    expect(survey.survey_code).toMatch(/^SRV-\d{4}-\d{4}$/);
    expect(survey.status).toBe("SCHEDULED");
    expect(survey.assigned_technician_id).toBe(technician.id);
    expect(survey.assigned_technician_name).toBe(technician.name);

    // Verify lead status transitioned to SURVEY_SCHEDULED
    const updatedLead = store.leads.find((l) => l.id === lead.id);
    expect(updatedLead?.status).toBe("SURVEY_SCHEDULED");

    // Verify activity logged
    const activities = store.leadActivities.filter((a) => a.lead_id === lead.id);
    expect(activities[0].activity_type).toBe("SURVEY_SCHEDULED");
    expect(activities[0].details).toContain(survey.survey_code);
  });

  // 4. Record technical survey findings and upload photos
  it("captures comprehensive survey findings, validates photos, and submits survey", () => {
    const store = getStore();
    const lead = store.leads[0];
    const technician = store.technicians[0];

    const survey = scheduleSurvey(
      lead.id,
      technician.id,
      "2026-03-22T10:00:00Z",
      "Survey site visit."
    );

    const surveyInput = {
      roofAzimuthDirection: "SOUTH",
      roofTiltAngleDeg: 28,
      roofAreaSqft: 1200,
      usableAreaSqft: 650,
      shadowFreeAreaSqft: 500,
      roofType: "RCC_FLAT",
      structuralIntegrity: "SOUND",
      structuralObservations: "Reinforced 6-inch concrete slab in prime structural condition. No cracks observed.",
      shadowObstaclesNotes: "Clear southern sky. Moderate parapet shadow on extreme northwest edge.",
      dcCableDistanceMeters: 22,
      acCableDistanceMeters: 14,
      electricalConnectionDetails: "3-Phase, 415V, 50Hz, Sanctioned Load 7 kW with PSPCL smart meter.",
      gridSuitability: "Grid stable with good power factor (0.95). DG sync interlock required.",
      sanctionedLoadKw: 7.0,
      technicianNotes: "Site is optimal for 5 kW On-Grid installation with standard south-facing elevated structure.",
      recommendedCapacityKw: 5.0,
      recommendedTopology: "ON_GRID" as const,
      photoUrls: [
        "https://storage.solaros.internal/surveys/srv-9999-south-roof.jpg",
        "https://storage.solaros.internal/surveys/srv-9999-electrical-db.jpg",
        "https://storage.solaros.internal/surveys/srv-9999-cable-tray.jpg",
        "https://storage.solaros.internal/surveys/srv-9999-earthing-pit.jpg",
      ],
      feasibilityStatus: "APPROVED" as const,
    };

    // Validate using Zod
    const validated = SubmitSurveySchema.parse(surveyInput);
    expect(validated.photoUrls.length).toBe(4);

    // Submit survey findings
    const submittedSurvey = submitSurvey(survey.id, {
      roof_azimuth_direction: validated.roofAzimuthDirection,
      roof_tilt_angle_deg: validated.roofTiltAngleDeg,
      roof_area_sqft: validated.roofAreaSqft,
      usable_area_sqft: validated.usableAreaSqft,
      shadow_free_area_sqft: validated.shadowFreeAreaSqft,
      roof_type: validated.roofType,
      structural_integrity: validated.structuralIntegrity,
      structural_observations: validated.structuralObservations,
      shadow_obstacles_notes: validated.shadowObstaclesNotes,
      dc_cable_distance_meters: validated.dcCableDistanceMeters,
      ac_cable_distance_meters: validated.acCableDistanceMeters,
      electrical_connection_details: validated.electricalConnectionDetails,
      grid_suitability: validated.gridSuitability,
      sanctioned_load_kw: validated.sanctionedLoadKw,
      technician_notes: validated.technicianNotes,
      recommended_capacity_kw: validated.recommendedCapacityKw,
      recommended_topology: validated.recommendedTopology,
      photo_urls: validated.photoUrls,
      feasibility_status: validated.feasibilityStatus,
    });

    expect(submittedSurvey.status).toBe("SUBMITTED");
    expect(submittedSurvey.photo_urls?.length).toBe(4);
    expect(submittedSurvey.dc_cable_distance_meters).toBe(22);

    // Lead status must advance to SURVEY_COMPLETED
    const updatedLead = store.leads.find((l) => l.id === lead.id);
    expect(updatedLead?.status).toBe("SURVEY_COMPLETED");
  });

  // 5. Verify unauthorized users cannot approve surveys
  it("prevents unauthorized roles from approving or rejecting surveys", () => {
    const store = getStore();
    const lead = store.leads[0];
    const technician = store.technicians[0];

    const survey = scheduleSurvey(lead.id, technician.id, "2026-03-22T10:00:00Z");

    const unauthorizedRoles: UserRole[] = [
      "SALES_EXECUTIVE",
      "FIELD_TECHNICIAN",
      "SURVEY_TECHNICIAN",
      "WAREHOUSE_MANAGER",
      "CUSTOMER",
    ];

    unauthorizedRoles.forEach((role) => {
      expect(canApproveSurvey(role)).toBe(false);

      expect(() =>
        reviewSurvey(
          survey.id,
          "APPROVED",
          "Attempted unauthorized approval.",
          role,
          "Unauthorized User",
          "user-123"
        )
      ).toThrowError(/Forbidden/);
    });

    // Ensure survey status remains SCHEDULED
    const surveyAfterAttempts = store.surveys.find((s) => s.id === survey.id);
    expect(surveyAfterAttempts?.status).toBe("SCHEDULED");
  });

  // 6. Authorized manager approves survey
  it("allows Sales Manager, Director, or Super Admin to approve survey with review notes", () => {
    const store = getStore();
    const lead = store.leads[0];
    const technician = store.technicians[0];

    const survey = scheduleSurvey(lead.id, technician.id, "2026-03-22T10:00:00Z");
    expect(canApproveSurvey("SALES_MANAGER")).toBe(true);
    expect(canApproveSurvey("DIRECTOR")).toBe(true);
    expect(canApproveSurvey("SUPER_ADMIN")).toBe(true);

    const approvedSurvey = reviewSurvey(
      survey.id,
      "APPROVED",
      "Engineering analysis confirmed: structural load capacity is 85 kg/m², clear azimuth. Approved for 5kW system.",
      "SALES_MANAGER",
      "Sales Manager",
      "20000000-0000-0000-0000-000000000002"
    );

    expect(approvedSurvey.status).toBe("APPROVED");
    expect(approvedSurvey.feasibility_status).toBe("APPROVED");
    expect(approvedSurvey.review_comments).toContain("Engineering analysis confirmed");
    expect(approvedSurvey.reviewed_at).toBeDefined();

    // Lead transitions to SURVEY_COMPLETED
    const updatedLead = store.leads.find((l) => l.id === lead.id);
    expect(updatedLead?.status).toBe("SURVEY_COMPLETED");
  });

  // 7. Verify quotation eligibility: Quotation is eligible when survey is approved
  it("allows quotation finalization without override when survey is approved", () => {
    const store = getStore();
    const approvedSurvey = store.surveys.find((s) => s.status === "APPROVED");
    expect(approvedSurvey).toBeDefined();

    const eligibility = verifyQuotationEligibility({
      survey: approvedSurvey,
      userRole: "SALES_EXECUTIVE",
    });

    expect(eligibility.isEligible).toBe(true);
    expect(eligibility.gatePassed).toBe(true);
    expect(eligibility.isOverrideApplied).toBe(false);
    expect(eligibility.surveyStatus).toBe("APPROVED");
  });

  // 8. Verify survey gate blocks quotation when survey is not approved
  it("blocks quotation finalization when survey is not approved or is rejected", () => {
    const store = getStore();
    const lead = store.leads[0];
    const technician = store.technicians[0];

    // Create unapproved survey
    const survey = scheduleSurvey(lead.id, technician.id, "2026-03-22T10:00:00Z");

    // Standard user tries to quote
    const eligibilityScheduled = verifyQuotationEligibility({
      survey,
      userRole: "SALES_EXECUTIVE",
    });
    expect(eligibilityScheduled.isEligible).toBe(false);
    expect(eligibilityScheduled.gatePassed).toBe(false);
    expect(eligibilityScheduled.rejectionReason).toContain("Quotations cannot be finalized without an approved site survey");

    // Now review as REJECTED
    const rejectedSurvey = reviewSurvey(
      survey.id,
      "REJECTED",
      "Severe shading from multi-story commercial building on south-east. Net solar generation unviable.",
      "DIRECTOR",
      "Company Director",
      "20000000-0000-0000-0000-000000000001"
    );

    const eligibilityRejected = verifyQuotationEligibility({
      survey: rejectedSurvey,
      userRole: "SALES_EXECUTIVE",
    });
    expect(eligibilityRejected.isEligible).toBe(false);
    expect(eligibilityRejected.gatePassed).toBe(false);
    expect(eligibilityRejected.rejectionReason).toContain("REJECTED");

    // Lead is marked as LOST
    const updatedLead = store.leads.find((l) => l.id === lead.id);
    expect(updatedLead?.status).toBe("LOST");
  });

  // 9. Verify survey outcome REQUIRES_REASSESSMENT
  it("handles REQUIRES_REASSESSMENT outcome correctly", () => {
    const store = getStore();
    const lead = store.leads[0];
    const technician = store.technicians[0];

    const survey = scheduleSurvey(lead.id, technician.id, "2026-03-22T10:00:00Z");

    const reassessSurvey = reviewSurvey(
      survey.id,
      "REQUIRES_REASSESSMENT",
      "Roof slab needs testing for load tolerance under 150 km/h wind shear.",
      "DIRECTOR",
      "Company Director",
      "20000000-0000-0000-0000-000000000001"
    );

    expect(reassessSurvey.status).toBe("REQUIRES_REASSESSMENT");
    expect(reassessSurvey.feasibility_status).toBe("REQUIRES_REASSESSMENT");

    const eligibility = verifyQuotationEligibility({
      survey: reassessSurvey,
      userRole: "SALES_MANAGER",
    });
    expect(eligibility.isEligible).toBe(false);
    expect(eligibility.gatePassed).toBe(false);
  });

  // 10. Verify documented admin override allows quotation finalization
  it("allows authorized administrators to bypass survey gate with documented justification and audit log", () => {
    const store = getStore();
    const lead = store.leads[0];
    const technician = store.technicians[0];

    const survey = scheduleSurvey(lead.id, technician.id, "2026-03-22T10:00:00Z");

    // 10.1 Unauthorized role cannot override
    expect(canOverrideSurveyGate("SALES_EXECUTIVE")).toBe(false);
    expect(canOverrideSurveyGate("SALES_MANAGER")).toBe(false);
    expect(canOverrideSurveyGate("FIELD_TECHNICIAN")).toBe(false);

    expect(() =>
      recordAdminOverride(
        survey.id,
        undefined,
        "Commercial executive agreement with customer.",
        "SALES_MANAGER" as any
      )
    ).toThrowError(/Forbidden/);

    // 10.2 Authorized role but reason too short (< 10 characters)
    expect(canOverrideSurveyGate("DIRECTOR")).toBe(true);
    expect(canOverrideSurveyGate("SUPER_ADMIN")).toBe(true);

    expect(() =>
      recordAdminOverride(
        survey.id,
        undefined,
        "Short", // 5 chars
        "DIRECTOR"
      )
    ).toThrowError(/at least 10 characters/);

    const checkShortReason = verifyQuotationEligibility({
      survey,
      userRole: "DIRECTOR",
      overrideReason: "Too short",
    });
    expect(checkShortReason.isEligible).toBe(false);

    // 10.3 Authorized role with valid documented reason (>= 10 characters)
    const validReason = "Architectural structural certificate provided directly by certified civil engineer. Approved for quotation ahead of physical visit.";

    const checkValidOverride = verifyQuotationEligibility({
      survey,
      userRole: "DIRECTOR",
      overrideReason: validReason,
    });
    expect(checkValidOverride.isEligible).toBe(true);
    expect(checkValidOverride.isOverrideApplied).toBe(true);
    expect(checkValidOverride.auditMessage).toContain("CRITICAL_OVERRIDE");

    // Execute override in store
    const overriddenSurvey = recordAdminOverride(
      survey.id,
      "q-test-1234",
      validReason,
      "DIRECTOR",
      "SunPower Managing Director"
    );

    expect(overriddenSurvey.admin_override_reason).toBe(validReason);
    expect(overriddenSurvey.admin_override_at).toBeDefined();

    // Verify immutable audit log was generated
    const auditLogs = store.auditLogs.filter(
      (a) => a.table_name === "site_surveys" && a.action === "SECURITY_OVERRIDE"
    );
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    expect((auditLogs[0].new_data as any)?.action).toBe("SURVEY_GATE_OVERRIDE");
    expect((auditLogs[0].new_data as any)?.reason).toBe(validReason);

    // Verify activity was appended to lead
    const leadActivities = store.leadActivities.filter(
      (a) => a.lead_id === lead.id && a.activity_type === "SYSTEM_AUDIT"
    );
    expect(leadActivities.length).toBeGreaterThanOrEqual(1);
    expect(leadActivities[0].details).toContain("Survey gate explicitly bypassed");
  });
});
