import { GoogleGenAI } from "@google/genai";

const isReplitProxy = !!process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "dummy",
  ...(isReplitProxy
    ? { httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL } }
    : {}),
});

const GEMINI_MODEL = isReplitProxy ? "gemini-3-flash-preview" : "gemini-2.0-flash-lite";

export interface CINVerificationResult {
  cinNumberMatch: boolean | null;
  cinNumberExtracted: string | null;
  expired: boolean | null;
  expiryDate: string | null;
  dateOfBirth: string | null;
  underAge: boolean | null;
  warnings: string[];
}

export interface LicenseFrontResult {
  cinNumberExtracted: string | null;
  cinNumberMatch: boolean | null;
  warnings: string[];
}

export interface LicenseBackResult {
  expiryDate: string | null;
  expired: boolean | null;
  warnings: string[];
}

function extractJson(text: string): string | null {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function computeUnderAge(dobStr: string): boolean | null {
  const parts = dobStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  const dob = new Date(year, month - 1, day);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age < 18;
}

function isDateExpired(dateStr: string): boolean | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  const expiry = new Date(year, month - 1, day);
  if (isNaN(expiry.getTime())) return null;
  return expiry < new Date();
}

const normalize = (s: string) => s.toUpperCase().replace(/[\s-]/g, "");

export async function verifyCINDocuments(params: {
  cinFrontBase64: string;
  enteredCinNumber?: string;
  mimeType?: string;
}): Promise<CINVerificationResult> {
  const { cinFrontBase64, enteredCinNumber, mimeType = "image/jpeg" } = params;

  const result: CINVerificationResult = {
    cinNumberMatch: null,
    cinNumberExtracted: null,
    expired: null,
    expiryDate: null,
    dateOfBirth: null,
    underAge: null,
    warnings: [],
  };

  const today = new Date().toLocaleDateString("fr-FR");

  const prompt = `You are a document verification AI for Moroccan national identity cards (CIN - Carte d'Identité Nationale).

Today's date: ${today}

First, determine if this image is actually a Moroccan CIN card. Set "is_valid_document" to false if the image is clearly not a CIN card (e.g. it is a random photo, selfie, landscape, or unrelated document).

If it IS a CIN card, extract:
1. The CIN number: 1-2 uppercase letters followed by 5-7 digits (e.g. AB123456, A123456, BE987654)
2. The expiry date labeled "Valable jusqu'au" on the card (format DD/MM/YYYY)
3. Whether the card is expired: compare expiry date to today ${today}
4. The date of birth labeled "Date de naissance" or "تاريخ الازدياد" on the card (format DD/MM/YYYY)

Respond with ONLY a raw JSON object, no markdown, no explanation:
{"is_valid_document":<true|false>,"cin_number":"<extracted or null>","expiry_date":"<DD/MM/YYYY or null>","is_expired":<true|false|null>,"date_of_birth":"<DD/MM/YYYY or null>"}`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: cinFrontBase64 } }] }],
      config: { maxOutputTokens: 8192, temperature: 0 },
    });

    const raw = (response.text ?? "").trim();
    console.log("Gemini CIN raw response:", raw.slice(0, 400));
    if (!raw) throw new Error("Empty response from Gemini");

    const jsonStr = extractJson(raw);
    if (!jsonStr) throw new Error(`No JSON found in: ${raw.slice(0, 150)}`);
    const parsed = JSON.parse(jsonStr);

    if (parsed.is_valid_document === false) {
      result.warnings.push("not_a_cin_document");
      return result;
    }

    result.cinNumberExtracted = parsed.cin_number ?? null;
    result.expiryDate = parsed.expiry_date ?? null;
    result.expired = parsed.is_expired ?? null;
    result.dateOfBirth = parsed.date_of_birth ?? null;

    if (result.dateOfBirth) result.underAge = computeUnderAge(result.dateOfBirth);

    if (enteredCinNumber && result.cinNumberExtracted) {
      result.cinNumberMatch = normalize(enteredCinNumber) === normalize(result.cinNumberExtracted);
    }

    if (result.expired === true) result.warnings.push("CIN expired");
    if (result.cinNumberMatch === false) result.warnings.push("CIN number mismatch");
    if (result.underAge === true) result.warnings.push("Driver under 18");
    if (result.cinNumberExtracted === null && result.expiryDate === null && result.dateOfBirth === null) {
      result.warnings.push("no_data_extracted");
    }
  } catch (err) {
    console.error("AI CIN verification error:", err);
  }

  return result;
}

export interface CarteGriseResult {
  expiryDate: string | null;
  expired: boolean | null;
  warnings: string[];
}

