import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TMP = "/tmp/rtc_pos.txt";

// STEP 1 — Extract raw text from PDF using pdftotext
function extractRaw(pdfPath: string): string {
  if (!pdfPath || typeof pdfPath !== 'string') {
    throw new Error('Invalid PDF path provided');
  }
  
  try {
    execSync(`pdftotext -layout -nopgbrk "${pdfPath}" "${TMP}"`);
    const text = fs.readFileSync(TMP, "utf8")
      .replace(/\u00A0/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .trim();
    
    // Clean up temp file
    try { fs.unlinkSync(TMP); } catch {}
    
    return text;
  } catch (error) {
    console.error('pdftotext extraction failed:', error);
    return '';
  }
}

// STEP 2 — Clean into usable lines
function cleanLines(text: string): string[] {
  return text.split("\n").map(l => l.trim()).filter(Boolean);
}

// STEP 3 — Parse based strictly on positions
function parseRTC(lines: string[]) {
  // LOCATION (always appears together)
  const locLine = lines.find(l => l.includes("ನಂಬರ್"));
  let taluk = null, hobli = null, village = null, survey_number = null;

  if (locLine) {
    const t = locLine.split(" ").filter(Boolean);
    taluk = t[0] || null;
    hobli = t[1] || null;
    village = t[2] || null;
    survey_number = t.find(v => v.includes("ನಂಬರ್") || v.match(/[\d/]+\*/)) || null;
  }

  // VALID FROM (fixed format)
  const validFromLine = lines.find(l => l.includes("Valid from"));
  const valid_from = validFromLine?.match(/\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2}/)?.[0] || null;

  // HISSA NUMBER
  const hissaLine = lines.find(l => l.includes("ಹಿಸ್ಸಾ"));
  const hissa_number = survey_number?.split("/")?.pop()?.replace("*", "") || null;

  // TOTAL EXTENT
  const extentLine = lines.find(l => l.match(/\d+\.\d+\.\d+\.\d+/));
  const total_extent = extentLine?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || null;

  // PHUT KHARAB A & B
  const extentIndex = lines.indexOf(extentLine || '');
  const phut_a = lines[extentIndex + 1]?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || null;
  const phut_b = lines[extentIndex + 2]?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || null;

  // LAND TAX
  const taxLine = lines.find(l => l.includes("ಕಂದಾಯ"));
  const land_tax = taxLine?.match(/\d+(\.\d+)?/)?.[0] || null;

  // SOIL TYPE
  const soilIdx = lines.findIndex(l => l.includes("ನಮೂನೆ"));
  const soil_type = soilIdx !== -1 ? lines[soilIdx + 1] : null;

  // OWNERSHIP
  const ownerLine = lines.find(l =>
    l.includes(".") &&
    l.match(/\d+\.\d+\.\d+\.\d+/) &&
    l.match(/\b\d{1,4}\b/) &&
    l.match(/\bMR\b/i)
  );

  let owners: string[] = [], ownerExtent = null, account_no = null, mutation_no = null, mutation_date = null;

  if (ownerLine) {
    const t = ownerLine.split(" ").filter(Boolean);
    const extIdx = t.findIndex(v => v.match(/\d+\.\d+\.\d+\.\d+/));
    
    const ownerPart = t.slice(0, extIdx).join(" ");
    owners = ownerPart.split(".").map(o => o.trim()).filter(Boolean);
    
    ownerExtent = t[extIdx];
    account_no = t[extIdx + 1] || null;
    mutation_no = t.slice(extIdx + 2).find(v => v.includes("MR")) || null;
  }

  const dateMatch = lines.find(l => l.match(/\d{2}\/\d{2}\/\d{4}/));
  mutation_date = dateMatch?.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || null;

  // CULTIVATION LINES
  const cultivation = lines
    .filter(l => l.match(/\d{4}-\d{4}/))
    .map(l => ({
      year: l.match(/\d{4}-\d{4}/)?.[0] || null,
      season: l.includes("ಮುಂಗಾರು") ? (l.includes("ಪೂ.") ? "ಪೂರ್ವ ಮುಂಗಾರು" : "ಉತ್ತರ ಮುಂಗಾರು") : null,
      crop: l.includes("ಹು") ? "ಹು" : null,
      extent: l.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || null
    }));

  return {
    location: { taluk, hobli, village },
    land_identification: { survey_number, hissa_number, valid_from },
    land_details: {
      total_extent,
      phut_kharab_a: phut_a,
      phut_kharab_b: phut_b,
      remaining_extent: total_extent,
      land_tax,
      soil_type
    },
    ownership: {
      owners,
      extent: ownerExtent,
      account_no,
      mutation_no,
      mutation_date
    },
    cultivation
  };
}

