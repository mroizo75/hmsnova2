import { z } from "zod";
import { SubmissionStatus } from "@prisma/client";

/**
 * Schema for submitting a filled-out form
 * 
 * Eksempel: Bruker fyller ut HMS morgenmøte og sender inn
 */
export const createFormSubmissionSchema = z.object({
  formTemplateId: z.string().cuid(),
  tenantId: z.string().cuid(),
  submittedById: z.string().cuid(),
  fieldValues: z.array(
    z.object({
      fieldId: z.string().cuid(),
      value: z.string().optional(),
      fileKey: z.string().optional(), // For filopplastinger
    })
  ),
  metadata: z.string().optional(), // JSON: IP-adresse, location, etc.
});

/**
 * Schema for approving/rejecting a submission
 */
export const approveFormSubmissionSchema = z.object({
  submissionId: z.string().cuid(),
  approvedById: z.string().cuid(),
  status: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().optional(),
});

export type CreateFormSubmissionInput = z.infer<typeof createFormSubmissionSchema>;
export type ApproveFormSubmissionInput = z.infer<typeof approveFormSubmissionSchema>;

