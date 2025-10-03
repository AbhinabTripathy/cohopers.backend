const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // true for 465
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASS,
  },
});

async function sendAdminNotification(subject, message) {
  try {
    await transporter.sendMail({
      from: `"CoHopers" <${process.env.ADMIN_EMAIL}>`,
      to: process.env.ADMIN_EMAIL, // send to admin itself
      subject,
      html: `<p>${message}</p>`,
    });
    console.log("Mail sent via Zoho!");
  } catch (error) {
    console.error("Mail send error:", error);
  }
}

module.exports = sendAdminNotification;
