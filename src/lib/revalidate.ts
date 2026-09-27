import { serverConfig } from "@/lib/config/server";

/**
 * Triggers on-demand ISR revalidation on the main.ys frontend application.
 * Called automatically when content is published, edited, or deleted in the CMS.
 */
export async function revalidateFrontendPath(
  path: string,
  type: "page" | "layout" = "page"
): Promise<boolean> {
  const frontendUrl = serverConfig.app.frontendUrl;
  const secret = serverConfig.security.revalidationSecret;

  if (!secret) {
    console.warn(
      "[revalidate] REVALIDATION_SECRET is not set. Skipping revalidation."
    );
    return false;
  }

  // Normalize path with leading slash
  let normalizedPath = path.trim();
  if (!normalizedPath.startsWith("/")) {
    normalizedPath = `/${normalizedPath}`;
  }

  try {
    const endpoint = `${frontendUrl.replace(/\/$/, "")}/api/revalidate`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret,
        path: normalizedPath,
        type,
      }),
      // 5-second timeout so admin operations are never blocked if frontend is down
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn(
        `[revalidate] Failed to revalidate path "${normalizedPath}" (${type}):`,
        err
      );
      return false;
    }

    const data = await response.json();
    console.log(
      `[revalidate] Successfully revalidated "${normalizedPath}" (${type}) at ${new Date(
        data.timestamp
      ).toISOString()}`
    );
    return true;
  } catch (error: any) {
    console.warn(
      `[revalidate] Could not reach frontend at ${frontendUrl}:`,
      error?.message || error
    );
    return false;
  }
}
