// Auth Schema Validation Tests
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../auth-schemas';

describe('Auth Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should pass with valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should fail with empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('should fail with invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'notanemail',
        password: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('should fail with empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });
  });

  describe('signupSchema', () => {
    it('should pass with valid data', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should pass with optional affiliate code', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        affiliateCode: 'GRPL2024',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.affiliateCode).toBe('GRPL2024');
      }
    });

    it('should fail with password less than 6 characters', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: '12345',
        confirmPassword: '12345',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 6 characters');
      }
    });

    it('should fail with password more than 72 characters', () => {
      const longPassword = 'a'.repeat(73);
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: longPassword,
        confirmPassword: longPassword,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be less than 72 characters');
      }
    });

    it('should fail when passwords do not match', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'differentpassword',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const mismatchError = result.error.issues.find(
          (issue) => issue.path.includes('confirmPassword')
        );
        expect(mismatchError?.message).toBe('Passwords do not match');
      }
    });

    it('should fail with empty confirm password', () => {
      const result = signupSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please confirm your password');
      }
    });

    it('should fail with invalid email', () => {
      const result = signupSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should pass with valid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should fail with empty email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('should fail with invalid email format', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });
  });

  describe('resetPasswordSchema', () => {
    it('should pass with valid matching passwords', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should fail with short password', () => {
      const result = resetPasswordSchema.safeParse({
        password: '12345',
        confirmPassword: '12345',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 6 characters');
      }
    });

    it('should fail when passwords do not match', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'newpassword123',
        confirmPassword: 'differentpassword',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const mismatchError = result.error.issues.find(
          (issue) => issue.path.includes('confirmPassword')
        );
        expect(mismatchError?.message).toBe('Passwords do not match');
      }
    });
  });
});
