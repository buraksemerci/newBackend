import { EmailClient, KnownEmailSendStatus } from '@azure/communication-email';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Initialize Azure Email Client
const emailClient = new EmailClient(env.AZURE_COMMUNICATION_CONNECTION_STRING);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Azure Communication Services
 */
const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const message = {
      senderAddress: env.AZURE_SENDER,
      content: {
        subject: options.subject,
        html: options.html,
        plainText: options.text || options.subject,
      },
      recipients: {
        to: [{ address: options.to }],
      },
    };

    const poller = await emailClient.beginSend(message);
    const result = await poller.pollUntilDone();

    if (result.status === KnownEmailSendStatus.Succeeded) {
      logger.info('Email sent successfully', {
        to: options.to.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
        subject: options.subject,
      });
      return true;
    } else {
      logger.error('Email send failed', {
        status: result.status,
        error: result.error,
      });
      return false;
    }
  } catch (error) {
    logger.error('Failed to send email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to.replace(/(.{2}).*(@.*)/, '$1***$2'),
    });
    return false;
  }
};

// Email templates
const getBaseTemplate = (content: string, title: string): string => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .logo { text-align: center; margin-bottom: 30px; font-size: 28px; font-weight: bold; color: #667eea; }
        .code { font-size: 36px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #667eea; background: #f0f2ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .footer { text-align: center; margin-top: 30px; color: #888; font-size: 13px; }
        h1 { color: #333; margin-bottom: 20px; }
        p { margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">🏋️ FitMark</div>
            ${content}
        </div>
        <div class="footer">
            <p>Bu email FitMark tarafından gönderildi.</p>
            <p>© ${new Date().getFullYear()} FitMark. Tüm hakları saklıdır.</p>
        </div>
    </div>
</body>
</html>
`;

/**
 * Send verification code email
 */
export const sendVerificationCode = async (
  email: string,
  code: string,
  firstName?: string
): Promise<boolean> => {
  const name = firstName || 'Kullanıcı';
  const content = `
        <h1>Email Doğrulama</h1>
        <p>Merhaba ${name},</p>
        <p>FitMark hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
        <div class="code">${code}</div>
        <p>Bu kod <strong>15 dakika</strong> geçerlidir.</p>
        <p>Eğer bu işlemi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
    `;

  return sendEmail({
    to: email,
    subject: `${code} - FitMark Doğrulama Kodu`,
    html: getBaseTemplate(content, 'Email Doğrulama'),
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  firstName?: string
): Promise<boolean> => {
  const name = firstName || 'Kullanıcı';
  const resetLink = `https://app.myfitmark.com/reset-password?token=${resetToken}`;

  const content = `
        <h1>Şifre Sıfırlama</h1>
        <p>Merhaba ${name},</p>
        <p>Şifrenizi sıfırlamak için bir istek aldık. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz:</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" class="button">Şifremi Sıfırla</a>
        </p>
        <p>Bu link <strong>1 saat</strong> geçerlidir.</p>
        <p>Eğer bu isteği siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
    `;

  return sendEmail({
    to: email,
    subject: 'FitMark - Şifre Sıfırlama',
    html: getBaseTemplate(content, 'Şifre Sıfırlama'),
  });
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (
  email: string,
  firstName?: string
): Promise<boolean> => {
  const name = firstName || 'Kullanıcı';

  const content = `
        <h1>FitMark'a Hoş Geldin! 🎉</h1>
        <p>Merhaba ${name},</p>
        <p>Fitness yolculuğuna başlamak için doğru adımı attın!</p>
        <p>FitMark ile:</p>
        <ul>
            <li>Kişiselleştirilmiş antrenman programları</li>
            <li>İlerleme takibi</li>
            <li>Motivasyon ve hedefler</li>
        </ul>
        <p>Hadi başlayalım!</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="https://app.myfitmark.com" class="button">Uygulamayı Aç</a>
        </p>
    `;

  return sendEmail({
    to: email,
    subject: 'FitMark\'a Hoş Geldin! 🏋️',
    html: getBaseTemplate(content, 'Hoş Geldin'),
  });
};

/**
 * Send new device login alert
 */
export const sendNewDeviceAlert = async (
  email: string,
  deviceInfo: { deviceName?: string; deviceType: string; loginTime: Date },
  firstName?: string
): Promise<boolean> => {
  const name = firstName || 'Kullanıcı';
  const deviceName = deviceInfo.deviceName || deviceInfo.deviceType;
  const time = deviceInfo.loginTime.toLocaleString('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const content = `
        <h1>Yeni Cihaz Girişi 📱</h1>
        <p>Merhaba ${name},</p>
        <p>Hesabınıza yeni bir cihazdan giriş yapıldı:</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Cihaz:</strong> ${deviceName}</p>
            <p><strong>Tarih:</strong> ${time}</p>
        </div>
        <p>Eğer bu giriş size ait değilse, lütfen hemen şifrenizi değiştirin.</p>
    `;

  return sendEmail({
    to: email,
    subject: 'FitMark - Yeni Cihaz Girişi',
    html: getBaseTemplate(content, 'Yeni Cihaz Girişi'),
  });
};
