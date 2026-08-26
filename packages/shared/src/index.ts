import crypto from 'crypto';
import { ApiResponse } from '@eventblast/types';

/**
 * Normalizes phone numbers to standard E.164 format.
 * Defaults to India (+91) if country code is omitted.
 */
export function normalizePhoneNumber(rawPhone: string, defaultCountryCode = '91'): string {
  if (!rawPhone) return '';

  // Remove whitespace, dashes, brackets, dots
  let cleaned = rawPhone.replace(/[^\d+]/g, '').trim();

  if (!cleaned) return '';

  // If already starts with '+', ensure valid digits
  if (cleaned.startsWith('+')) {
    const digitsOnly = cleaned.slice(1).replace(/\D/g, '');
    return `+${digitsOnly}`;
  }

  // If starts with 00 (international format like 0091...), convert to +
  if (cleaned.startsWith('00')) {
    return `+${cleaned.slice(2)}`;
  }

  // If starts with single leading 0 (common local trunk prefix in India/UK etc)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // If 10 digits and default country is India (91), prefix +91
  if (cleaned.length === 10) {
    return `+${defaultCountryCode}${cleaned}`;
  }

  // If it already has country code prepended without +
  if (cleaned.startsWith(defaultCountryCode) && cleaned.length === 10 + defaultCountryCode.length) {
    return `+${cleaned}`;
  }

  return `+${cleaned}`;
}

/**
 * Validates whether an E.164 normalized phone number is compliant.
 * Length should typically be between 8 and 16 characters including '+'.
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || !phone.startsWith('+')) return false;
  const digits = phone.slice(1);
  return /^\d{8,15}$/.test(digits);
}

/**
 * Extracts all variable keys inside double curly braces: e.g. {{firstName}}, {{custom.vipLevel}}
 */
export function extractTemplateVariables(template: string): string[] {
  if (!template) return [];
  const regex = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
  const matches = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    if (match[1]) {
      matches.add(match[1].trim());
    }
  }

  return Array.from(matches);
}

/**
 * Resolves nested property path in object, e.g. "custom.vipLevel" in { custom: { vipLevel: "Gold" } }
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current: any = obj;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Renders template string substituting variables.
 * Tracks any missing/unresolved variables to prevent sending incomplete text.
 */
export function renderTemplateVariables(
  template: string,
  variables: Record<string, any>,
  allowMissing = false
): { rendered: string; missingVariables: string[] } {
  if (!template) return { rendered: '', missingVariables: [] };

  const missingVariables: string[] = [];
  const rendered = template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const value = getNestedValue(variables, trimmedKey);

    if (value === undefined || value === null || value === '') {
      missingVariables.push(trimmedKey);
      return allowMissing ? match : '';
    }

    return String(value);
  });

  return {
    rendered,
    missingVariables: Array.from(new Set(missingVariables)),
  };
}

/**
 * Generates a cryptographically secure URL-friendly token for RSVP links.
 */
export function generateSecureToken(byteLength = 12): string {
  return crypto.randomBytes(byteLength).toString('base64url');
}

/**
 * Helper to build standard API success response.
 */
export function createApiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Helper to build standard API error response.
 */
export function createApiError(code: string, message: string, details?: any): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}
