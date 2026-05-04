const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || process.env.GMAIL_USER || process.env.EMAIL_USER || '';
const FROM_NAME = 'FAYAGE';

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;

  if (!apiKey || !secretKey) {
    console.error('MAILJET_API_KEY / MAILJET_SECRET_KEY not configured');
    return false;
  }

  try {
    const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: FROM_EMAIL, Name: FROM_NAME },
          To: [{ Email: to }],
          Subject: subject,
          HTMLPart: html,
        }],
      }),
    });

    const data = await response.json() as any;
    if (!response.ok || data?.Messages?.[0]?.Status !== 'success') {
      console.error('Mailjet error:', JSON.stringify(data));
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to send email:', err);
    return false;
  }
}

export async function sendVerificationEmail(toEmail: string, code: string): Promise<boolean> {
  return sendEmail(toEmail, 'Code de vérification FAYAGE / رمز التحقق', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1E3A8A, #3B82F6); padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: white; margin: 0;">FAYAGE</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Vérification de votre email</p>
      </div>
      <div style="padding: 30px; text-align: center;">
        <p style="color: #333; font-size: 16px;">Votre code de vérification est:</p>
        <div style="background: #F8FAFC; border: 2px solid #1E3A8A; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #1E3A8A; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #666; font-size: 14px;">Ce code expire dans 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #333; font-size: 16px; direction: rtl;">رمز التحقق الخاص بك هو:</p>
        <p style="color: #666; font-size: 14px; direction: rtl;">ينتهي هذا الرمز خلال 10 دقائق.</p>
      </div>
    </div>
  `);
}

export async function sendPasswordResetEmail(toEmail: string, code: string): Promise<boolean> {
  return sendEmail(toEmail, 'Réinitialisation du mot de passe FAYAGE / إعادة تعيين كلمة المرور', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1E3A8A, #3B82F6); padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: white; margin: 0;">FAYAGE</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Réinitialisation du mot de passe</p>
      </div>
      <div style="padding: 30px; text-align: center;">
        <p style="color: #333; font-size: 16px;">Votre code de vérification est:</p>
        <div style="background: #F8FAFC; border: 2px solid #D97706; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #D97706; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #666; font-size: 14px;">Ce code expire dans 10 minutes.</p>
        <p style="color: #EF4444; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #333; font-size: 16px; direction: rtl;">رمز التحقق الخاص بك هو:</p>
        <p style="color: #666; font-size: 14px; direction: rtl;">ينتهي هذا الرمز خلال 10 دقائق.</p>
      </div>
    </div>
  `);
}

export async function sendClientWelcomeEmail(toEmail: string, fullName: string): Promise<boolean> {
  return sendEmail(toEmail, 'Bienvenue sur FAYAGE! / مرحبًا بك في FAYAGE!', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1E3A8A, #3B82F6); padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: white; margin: 0;">FAYAGE</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Bienvenue sur notre plateforme!</p>
      </div>
      <div style="padding: 30px; text-align: center;">
        <h2 style="color: #1E3A8A;">Bonjour ${fullName}!</h2>
        <p style="color: #333; font-size: 16px;">Nous sommes ravis de vous accueillir sur FAYAGE.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <h2 style="color: #1E3A8A; direction: rtl;">مرحبًا ${fullName}!</h2>
        <p style="color: #333; font-size: 16px; direction: rtl;">نحن سعداء بانضمامك إلى FAYAGE.</p>
      </div>
      <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; text-align: center;">
        <p style="color: #666; font-size: 14px; margin: 0;">FAYAGE - Transport Premium au Maroc</p>
      </div>
    </div>
  `);
}

export async function sendDriverWelcomeEmail(toEmail: string, fullName: string): Promise<boolean> {
  return sendEmail(toEmail, 'Bienvenue Chauffeur FAYAGE! / مرحبًا بك سائق FAYAGE!', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1E3A8A, #3B82F6); padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: white; margin: 0;">FAYAGE</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Bienvenue dans notre réseau de chauffeurs!</p>
      </div>
      <div style="padding: 30px; text-align: center;">
        <h2 style="color: #1E3A8A;">Bonjour ${fullName}!</h2>
        <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 10px; padding: 15px; margin: 20px 0;">
          <p style="color: #92400E; font-size: 14px; margin: 0;"><strong>Prochaine étape:</strong> Complétez votre vérification.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <h2 style="color: #1E3A8A; direction: rtl;">مرحبًا ${fullName}!</h2>
        <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 10px; padding: 15px; margin: 20px 0;">
          <p style="color: #92400E; font-size: 14px; margin: 0; direction: rtl;"><strong>الخطوة التالية:</strong> أكمل التحقق.</p>
        </div>
      </div>
      <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; text-align: center;">
        <p style="color: #666; font-size: 14px; margin: 0;">FAYAGE - Transport Premium au Maroc</p>
      </div>
    </div>
  `);
}

export async function sendDriverApprovalEmail(toEmail: string, fullName: string): Promise<boolean> {
  return sendEmail(toEmail, 'Compte Vérifié - FAYAGE / تم التحقق من الحساب!', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #059669, #10B981); padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: white; margin: 0;">FAYAGE</h1>
      </div>
      <div style="padding: 30px; text-align: center;">
        <h2 style="color: #059669;">Félicitations ${fullName}!</h2>
        <p style="color: #333;">Votre compte chauffeur a été vérifié avec succès.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <h2 style="color: #059669; direction: rtl;">تهانينا ${fullName}!</h2>
        <p style="color: #333; direction: rtl;">تم التحقق من حسابك بنجاح.</p>
      </div>
    </div>
  `);
}

export async function sendDriverRejectionEmail(toEmail: string, fullName: string, reason?: string): Promise<boolean> {
  const reasonText = reason || "Documents incomplets ou non conformes";
  return sendEmail(toEmail, 'Vérification Non Approuvée - FAYAGE', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #DC2626, #EF4444); padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: white; margin: 0;">FAYAGE</h1>
      </div>
      <div style="padding: 30px; text-align: center;">
        <h2 style="color: #DC2626;">Bonjour ${fullName},</h2>
        <p style="color: #333;">Malheureusement, votre demande n'a pas été approuvée.</p>
        <div style="background: #FEE2E2; border: 2px solid #EF4444; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <p style="color: #991B1B; margin: 0;"><strong>Raison:</strong> ${reasonText}</p>
        </div>
      </div>
    </div>
  `);
}
