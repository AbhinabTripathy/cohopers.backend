const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("SMTP Error:", err.message);
  } else {
    console.log("Zoho SMTP Connected Successfully");
  }
});

async function sendMail(to, subject, html, options = {}) {
  try {
    const mailOptions = {
      from: `"CoHopers" <${process.env.ADMIN_EMAIL}>`,
      to,
      subject,
      html,
      ...options,
    };

    await transporter.sendMail(mailOptions);
    console.log("Mail sent successfully");
  } catch (error) {
    console.error("Mail send error:", error.message);
  }
}

module.exports = sendMail;
