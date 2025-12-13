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
  NewPG: ({
    userName,
    pg_name,
    pg_type,
    owner_name,
    address,
    pg_image,
    pg_link,
  }) => {
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
  UserBooking: ({
    user_name,
    booking_date,
    room_id,
    booking_id,
    user_booking_url,
    persons,
  }) => {
    let htmlContent = getContentByfilename("user-booking.html"); // your email template file

    // Generate the table rows for all persons
    const personsRows = persons
      .map(
        (p) => `
        <tr>
          <td style="border: 1px solid #ddd;">${p.first_name} ${
          p.last_name
        }</td>
          <td style="border: 1px solid #ddd;">${p.age}</td>
          <td style="border: 1px solid #ddd;">${p.gender}</td>
          <td style="border: 1px solid #ddd;">${p.type_of_identity}</td>
          <td style="border: 1px solid #ddd;">${p.identity_id}</td>
          <td style="border: 1px solid #ddd;">${
            p.is_primary ? "Yes" : "No"
          }</td>
        </tr>`
      )
      .join("");

    htmlContent = htmlContent
      .replace("{{user_name}}", user_name)
      .replace("{{booking_date}}", booking_date)
      .replace("{{room_id}}", room_id)
      .replace("{{booking_id}}", booking_id)
      .replace("{{user_booking_url}}", user_booking_url)
      .replace("{{year}}", new Date().getFullYear())
      .replace("{{persons_rows}}", personsRows);

    return htmlContent;
  },

  AdminBooking: ({
    admin_name,
    user_name,
    booking_date,
    room_id,
    booking_id,
    admin_booking_url,
    persons,
  }) => {
    let htmlContent = getContentByfilename("admin-booking.html"); // your admin template

    const personsRows = persons
      .map(
        (p) => `
        <tr>
          <td style="border: 1px solid #ddd;">${p.first_name} ${
          p.last_name
        }</td>
          <td style="border: 1px solid #ddd;">${p.age}</td>
          <td style="border: 1px solid #ddd;">${p.gender}</td>
          <td style="border: 1px solid #ddd;">${p.type_of_identity}</td>
          <td style="border: 1px solid #ddd;">${p.identity_id}</td>
          <td style="border: 1px solid #ddd;">${
            p.is_primary ? "Yes" : "No"
          }</td>
        </tr>`
      )
      .join("");

    htmlContent = htmlContent
      .replace("{{admin_name}}", admin_name)
      .replace("{{user_name}}", user_name)
      .replace("{{booking_date}}", booking_date)
      .replace("{{room_id}}", room_id)
      .replace("{{booking_id}}", booking_id)
      .replace("{{admin_booking_url}}", admin_booking_url)
      .replace("{{year}}", new Date().getFullYear())
      .replace("{{persons_rows}}", personsRows);

    return htmlContent;
  },
};
