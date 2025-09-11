"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SendGrid API key is missing in .env file");
}
mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
class EmailService {
    static async sendEmail(to, subject, html, attachments) {
        try {
            const msg = {
                to,
                from: process.env.SENDGRID_FROM_EMAIL,
                subject,
                html,
                attachments,
            };
            await mail_1.default.send(msg);
        }
        catch (error) {
            console.error("Error sending email:", error);
            throw new Error("Failed to send email");
        }
    }
}
exports.EmailService = EmailService;
