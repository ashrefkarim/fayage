import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendPasswordResetEmail(toEmail: string, code: string): Promise<boolean> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Gmail credentials not configured');
      return false;
    }

    const result = await transporter.sendMail({
      from: `FAYAGE <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Réinitialisation du mot de passe FAYAGE / إعادة تعيين كلمة المرور',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A8A, #3B82F6); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">FAYAGE</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Réinitialisation du mot de passe</p>
          </div>
          
          <div style="padding: 30px; text-align: center;">
            <p style="color: #333; font-size: 16px;">Vous avez demandé la réinitialisation de votre mot de passe.</p>
            <p style="color: #333; font-size: 16px;">Votre code de vérification est:</p>
            <div style="background: #F8FAFC; border: 2px solid #D97706; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #D97706; letter-spacing: 8px;">${code}</span>
            </div>
            <p style="color: #666; font-size: 14px;">Ce code expire dans 10 minutes.</p>
            <p style="color: #EF4444; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #333; font-size: 16px; direction: rtl;">لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.</p>
            <p style="color: #333; font-size: 16px; direction: rtl;">رمز التحقق الخاص بك هو:</p>
            <p style="color: #666; font-size: 14px; direction: rtl;">ينتهي هذا الرمز خلال 10 دقائق.</p>
            <p style="color: #EF4444; font-size: 14px; direction: rtl;">إذا لم تطلب هذا، تجاهل هذا البريد الإلكتروني.</p>
          </div>
        </div>
      `
    });
    
    console.log('Password reset email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

export async function sendClientWelcomeEmail(toEmail: string, fullName: string): Promise<boolean> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Gmail credentials not configured');
      return false;
    }

    const result = await transporter.sendMail({
      from: `FAYAGE <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Bienvenue sur FAYAGE! / مرحبًا بك في FAYAGE!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A8A, #3B82F6); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">FAYAGE</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Bienvenue sur notre plateforme!</p>
          </div>
          
          <div style="padding: 30px; text-align: center;">
            <h2 style="color: #1E3A8A;">Bonjour ${fullName}!</h2>
            <p style="color: #333; font-size: 16px;">Nous sommes ravis de vous accueillir sur FAYAGE, votre plateforme de transport premium au Maroc.</p>
            <p style="color: #333; font-size: 16px;">Vous pouvez maintenant:</p>
            <ul style="text-align: left; color: #333; font-size: 14px; line-height: 1.8;">
              <li>Créer des demandes de transport</li>
              <li>Suivre vos livraisons en temps réel</li>
              <li>Communiquer avec les chauffeurs</li>
              <li>Consulter votre historique</li>
            </ul>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <h2 style="color: #1E3A8A; direction: rtl;">مرحبًا ${fullName}!</h2>
            <p style="color: #333; font-size: 16px; direction: rtl;">نحن سعداء بانضمامك إلى FAYAGE، منصة النقل المميزة في المغرب.</p>
            <p style="color: #333; font-size: 16px; direction: rtl;">يمكنك الآن:</p>
            <ul style="text-align: right; color: #333; font-size: 14px; line-height: 1.8; direction: rtl;">
              <li>إنشاء طلبات النقل</li>
              <li>تتبع عمليات التوصيل في الوقت الفعلي</li>
              <li>التواصل مع السائقين</li>
              <li>الاطلاع على سجلك</li>
            </ul>
          </div>
          
          <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; text-align: center;">
            <p style="color: #666; font-size: 14px; margin: 0;">FAYAGE - Transport Premium au Maroc</p>
          </div>
        </div>
      `
    });
    
    console.log('Client welcome email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send client welcome email:', error);
    return false;
  }
}

export async function sendDriverWelcomeEmail(toEmail: string, fullName: string): Promise<boolean> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Gmail credentials not configured');
      return false;
    }

    const result = await transporter.sendMail({
      from: `FAYAGE <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Bienvenue Chauffeur FAYAGE! / مرحبًا بك سائق FAYAGE!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A8A, #3B82F6); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">FAYAGE</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Bienvenue dans notre réseau de chauffeurs!</p>
          </div>
          
          <div style="padding: 30px; text-align: center;">
            <h2 style="color: #1E3A8A;">Bonjour ${fullName}!</h2>
            <p style="color: #333; font-size: 16px;">Nous sommes ravis de vous accueillir parmi nos chauffeurs partenaires FAYAGE.</p>
            
            <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 10px; padding: 15px; margin: 20px 0;">
              <p style="color: #92400E; font-size: 14px; margin: 0;"><strong>Prochaine étape:</strong> Complétez votre vérification pour commencer à recevoir des commandes.</p>
            </div>
            
            <p style="color: #333; font-size: 16px;">Une fois vérifié, vous pourrez:</p>
            <ul style="text-align: left; color: #333; font-size: 14px; line-height: 1.8;">
              <li>Recevoir des demandes de transport</li>
              <li>Proposer vos services</li>
              <li>Suivre vos gains</li>
              <li>Communiquer avec les clients</li>
            </ul>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <h2 style="color: #1E3A8A; direction: rtl;">مرحبًا ${fullName}!</h2>
            <p style="color: #333; font-size: 16px; direction: rtl;">نحن سعداء بانضمامك إلى شبكة سائقي FAYAGE.</p>
            
            <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 10px; padding: 15px; margin: 20px 0;">
              <p style="color: #92400E; font-size: 14px; margin: 0; direction: rtl;"><strong>الخطوة التالية:</strong> أكمل التحقق لبدء استقبال الطلبات.</p>
            </div>
          </div>
          
          <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; text-align: center;">
            <p style="color: #666; font-size: 14px; margin: 0;">FAYAGE - Transport Premium au Maroc</p>
          </div>
        </div>
      `
    });
    
    console.log('Driver welcome email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send driver welcome email:', error);
    return false;
  }
}

