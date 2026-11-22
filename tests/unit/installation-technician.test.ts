import { describe, it, expect, beforeEach } from "vitest";
import { getStore, resetStore } from "@/lib/data/store";
import {
  scheduleInstallationJob,
  rescheduleInstallationJob,
  startInstallationJob,
  updateInstallationChecklist,
  recordCommissioningMeasurements,
  recordInstallationPhoto,
  submitCustomerSignatureAndCommissioning,
  generateCompletionReportData,
  checkTechnicianConflict,
  SchedulingConflictError,
  JobClosedError,
  EarthingSafetyHazardError,
  IncompleteChecklistError,
  InstallationError,
} from "@/domain/installations/installation-engine";

describe("Mobile-First Technician & Installation Management Engine", () => {
  beforeEach(() => {
    resetStore();
  });

  // 1. TECHNICIAN MANAGEMENT
  it("tracks all 15 certified technicians with skills, contact details, and labor rates", () => {
    const store = getStore();
    expect(store.technicians.length).toBe(15);

    for (const tech of store.technicians) {
      expect(tech.name).toBeDefined();
      expect(tech.email).toBeDefined();
      expect(tech.phone).toBeDefined();
      expect(tech.hourly_rate).toBeGreaterThan(0);
      expect(tech.skills.length).toBeGreaterThan(0);
      expect(tech.is_available).toBeDefined();
    }
  });

  // 2. CONFLICT DETECTION: Rejects double-booking technicians
  it("detects scheduling conflicts and prevents double-booking a technician on the same date/time slot", () => {
    const store = getStore();
    const leadTech = store.technicians[0]; // Manpreet Singh

    // Schedule Job A on 2026-11-28 Morning
    const jobA = scheduleInstallationJob({
      orderId: store.orders[0].id,
      leadTechnicianId: leadTech.profile_id,
      scheduledDate: "2026-11-28",
      scheduledTimeSlot: "09:00 - 15:00",
      userRole: "INSTALLATION_MANAGER",
    });

    expect(jobA).toBeDefined();
    expect(jobA.status).toBe("ASSIGNED");

    // Attempt to schedule Job B on the same date and slot with the SAME lead technician
    expect(() =>
      scheduleInstallationJob({
        orderId: store.orders[1].id,
        leadTechnicianId: leadTech.profile_id,
        scheduledDate: "2026-11-28",
        scheduledTimeSlot: "09:00 - 15:00",
        userRole: "INSTALLATION_MANAGER",
      })
    ).toThrowError(SchedulingConflictError);

    // But scheduling on a DIFFERENT date must succeed
    const jobB = scheduleInstallationJob({
      orderId: store.orders[1].id,
      leadTechnicianId: leadTech.profile_id,
      scheduledDate: "2026-11-29",
      scheduledTimeSlot: "09:00 - 15:00",
      userRole: "INSTALLATION_MANAGER",
    });
    expect(jobB).toBeDefined();
  });

  // 3. JOB RESCHEDULING WITH DOCUMENTED REASON
  it("reschedules jobs with documented reason and enforces audit logging", () => {
    const store = getStore();
    const leadTech = store.technicians[1];

    const job = scheduleInstallationJob({
      orderId: store.orders[0].id,
      leadTechnicianId: leadTech.profile_id,
      scheduledDate: "2026-11-25",
      scheduledTimeSlot: "09:00 - 15:00",
      userRole: "INSTALLATION_MANAGER",
    });

    // Rejects rescheduling without reason
    expect(() =>
      rescheduleInstallationJob({
        jobId: job.id,
        newDate: "2026-11-26",
        newTimeSlot: "09:00 - 15:00",
        reason: "", // Empty reason!
        userRole: "INSTALLATION_MANAGER",
      })
    ).toThrowError(/documented rescheduling reason/);

    // Successfully reschedules with valid reason
    const rescheduled = rescheduleInstallationJob({
      jobId: job.id,
      newDate: "2026-11-26",
      newTimeSlot: "13:00 - 18:30",
      reason: "Postponed due to forecast unseasonal heavy rain in Jalandhar.",
      userRole: "INSTALLATION_MANAGER",
      userName: "Harinder Singh (Manager)",
    });

    expect(rescheduled.scheduled_date).toBe("2026-11-26");
    expect(rescheduled.scheduled_time_slot).toBe("13:00 - 18:30");
    expect(rescheduled.rescheduled_reason).toContain("heavy rain");
    expect(rescheduled.rescheduled_by).toBe("Harinder Singh (Manager)");
  });

  // 4. MOBILE WORKSPACE: Start Job
  it("records job start time when field technicians arrive on site", () => {
    const store = getStore();
    const job = scheduleInstallationJob({
      orderId: store.orders[0].id,
      leadTechnicianId: store.technicians[2].profile_id,
      scheduledDate: "2026-11-27",
      scheduledTimeSlot: "09:00 - 15:00",
      userRole: "INSTALLATION_MANAGER",
    });

    const started = startInstallationJob(job.id, "tech-lead");
    expect(started.status).toBe("IN_PROGRESS");
    expect(started.start_time).toBeDefined();
  });

  // 5. 8-STEP INSTALLATION SOP CHECKLIST
  it("tracks and updates all 8 required SOP checklist steps", () => {
    const store = getStore();
    const job = scheduleInstallationJob({
      orderId: store.orders[0].id,
      leadTechnicianId: store.technicians[3].profile_id,
      scheduledDate: "2026-11-28",
      scheduledTimeSlot: "09:00 - 15:00",
      userRole: "INSTALLATION_MANAGER",
    });

    const checklist = updateInstallationChecklist(job.id, {
      mounting_structures_fitted: true,
      solar_panels_installed: true,
      inverter_installed: true,
      wiring_completed: true,
      electrical_safety_checks_completed: true,
      earthing_completed: true,
      system_testing_performed: true,
      power_generation_verified: true,
    });

    expect(checklist.mounting_structures_fitted).toBe(true);
    expect(checklist.solar_panels_installed).toBe(true);
    expect(checklist.inverter_installed).toBe(true);
    expect(checklist.wiring_completed).toBe(true);
    expect(checklist.electrical_safety_checks_completed).toBe(true);
    expect(checklist.earthing_completed).toBe(true);
    expect(checklist.system_testing_performed).toBe(true);
    expect(checklist.power_generation_verified).toBe(true);
  });

  // 6. ELECTRICAL SAFETY TEST READINGS & EARTHING COMPLIANCE (< 5 Ohms)
  it("enforces statutory earthing resistance compliance (< 5.0 Ohms)", () => {
    const store = getStore();
    const job = scheduleInstallationJob({
      orderId: store.orders[0].id,
      leadTechnicianId: store.technicians[4].profile_id,
      scheduledDate: "2026-11-29",
      scheduledTimeSlot: "09:00 - 15:00",
      userRole: "INSTALLATION_MANAGER",
    });

    // Rejects non-compliant hazardous earthing (e.g. 6.2 Ohms >= 5.0 Ohms)
    expect(() =>
      recordCommissioningMeasurements(job.id, {
        measuredDcVoltage: 245.0,
        measuredDcCurrent: 9.5,
        measuredAcVoltage: 230.0,
        measuredInstantaneousPowerKw: 2.2,
        earthingResistanceOhms: 6.2, // FAILS: Exceeds 5.0 Ohms CEA threshold!
      })
    ).toThrowError(EarthingSafetyHazardError);

    // Compliant earthing measurement (< 5.0 Ohms) succeeds
    const compliantJob = recordCommissioningMeasurements(job.id, {
      measuredDcVoltage: 245.0,
      measuredDcCurrent: 9.5,
      measuredAcVoltage: 230.0,
      measuredInstantaneousPowerKw: 2.2,
      earthingResistanceOhms: 2.1, // COMPLIANT
    });

    expect(compliantJob.earthing_resistance_ohms).toBe(2.1);
    expect(compliantJob.status).toBe("TESTING");
  });

  // 7. INCOMPLETE CHECKLIST BLOCKS COMMISSIONING
  it("blocks customer sign-off and commissioning if any checklist step is incomplete", () => {
    const store = getStore();
    const job = scheduleInstallationJob({
      orderId: store.orders[0].id,
      leadTechnicianId: store.technicians[0].profile_id,
      scheduledDate: "2026-11-30",
      scheduledTimeSlot: "09:00 - 15:00",
      userRole: "INSTALLATION_MANAGER",
    });

    // Only complete 6 of 8 steps
    updateInstallationChecklist(job.id, {
      mounting_structures_fitted: true,
      solar_panels_installed: true,
      inverter_installed: true,
      wiring_completed: true,
      electrical_safety_checks_completed: true,
      earthing_completed: true,
      system_testing_performed: false, // Incomplete!
      power_generation_verified: false, // Incomplete!
    });

    recordCommissioningMeasurements(job.id, {
      measuredDcVoltage: 245.0,
      measuredDcCurrent: 9.5,
      measuredAcVoltage: 230.0,
      measuredInstantaneousPowerKw: 2.2,
      earthingResistanceOhms: 1.9,
    });

    expect(() =>
      submitCustomerSignatureAndCommissioning({
        jobId: job.id,
        signerName: "Simranjeet Kaur",
        signatureSvg: "data:image/svg+xml;utf8,<svg><path d='M10 20'/></svg>",
      })
    ).toThrowError(IncompleteChecklistError);
  });

  // 8. COMPLETE INSTALLATION, CUSTOMER SIGNATURE & WARRANTY ACTIVATION
  it("completes commissioning with digital customer signature, updates order to COMPLETED, and generates certificate", () => {
    const store = getStore();
    const order = store.orders[0];

    const job = scheduleInstallationJob({
      orderId: order.id,
      leadTechnicianId: store.technicians[0].profile_id,
      scheduledDate: "2026-11-30",
      scheduledTimeSlot: "09:00 - 15:00",
      userRole: "INSTALLATION_MANAGER",
    });

    // 1. Complete all 8 checklist steps
    updateInstallationChecklist(job.id, {
      mounting_structures_fitted: true,
      solar_panels_installed: true,
      inverter_installed: true,
      wiring_completed: true,
      electrical_safety_checks_completed: true,
      earthing_completed: true,
      system_testing_performed: true,
      power_generation_verified: true,
    });

    // 2. Record compliant test readings
    recordCommissioningMeasurements(job.id, {
      measuredDcVoltage: 245.5,
      measuredDcCurrent: 9.8,
      measuredAcVoltage: 232.0,
      measuredInstantaneousPowerKw: 2.25,
      earthingResistanceOhms: 1.8,
    });

    // 3. Attach before/after installation photo
    recordInstallationPhoto(job.id, {
      photoType: "ROOF_ARRAY",
      photoUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276",
      gpsLatitude: 31.326,
      gpsLongitude: 75.5762,
    });

    // 4. Submit digital signature and commissioning sign-off
    const finishedJob = submitCustomerSignatureAndCommissioning({
      jobId: job.id,
      signerName: "Simranjeet Kaur",
      signatureSvg: "data:image/svg+xml;utf8,<svg><path d='M 10 30 Q 50 10 90 30'/></svg>",
      feedbackRating: 5,
      feedbackComments: "Flawless rooftop installation and neat cable dressing.",
      technicianNotes: "Commissioned under clear sky. 2.25 kW instantaneous generation verified.",
    });

    expect(finishedJob.status).toBe("APPROVED");
    expect(finishedJob.finish_time).toBeDefined();
    expect(finishedJob.completion_report_url).toBeDefined();

    // Check customer signature recorded
    const savedSig = store.customerSignatures.find((s) => s.installation_job_id === job.id);
    expect(savedSig).toBeDefined();
    expect(savedSig?.signer_name).toBe("Simranjeet Kaur");
    expect(savedSig?.feedback_rating).toBe(5);

    // Check order completed
    expect(order.status).toBe("COMPLETED");

    // 5. Generate Technical Completion Report Data
    const reportData = generateCompletionReportData(job.id);
    expect(reportData.customer.name).toBe("Simranjeet Kaur");
    expect(reportData.measurements.isEarthingCompliant).toBe(true);
    expect(reportData.checklist.mountingStructuresFitted).toBe(true);
    expect(reportData.checklist.powerGenerationVerified).toBe(true);
    expect(reportData.signature?.signerName).toBe("Simranjeet Kaur");
  });

  // 9. CRITICAL INVARIANT: Closed / Approved jobs are immutable
  it("enforces immutability: closed/approved jobs cannot be modified or rescheduled", () => {
    const store = getStore();
    // job2 is already APPROVED in seed data
    const approvedJob = store.installations.find((j) => j.status === "APPROVED");
    expect(approvedJob).toBeDefined();

    // Attempt to reschedule
    expect(() =>
      rescheduleInstallationJob({
        jobId: approvedJob!.id,
        newDate: "2026-12-01",
        newTimeSlot: "09:00 - 15:00",
        reason: "Attempting to change completed job",
        userRole: "INSTALLATION_MANAGER",
      })
    ).toThrowError(JobClosedError);

    // Attempt to alter checklist
    expect(() =>
      updateInstallationChecklist(approvedJob!.id, { mounting_structures_fitted: false })
    ).toThrowError(JobClosedError);

    // Attempt to restart
    expect(() => startInstallationJob(approvedJob!.id, "tech-lead")).toThrowError(JobClosedError);
  });

  // 10. IDEMPOTENCY: Duplicate submissions with matching key return existing record safely
  it("handles idempotent commissioning submissions to safely prevent duplicate records", () => {
    const store = getStore();
    const order = store.orders[0];

    const job = scheduleInstallationJob({
      orderId: order.id,
      leadTechnicianId: store.technicians[0].profile_id,
      scheduledDate: "2026-11-30",
      scheduledTimeSlot: "09:00 - 15:00",
      userRole: "INSTALLATION_MANAGER",
    });

    updateInstallationChecklist(job.id, {
      mounting_structures_fitted: true,
      solar_panels_installed: true,
      inverter_installed: true,
      wiring_completed: true,
      electrical_safety_checks_completed: true,
      earthing_completed: true,
      system_testing_performed: true,
      power_generation_verified: true,
    });

    recordCommissioningMeasurements(job.id, {
      measuredDcVoltage: 245.5,
      measuredDcCurrent: 9.8,
      measuredAcVoltage: 232.0,
      measuredInstantaneousPowerKw: 2.25,
      earthingResistanceOhms: 1.8,
    });

    const idempotencyKey = "IDEM-TEST-1002";

    // First submission
    const firstResult = submitCustomerSignatureAndCommissioning({
      jobId: job.id,
      signerName: "Simranjeet Kaur",
      signatureSvg: "data:image/svg+xml;utf8,<svg><path d='M10 20'/></svg>",
      idempotencyKey,
    });

    expect(firstResult.status).toBe("APPROVED");

    // Second duplicate submission with same key
    const secondResult = submitCustomerSignatureAndCommissioning({
      jobId: job.id,
      signerName: "Simranjeet Kaur",
      signatureSvg: "data:image/svg+xml;utf8,<svg><path d='M10 20'/></svg>",
      idempotencyKey,
    });

    expect(secondResult.id).toBe(firstResult.id);
    expect(secondResult.status).toBe("APPROVED");
  });
});
