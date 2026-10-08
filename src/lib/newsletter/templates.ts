export interface BlogNewsletterData {
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  readingTime?: number | null;
  categoryName?: string | null;
  frontendUrl?: string;
}

export function renderBlogNewsletterHtml(
  blog: BlogNewsletterData,
  unsubscribeUrl: string
): string {
  const siteUrl = blog.frontendUrl || process.env.NEXT_PUBLIC_FRONTEND_URL || "https://ysinnovations.com";
  const articleUrl = `${siteUrl.replace(/\/$/, "")}/${blog.slug}`;
  const excerpt = blog.excerpt || "We have just published a fresh, in-depth guide on the YS Innovations blog. Dive in to explore the latest insights and industry strategies.";
  const readingTimeText = blog.readingTime ? `${blog.readingTime} min read` : "5 min read";
  const categoryTag = blog.categoryName ? blog.categoryName.toUpperCase() : "INSIGHTS & STRATEGY";

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
<body style="margin: 0; padding: 0; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f17;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #111827; border-radius: 16px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #111827 0%, #1a2234 100%); border-bottom: 1px solid #1f2937;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                      YS <span style="color: #f59e0b;">INNOVATIONS</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; background-color: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(245, 158, 11, 0.3);">
                      NEW PUBLICATION
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

          <!-- ARTICLE METADATA -->
          <tr>
            <td style="padding: 28px 32px 12px 32px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: #9ca3af; text-transform: uppercase;">
                      ${categoryTag} &bull; ${readingTimeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ARTICLE TITLE -->
          <tr>
            <td style="padding: 0 32px 16px 32px;">
              <h1 style="margin: 0; font-size: 26px; line-height: 1.35; font-weight: 800; color: #f9fafb; letter-spacing: -0.5px;">
                <a href="${articleUrl}" target="_blank" style="color: #f9fafb; text-decoration: none;">
                  ${blog.title}
                </a>
              </h1>
            </td>
          </tr>

          <!-- EXCERPT -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #9ca3af;">
                ${excerpt}
              </p>
            </td>
          </tr>

          <!-- CALL TO ACTION BUTTON -->
          <tr>
            <td style="padding: 0 32px 36px 32px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <a href="${articleUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 700; color: #000000; text-decoration: none; border-radius: 10px; letter-spacing: -0.2px;">
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
              <div style="height: 1px; background-color: #1f2937;"></div>
            </td>
          </tr>

          <!-- BRAND FOOTER -->
          <tr>
            <td style="padding: 28px 32px; background-color: #0d131f; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #d1d5db;">
                YS Innovations &bull; Innovate Today, Lead Tomorrow!
              </p>
              <p style="margin: 0 0 16px 0; font-size: 12px; line-height: 1.5; color: #6b7280;">
                You are receiving this update because you subscribed to our newsletter on ysinnovations.com.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                <a href="${articleUrl}" style="color: #9ca3af; text-decoration: underline; margin-right: 12px;">View in Browser</a>
                &bull;
                <a href="${unsubscribeUrl}" style="color: #ef4444; text-decoration: underline; margin-left: 12px;">Unsubscribe</a>
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
<body style="margin: 0; padding: 0; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f17;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #111827; border-radius: 16px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #111827 0%, #1a2234 100%); border-bottom: 1px solid #1f2937;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                      YS <span style="color: #f59e0b;">INNOVATIONS</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; background-color: rgba(59, 130, 246, 0.15); color: #60a5fa; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(59, 130, 246, 0.3);">
                      SPECIAL UPDATE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 36px 32px 36px 32px; font-size: 16px; line-height: 1.7; color: #d1d5db;">
              ${bodyContent}
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #1f2937;"></div>
            </td>
          </tr>

          <!-- BRAND FOOTER -->
          <tr>
            <td style="padding: 28px 32px; background-color: #0d131f; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #d1d5db;">
                YS Innovations &bull; Innovate Today, Lead Tomorrow!
              </p>
              <p style="margin: 0 0 16px 0; font-size: 12px; line-height: 1.5; color: #6b7280;">
                You are receiving this announcement because you are an active subscriber to YS Innovations.
              </p>
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                <a href="${unsubscribeUrl}" style="color: #ef4444; text-decoration: underline;">Unsubscribe from our updates</a>
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
