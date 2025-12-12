/**
 * patterns.js
 * Regex patterns for PII detection in the PIIVault system.
 * Optimized for JavaScript with global flags for iterative matching.
 */

/**
 * PII detection patterns.
 * All patterns use the global flag for multiple match detection.
 * 
 * IMPORTANT: Order matters! More specific patterns (credit card, IP) 
 * should be matched BEFORE less specific ones (phone).
 * Using an array of tuples to preserve order.
 */
export const PATTERNS_ORDERED = [


  // IPv4 Address: Standard dotted decimal notation
  // Matches: 192.168.1.1, 10.0.0.255, 172.16.0.1
  ['IPV4', /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g],

  // Credit Card: 13-16 digits with optional spacers (spaces or dashes)
  // Matches: 4111111111111111, 4111-1111-1111-1111, 4111 1111 1111 1111
  ['CREDIT_CARD', /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/g],

  // Email: Standard validation with subdomain support
  // Matches: user@domain.com, user.name+tag@sub.domain.co.uk
  ['EMAIL', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],

  // Phone: Matches common phone formats but NOT IP addresses or credit cards
  // Uses negative lookbehind for dots to avoid IP addresses
  // Matches: +1-555-123-4567, (555) 123-4567, 555-123-4567
  ['PHONE', /(?<!\.)(?<!\d)\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}(?!\.)/g]
];

/**
 * Legacy object format for backwards compatibility.
 * @deprecated Use PATTERNS_ORDERED instead
 */
export const PATTERNS = Object.fromEntries(PATTERNS_ORDERED);

/**
 * Tag prefixes for semantic masking.
 * Maps pattern keys to human-readable tag names.
 */
export const TAG_PREFIXES = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  CREDIT_CARD: 'CREDIT_CARD',
  IPV4: 'IPV4'
};

