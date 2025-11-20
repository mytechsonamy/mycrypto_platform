import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

/**
 * Email template variables interface
 */
export interface EmailTemplateVariables {
  [key: string]: string | number;
}

/**
 * Email options interface
 */
export interface EmailOptions {
  to: string;
  subject: string;
  templateName: string;
  variables: EmailTemplateVariables;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

/**
 * Email Service
 * Handles email sending with template support
 * Uses nodemailer for SMTP communication
 * Supports both development (MailHog) and production (AWS SES) environments
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly templatesPath: string;
  private readonly mockEmailService: boolean;
  private readonly devEmailCapture: boolean;
  private readonly mailFrom: string;
  private transporter: Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.templatesPath = this.configService.get(
      'email.templatesPath',
      './templates/emails',
    );
    this.mockEmailService = this.configService.get(
      'email.mockEmailService',
      false,
    );
    this.devEmailCapture = this.configService.get(
      'email.devEmailCapture',
      false,
    );
    this.mailFrom = this.configService.get('email.from', 'noreply@exchange.local');

    // Initialize nodemailer transporter if not in mock mode
    if (!this.mockEmailService) {
      this.initializeTransporter();
    }
  }

  /**
   * Initialize nodemailer transporter
   */
  private async initializeTransporter(): Promise<void> {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('email.host', 'mailhog'),
        port: this.configService.get('email.port', 1025),
        secure: this.configService.get('email.secure', false),
        auth: this.configService.get('email.user')
          ? {
              user: this.configService.get('email.user'),
              pass: this.configService.get('email.password'),
            }
          : undefined,
        ignoreTLS: true, // For MailHog
      });

      // Verify connection configuration
      await this.transporter.verify();
      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize email transporter: ${error.message}`);
      this.transporter = null;
    }
  }

  /**
   * Send email with template
   * @param options Email options including template name and variables
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Validate email address
      if (!this.isValidEmail(options.to)) {
        this.logger.warn(`Invalid email address: ${options.to}`);
        return {
          success: false,
          error: 'Invalid email address',
        };
      }

      // Load and compile template
      const { html, text } = await this.loadTemplate(
        options.templateName,
        options.variables,
      );

      // Mock mode for testing
      if (this.mockEmailService) {
        this.logger.log(
          `[MOCK] Email would be sent to: ${options.to}, Subject: ${options.subject}`,
        );
        return { success: true, messageId: 'mock-' + Date.now() };
      }

      // Development email capture mode
      if (this.devEmailCapture) {
        this.logger.log(
          `[DEV] Preparing email for: ${options.to}, Subject: ${options.subject}`,
        );
        this.logger.debug(`HTML Content Preview (first 200 chars): ${html.substring(0, 200)}...`);
      }

      // Nodemailer integration
      // This requires nodemailer to be installed: npm install nodemailer @types/nodemailer
      // const transporter = nodemailer.createTransport({
      //   host: this.configService.get('email.host'),
      //   port: this.configService.get('email.port'),
      //   secure: this.configService.get('email.secure'),
      //   auth: {
      //     user: this.configService.get('email.user'),
      //     pass: this.configService.get('email.password'),
      //   },
      // });
      //
      // const mailOptions = {
      //   from: this.mailFrom,
      //   to: options.to,
      //   cc: options.cc,
      //   bcc: options.bcc,
      //   replyTo: options.replyTo,
      //   subject: options.subject,
      //   html,
      //   text,
      // };
      //
      // const info = await transporter.sendMail(mailOptions);
      // this.logger.log(`Email sent with messageId: ${info.messageId}`);
      // return { success: true, messageId: info.messageId };

      // Use nodemailer to send the email
      if (this.transporter) {
        const mailOptions = {
          from: this.mailFrom,
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          replyTo: options.replyTo,
          subject: options.subject,
          html,
          text,
        };

        const info = await this.transporter.sendMail(mailOptions);
        this.logger.log(`Email sent successfully`, {
          messageId: info.messageId,
          to: options.to,
          subject: options.subject,
        });
        return { success: true, messageId: info.messageId };
      } else {
        // Fallback if transporter is not available
        this.logger.warn('Email transporter not available, email not sent');
        return {
          success: false,
          error: 'Email service not configured',
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send verification email
   * @param email User email address
   * @param userName User name
   * @param verificationCode Verification code
   * @param verificationLink Verification link
   */
  async sendVerificationEmail(
    email: string,
    userName: string,
    verificationCode: string,
    verificationLink: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to: email,
      subject: 'Email Verification - MyCrypto Exchange / E-mail Doğrulaması - MyCrypto Exchange',
      templateName: 'verify-email',
      variables: {
        userName,
        verificationCode,
        verificationLink,
        currentYear: new Date().getFullYear().toString(),
      },
    });
  }

  /**
   * Send password reset email
   * @param email User email address
   * @param userName User name
   * @param resetLink Password reset link
   */
  async sendPasswordResetEmail(
    email: string,
    userName: string,
    resetLink: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to: email,
      subject: 'Password Reset - MyCrypto Exchange / Şifre Sıfırlama - MyCrypto Exchange',
      templateName: 'reset-password',
      variables: {
        userName,
        resetLink,
        currentYear: new Date().getFullYear().toString(),
      },
    });
  }

  /**
   * Send password reset success email
   * @param email User email address
   * @param userName User name
   */
  async sendPasswordResetSuccessEmail(
    email: string,
    userName: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to: email,
      subject: 'Password Reset Successful - MyCrypto Exchange / Şifre Başarıyla Sıfırlandı - MyCrypto Exchange',
      templateName: 'password-reset-success',
      variables: {
        userName,
        currentYear: new Date().getFullYear().toString(),
      },
    });
  }

  /**
   * Load and compile email template
   * @param templateName Name of the template (without extension)
   * @param variables Template variables to interpolate
   * @returns HTML and text versions of the compiled template
   */
  private async loadTemplate(
    templateName: string,
    variables: EmailTemplateVariables,
  ): Promise<{ html: string; text: string }> {
    try {
      const htmlPath = path.join(this.templatesPath, `${templateName}.html`);
      const textPath = path.join(this.templatesPath, `${templateName}.txt`);

      // Load both HTML and text versions
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      const textContent = fs.readFileSync(textPath, 'utf-8');

      // Compile templates with variables
      const html = this.interpolateTemplate(htmlContent, variables);
      const text = this.interpolateTemplate(textContent, variables);

      return { html, text };
    } catch (error) {
      this.logger.error(`Failed to load template ${templateName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Interpolate template variables
   * Replaces {{variableName}} with actual values
   * @param template Template string
   * @param variables Variables object
   * @returns Interpolated template
   */
  private interpolateTemplate(
    template: string,
    variables: EmailTemplateVariables,
  ): string {
    let result = template;

    // Replace all {{variableName}} patterns with actual values
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(variables[key]));
    });

    return result;
  }

  /**
   * Validate email address format
   * @param email Email address to validate
   * @returns True if email is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Health check for email service
   * Attempts to load template files
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      const htmlPath = path.join(this.templatesPath, 'verify-email.html');
      const textPath = path.join(this.templatesPath, 'verify-email.txt');

      const htmlExists = fs.existsSync(htmlPath);
      const textExists = fs.existsSync(textPath);

      if (!htmlExists || !textExists) {
        return {
          healthy: false,
          message: `Email templates not found at ${this.templatesPath}`,
        };
      }

      return {
        healthy: true,
        message: 'Email service is healthy',
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Email service health check failed: ${error.message}`,
      };
    }
  }
}
