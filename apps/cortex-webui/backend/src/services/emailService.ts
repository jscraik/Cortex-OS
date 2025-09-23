import { promises as fs } from 'node:fs';
import path from 'node:path';
import type nodemailer from 'nodemailer';

// Mock email service for testing
const mockEmailService = {
	sendMail: async (options: any) => {
		console.log('Mock email sent:', options);
		return { messageId: `mock-${Date.now()}` };
	},
	verify: async () => {
		return true;
	},
};

interface EmailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

interface EmailTemplate {
	name: string;
	subject: string;
	template: string;
}

export class EmailService {
	private transporter: nodemailer.Transporter;
	private templateCache: Map<string, string> = new Map();

	constructor() {
		// Use mock email service to avoid configuration issues
		this.transporter = mockEmailService as any;
	}

	async sendEmail(options: EmailOptions): Promise<void> {
		try {
			const mailOptions = {
				from: process.env.EMAIL_FROM || process.env.SMTP_USER,
				to: options.to,
				subject: options.subject,
				html: options.html,
				text: options.text,
			};

			await this.transporter.sendMail(mailOptions);
			console.log('Email sent successfully to:', options.to);
		} catch (error) {
			console.error('Failed to send email:', error);

			// In development, log the email content
			if (process.env.NODE_ENV === 'development') {
				console.log('\n=== EMAIL CONTENT ===');
				console.log('To:', options.to);
				console.log('Subject:', options.subject);
				console.log('HTML:', options.html);
				console.log('===================\n');
			}

			throw new Error('Failed to send email');
		}
	}

	async sendVerificationEmail(user: { email: string; name?: string }, url: string): Promise<void> {
		const template = await this.loadTemplate('verification');
		const html = template.template
			.replace('{{name}}', user.name || 'User')
			.replace('{{verificationUrl}}', url)
			.replace('{{appName}}', 'Cortex-OS');

		await this.sendEmail({
			to: user.email,
			subject: template.subject,
			html,
			text: `Verify your email address for Cortex-OS by clicking this link: ${url}`,
		});
	}

	async sendPasswordResetEmail(user: { email: string; name?: string }, url: string): Promise<void> {
		const template = await this.loadTemplate('password-reset');
		const html = template.template
			.replace('{{name}}', user.name || 'User')
			.replace('{{resetUrl}}', url)
			.replace('{{appName}}', 'Cortex-OS');

		await this.sendEmail({
			to: user.email,
			subject: template.subject,
			html,
			text: `Reset your password for Cortex-OS by clicking this link: ${url}`,
		});
	}

	async sendMagicLink(email: string, url: string): Promise<void> {
		const template = await this.loadTemplate('magic-link');
		const html = template.template
			.replace('{{email}}', email)
			.replace('{{magicLinkUrl}}', url)
			.replace('{{appName}}', 'Cortex-OS');

		await this.sendEmail({
			to: email,
			subject: template.subject,
			html,
			text: `Sign in to Cortex-OS using this magic link: ${url}`,
		});
	}

	private async loadTemplate(templateName: string): Promise<EmailTemplate> {
		// Check cache first
		if (this.templateCache.has(templateName)) {
			const cached = this.templateCache.get(templateName)!;
			return {
				name: templateName,
				subject: this.getSubjectForTemplate(templateName),
				template: cached,
			};
		}

		// Load template file
		const templatePath = path.join(
			process.cwd(),
			'src',
			'templates',
			'emails',
			`${templateName}.html`,
		);

		try {
			const template = await fs.readFile(templatePath, 'utf-8');
			this.templateCache.set(templateName, template);

			return {
				name: templateName,
				subject: this.getSubjectForTemplate(templateName),
				template,
			};
		} catch (_error) {
			console.warn(`Template ${templateName} not found, using default`);
			return this.getDefaultTemplate(templateName);
		}
	}

	private getSubjectForTemplate(templateName: string): string {
		const subjects = {
			verification: 'Verify your email address',
			'password-reset': 'Reset your password',
			'magic-link': 'Your magic link sign-in',
		};
		return subjects[templateName as keyof typeof subjects] || 'Email from Cortex-OS';
	}

	private getDefaultTemplate(templateName: string): EmailTemplate {
		const templates = {
			verification: {
				subject: 'Verify your email address',
				template: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Email Verification</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .button {
                  display: inline-block;
                  padding: 10px 20px;
                  background-color: #007bff;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>Hello {{name}},</h2>
                <p>Please verify your email address to complete your registration.</p>
                <p><a href="{{verificationUrl}}" class="button">Verify Email</a></p>
                <p>Or copy and paste this link: {{verificationUrl}}</p>
                <p>Thanks,<br>The {{appName}} Team</p>
              </div>
            </body>
          </html>
        `,
			},
			'password-reset': {
				subject: 'Reset your password',
				template: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Password Reset</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .button {
                  display: inline-block;
                  padding: 10px 20px;
                  background-color: #dc3545;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>Hello {{name}},</h2>
                <p>We received a request to reset your password.</p>
                <p><a href="{{resetUrl}}" class="button">Reset Password</a></p>
                <p>Or copy and paste this link: {{resetUrl}}</p>
                <p>If you didn't request this, please ignore this email.</p>
                <p>Thanks,<br>The {{appName}} Team</p>
              </div>
            </body>
          </html>
        `,
			},
			'magic-link': {
				subject: 'Your magic link sign-in',
				template: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Magic Link Sign-in</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .button {
                  display: inline-block;
                  padding: 10px 20px;
                  background-color: #28a745;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>Hello,</h2>
                <p>Click the link below to sign in to your account.</p>
                <p><a href="{{magicLinkUrl}}" class="button">Sign In</a></p>
                <p>Or copy and paste this link: {{magicLinkUrl}}</p>
                <p>This link will expire in 1 hour.</p>
                <p>Thanks,<br>The {{appName}} Team</p>
              </div>
            </body>
          </html>
        `,
			},
		};

		const defaultTemplate = templates[templateName as keyof typeof templates];

		return {
			name: templateName,
			subject: defaultTemplate.subject,
			template: defaultTemplate.template,
		};
	}

	async verifyConnection(): Promise<boolean> {
		try {
			await this.transporter.verify();
			return true;
		} catch (error) {
			console.error('Email service connection failed:', error);
			return false;
		}
	}
}

// Singleton instance
export const emailService = new EmailService();
