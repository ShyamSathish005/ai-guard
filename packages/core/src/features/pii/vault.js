/**
 * vault.js
 * PIIVault - Reversible PII Redaction System
 * 
 * Enables masking sensitive data before sending to LLMs,
 * and unmasking LLM responses to restore original values locally.
 */

import { PATTERNS_ORDERED, TAG_PREFIXES } from './patterns.js';

/**
 * PIIVault class for reversible PII masking/unmasking.
 * 
 * Features:
 * - Referential Consistency: Same value always maps to same tag
 * - Semantic Tags: Human-readable tags like <EMAIL_1>, <PHONE_2>
 * - Fuzzy Unmasking: Handles LLM hallucinations (brackets, spacing)
 * 
 * @example
 * const vault = new PIIVault();
 * const masked = vault.mask("Contact john@test.com");
 * // Send masked text to LLM...
 * const restored = vault.unmask(llmResponse);
 */
export class PIIVault {
    constructor() {
        /**
         * The Vault: Maps semantic tags to original secret values.
         * @type {Map<string, string>}
         */
        this.vault = new Map();

        /**
         * Reverse Map: Maps original values to their assigned tags.
         * Critical for referential consistency.
         * @type {Map<string, string>}
         */
        this.reverseMap = new Map();

        /**
         * Counters: Track incremental IDs per PII type.
         * @type {Object<string, number>}
         */
        this.counters = {};

        // Initialize counters for each pattern type
        for (const type of Object.keys(TAG_PREFIXES)) {
            this.counters[type] = 0;
        }
    }

    /**
     * Mask PII in the input text with semantic tags.
     * 
     * @param {string} text - The input text containing PII
     * @returns {string} - Text with PII replaced by semantic tags
     * 
     * @example
     * vault.mask("Email john@test.com and john@test.com")
     * // Returns: "Email <EMAIL_1> and <EMAIL_1>"
     */
    mask(text) {
        let maskedText = text;

        for (const [type, pattern] of PATTERNS_ORDERED) {
            const prefix = TAG_PREFIXES[type];

            // Reset regex lastIndex for fresh matching
            pattern.lastIndex = 0;

            // Find all matches
            const matches = text.matchAll(pattern);

            for (const match of matches) {
                const value = match[0];

                // Check if this value already has an assigned tag
                let tag;
                if (this.reverseMap.has(value)) {
                    // Referential Consistency: reuse existing tag
                    tag = this.reverseMap.get(value);
                } else {
                    // Generate new semantic tag
                    this.counters[type]++;
                    tag = `<${prefix}_${this.counters[type]}>`;

                    // Store in both maps
                    this.vault.set(tag, value);
                    this.reverseMap.set(value, tag);
                }

                // Replace all occurrences of this specific value
                maskedText = maskedText.split(value).join(tag);
            }
        }

        return maskedText;
    }

    /**
     * Unmask semantic tags in text, restoring original PII values.
     * 
     * Includes fuzzy matching to handle LLM output variations:
     * - <EMAIL_1>, < EMAIL_1 >, [EMAIL_1], (EMAIL_1)
     * 
     * @param {string} text - The text containing semantic tags
     * @returns {string} - Text with original PII values restored
     * 
     * @example
     * vault.unmask("Contact < EMAIL_1 > for help")
     * // Returns: "Contact john@test.com for help"
     */
    unmask(text) {
        let unmaskedText = text;

        // Get all tags and sort by length (descending) to prevent partial replacements
        // This ensures <EMAIL_10> is replaced before <EMAIL_1>
        const tags = Array.from(this.vault.keys()).sort((a, b) => b.length - a.length);

        for (const tag of tags) {
            const originalValue = this.vault.get(tag);

            // Extract the inner tag content (e.g., "EMAIL_1" from "<EMAIL_1>")
            const innerTag = tag.slice(1, -1);

            // Escape special regex characters in the inner tag
            const escapedInner = innerTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Build fuzzy pattern to match variations:
            // - <EMAIL_1>, < EMAIL_1 >, [EMAIL_1], (EMAIL_1)
            const fuzzyPattern = new RegExp(
                `[<\\[\\(]\\s*${escapedInner}\\s*[>\\]\\)]`,
                'g'
            );

            unmaskedText = unmaskedText.replace(fuzzyPattern, originalValue);
        }

        return unmaskedText;
    }

    /**
     * Clear all stored mappings and reset counters.
     * Use for session cleanup or starting a new context.
     */
    flush() {
        this.vault.clear();
        this.reverseMap.clear();

        for (const type of Object.keys(TAG_PREFIXES)) {
            this.counters[type] = 0;
        }
    }

    /**
     * Get the current size of the vault (number of unique PII values stored).
     * @returns {number}
     */
    get size() {
        return this.vault.size;
    }
}