export async function sendDriverApprovalEmail(toEmail: string, fullName: string): Promise<boolean> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Gmail credentials not configured');
      return false;
    }

    const result = await transporter.sendMail({
      from: `FAYAGE <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Compte Vérifié - Bienvenue chez FAYAGE! / تم التحقق من الحساب!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669, #10B981); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">FAYAGE</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Félicitations!</p>
          </div>
          
          <div style="padding: 30px; text-align: center;">
            <div style="background: #D1FAE5; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 40px;">✓</span>
            </div>
            
            <h2 style="color: #059669;">Félicitations ${fullName}!</h2>
            <p style="color: #333; font-size: 16px;">Votre compte chauffeur a été vérifié avec succès.</p>
            <p style="color: #333; font-size: 16px;">Vous pouvez maintenant commencer à accepter des commandes et gagner de l'argent avec FAYAGE!</p>
            
            <div style="background: #ECFDF5; border: 2px solid #10B981; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <p style="color: #047857; font-size: 16px; margin: 0;"><strong>Votre compte est maintenant actif!</strong></p>
              <p style="color: #047857; font-size: 14px; margin: 10px 0 0 0;">Ouvrez l'application pour voir les commandes disponibles.</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <h2 style="color: #059669; direction: rtl;">تهانينا ${fullName}!</h2>
            <p style="color: #333; font-size: 16px; direction: rtl;">تم التحقق من حسابك كسائق بنجاح.</p>
            <p style="color: #333; font-size: 16px; direction: rtl;">يمكنك الآن البدء في قبول الطلبات وكسب المال مع FAYAGE!</p>
            
            <div style="background: #ECFDF5; border: 2px solid #10B981; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <p style="color: #047857; font-size: 16px; margin: 0; direction: rtl;"><strong>حسابك نشط الآن!</strong></p>
              <p style="color: #047857; font-size: 14px; margin: 10px 0 0 0; direction: rtl;">افتح التطبيق لرؤية الطلبات المتاحة.</p>
            </div>
          </div>
          
          <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; text-align: center;">
            <p style="color: #666; font-size: 14px; margin: 0;">FAYAGE - Transport Premium au Maroc</p>
          </div>
        </div>
      `
    });
    
    console.log('Driver approval email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send driver approval email:', error);
    return false;
  }
}

export async function sendDriverRejectionEmail(toEmail: string, fullName: string, reason?: string): Promise<boolean> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Gmail credentials not configured');
      return false;
    }

    const reasonText = reason || "Documents incomplets ou non conformes / وثائق غير مكتملة أو غير مطابقة";

    const result = await transporter.sendMail({
      from: `FAYAGE <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Vérification Non Approuvée - FAYAGE / التحقق غير موافق عليه',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #DC2626, #EF4444); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">FAYAGE</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Mise à jour de votre demande</p>
          </div>
          
          <div style="padding: 30px; text-align: center;">
            <h2 style="color: #DC2626;">Bonjour ${fullName},</h2>
            <p style="color: #333; font-size: 16px;">Nous avons examiné votre demande de vérification de compte chauffeur.</p>
            <p style="color: #333; font-size: 16px;">Malheureusement, nous ne pouvons pas approuver votre demande pour le moment.</p>
            
            <div style="background: #FEE2E2; border: 2px solid #EF4444; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <p style="color: #991B1B; font-size: 14px; margin: 0;"><strong>Raison:</strong></p>
              <p style="color: #991B1B; font-size: 14px; margin: 10px 0 0 0;">${reasonText}</p>
            </div>
            
            <p style="color: #333; font-size: 16px;">Vous pouvez soumettre de nouveaux documents et réessayer.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <h2 style="color: #DC2626; direction: rtl;">مرحبًا ${fullName}،</h2>
            <p style="color: #333; font-size: 16px; direction: rtl;">لقد راجعنا طلب التحقق من حساب السائق الخاص بك.</p>
            <p style="color: #333; font-size: 16px; direction: rtl;">للأسف، لا يمكننا الموافقة على طلبك في الوقت الحالي.</p>
            
            <div style="background: #FEE2E2; border: 2px solid #EF4444; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <p style="color: #991B1B; font-size: 14px; margin: 0; direction: rtl;"><strong>السبب:</strong></p>
              <p style="color: #991B1B; font-size: 14px; margin: 10px 0 0 0; direction: rtl;">${reasonText}</p>
            </div>
            
            <p style="color: #333; font-size: 16px; direction: rtl;">يمكنك تقديم وثائق جديدة والمحاولة مرة أخرى.</p>
          </div>
          
          <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; text-align: center;">
            <p style="color: #666; font-size: 14px; margin: 0;">FAYAGE - Transport Premium au Maroc</p>
          </div>
        </div>
      `
    });
    
    console.log('Driver rejection email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send driver rejection email:', error);
    return false;
  }
}

export async function sendVerificationEmail(toEmail: string, code: string): Promise<boolean> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Gmail credentials not configured');
      return false;
    }

    const result = await transporter.sendMail({
      from: `FAYAGE <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Code de vérification FAYAGE / رمز التحقق',
      html: `
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
      `
    });
    
    console.log('Email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}
