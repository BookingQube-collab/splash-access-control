/** Table-based HTML email for digital guest pass confirmations (POS + public registration). */

export type DigitalPassEmailContent = {
  customerName: string;

  registeredFor: string;

  slotLabel: string;

  visitDate: string;

  guestCount: number;

  venue: string;

  passId: string;

  passLink: string;

  myPassesLink: string;

  qrImageUrl: string;

  supportEmail: string;

  supportPhone: string;

  logoUrl: string;

  heroUrl: string;

  socialLinks?: {
    instagram?: string;

    facebook?: string;

    x?: string;

    youtube?: string;
  };

  /** Optional absolute logo URL for footer "Presented by" (falls back to styled text). */

  visitQatarLogoUrl?: string;

  halaSummerLogoUrl?: string;

  /** Optional gate illustration for the Important banner (right column). */

  gateIllustrationUrl?: string;
};

const NAVY = "#102A43";

const ORANGE = "#F47B20";

const CREAM = "#FFF8F2";

const PEACH = "#FFE8D4";

const LIGHT_ORANGE = "#FFF0E4";

const VISIT_QATAR = "#8B1538";

/** Decorative wavy footer strip (inline SVG — no external asset required). */

const FOOTER_WAVE_BG =
  "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 600 48%22 preserveAspectRatio=%22none%22%3E%3Cpath fill=%22%23F47B20%22 d=%22M0 32 Q75 8 150 28 T300 24 T450 30 T600 18 V48 H0 Z%22/%3E%3Cpath fill=%22%2300A8B5%22 opacity=%220.55%22 d=%22M0 38 Q100 22 200 36 T400 32 T600 40 V48 H0 Z%22/%3E%3Cpath fill=%22%232D6A4F%22 opacity=%220.45%22 d=%22M0 42 Q150 30 300 44 T600 36 V48 H0 Z%22/%3E%3C/svg%3E')";

function escapeHtml(value: string): string {
  return value

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;");
}

function guestsLabel(count: number): string {
  if (count <= 0) return "—";

  if (count === 1) return "1 Guest";

  return `${count} Guests`;
}

function iconCell(emoji: string): string {
  return `<td width="44" valign="top" style="padding:0 12px 16px 0;">

    <table role="presentation" cellpadding="0" cellspacing="0">

      <tr>

        <td align="center" valign="middle" width="32" height="32" style="width:32px;height:32px;background:${LIGHT_ORANGE};border-radius:50%;font-size:15px;line-height:32px;text-align:center;color:${ORANGE};">${emoji}</td>

      </tr>

    </table>

  </td>`;
}

function detailRow(emoji: string, label: string, value: string): string {
  return `<tr>

    ${iconCell(emoji)}

    <td valign="top" style="padding:0 0 16px;">

      <p style="margin:0;font-size:11px;line-height:1.3;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(label)}</p>

      <p style="margin:4px 0 0;font-size:15px;line-height:1.35;font-weight:700;color:${NAVY};">${escapeHtml(value)}</p>

    </td>

  </tr>`;
}

function footerBrandCell(
  label: string,

  logoUrl: string | undefined,

  textStyle: string,

  uppercase = true,
): string {
  const url = logoUrl?.trim();

  if (url) {
    return `<td valign="middle" style="padding:0 12px;">

      <img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" height="28" style="display:block;height:28px;width:auto;border:0;" />

    </td>`;
  }

  const transform = uppercase
    ? "text-transform:uppercase;letter-spacing:0.06em;"
    : "letter-spacing:0.02em;";

  return `<td valign="middle" style="padding:0 12px;">

    <span style="display:inline-block;font-size:13px;font-weight:800;${transform}${textStyle}">${escapeHtml(label)}</span>

  </td>`;
}

function socialIcon(href: string, label: string, glyph: string): string {
  const url = href.trim() || "#";

  return `<td style="padding:0 5px;">

    <a href="${escapeHtml(url)}" aria-label="${escapeHtml(label)}" style="display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;background:${NAVY};border-radius:50%;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${glyph}</a>

  </td>`;
}

