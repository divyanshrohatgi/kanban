import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SendGrid API key is missing in .env file");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export class EmailService {
  static async sendEmail(
    to: string,
    subject: string,
    html: string,
    attachments?: {
      content: string;
      filename: string;
      type: string;
      disposition: string;
      content_id: string;
    }[]
  ) {
    try {
      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject,
        html,
        attachments,
      };
      await sgMail.send(msg);
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email");
    }
  }
}
