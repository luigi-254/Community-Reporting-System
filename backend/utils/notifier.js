let resendClient = null;

try {
  const { Resend } = await import('resend');
  if (process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
} catch (e) {
}

export async function sendVerificationEmail({ email, code, token }) {
  const from = process.env.EMAIL_FROM || 'Community Reporting <noreply@communityreporting.org>';
  const subject = 'Verify your Community Reporting account';
  const html = `
    <h2>Welcome to Community Reporting System</h2>
    <p>Please verify your email to start submitting or tracking community reports.</p>
    <p><strong>Your verification code:</strong> <span style="font-size: 24px; letter-spacing: 4px; font-weight: bold;">${code}</span></p>
    <p>This code will expire in 30 minutes.</p>
  `;

  if (resendClient && process.env.RESEND_API_KEY) {
    try {
      await resendClient.emails.send({
        from,
        to: email,
        subject,
        html,
      });
      return true;
    } catch (err) {
      console.error('[Notifier] Resend verification email failed:', err.message);
    }
  }

  // Development fallback logging
  console.log(`[Notifier DEV] Verification Code for ${email}: ${code} (Token: ${token})`);
  return true;
}

export async function sendPasswordResetEmail({ email, token, code }) {
  const from = process.env.EMAIL_FROM || 'Community Reporting <noreply@communityreporting.org>';
  const subject = 'Password Reset Request';
  const html = `
    <h2>Password Reset Request</h2>
    <p>You requested a password reset for your Community Reporting account.</p>
    <p><strong>Reset Code:</strong> <span style="font-size: 24px; letter-spacing: 4px; font-weight: bold;">${code}</span></p>
    <p>Reset Token: <code>${token}</code></p>
    <p>If you did not request this, please ignore this email.</p>
  `;

  if (resendClient && process.env.RESEND_API_KEY) {
    try {
      await resendClient.emails.send({
        from,
        to: email,
        subject,
        html,
      });
      return true;
    } catch (err) {
      console.error('[Notifier] Resend password reset email failed:', err.message);
    }
  }

  // Development fallback logging
  console.log(`[Notifier DEV] Password Reset Code for ${email}: ${code} (Token: ${token})`);
  return true;
}

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
