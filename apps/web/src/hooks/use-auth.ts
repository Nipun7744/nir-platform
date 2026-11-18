'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface AuthResponse {
  user: { id: string; email: string; fullName: string; roles: string[]; locale: string };
  accessToken: string;
  refreshToken: string;
}

export type CaptchaProvider = 'turnstile' | 'recaptcha' | 'hcaptcha' | 'none';
export type OtpChannel = 'EMAIL' | 'SMS';

export interface SecurityConfig {
  captcha: { provider: CaptchaProvider; siteKey: string | null };
  otp: { channels: OtpChannel[]; codeLength: number; ttlSeconds: number; resendSeconds: number };
}

/** CAPTCHA provider/site key + OTP settings, served by the API so they're configured in one place. */
export function useSecurityConfig() {
  return useQuery({
    queryKey: ['auth', 'security-config'],
    queryFn: () => api.get<SecurityConfig>('/auth/security-config'),
    staleTime: 5 * 60 * 1000,
  });
}

export interface OtpSent {
  channel: OtpChannel;
  sentTo: string;
  expiresInSeconds: number;
  resendInSeconds: number;
}

/** Registration step 1: send a one-time code to the email address or phone being verified. */
export function useSendOtp() {
  return useMutation({
    mutationFn: (input: { channel: OtpChannel; email?: string; phone?: string; locale?: string; captchaToken?: string }) =>
      api.post<OtpSent>('/auth/otp/send', input),
  });
}

// ---- Forgot password (POST /auth/password/*) — three steps, no session is created ----

/** Step 1: send a reset code to the registered email address or mobile number. */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: { channel: OtpChannel; email?: string; phone?: string; locale?: string; captchaToken?: string }) =>
      api.post<OtpSent>('/auth/password/forgot', input),
  });
}

/** Step 2: check the code; returns a short-lived token for step 3. */
export function useVerifyResetCode() {
  return useMutation({
    mutationFn: (input: { channel: OtpChannel; email?: string; phone?: string; code: string }) =>
      api.post<{ resetToken: string; expiresInSeconds: number }>('/auth/password/verify-code', input),
  });
}

/** Step 3: set the new password. The API signs the account out on every device. */
export function useResetPassword() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { resetToken: string; password: string; confirmPassword: string }) =>
      api.post<{ success: true; message: string }>('/auth/password/reset', input),
    onSuccess: () => {
      // Any session in this browser was just revoked server-side — drop it locally too.
      clear();
      queryClient.clear();
    },
  });
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { email: string; password: string; captchaToken?: string }) =>
      api.post<AuthResponse>('/auth/login', input),
    onSuccess: (data) => {
      setSession(data as any);
      queryClient.invalidateQueries();
    },
  });
}

// Since 2026-11-15 a verified OTP activates the account, and the response is a full session
// (`pending: false`). `pending: true` (no tokens) is kept for API versions that still queue for
// admin approval.
type RegisterResponse =
  | ({ pending: false; message: string } & AuthResponse)
  | { pending: true; message: string };

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    onSuccess: (data) => {
      if (!data.pending) {
        setSession(data as any);
        queryClient.invalidateQueries();
      }
    },
    mutationFn: (input: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      otpChannel: OtpChannel;
      otpCode: string;
      role?: 'INVESTOR' | 'MENTOR' | 'MINISTRY_FOCAL_POINT';
      organizationName?: string;
      binNumber?: string;
      sectorInterestIds?: string[];
      bio?: string;
      availability?: string;
      expertiseTagIds?: string[];
      ministryId?: string;
      title?: string;
    }) => api.post<RegisterResponse>('/auth/register', input),
  });
}

export function useLogout() {
  const { refreshToken, clear } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (refreshToken ? api.post('/auth/logout', { refreshToken }) : Promise.resolve()),
    onSettled: () => {
      clear();
      queryClient.clear();
    },
  });
}

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me'),
    enabled: Boolean(accessToken),
    retry: false,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return useMutation({
    mutationFn: (input: {
      fullName?: string;
      phone?: string;
      designation?: string;
      institution?: string;
      avatarUrl?: string;
      categoryIds?: string[];
    }) => api.patch('/users/me', input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      if (variables.fullName && user && accessToken && refreshToken) {
        setSession({ accessToken, refreshToken, user: { ...user, fullName: variables.fullName } });
      }
    },
  });
}
