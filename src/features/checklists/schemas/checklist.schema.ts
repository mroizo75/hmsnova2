import { z } from "zod";

const itemSchema = z.object({
  prompt: z.string().trim().min(2, "Hvert punkt trenger en tekst").max(180),
  helpText: z.string().trim().max(400).optional().or(z.literal("")),
  required: z.boolean(),
});

const sectionSchema = z.object({
  title: z.string().trim().min(2, "Bolkene trenger en overskrift").max(80),
  items: z.array(itemSchema).min(1, "Hver bolk trenger minst ett punkt").max(25),
});

export const saveChecklistSchema = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string().trim().min(2, "Sjekklisten trenger et navn").max(120),
    description: z.string().trim().max(1500).optional().or(z.literal("")),
    usageNote: z.string().trim().max(400).optional().or(z.literal("")),
    status: z.enum(["DRAFT", "ACTIVE"]),
    access: z.enum(["ALL", "ROLES", "USERS", "ROLES_AND_USERS"]),
    allowedRoles: z.array(z.string()).max(12),
    allowedUserIds: z.array(z.string()).max(200),
    resultRecipientIds: z.array(z.string()).max(30),
    sections: z.array(sectionSchema).min(1, "Legg til minst én bolk").max(12),
  })
  .superRefine((value, ctx) => {
    const itemCount = value.sections.reduce((sum, section) => sum + section.items.length, 0);
    if (itemCount > 60) {
      ctx.addIssue({ code: "custom", message: "En sjekkliste kan ha maks 60 punkter", path: ["sections"] });
    }
    if (value.status === "ACTIVE" && value.resultRecipientIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Velg minst én person som skal få resultatet",
        path: ["resultRecipientIds"],
      });
    }
    if ((value.access === "ROLES" || value.access === "ROLES_AND_USERS") && value.allowedRoles.length === 0) {
      ctx.addIssue({ code: "custom", message: "Velg minst én rolle", path: ["allowedRoles"] });
    }
    if ((value.access === "USERS" || value.access === "ROLES_AND_USERS") && value.allowedUserIds.length === 0) {
      ctx.addIssue({ code: "custom", message: "Velg minst én person", path: ["allowedUserIds"] });
    }
  });

export const submitChecklistSchema = z.object({
  checklistId: z.string().min(1),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  projectId: z.string().cuid().optional().or(z.literal("")),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  answers: z
    .array(
      z.object({
        itemId: z.string().min(1),
        response: z.enum(["OK", "DEVIATION", "NOT_APPLICABLE"]),
        comment: z.string().trim().max(1000).optional().or(z.literal("")),
        reportIncident: z.boolean().optional(),
        photos: z
          .array(
            z.object({
              fileKey: z.string().min(8).max(500),
              fileName: z.string().trim().min(1).max(200),
              mimeType: z.string().trim().min(1).max(100),
            }),
          )
          .max(4)
          .optional(),
      }),
    )
    .min(1),
});

export type SaveChecklistInput = z.infer<typeof saveChecklistSchema>;
export type SubmitChecklistInput = z.infer<typeof submitChecklistSchema>;
