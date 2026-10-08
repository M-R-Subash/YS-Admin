import { Resend } from "resend";
import nodemailer from "nodemailer";
import { serverConfig } from "@/lib/config/server";

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  unsubscribeUrl?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  send(payload: SendEmailPayload): Promise<SendEmailResult>;
}

/**
 * Resend Email Provider Adapter
 */
export class ResendProvider implements EmailProvider {
  private resend: Resend;
  private from: string;
  private defaultReplyTo: string;

  constructor() {
    this.resend = new Resend(serverConfig.email.resendApiKey || process.env.RESEND_API_KEY || "");
    this.from = serverConfig.email.from || "YS Innovations <onboarding@resend.dev>";
    this.defaultReplyTo = serverConfig.email.replyTo || "subash@ysinnovations.com";
  }

  async send({ to, subject, html, unsubscribeUrl, replyTo }: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const headers: Record<string, string> = {};
      if (unsubscribeUrl) {
        headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
        headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
      }

      const res = await this.resend.emails.send({
        from: this.from,
        to: [to],
        subject,
        html,
        replyTo: replyTo || this.defaultReplyTo,
        headers,
      });

      if (res.error) {
        return { success: false, error: res.error.message || "Resend dispatch failed" };
      }

      return { success: true, messageId: res.data?.id };
    } catch (err: any) {
      return { success: false, error: err?.message || "Unexpected Resend exception" };
    }
  }
}

/**
 * Nodemailer / Enterprise SMTP Provider Adapter (AWS SES, Brevo, SendGrid SMTP, Mailgun)
 */
export class NodemailerProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;
  private from: string;
  private defaultReplyTo: string;

  constructor() {
    this.from = serverConfig.email.from || "YS Innovations <newsletter@ysinnovations.com>";
    this.defaultReplyTo = serverConfig.email.replyTo || "subash@ysinnovations.com";

    const smtp = serverConfig.email.smtp;
    this.transporter = nodemailer.createTransport({
      host: smtp.host || "smtp.resend.com",
      port: smtp.port || 465,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user || "resend",
        pass: smtp.pass || serverConfig.email.resendApiKey || "",
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  async send({ to, subject, html, unsubscribeUrl, replyTo }: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const headers: Record<string, string> = {};
      if (unsubscribeUrl) {
        headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
        headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
      }

      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        replyTo: replyTo || this.defaultReplyTo,
        headers,
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      return { success: false, error: err?.message || "SMTP dispatch failed" };
    }
  }
}

/**
 * Provider Factory
 */
export function getEmailProvider(): EmailProvider {
  const provider = (serverConfig.email.provider || "resend").toLowerCase();
  if (provider === "nodemailer" || provider === "smtp") {
    return new NodemailerProvider();
  }
  return new ResendProvider();
}
