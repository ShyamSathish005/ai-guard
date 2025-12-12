import { describe, it, expect } from 'vitest';
import { PIIVault } from '../src/features/pii/vault.js';

// Factory function for testing
const createPIIVault = () => new PIIVault();

describe('PIIVault', () => {
    describe('factory function', () => {
        it('creates a new PIIVault instance', () => {
            const vault = createPIIVault();
            expect(vault).toBeInstanceOf(PIIVault);
        });
    });

    describe('mask()', () => {
        it('masks email addresses with semantic tags', () => {
            const vault = new PIIVault();
            const result = vault.mask('Contact john@example.com for help');
            expect(result).toBe('Contact <EMAIL_1> for help');
        });

        it('masks phone numbers', () => {
            const vault = new PIIVault();
            const result = vault.mask('Call me at 555-123-4567');
            expect(result).toContain('<PHONE_');
        });

        it('masks credit card numbers', () => {
            const vault = new PIIVault();
            const result = vault.mask('Card: 4111-1111-1111-1111');
            expect(result).toContain('<CREDIT_CARD_');
        });

        it('masks IPv4 addresses', () => {
            const vault = new PIIVault();
            const result = vault.mask('Server IP: 192.168.1.1');
            expect(result).toBe('Server IP: <IPV4_1>');
        });
    });

    describe('referential consistency', () => {
        it('uses the same tag for repeated values (consistency)', () => {
            const vault = new PIIVault();
            const result = vault.mask('Email john@test.com and john@test.com again');
            expect(result).toBe('Email <EMAIL_1> and <EMAIL_1> again');
        });

        it('uses different tags for different values (isolation)', () => {
            const vault = new PIIVault();
            const result = vault.mask('Email john@test.com and mary@test.com');
            expect(result).toBe('Email <EMAIL_1> and <EMAIL_2>');
        });
    });

    describe('unmask()', () => {
        it('restores original values from semantic tags', () => {
            const vault = new PIIVault();
            vault.mask('Contact john@example.com');
            const restored = vault.unmask('Reply to <EMAIL_1>');
            expect(restored).toBe('Reply to john@example.com');
        });

        it('handles fuzzy matching with spaces inside brackets', () => {
            const vault = new PIIVault();
            vault.mask('Contact john@example.com');
            const restored = vault.unmask('Reply to < EMAIL_1 >');
            expect(restored).toBe('Reply to john@example.com');
        });

        it('handles fuzzy matching with square brackets', () => {
            const vault = new PIIVault();
            vault.mask('Contact john@example.com');
            const restored = vault.unmask('Reply to [EMAIL_1]');
            expect(restored).toBe('Reply to john@example.com');
        });

        it('handles fuzzy matching with parentheses', () => {
            const vault = new PIIVault();
            vault.mask('Contact john@example.com');
            const restored = vault.unmask('Reply to (EMAIL_1)');
            expect(restored).toBe('Reply to john@example.com');
        });
    });

    describe('sort ordering', () => {
        it('replaces longer tags before shorter ones (EMAIL_10 before EMAIL_1)', () => {
            const vault = new PIIVault();

            // Generate 10 unique emails to create EMAIL_1 through EMAIL_10
            for (let i = 1; i <= 10; i++) {
                vault.mask(`user${i}@test.com`);
            }

            expect(vault.size).toBe(10);

            // Create text with both EMAIL_1 and EMAIL_10
            const text = 'First: <EMAIL_1> and Tenth: <EMAIL_10>';
            const restored = vault.unmask(text);

            // EMAIL_10 should resolve to user10@test.com, not user1@test.com + "0"
            expect(restored).toBe('First: user1@test.com and Tenth: user10@test.com');
        });
    });

    describe('flush()', () => {
        it('clears all stored mappings', () => {
            const vault = new PIIVault();
            vault.mask('Contact john@example.com');
            expect(vault.size).toBe(1);

            vault.flush();
            expect(vault.size).toBe(0);
        });

        it('resets counters after flush', () => {
            const vault = new PIIVault();
            vault.mask('john@example.com');
            vault.flush();

            const result = vault.mask('mary@example.com');
            expect(result).toBe('<EMAIL_1>'); // Counter restarted at 1
        });
    });

    describe('round-trip', () => {
        it('correctly round-trips when LLM echoes tags', () => {
            const vault = new PIIVault();
            const original = 'Contact john@example.com and call 555-123-4567';
            const masked = vault.mask(original);

            // Simulate LLM echoing the tags
            const llmResponse = `I will contact ${masked.match(/<EMAIL_\d+>/)[0]} shortly.`;
            const restored = vault.unmask(llmResponse);

            expect(restored).toContain('john@example.com');
        });
    });
});
