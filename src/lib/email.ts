import "server-only";
import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { Resend } from "resend";

export type EmailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

export type OutgoingEmail = {
  to: string;
  subject: string;
  react: ReactElement;
  attachments?: EmailAttachment[];
};

/** Emails captured in dev/test when no Resend key is configured. */
const globalOutbox = globalThis as unknown as {
  __quadraOutbox?: { to: string; subject: string; text: string }[];
};

export function devOutbox() {
  globalOutbox.__quadraOutbox ??= [];
  return globalOutbox.__quadraOutbox;
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const key = process.env.AUTH_RESEND_KEY;
  const from = process.env.EMAIL_FROM ?? "Quadra <no-reply@example.com>";
  if (!key) {
    const text = await render(email.react, { plainText: true });
    devOutbox().push({ to: email.to, subject: email.subject, text });
    console.info(
      `\n[email:dev] to=${email.to} subject="${email.subject}"\n${text}\n`,
    );
    return;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: email.to,
    subject: email.subject,
    react: email.react,
    attachments: email.attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content).toString("base64"),
      contentType: a.contentType,
    })),
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
