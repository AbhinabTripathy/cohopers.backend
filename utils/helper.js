const nodemailer = require("nodemailer");

const host = (process.env.SMTP_HOST || "").trim();
const port = Number((process.env.SMTP_PORT || "").trim() || 465);
const user = ((process.env.ADMIN_EMAIL || process.env.SMTP_USER) || "").trim();
const pass = ((process.env.ADMIN_PASS || process.env.SMTP_PASS) || "").trim();

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  requireTLS: port !== 465,
  auth: { user, pass },
});

transporter.verify((err) => {
  if (err) console.error("SMTP Error:", err.message);
  else console.log("Zoho SMTP Connected Successfully");
});

async function sendMail(to, subject, html, options = {}) {
  try {
    if (!user || !pass || !host || !port) {
      throw new Error("SMTP is not fully configured");
    }
    const mailOptions = {
      from: `"CoHopers" <${user}>`,
      to: to || user,
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
