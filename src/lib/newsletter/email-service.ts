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
 * Nodemailer / Enterprise SMTP Provider Adapter (AWS SES, Brevo, SendGrid SMTP, Gmail, Mailgun)
 */
export class NodemailerProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;
  private from: string;
  private defaultReplyTo: string;

  constructor() {
    this.from = serverConfig.email.from;
    this.defaultReplyTo = serverConfig.email.replyTo;

    const smtp = serverConfig.email.smtp;
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
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
 * Provider Factory: returns the Nodemailer / SMTP provider
 */
export function getEmailProvider(): EmailProvider {
  return new NodemailerProvider();
}