// Main extraction function
export async function extractRTCData(pdfPath: string) {
  if (!pdfPath || typeof pdfPath !== 'string') {
    throw new Error('Invalid PDF path provided');
  }
  
  try {
    console.log(`Extracting data from: ${pdfPath}`);
    const raw = extractRaw(pdfPath);
    if (!raw) {
      throw new Error('Failed to extract text from PDF');
    }
    
    const lines = cleanLines(raw);
    console.log(`Extracted ${lines.length} lines from PDF`);
    
    const result = parseRTC(lines);
    console.log('Parsed RTC data:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('RTC extraction error:', error);
    throw error;
  }
}

// For Aadhaar, use improved text extraction
export async function extractAadhaarData(pdfPath: string) {
  if (!pdfPath || typeof pdfPath !== 'string') {
    throw new Error('Invalid PDF path provided');
  }
  
  try {
    console.log(`Extracting Aadhaar data from: ${pdfPath}`);
    const raw = extractRaw(pdfPath);
    const result = parseAadhaar(raw);
    console.log('Parsed Aadhaar data:', result);
    return result;
  } catch (error) {
    console.error('Aadhaar extraction error:', error);
    return {
      aadhaar_number: null,
      name_english: null,
      name_kannada: null,
      dob: null,
      gender: null,
      mobile: null,
      address: null
    };
  }
}

// Clean trailing commas/spaces
function clean(s: string): string | null {
  return s ? s.replace(/[,]+$/g, "").replace(/\s+/g, " ").trim() : null;
}

function parseAadhaar(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // -------------------------
  // Aadhaar Number
  // -------------------------
  const aadhaar = text.match(/\b\d{4}\s\d{4}\s\d{4}\b/);
  const aadhaarNumber = aadhaar ? aadhaar[0] : null;

  // -------------------------
  // Mobile Number
  // -------------------------
  const mobile = text.match(/[6-9]\d{9}/);
  const mobileNumber = mobile ? mobile[0] : null;

  // -------------------------
  // English Name
  // -------------------------
  const forbiddenEng = [
    "to", "c/o", "s/o", "w/o", "h/o",
    "address", "vtc", "po", "district",
    "state", "pin", "mobile", "dob",
    "male", "female", "verified",
    "signature", "digitally", "enrol",
    "identification", "authority", "india", "government", "unique",
    "uid", "enrollment", "card", "resident"
  ];

  const nameEnglish =
    lines.find(l =>
      /^[A-Za-z ]+$/.test(l) &&
      !forbiddenEng.some(f => l.toLowerCase().includes(f)) &&
      l.length > 3 &&
      l.length < 50 && // Reasonable name length
      l.split(' ').length >= 2 && // At least first and last name
      l.split(' ').length <= 4 // Max 4 name parts
    ) || null;

  // -------------------------
  // Kannada Name
  // -------------------------
  const forbiddenKan = [
    "ವಿಳಾ", "ನೋಂದಣಿ", "ನಂ", "DOB", "ಜನ್ಮ",
    "ವಿಳಾಸ", "ಮನೆ", "ರಸ್ತೆ", "ಬಡಾವಣೆ",
    "ತಾಲ್ಲೂಕು", "ಜಿಲ್ಲೆ", "ರಾಜ್ಯ", "ಪಿನ್",
    "ಸಹಿ", "ಸಹಿತ", "ಆಧಾರ್", "ಗುರುತು"
  ];

  const nameKannada =
    lines.find(l =>
      /[\u0C80-\u0CFF]+/.test(l) &&
      !forbiddenKan.some(f => l.includes(f)) &&
      l.length > 2 &&
      l.length < 30 && // Reasonable name length
      l.split(' ').length <= 3 // Max 3 name parts
    ) || null;

  // -------------------------
  // DOB
  // -------------------------
  const dobMatch = text.match(/DOB[: ]*(\d{2}\/\d{2}\/\d{4})/i);
  const dob = dobMatch ? dobMatch[1] : null;

  // -------------------------
  // Gender
  // -------------------------
  const gender = /MALE/i.test(text)
    ? "MALE"
    : /FEMALE/i.test(text)
    ? "FEMALE"
    : null;

  // -------------------------
  // English Address
  // -------------------------
  let addrEng = null;
  const engStart = lines.findIndex(l => l.startsWith("C/O") || l.startsWith("S/O"));

  if (engStart !== -1) {
    let block = [];

    for (let i = engStart; i < lines.length; i++) {
      const line = lines[i];

      // stop conditions for English address
      if (line.match(/\b\d{4} \d{4} \d{4}\b/)) break;
      if (/Signature|Digitally|Verified|Enrol|Mobile:/i.test(line)) break;

      block.push(clean(line));
    }
    addrEng = clean(block.join(", "));
  }

  // -------------------------
  // Kannada Address (pure Kannada only)
  // -------------------------
  let addrKan = null;
  const kanStart = lines.findIndex(
    l => l.includes("ವಿಳಾ") || l.includes("ವಿಳಾಸ")
  );

  if (kanStart !== -1) {
    let block = [];

    for (let i = kanStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Stop ONLY if the line is clearly not Kannada
      if (line.match(/\b\d{4} \d{4} \d{4}\b/)) break; // Aadhaar number
      if (/Enrol|Signature|Digitally|Verified|DOB|Details as on/i.test(line)) break;

      const kan = line.match(/[\u0C80-\u0CFF]/g)?.length || 0;
      const eng = line.match(/[A-Za-z]/g)?.length || 0;

      // Keep line only if Kannada chars dominate English chars
      if (kan > eng) {
        block.push(clean(line));
      }
    }

    addrKan = clean(block.join(", "));
  }

  return {
    aadhaar_number: aadhaarNumber,
    name_english: nameEnglish,
    name_kannada: nameKannada,
    dob,
    gender,
    mobile: mobileNumber,
    address: addrEng,
  };
}