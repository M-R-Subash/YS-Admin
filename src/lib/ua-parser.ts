export interface ParsedDevice {
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
  label: string;
}

/**
 * Lightweight, zero-dependency parser for user-agent strings.
 * Accurately detects OS, browser, and device form-factor.
 */
export function parseUserAgent(ua?: string | null): ParsedDevice {
  if (!ua || typeof ua !== "string") {
    return {
      browser: "Web Browser",
      os: "Unknown OS",
      deviceType: "desktop",
      label: "Web Browser",
    };
  }

  let os = "Unknown OS";
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";

  // OS & Device Type Detection
  if (/iPhone/i.test(ua)) {
    os = "iOS";
    deviceType = "mobile";
  } else if (/iPad/i.test(ua)) {
    os = "iPadOS";
    deviceType = "tablet";
  } else if (/Android/i.test(ua)) {
    os = "Android";
    deviceType = /Mobile/i.test(ua) ? "mobile" : "tablet";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "macOS";
    deviceType = "desktop";
  } else if (/Windows NT 10.0/i.test(ua)) {
    os = "Windows 10/11";
    deviceType = "desktop";
  } else if (/Windows NT/i.test(ua)) {
    os = "Windows";
    deviceType = "desktop";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
    deviceType = "desktop";
  }

  // Browser Detection
  let browser = "Web Browser";
  if (/Edg\//i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/Chrome\//i.test(ua) && !/Chromium|Edg/i.test(ua)) {
    browser = "Google Chrome";
  } else if (/Safari\//i.test(ua) && !/Chrome|Chromium/i.test(ua)) {
    browser = "Safari";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Mozilla Firefox";
  } else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
    browser = "Opera";
  }

  return {
    browser,
    os,
    deviceType,
    label: `${browser} on ${os}`,
  };
}
