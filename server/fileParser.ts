import * as XLSX from 'xlsx';

export interface ParsedPhoneNumber {
  phone: string;
  metadata?: Record<string, any>;
}

/**
 * Parse CSV or XLS file and extract phone numbers
 * Expects a column named 'phone' or 'phone_number'
 * All other columns will be stored as metadata JSON
 */
export function parsePhoneNumberFile(buffer: Buffer, filename: string): ParsedPhoneNumber[] {
  try {
    // Read the workbook from buffer
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No sheets found in file');
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error('Failed to read sheet');
    }

    // Convert sheet to JSON
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    if (data.length === 0) {
      throw new Error('No data found in file');
    }

    // Find phone column (case-insensitive)
    const firstRow = data[0];
    const phoneColumn = Object.keys(firstRow).find(key => 
      key.toLowerCase() === 'phone' || 
      key.toLowerCase() === 'phone_number' ||
      key.toLowerCase() === 'phonenumber'
    );

    if (!phoneColumn) {
      throw new Error('No phone column found. Expected column named "phone" or "phone_number"');
    }

    // Parse rows
    const results: ParsedPhoneNumber[] = [];
    
    for (const row of data) {
      const phone = String(row[phoneColumn] || '').trim();
      
      // Skip empty phones
      if (!phone) continue;

      // Normalize phone number (remove spaces, dashes, etc.)
      const normalizedPhone = normalizePhoneNumber(phone);
      
      // Collect metadata (all columns except phone)
      const metadata: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        if (key !== phoneColumn && value !== null && value !== undefined) {
          metadata[key] = value;
        }
      }

      results.push({
        phone: normalizedPhone,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    }

    return results;
  } catch (error: any) {
    console.error('[FileParser] Error parsing file:', error);
    throw new Error(`Failed to parse file: ${error.message}`);
  }
}

/**
 * Normalize phone number to E.164 format if possible
 * Removes spaces, dashes, parentheses
 * Ensures it starts with +
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If doesn't start with +, add it
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }

  return normalized;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Basic E.164 validation: + followed by 7-15 digits
  const e164Regex = /^\+\d{7,15}$/;
  return e164Regex.test(phone);
}
