import crypto from 'crypto';

// Generate random 6-digit OTP
export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}