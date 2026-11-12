'use client';

import { useGeneralSubmissionOpen } from '@/hooks/use-settings';

/**
 * Renders its children (a "Submit an Innovation" link) only while the admin has general
 * submission switched on (GET /settings/submission). Lets server components such as the footer
 * gate their links without becoming client components themselves.
 */
export function GeneralSubmitGate({ children }: { children: React.ReactNode }) {
  return useGeneralSubmissionOpen() ? <>{children}</> : null;
}
