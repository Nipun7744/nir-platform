import { API_BASE_URL } from './config';
import { useAuthStore } from '@/store/auth-store';

export interface UploadResult {
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);

  const { accessToken } = useAuthStore.getState();
  const res = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Upload failed');
  }
  return res.json();
}
