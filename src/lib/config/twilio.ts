/**
 * ============================================
 * CLARA OS
 * Twilio Configuration
 * --------------------------------------------
 * File : twilio.ts
 * Responsibility :
 * Centralizes Twilio configuration.
 * ============================================
 */

export const twilioConfig = {

  accountSid:
    process.env.TWILIO_ACCOUNT_SID ?? "",

  authToken:
    process.env.TWILIO_AUTH_TOKEN ?? "",

  phoneNumber:
    process.env.TWILIO_PHONE_NUMBER ?? "",

} as const;
