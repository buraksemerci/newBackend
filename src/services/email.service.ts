import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Initialize SendGrid
sgMail.setApiKey(env.SENDGRID_API_KEY);

// Email templates types
export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

/**
 * Send an email using SendGrid
 */
const sendEmail = async (options: EmailOptions): Promise<boolean> => {
    try {
        const msg: MailDataRequired = {
            to: options.to,
            from: {
                email: env.SENDGRID_FROM_EMAIL,
                name: env.SENDGRID_FROM_NAME,
            },
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, ''),
        };

        await sgMail.send(msg);
        logger.info('Email sent successfully', { to: options.to, subject: options.subject });
        return true;
    } catch (error) {
        logger.error('Failed to send email', {
            to: options.to,
            subject: options.subject,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return false;
    }
};

/**
 * Send verification code email
 */
export const sendVerificationCode = async (
    email: string,
    code: string,
    name?: string
): Promise<boolean> => {
    const subject = 'Verify Your Email - Fitness App';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; text-align: center; padding: 20px; background: white; border-radius: 10px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Email Verification</h1>
        </div>
        <div class="content">
          <p>Hi${name ? ` ${name}` : ''},</p>
          <p>Thank you for signing up! Please use the following code to verify your email address:</p>
          <div class="code">${code}</div>
          <p>This code will expire in <strong>15 minutes</strong>.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Fitness App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return sendEmail({ to: email, subject, html });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
    email: string,
    resetToken: string,
    name?: string
): Promise<boolean> => {
    const subject = 'Reset Your Password - Fitness App';
    // In production, this should be a frontend URL
    const resetLink = `https://yourapp.com/reset-password?token=${resetToken}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset</h1>
        </div>
        <div class="content">
          <p>Hi${name ? ` ${name}` : ''},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
          <p>This link will expire in <strong>1 hour</strong>.</p>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Fitness App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return sendEmail({ to: email, subject, html });
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (email: string, name: string): Promise<boolean> => {
    const subject = 'Welcome to Fitness App! 🎉';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .feature { display: flex; align-items: center; margin: 15px 0; }
        .feature-icon { font-size: 24px; margin-right: 15px; }
        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome, ${name}! 🎉</h1>
          <p>Your fitness journey starts now</p>
        </div>
        <div class="content">
          <p>Congratulations on taking the first step towards a healthier you!</p>
          <h3>What's next?</h3>
          <div class="feature">
            <span class="feature-icon">📋</span>
            <span>Complete your profile to get personalized workout plans</span>
          </div>
          <div class="feature">
            <span class="feature-icon">💪</span>
            <span>Start your first workout and track your progress</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🎯</span>
            <span>Set goals and crush them one day at a time</span>
          </div>
          <p style="text-align: center;">
            <a href="https://yourapp.com" class="button">Open App</a>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Fitness App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return sendEmail({ to: email, subject, html });
};

/**
 * Send new device login alert
 */
export const sendNewDeviceAlert = async (
    email: string,
    deviceInfo: {
        deviceName?: string;
        deviceType: string;
        loginTime: Date;
        ipAddress?: string;
    },
    name?: string
): Promise<boolean> => {
    const subject = '🔔 New Device Login - Fitness App';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .info-row:last-child { border-bottom: none; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; }
        .button { display: inline-block; padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Login Detected</h1>
        </div>
        <div class="content">
          <p>Hi${name ? ` ${name}` : ''},</p>
          <p>We detected a new login to your account from a new device:</p>
          <div class="info-box">
            <div class="info-row">
              <strong>Device:</strong>
              <span>${deviceInfo.deviceName || 'Unknown'} (${deviceInfo.deviceType})</span>
            </div>
            <div class="info-row">
              <strong>Time:</strong>
              <span>${deviceInfo.loginTime.toLocaleString()}</span>
            </div>
            ${deviceInfo.ipAddress ? `
            <div class="info-row">
              <strong>IP Address:</strong>
              <span>${deviceInfo.ipAddress}</span>
            </div>
            ` : ''}
          </div>
          <div class="warning">
            <strong>⚠️ Wasn't you?</strong>
            <p style="margin: 10px 0 0 0;">If you didn't login from this device, we recommend changing your password immediately and removing unknown devices from your account.</p>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Fitness App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    return sendEmail({ to: email, subject, html });
};
