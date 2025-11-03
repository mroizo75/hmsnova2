"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { completeGeneratorSchema, getEmployeeCount } from "@/features/document-generator/schemas/generator.schema";
import { INDUSTRY_RISKS } from "@/features/document-generator/data/industry-risks";
import { INDUSTRY_TRAINING } from "@/features/document-generator/data/industry-training";

/**
 * Server Actions for HMS Document Generator
 * 
 * Flow:
 * 1. createGeneratedDocument() - Lagre form data til database
 * 2. generateDocuments() - Generer PDF/Excel filer
 * 3. sendDocuments() - Send email med download links
 */

// ═══════════════════════════════════════════════════════════════
// 1. CREATE GENERATED DOCUMENT
// ═══════════════════════════════════════════════════════════════

export async function createGeneratedDocument(data: z.infer<typeof completeGeneratorSchema>) {
  try {
    const validated = completeGeneratorSchema.parse(data);

    const { step1, step2, step3, step4, step5 } = validated;

    // Beregn antall ansatte (midtpunkt av range)
    const employees = getEmployeeCount(step1.employeeRange);

    // Opprett document record
    const doc = await prisma.generatedDocument.create({
      data: {
        // Step 1: Bedriftsinfo
        email: step1.email,
        companyName: step1.companyName,
        orgNumber: step1.orgNumber,
        address: step1.address,
        postalCode: step1.postalCode,
        city: step1.city,
        ceoName: step1.ceoName,
        phone: step1.phone,
        employees,

        // Step 2: Bransje
        industry: step2.industry,
        companyDescription: step2.companyDescription,

        // Step 3: HMS-organisering
        hmsResponsible: step3.hmsIsCeo ? step1.ceoName : step3.hmsResponsible,
        hmsEmail: step3.hmsEmail,
        hmsPhone: step3.hmsPhone,
        safetyRep: step3.hasSafetyRep ? step3.safetyRep : null,
        safetyRepEmail: step3.hasSafetyRep ? step3.safetyRepEmail : null,
        safetyRepPhone: step3.hasSafetyRep ? step3.safetyRepPhone : null,
        hasBHT: step3.hasBHT,
        bhtProvider: step3.hasBHT ? step3.bhtProvider : null,
        bhtContact: step3.hasBHT ? step3.bhtContact : null,
        departments: step3.departments || [],

        // Step 4: Opplæring
        completedTraining: step4.completedTraining || [],

        // Step 5: Marketing
        marketingConsent: step5.marketingConsent,

        // Status
        status: "PENDING",
      },
    });

    return {
      success: true,
      data: { id: doc.id },
    };
  } catch (error: any) {
    console.error("Create generated document error:", error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Ugyldig data: " + error.issues.map((e) => e.message).join(", "),
      };
    }

    return {
      success: false,
      error: error.message || "Kunne ikke opprette dokument",
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. GENERATE DOCUMENTS (PDF/Excel)
// ═══════════════════════════════════════════════════════════════

export async function generateDocuments(documentId: string) {
  try {
    // Hent document data
    const doc = await prisma.generatedDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    // Oppdater status til GENERATING
    await prisma.generatedDocument.update({
      where: { id: documentId },
      data: { status: "GENERATING" },
    });

    // Import dependencies
    const { 
      generateDocumentRegister,
      generateHMSHandbook,
      generateRiskAssessment,
      generateTrainingPlan,
      generateSafetyRound,
      generateAMUProtocol,
    } = await import("@/lib/docx-generator");
    const { getStorage, generateFileKey } = await import("@/lib/storage");
    const JSZip = (await import("jszip")).default;

    const storage = getStorage();

    // Generate ALL DOCX documents (editable Word files)
    console.log("Generating HMS documents...");
    const registerDocx = await generateDocumentRegister(doc);
    const handbookDocx = await generateHMSHandbook(doc);
    const riskDocx = await generateRiskAssessment(doc);
    const trainingDocx = await generateTrainingPlan(doc);
    const safetyRoundDocx = await generateSafetyRound(doc);
    const amuDocx = await generateAMUProtocol(doc);

    // Create ZIP file with all documents
    const zip = new JSZip();
    zip.file("HMS-00-Dokumentregister.docx", registerDocx);
    zip.file("HMS-01-HMS-Håndbok.docx", handbookDocx);
    zip.file("HMS-02-Risikovurdering.docx", riskDocx);
    zip.file("HMS-03-Opplæringsplan.docx", trainingDocx);
    zip.file("HMS-04-Vernerunde-sjekkliste.docx", safetyRoundDocx);
    zip.file("HMS-05-AMU-møteprotokoll.docx", amuDocx);
    
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Upload to storage
    const registerKey = generateFileKey(doc.id, "generated", "HMS-00-Dokumentregister.docx");
    const handbookKey = generateFileKey(doc.id, "generated", "HMS-01-HMS-Håndbok.docx");
    const riskKey = generateFileKey(doc.id, "generated", "HMS-02-Risikovurdering.docx");
    const trainingKey = generateFileKey(doc.id, "generated", "HMS-03-Opplæringsplan.docx");
    const vernerundeKey = generateFileKey(doc.id, "generated", "HMS-04-Vernerunde-sjekkliste.docx");
    const amuKey = generateFileKey(doc.id, "generated", "HMS-05-AMU-møteprotokoll.docx");
    const zipKey = generateFileKey(doc.id, "generated", "HMS-Komplett-Pakke.zip");

    console.log("Uploading documents to storage...");
    await Promise.all([
      storage.upload(registerKey, registerDocx),
      storage.upload(handbookKey, handbookDocx),
      storage.upload(riskKey, riskDocx),
      storage.upload(trainingKey, trainingDocx),
      storage.upload(vernerundeKey, safetyRoundDocx),
      storage.upload(amuKey, amuDocx),
      storage.upload(zipKey, zipBuffer),
    ]);
    
    console.log("All documents uploaded successfully!");

    // Oppdater document med file keys
    await prisma.generatedDocument.update({
      where: { id: documentId },
      data: {
        status: "COMPLETED",
        generatedAt: new Date(),
        registerKey,
        handbookKey,
        riskKey,
        trainingKey,
        vernerundeKey,
        amuKey,
        zipKey,
      },
    });

    return {
      success: true,
      data: {
        registerKey,
        handbookKey,
        riskKey,
        trainingKey,
        vernerundeKey,
        amuKey,
        zipKey,
      },
    };
  } catch (error: any) {
    console.error("Generate documents error:", error);

    // Oppdater status til FAILED
    await prisma.generatedDocument.update({
      where: { id: documentId },
      data: { status: "FAILED" },
    });

    return {
      success: false,
      error: error.message || "Kunne ikke generere dokumenter",
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. SEND DOCUMENTS VIA EMAIL
// ═══════════════════════════════════════════════════════════════

export async function sendDocuments(documentId: string) {
  try {
    const doc = await prisma.generatedDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    if (doc.status !== "COMPLETED") {
      return { success: false, error: "Dokumenter er ikke generert ennå" };
    }

    // Generate download URLs
    const { getStorage } = await import("@/lib/storage");
    const storage = getStorage();

    // R2/S3 presigned URLs can only be valid for max 7 days (604800 seconds)
    const SEVEN_DAYS = 604800;
    
    const downloadLinks = {
      register: await storage.getUrl(doc.registerKey || "", SEVEN_DAYS),
      handbook: await storage.getUrl(doc.handbookKey || "", SEVEN_DAYS),
      risk: await storage.getUrl(doc.riskKey || "", SEVEN_DAYS),
      training: await storage.getUrl(doc.trainingKey || "", SEVEN_DAYS),
      vernerunde: await storage.getUrl(doc.vernerundeKey || "", SEVEN_DAYS),
      amu: await storage.getUrl(doc.amuKey || "", SEVEN_DAYS),
      zip: await storage.getUrl(doc.zipKey || "", SEVEN_DAYS),
    };

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const { getDocumentDeliveryEmail } = await import("@/lib/email-templates");

      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailTemplate = getDocumentDeliveryEmail({
        companyName: doc.companyName,
        email: doc.email,
        documentId: doc.id,
        downloadLinks,
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "HMS Nova <onboarding@resend.dev>",
        to: doc.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });
    } else {
      console.log(`Would send email to ${doc.email} with download links`);
    }

    return {
      success: true,
      data: { email: doc.email, downloadLinks },
    };
  } catch (error: any) {
    console.error("Send documents error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke sende dokumenter",
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. GET GENERATED DOCUMENT
// ═══════════════════════════════════════════════════════════════

export async function getGeneratedDocument(documentId: string) {
  try {
    const doc = await prisma.generatedDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    return {
      success: true,
      data: doc,
    };
  } catch (error: any) {
    console.error("Get generated document error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke hente dokument",
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. TRACK DOWNLOAD
// ═══════════════════════════════════════════════════════════════

export async function trackDownload(documentId: string) {
  try {
    await prisma.generatedDocument.update({
      where: { id: documentId },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Track download error:", error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// 6. MARK AS CONVERTED TO TRIAL
// ═══════════════════════════════════════════════════════════════

export async function markAsConvertedToTrial(documentId: string) {
  try {
    await prisma.generatedDocument.update({
      where: { id: documentId },
      data: {
        convertedToTrial: true,
        convertedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Mark as converted error:", error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// 7. GET DOWNLOAD LINKS
// ═══════════════════════════════════════════════════════════════

export async function getDownloadLinks(documentId: string) {
  try {
    const doc = await prisma.generatedDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      return { success: false, error: "Dokument ikke funnet" };
    }

    if (doc.status !== "COMPLETED" || !doc.zipKey) {
      return { success: false, error: "Dokumenter er ikke generert ennå" };
    }

    // Generate download URLs
    const { getStorage } = await import("@/lib/storage");
    const storage = getStorage();

    // R2/S3 presigned URLs can only be valid for max 7 days
    const SEVEN_DAYS = 604800;
    
    const downloadLinks = {
      register: doc.registerKey ? await storage.getUrl(doc.registerKey, SEVEN_DAYS) : null,
      handbook: doc.handbookKey ? await storage.getUrl(doc.handbookKey, SEVEN_DAYS) : null,
      risk: doc.riskKey ? await storage.getUrl(doc.riskKey, SEVEN_DAYS) : null,
      training: doc.trainingKey ? await storage.getUrl(doc.trainingKey, SEVEN_DAYS) : null,
      vernerunde: doc.vernerundeKey ? await storage.getUrl(doc.vernerundeKey, SEVEN_DAYS) : null,
      amu: doc.amuKey ? await storage.getUrl(doc.amuKey, SEVEN_DAYS) : null,
      zip: doc.zipKey ? await storage.getUrl(doc.zipKey, SEVEN_DAYS) : null,
    };

    return {
      success: true,
      data: downloadLinks,
    };
  } catch (error: any) {
    console.error("Get download links error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke hente nedlastingslenker",
    };
  }
}