function gateIllustrationCell(gateIllustrationUrl: string | undefined): string {
  const url = gateIllustrationUrl?.trim();

  if (!url) {
    return `<td width="96" valign="bottom" align="right" style="padding:0 16px 12px 8px;font-size:0;line-height:0;">&nbsp;</td>`;
  }

  return `<td width="96" valign="bottom" align="right" style="padding:0 16px 8px 8px;">

    <img src="${escapeHtml(url)}" alt="" width="88" height="72" style="display:block;width:88px;height:auto;border:0;" />

  </td>`;
}

export function buildDigitalPassEmailContent(input: DigitalPassEmailContent): {
  subject: string;

  text: string;

  html: string;
} {
  const subject = "Summer Splash '26 — Your Guest Pass";

  const {
    customerName,

    registeredFor,

    slotLabel,

    visitDate,

    guestCount,

    venue,

    passId,

    passLink,

    myPassesLink,

    qrImageUrl,

    supportEmail,

    supportPhone,

    logoUrl,

    heroUrl,

    socialLinks = {},

    visitQatarLogoUrl,

    halaSummerLogoUrl,

    gateIllustrationUrl,
  } = input;

  const guests = guestsLabel(guestCount);

  const phoneTel = supportPhone.replace(/\s/g, "");

  const text = [
    `Hi ${customerName},`,

    "",

    "Thank you for registering for Summer Splash '26. Your guest pass is ready!",

    "",

    `Registered For: ${registeredFor}`,

    `Guests: ${guests}`,

    `Slot: ${slotLabel}`,

    visitDate ? `Date: ${visitDate}` : "",

    `Venue: ${venue}`,

    `Pass ID: ${passId}`,

    "",

    `Download / view your pass: ${myPassesLink}`,

    `View in browser: ${passLink}`,

    "",

    "Your pass includes a scannable QR code — open the link above or use the HTML version of this email.",

    "Show this QR code at the gate for quick entry.",

    "",

    "IMPORTANT: Please arrive within your selected slot time. Each QR code can be used only once.",

    "",

    `Need help? ${supportEmail} · ${supportPhone}`,
  ]

    .filter(Boolean)

    .join("\n");

  const html = `<!DOCTYPE html>

<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">

<head>

  <meta charset="utf-8">

  <meta name="viewport" content="width=device-width,initial-scale=1">

  <meta http-equiv="X-UA-Compatible" content="IE=edge">

  <title>${escapeHtml(subject)}</title>

  <!--[if mso]><style>table{border-collapse:collapse;}td{font-family:Segoe UI,Arial,sans-serif;}</style><![endif]-->

  <style>

    @media only screen and (max-width:520px){

      .email-shell{width:100%!important;}

      .pass-columns{display:block!important;width:100%!important;}

      .pass-col{display:block!important;width:100%!important;padding:0!important;}

      .qr-wrap{padding-top:20px!important;}

      .important-gate{display:none!important;}

    }

  </style>

</head>

<body style="margin:0;padding:0;background:${CREAM};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${NAVY};-webkit-text-size-adjust:100%;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Your Summer Splash '26 guest pass is ready — show your QR at the gate.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">

    <tr><td align="center" style="padding:16px 12px 32px;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-shell" style="max-width:600px;border-collapse:collapse;">



        <!-- Pre-header -->

        <tr>

          <td align="center" style="padding:0 0 12px;font-size:12px;line-height:1.5;color:#64748b;">

            Having trouble viewing this email?

            <a href="${escapeHtml(passLink)}" style="color:${ORANGE};font-weight:700;text-decoration:none;">View in browser</a>

          </td>

        </tr>



        <!-- Hero header -->

        <tr>

          <td style="padding:0;border-radius:20px 20px 0 0;overflow:hidden;background-color:#1a3a52;">

            <!--[if gte mso 9]>

            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:260px;">

              <v:fill type="frame" src="${escapeHtml(heroUrl)}" color="#1a3a52" />

              <v:textbox inset="0,0,0,0">

            <![endif]-->

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a3a52;background-image:url('${escapeHtml(heroUrl)}');background-size:cover;background-position:center center;">

              <tr>

                <td style="padding:24px 28px 32px;background:linear-gradient(180deg,rgba(16,42,67,0.2) 0%,rgba(16,42,67,0.82) 100%);">

                  <table role="presentation" cellpadding="0" cellspacing="0">

                    <tr>

                      <td valign="middle" style="padding:0;">

                        <img src="${escapeHtml(logoUrl)}" alt="Summer Splash" width="132" style="display:block;max-width:132px;width:132px;height:auto;border:0;" />

                      </td>

                      <td width="1" valign="middle" style="padding:0 14px;width:1px;font-size:0;line-height:0;">

                        <div style="width:1px;height:34px;background-color:rgba(255,255,255,0.45);">&nbsp;</div>

                      </td>

                      <td valign="middle" style="padding:0;">

                        <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#ffffff;">Beach Festival '26</p>

                      </td>

                    </tr>

                  </table>

                  <p style="margin:28px 0 0;font-size:30px;line-height:1.15;font-weight:800;color:#ffffff;">Hi ${escapeHtml(customerName)},</p>

                  <p style="margin:10px 0 0;font-size:15px;line-height:1.55;color:rgba(255,255,255,0.94);">Thank you for registering for Summer Splash '26.<br />Your guest pass is ready!</p>

                </td>

              </tr>

            </table>

            <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->

          </td>

        </tr>



        <!-- Pass card -->

        <tr>

          <td style="background:#ffffff;padding:28px 24px 22px;border-left:1px solid #f0e6dc;border-right:1px solid #f0e6dc;box-shadow:0 4px 24px rgba(16,42,67,0.06);">

            <p style="margin:0 0 16px;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${ORANGE};">Your Guest Pass</p>



            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="pass-columns" style="border:1px solid #f0e6dc;border-radius:16px;background:#ffffff;box-shadow:0 6px 20px rgba(16,42,67,0.05);">

              <tr>

                <td class="pass-col" valign="top" width="58%" style="padding:22px 8px 22px 22px;">

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                    ${detailRow("📅", "Registered For", registeredFor)}

                    ${detailRow("👥", "Guests", guests)}

                    ${detailRow("🕐", "Slot", slotLabel)}

                    ${detailRow("📍", "Venue", venue)}

                    ${detailRow("🎫", "Pass ID", passId)}

                  </table>

                </td>

                <td class="pass-col qr-wrap" valign="middle" align="center" width="42%" style="padding:22px 22px 22px 8px;">

                  <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="background:${PEACH};border-radius:16px;">

                    <tr><td style="padding:18px 18px 14px;text-align:center;">

                      <a href="${escapeHtml(passLink)}" style="text-decoration:none;display:block;">

                        <img src="${escapeHtml(qrImageUrl)}" alt="" width="180" height="180" style="display:block;margin:0 auto;width:180px;height:180px;max-width:180px;border:0;border-radius:8px;background:#ffffff;" />

                      </a>

                      <p style="margin:12px 0 0;font-size:12px;line-height:1.45;color:#64748b;">Show this QR code at the gate for quick entry.</p>

                    </td></tr>

                  </table>

                </td>

              </tr>

            </table>



            <!-- Download CTA -->

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">

              <tr><td align="center">

                <a href="${escapeHtml(myPassesLink)}" style="display:inline-block;background:${ORANGE};color:#ffffff;font-size:15px;font-weight:800;line-height:1;text-decoration:none;padding:16px 40px;border-radius:999px;box-shadow:0 6px 18px rgba(244,123,32,0.35);">Download My Pass</a>

              </td></tr>

              <tr><td align="center" style="padding-top:10px;">

                <a href="${escapeHtml(myPassesLink)}" style="font-size:12px;color:#64748b;text-decoration:underline;">Save to your phone · My Passes</a>

              </td></tr>

            </table>

          </td>

        </tr>



        <!-- Important banner -->

        <tr>

          <td style="background:#ffffff;padding:0 24px 24px;border-left:1px solid #f0e6dc;border-right:1px solid #f0e6dc;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PEACH};border-radius:14px;">

              <tr>

                <td width="56" valign="top" style="padding:20px 0 20px 18px;">

                  <table role="presentation" cellpadding="0" cellspacing="0">

                    <tr>

                      <td align="center" valign="middle" width="40" height="40" style="width:40px;height:40px;background:${ORANGE};border-radius:10px;font-size:18px;line-height:40px;text-align:center;color:#ffffff;">🛡</td>

                    </tr>

                  </table>

                </td>

                <td valign="top" style="padding:20px 8px 20px 4px;">

                  <p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${ORANGE};">Important</p>

                  <p style="margin:0;font-size:13px;line-height:1.55;color:${NAVY};">Please arrive within your selected slot time. Each QR code can be used only once.</p>

                </td>

                ${gateIllustrationCell(gateIllustrationUrl)}

              </tr>

            </table>

          </td>

        </tr>



        <!-- Need help -->

        <tr>

          <td style="background:#ffffff;padding:0 24px 28px;border-left:1px solid #f0e6dc;border-right:1px solid #f0e6dc;border-bottom:1px solid #f0e6dc;">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

              <tr><td align="center" style="padding-bottom:10px;">

                <table role="presentation" cellpadding="0" cellspacing="0" align="center">

                  <tr>

                    <td align="center" valign="middle" width="44" height="44" style="width:44px;height:44px;background:${ORANGE};border-radius:50%;font-size:22px;line-height:44px;text-align:center;">🛟</td>

                  </tr>

                </table>

              </td></tr>

              <tr><td align="center">

                <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:${NAVY};">Need Help?</p>

                <p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:#64748b;">Contact our support team if you have any questions.</p>

              </td></tr>

              <tr><td align="center">

                <table role="presentation" cellpadding="0" cellspacing="0" align="center">

                  <tr>

                    <td style="padding:0 14px;font-size:13px;line-height:1.5;">

                      <a href="mailto:${escapeHtml(supportEmail)}" style="color:${NAVY};font-weight:600;text-decoration:none;">✉ ${escapeHtml(supportEmail)}</a>

                    </td>

                    <td style="width:1px;background:#e2e8f0;font-size:0;line-height:0;">&nbsp;</td>

                    <td style="padding:0 14px;font-size:13px;line-height:1.5;">

                      <a href="tel:${escapeHtml(phoneTel)}" style="color:${NAVY};font-weight:600;text-decoration:none;">☎ ${escapeHtml(supportPhone)}</a>

                    </td>

                  </tr>

                </table>

              </td></tr>

            </table>

          </td>

        </tr>



        <!-- Footer -->

        <tr>

          <td style="padding:0;border-radius:0 0 20px 20px;overflow:hidden;background:linear-gradient(180deg,#fff5eb 0%,#e8f4ff 100%);">

            <div style="height:28px;background:${FOOTER_WAVE_BG} center bottom no-repeat;background-size:100% 100%;"></div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

              <tr><td style="padding:8px 24px 20px;text-align:center;">

                <p style="margin:0 0 10px;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Presented by</p>

                <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 18px;">

                  <tr>

                    ${footerBrandCell("Visit Qatar", visitQatarLogoUrl, `color:${VISIT_QATAR};`, true)}

                    <td valign="middle" style="padding:0 4px;font-size:14px;font-weight:700;color:#94a3b8;">·</td>

                    ${footerBrandCell("Hala Summer", halaSummerLogoUrl, `color:${NAVY};`, false)}

                  </tr>

                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px;">

                  <tr>

                    ${socialIcon(socialLinks.facebook ?? "", "Facebook", "f")}

                    ${socialIcon(socialLinks.instagram ?? "", "Instagram", "◎")}

                    ${socialIcon(socialLinks.x ?? "", "X", "X")}

                    ${socialIcon(socialLinks.youtube ?? "", "YouTube", "▶")}

                  </tr>

                </table>

                <p style="margin:0;font-size:11px;line-height:1.5;color:#64748b;">© 2026 Visit Qatar. All rights reserved.</p>

                <p style="margin:10px 0 0;font-size:10px;line-height:1.4;color:#94a3b8;">You received this email because you registered with this address.</p>

              </td></tr>

            </table>

          </td>

        </tr>



      </table>

    </td></tr>

  </table>

</body>

</html>`;

  return { subject, text, html };
}

/** Human-readable pass ID, e.g. SS26-PG-8F3A7D */

export function formatPassId(qrToken: string, eventName?: string | null): string {
  const compact = qrToken.replace(/-/g, "").slice(0, 6).toUpperCase();

  const code = eventPassCode(eventName);

  return `SS26-${code}-${compact}`;
}

function eventPassCode(eventName?: string | null): string {
  const raw = eventName?.trim();

  if (!raw) return "GP";

  const words = raw.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return words

      .slice(0, 2)

      .map((w) => w[0]?.toUpperCase() ?? "")

      .join("");
  }

  return raw.slice(0, 2).toUpperCase();
}