export async function verifyCarteGrise(params: {
  imageBase64: string;
  mimeType?: string;
}): Promise<CarteGriseResult> {
  const { imageBase64, mimeType = "image/jpeg" } = params;

  const result: CarteGriseResult = {
    expiryDate: null,
    expired: null,
    warnings: [],
  };

  const today = new Date().toLocaleDateString("fr-FR");

  const prompt = `You are a document verification AI for Moroccan vehicle registration cards (Carte Grise).

Today's date: ${today}

First, determine if this image is actually a Moroccan Carte Grise (vehicle registration). Set "is_valid_document" to false if the image is clearly not a carte grise (e.g. it is a random photo, selfie, landscape, or unrelated document).

If it IS a carte grise, extract the expiry date.
Look for "Date de fin de validité", "Valable jusqu'au", "Expire le", or similar label.
The date format is DD/MM/YYYY.

Respond with ONLY a raw JSON object, no markdown, no explanation:
{"is_valid_document":<true|false>,"expiry_date":"<DD/MM/YYYY or null>","is_expired":<true|false|null>}`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] }],
      config: { maxOutputTokens: 8192, temperature: 0 },
    });

    const raw = (response.text ?? "").trim();
    console.log("Gemini carte grise raw response:", raw.slice(0, 400));
    if (!raw) throw new Error("Empty response");

    const jsonStr = extractJson(raw);
    if (!jsonStr) throw new Error(`No JSON found in: ${raw.slice(0, 150)}`);
    const parsed = JSON.parse(jsonStr);

    if (parsed.is_valid_document === false) {
      result.warnings.push("not_a_carte_grise_document");
      return result;
    }

    result.expiryDate = parsed.expiry_date ?? null;
    if (result.expiryDate) {
      result.expired = isDateExpired(result.expiryDate);
    } else {
      result.expired = parsed.is_expired ?? null;
    }

    if (result.expired === true) result.warnings.push("Carte grise expired");
    if (result.expiryDate === null && result.expired === null) result.warnings.push("no_data_extracted");
  } catch (err) {
    console.error("AI carte grise verification error:", err);
  }

  return result;
}

export async function verifyLicenseFront(params: {
  imageBase64: string;
  cinNumberFromCard: string;
  mimeType?: string;
}): Promise<LicenseFrontResult> {
  const { imageBase64, cinNumberFromCard, mimeType = "image/jpeg" } = params;

  const result: LicenseFrontResult = {
    cinNumberExtracted: null,
    cinNumberMatch: null,
    warnings: [],
  };

  const prompt = `You are a document verification AI for Moroccan driving licenses (Permis de conduire).

First, determine if this image is actually the FRONT of a Moroccan driving license. Set "is_valid_document" to false if the image is clearly not a driving license front (e.g. it is a random photo, selfie, landscape, or unrelated document).

If it IS a driving license front, extract the CIN number (Carte d'Identité Nationale number).
The CIN number format is: 1-2 uppercase letters followed by 5-7 digits (e.g. AB123456, A123456).
It may be labeled "C.I.N", "CIN", "N° CIN", or similar on the license.

Respond with ONLY a raw JSON object, no markdown, no explanation:
{"is_valid_document":<true|false>,"cin_number":"<extracted or null>"}`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] }],
      config: { maxOutputTokens: 8192, temperature: 0 },
    });

    const raw = (response.text ?? "").trim();
    console.log("Gemini license front raw response:", raw.slice(0, 400));
    if (!raw) throw new Error("Empty response");

    const jsonStr = extractJson(raw);
    if (!jsonStr) throw new Error(`No JSON found in: ${raw.slice(0, 150)}`);
    const parsed = JSON.parse(jsonStr);

    if (parsed.is_valid_document === false) {
      result.warnings.push("not_a_license_document");
      return result;
    }

    result.cinNumberExtracted = parsed.cin_number ?? null;

    if (result.cinNumberExtracted && cinNumberFromCard) {
      result.cinNumberMatch = normalize(cinNumberFromCard) === normalize(result.cinNumberExtracted);
    }

    if (result.cinNumberMatch === false) result.warnings.push("License CIN mismatch");
    if (result.cinNumberExtracted === null) result.warnings.push("no_data_extracted");
  } catch (err) {
    console.error("AI license front verification error:", err);
  }

  return result;
}

export async function verifyLicenseBack(params: {
  imageBase64: string;
  mimeType?: string;
}): Promise<LicenseBackResult> {
  const { imageBase64, mimeType = "image/jpeg" } = params;

  const result: LicenseBackResult = {
    expiryDate: null,
    expired: null,
    warnings: [],
  };

  const today = new Date().toLocaleDateString("fr-FR");

  const prompt = `You are a document verification AI for Moroccan driving licenses (Permis de conduire).

Today's date: ${today}

First, determine if this image is actually the BACK of a Moroccan driving license. Set "is_valid_document" to false if the image is clearly not a driving license back (e.g. it is a random photo, selfie, landscape, or unrelated document).

If it IS a driving license back, extract the expiry date.
Look for "Date d'expiration", "Valable jusqu'au", "Expire le", or similar label.
The date format is DD/MM/YYYY.

Respond with ONLY a raw JSON object, no markdown, no explanation:
{"is_valid_document":<true|false>,"expiry_date":"<DD/MM/YYYY or null>","is_expired":<true|false|null>}`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] }],
      config: { maxOutputTokens: 8192, temperature: 0 },
    });

    const raw = (response.text ?? "").trim();
    console.log("Gemini license back raw response:", raw.slice(0, 400));
    if (!raw) throw new Error("Empty response");

    const jsonStr = extractJson(raw);
    if (!jsonStr) throw new Error(`No JSON found in: ${raw.slice(0, 150)}`);
    const parsed = JSON.parse(jsonStr);

    if (parsed.is_valid_document === false) {
      result.warnings.push("not_a_license_document");
      return result;
    }

    result.expiryDate = parsed.expiry_date ?? null;

    if (result.expiryDate) {
      result.expired = isDateExpired(result.expiryDate);
    } else {
      result.expired = parsed.is_expired ?? null;
    }

    if (result.expired === true) result.warnings.push("License expired");
    if (result.expiryDate === null && result.expired === null) result.warnings.push("no_data_extracted");
  } catch (err) {
    console.error("AI license back verification error:", err);
  }

  return result;
}
