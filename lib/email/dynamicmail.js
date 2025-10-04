import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

function getContentByfilename(filename) {
  const filePath = path.join(__dirname, "emailtemp", filename);
  let htmlContent = fs.readFileSync(filePath, "utf-8");
  return htmlContent;
}

export const EmailContent = {
  Test: ({ name }) => {
    let htmlContent = getContentByfilename("test.html");
    htmlContent = htmlContent.replace("{{name}}", name);
    return htmlContent;
  },
  ForgotPassword: ({ userName, token }) => {
    let htmlContent = getContentByfilename("forgot-password.html");
    htmlContent = htmlContent
      .replace("{{name}}", userName)
      .replace(
        "{{resetLink}}",
        `https://guestify-2-0.vercel.app/reset-password/${token}`
      )
      .replace("{{year}}", new Date().getFullYear());
    return htmlContent;
  },
  VerifyEmail: ({ userName, otp, expiry_minutes }) => {
    let htmlContent = getContentByfilename("verify-email.html");
    htmlContent = htmlContent
      .replace("{{name}}", userName)
      .replace("{{otp}}", `${otp}`)
      .replace("{{expiry_minutes}}", expiry_minutes);
    return htmlContent;
  },
  Welcome: ({ userName, login_url }) => {
    let htmlContent = getContentByfilename("welcome.html");
    htmlContent = htmlContent
      .replace("{{name}}", userName)
      .replace("{{login_url}}", login_url)
      .replace("{{year}}", new Date().getFullYear());
    return htmlContent;
  },
  NewPG: ({ userName, pg_name, pg_type, owner_name, address, pg_image, pg_link }) => {
    let htmlContent = getContentByfilename("new-pg.html");
    htmlContent = htmlContent
      .replace("{{name}}", userName)
      .replace("{{pg_name}}", pg_name)
      .replace("{{pg_type}}", pg_type)
      .replace("{{owner_name}}", owner_name)
      .replace("{{address}}", address)
      .replace("{{pg_image}}", pg_image)
      .replace("{{pg_link}}", pg_link)
      .replace("{{year}}", new Date().getFullYear());
    return htmlContent;
  },
};
