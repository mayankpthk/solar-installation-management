import { describe, it, expect } from "vitest";
import {
  CreateLeadSchema,
  QualifyLeadSchema,
  SubmitSurveySchema,
  GenerateQuotationSchema,
} from "@/lib/schemas";
import { UnapprovedSurveyError, DoubleDispatchError, ValidationError } from "@/lib/errors";

describe("Zod Validation Schemas & Centralized Errors", () => {
  it("validates valid lead creation payload", () => {
    const validLead = {
      fullName: "Rajesh Kumar",
      phone: "+919876543210",
      address: "123 Solar Way",
      city: "Jalandhar",
      state: "Punjab",
      pincode: "144001",
      interestedCapacityKw: 3.0,
      systemTopology: "ON_GRID" as const,
    };

    const parsed = CreateLeadSchema.parse(validLead);
    expect(parsed.fullName).toBe("Rajesh Kumar");
    expect(parsed.isSubsidyRequested).toBe(true); // default
  });

  it("rejects invalid phone numbers and pin codes", () => {
    const invalidLead = {
      fullName: "Rajesh",
      phone: "123", // too short
      address: "Way",
      city: "J",
      state: "P",
      pincode: "144", // invalid PIN
    };

    expect(() => CreateLeadSchema.parse(invalidLead)).toThrow();
  });

  it("validates qualification checklist inputs", () => {
    const validQual = {
      monthlyBillAmount: 4500,
      avgMonthlyConsumptionKwh: 520,
      shadowFreeAreaSqft: 350,
      sanctionedLoadKw: 5.0,
      gridConnectionType: "SINGLE_PHASE" as const,
      discomName: "PSPCL",
    };

    const parsed = QualifyLeadSchema.parse(validQual);
    expect(parsed.discomName).toBe("PSPCL");
  });

  it("formats RFC 7807 problem details correctly", () => {
    const surveyError = new UnapprovedSurveyError("SRV-1001", "SUBMITTED");
    const problem = surveyError.toProblemDetails("/api/quotations/generate");

    expect(problem.status).toBe(422);
    expect(problem.code).toBe("SURVEY_NOT_APPROVED");
    expect(problem.instance).toBe("/api/quotations/generate");
    expect(problem.detail).toContain("SUBMITTED");

    const dispatchError = new DoubleDispatchError("INV-2024-884912");
    const dispatchProblem = dispatchError.toProblemDetails("/api/dispatches/scan");
    expect(dispatchProblem.status).toBe(409);
    expect(dispatchProblem.code).toBe("SERIAL_ALREADY_DISPATCHED");
  });
});
