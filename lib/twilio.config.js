import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

export const client = twilio(accountSid, authToken);