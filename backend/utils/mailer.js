const nodemailer = require('nodemailer');

function hasSmtpConfig() {
  return process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;
}

async function getTransport() {
  if (!hasSmtpConfig()) return null;
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail({ to, subject, text, html }) {
  const transport = await getTransport();
  if (!transport) {
    console.log('[MAIL:FALLBACK]', { to, subject, text });
    return { fallback: true };
  }
  return transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
}

async function sendPasswordReset({ to, resetUrl }) {
  const subject = 'Reset your password';
  const text = `Click the link to reset your password: ${resetUrl}`;
  const html = `<p>Click the link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`;
  return sendMail({ to, subject, text, html });
}

module.exports = { sendMail, sendPasswordReset };
