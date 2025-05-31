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
      .replace("{{resetLink}}", `https://guestify-2-0.vercel.app/reset-password/${token}`)
      .replace("{{year}}", new Date().getFullYear());
    return htmlContent;
  },
};
