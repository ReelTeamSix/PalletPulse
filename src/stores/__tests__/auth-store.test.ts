// Auth Store Unit Tests
import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from '../auth-store';
import { supabase } from '@/src/lib/supabase';

// Mock Supabase - needs to be before imports to work correctly
jest.mock('@/src/lib/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      isInitialized: false,
      error: null,
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should initialize with existing session', async () => {
      const mockSession = {
        access_token: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockReturnValueOnce({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.isLoading).toBe(false);
    });

    it('should initialize without session', async () => {
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      (mockSupabase.auth.onAuthStateChange as jest.Mock).mockReturnValueOnce({
        data: { subscription: { unsubscribe: jest.fn() } },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should handle initialization error gracefully', async () => {
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Network error' },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      // Auth errors during init are handled gracefully (user redirected to login)
      // without showing an error message - just clears session state
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should sign in successfully', async () => {
      const mockSession = {
        access_token: 'test-token',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password123');
      });

      expect(signInResult).toEqual({ success: true });
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.error).toBeNull();
    });

    it('should handle invalid credentials', async () => {
      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const { result } = renderHook(() => useAuthStore());

      let signInResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrongpassword');
      });

      expect(signInResult!.success).toBe(false);
      expect(signInResult!.error).toBe('Invalid email or password. Please try again.');
      expect(result.current.session).toBeNull();
    });

    it('should set loading state during sign in', async () => {
      (mockSupabase.auth.signInWithPassword as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          data: { user: null, session: null },
          error: null,
        }), 100))
      );

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('signUp', () => {
    it('should sign up successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, session: null }, // No session when email confirmation required
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('test@example.com', 'password123');
      });

      expect(signUpResult).toEqual({ success: true });
    });

    it('should handle existing email error', async () => {
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const { result } = renderHook(() => useAuthStore());

      let signUpResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        signUpResult = await result.current.signUp('existing@example.com', 'password123');
      });

      expect(signUpResult!.success).toBe(false);
      expect(signUpResult!.error).toBe('An account with this email already exists.');
    });

    it('should pass affiliate code when provided', async () => {
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: '123' }, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123', 'GRPL2024');
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: 'palletpro://auth/callback',
          data: {
            affiliate_code: 'GRPL2024',
          },
        },
      });
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      // Set initial signed-in state
      useAuthStore.setState({
        user: { id: 'user-123', email: 'test@example.com' } as any,
        session: { access_token: 'token' } as any,
      });

      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should clear state even on signOut error', async () => {
      useAuthStore.setState({
        user: { id: 'user-123', email: 'test@example.com' } as any,
        session: { access_token: 'token' } as any,
      });

      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
        error: { message: 'Network error' },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      // Should still clear local state even if API call fails
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should send reset email successfully', async () => {
      (mockSupabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      let resetResult;
      await act(async () => {
        resetResult = await result.current.resetPassword('test@example.com');
      });

      expect(resetResult).toEqual({ success: true });
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: 'palletpro://reset-password' }
      );
    });

    it('should handle rate limit error', async () => {
      (mockSupabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValueOnce({
        error: { message: 'For security purposes, you can only request this once every 60 seconds' },
      });

      const { result } = renderHook(() => useAuthStore());

      let resetResult: { success: boolean; error?: string } | undefined;
      await act(async () => {
        resetResult = await result.current.resetPassword('test@example.com');
      });

      expect(resetResult!.success).toBe(false);
      expect(resetResult!.error).toBe('Please wait before requesting another password reset.');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
