import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendPhoneVerification = async (phone) => {
  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({ to: phone, channel: 'sms' });
    
    return {
      success: true,
      status: verification.status
    };
  } catch (error) {
    console.error('Erro ao enviar SMS:', error);
    throw new Error('Erro ao enviar código SMS');
  }
};

export const verifyPhoneCode = async (phone, code) => {
  try {
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: phone, code });
    
    return {
      success: verificationCheck.status === 'approved',
      status: verificationCheck.status
    };
  } catch (error) {
    console.error('Erro ao verificar código:', error);
    throw new Error('Erro ao verificar código SMS');
  }
};