/**
 * Secure Client-Side Media Upload Helper
 * Routes through the authenticated Next.js backend endpoint (/api/cloudinary/upload)
 * instead of exposing unsigned Cloudinary presets directly to the browser.
 */

export interface UploadedMediaResult {
  secure_url: string;
  url?: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  created_at?: string;
  original_filename?: string;
  [key: string]: any;
}

export async function uploadMediaFile(file: File): Promise<UploadedMediaResult> {
  if (!file) {
    throw new Error("No file selected for upload");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/cloudinary/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.secure_url) {
    throw new Error(data.error || "Failed to upload file to media storage");
  }

  return data as UploadedMediaResult;
}
