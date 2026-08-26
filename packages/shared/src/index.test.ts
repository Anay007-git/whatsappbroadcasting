import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  extractTemplateVariables,
  renderTemplateVariables,
  generateSecureToken,
} from './index';

describe('Shared Utilities', () => {
  describe('normalizePhoneNumber', () => {
    it('normalizes 10-digit Indian numbers to E.164 (+91)', () => {
      expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
      expect(normalizePhoneNumber('09876543210')).toBe('+919876543210');
      expect(normalizePhoneNumber('+91 98765-43210')).toBe('+919876543210');
    });

    it('handles numbers already with + international codes', () => {
      expect(normalizePhoneNumber('+1 (555) 234-5678')).toBe('+15552345678');
      expect(normalizePhoneNumber('+44 7911 123456')).toBe('+447911123456');
    });

    it('handles 00 international prefix', () => {
      expect(normalizePhoneNumber('00919876543210')).toBe('+919876543210');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('returns true for valid E.164 phone numbers', () => {
      expect(isValidPhoneNumber('+919876543210')).toBe(true);
      expect(isValidPhoneNumber('+15552345678')).toBe(true);
    });

    it('returns false for invalid numbers', () => {
      expect(isValidPhoneNumber('9876543210')).toBe(false);
      expect(isValidPhoneNumber('invalid')).toBe(false);
      expect(isValidPhoneNumber('+123')).toBe(false);
    });
  });

  describe('extractTemplateVariables', () => {
    it('extracts unique variable tokens', () => {
      const template = 'Hi {{firstName}}, welcome to {{eventName}}! Venue: {{venue}}. See you {{firstName}}!';
      expect(extractTemplateVariables(template)).toEqual(['firstName', 'eventName', 'venue']);
    });

    it('extracts nested custom field tokens', () => {
      const template = 'VIP Level: {{custom.vipLevel}}, Code: {{custom.dealerCode}}';
      expect(extractTemplateVariables(template)).toEqual(['custom.vipLevel', 'custom.dealerCode']);
    });
  });

  describe('renderTemplateVariables', () => {
    it('replaces tokens accurately', () => {
      const template = 'Hi {{firstName}}, RSVP here: {{rsvpUrl}}';
      const variables = {
        firstName: 'Rahul',
        rsvpUrl: 'https://eventblast.io/rsvp/xyz123',
      };
      const result = renderTemplateVariables(template, variables);
      expect(result.rendered).toBe('Hi Rahul, RSVP here: https://eventblast.io/rsvp/xyz123');
      expect(result.missingVariables).toEqual([]);
    });

    it('reports missing variables', () => {
      const template = 'Hi {{firstName}}, join {{eventName}} at {{venue}}!';
      const variables = { firstName: 'Anay' };
      const result = renderTemplateVariables(template, variables);
      expect(result.missingVariables).toEqual(['eventName', 'venue']);
    });
  });

  describe('generateSecureToken', () => {
    it('generates secure random base64url strings', () => {
      const token1 = generateSecureToken(16);
      const token2 = generateSecureToken(16);
      expect(token1).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(15);
    });
  });
});
