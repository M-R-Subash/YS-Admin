import { clientConfig } from "@/lib/config/client";

export const BRAND_LOGO_URL =
  "https://res.cloudinary.com/subash-cms/image/upload/v1788346719/image-8.png";

export interface BlogNewsletterData {
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  readingTime?: number | null;
  categoryName?: string | null;
}

/**
 * Formats message body content so plain text newlines are preserved in email clients
 * while respecting existing HTML tags.
 */
export function formatEmailBody(content: string): string {
  if (!content) return "";
  const trimmed = content.trim();
  // Check if content is already structured with HTML block tags (<p>, <div>, <h1>-<h6>, <ul>, <ol>, <table>)
  const hasBlockTags = /<(p|div|h[1-6]|ul|ol|table|blockquote)[^>]*>/i.test(trimmed);
  if (!hasBlockTags) {
    // Plain text: convert double newlines to paragraphs, and single newlines to <br />
    return trimmed
      .split(/\r?\n\r?\n+/)
      .map(
        (para) =>
          `<p style="margin: 0 0 16px 0; line-height: 1.7; color: #d1d5db;">${para.replace(
            /\r?\n/g,
            "<br />"
          )}</p>`
      )
      .join("");
  }
  // Has HTML: convert standalone newlines between text into <br/>
  return trimmed.replace(/([^>])\r?\n([^<])/g, "$1<br />$2");
}

export function renderBlogNewsletterHtml(
  blog: BlogNewsletterData,
  unsubscribeUrl: string
): string {
  const siteUrl = clientConfig.app.frontendUrl.replace(/\/$/, "");
  const cleanSlug = blog.slug.replace(/^\/+/, "");
  const articleUrl = cleanSlug.startsWith("blogs/")
    ? `${siteUrl}/${cleanSlug}`
    : `${siteUrl}/blogs/${cleanSlug}`;

  const metaParts: string[] = [];
  if (blog.categoryName) {
    metaParts.push(blog.categoryName.toUpperCase());
  }
  if (blog.readingTime) {
    metaParts.push(`${blog.readingTime} min read`);
  }
  const metaLine = metaParts.join(" &bull; ");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blog.title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #0a0c10; border-radius: 16px; border: 1px solid #1f242d; overflow: hidden; box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.8);">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #0a0c10 0%, #121622 100%); border-bottom: 1px solid #1f242d;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${BRAND_LOGO_URL}" alt="YS Innovations" width="165" height="34" style="height: 34px; width: auto; max-height: 38px; display: block; border: 0; outline: none;" />
                    </a>
                  </td>
                  <td align="right">
                    <span style="font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background-color: rgba(245, 168, 23, 0.12); color: #F5A817; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(245, 168, 23, 0.35);">
                      NEW POST
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            blog.featuredImage
              ? `
          <!-- FEATURED HERO IMAGE -->
          <tr>
            <td style="padding: 0;">
              <a href="${articleUrl}" target="_blank" style="text-decoration: none; display: block;">
                <img src="${blog.featuredImage}" alt="${blog.title}" width="620" style="width: 100%; max-width: 620px; height: auto; display: block; border: 0; outline: none;" />
              </a>
            </td>
          </tr>
          `
              : ""
          }

          ${
            metaLine
              ? `
          <!-- ARTICLE METADATA -->
          <tr>
            <td style="padding: 28px 32px 12px 32px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: #F5A817; text-transform: uppercase;">
                      ${metaLine}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `
              : ""
          }

          <!-- ARTICLE TITLE -->
          <tr>
            <td style="padding: ${metaLine ? "0" : "28px"} 32px 16px 32px;">
              <h1 style="margin: 0; font-size: 24px; line-height: 1.35; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                <a href="${articleUrl}" target="_blank" style="color: #ffffff; text-decoration: none;">
                  ${blog.title}
                </a>
              </h1>
            </td>
          </tr>

          ${
            blog.excerpt?.trim()
              ? `
          <!-- EXCERPT -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #94a3b8;">
                ${blog.excerpt.trim()}
              </p>
            </td>
          </tr>
          `
              : ""
          }

          <!-- CALL TO ACTION BUTTON -->
          <tr>
            <td style="padding: 0 32px 36px 32px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #F5A817 0%, #e59807 100%);">
                    <a href="${articleUrl}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 14px; font-weight: 700; color: #000000; text-decoration: none; border-radius: 10px; letter-spacing: -0.2px;">
                      Read Full Article &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #1f242d;"></div>
            </td>
          </tr>

          <!-- BRAND FOOTER -->
          <tr>
            <td style="padding: 28px 32px; background-color: #06070a; border-top: 1px solid #1f242d; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #F5A817; letter-spacing: -0.2px;">
                YS Innovations
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #71717a; font-style: italic;">
                Innovate Today, Lead Tomorrow!
              </p>
              <p style="margin: 0 0 14px 0; font-size: 12px; line-height: 1.5; color: #52525b;">
                You are receiving this update because you subscribed to our newsletter at <a href="${siteUrl}" style="color: #a1a1aa; text-decoration: none;">ysinnovations.com</a>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #71717a;">
                <a href="${articleUrl}" style="color: #9ca3af; text-decoration: underline; margin-right: 12px;">View in Browser</a>
                &bull;
                <a href="${unsubscribeUrl}" style="color: #f87171; text-decoration: underline; margin-left: 12px;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export function renderCustomBlastHtml(
  subject: string,
  bodyContent: string,
  unsubscribeUrl: string
): string {
  const siteUrl = clientConfig.app.frontendUrl.replace(/\/$/, "");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #0a0c10; border-radius: 16px; border: 1px solid #1f242d; overflow: hidden; box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.8);">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #0a0c10 0%, #121622 100%); border-bottom: 1px solid #1f242d;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${BRAND_LOGO_URL}" alt="YS Innovations" width="165" height="34" style="height: 34px; width: auto; max-height: 38px; display: block; border: 0; outline: none;" />
                    </a>
                  </td>
                  <td align="right">
                    <span style="font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background-color: rgba(245, 168, 23, 0.12); color: #F5A817; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(245, 168, 23, 0.35);">
                      ANNOUNCEMENT
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 36px 32px; font-size: 15px; line-height: 1.7; color: #d1d5db;">
              ${formatEmailBody(bodyContent)}
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #1f242d;"></div>
            </td>
          </tr>

          <!-- BRAND FOOTER -->
          <tr>
            <td style="padding: 28px 32px; background-color: #06070a; border-top: 1px solid #1f242d; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #F5A817; letter-spacing: -0.2px;">
                YS Innovations
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #71717a; font-style: italic;">
                Innovate Today, Lead Tomorrow!
              </p>
              <p style="margin: 0 0 14px 0; font-size: 12px; line-height: 1.5; color: #52525b;">
                You are receiving this announcement because you are an active subscriber to <a href="${siteUrl}" style="color: #a1a1aa; text-decoration: none;">ysinnovations.com</a>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #71717a;">
                <a href="${unsubscribeUrl}" style="color: #f87171; text-decoration: underline;">Unsubscribe from our updates</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
