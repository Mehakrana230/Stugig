const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTP = async (to, otp) => {
  const mailOptions = {
    from: `"StuGig" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your StuGig Verification Code',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #0F1115; color: #E6EEF6; border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.06);">
        <h1 style="color: #4F7FFF; font-size: 1.8rem; margin-bottom: 8px;">StuGig</h1>
        <p style="color: #9AA3B2; margin-bottom: 32px;">Student Freelance Platform</p>
        <h2 style="margin-bottom: 12px;">Verify your email</h2>
        <p style="color: #9AA3B2; line-height: 1.6;">Use the code below to complete your signup. It expires in <strong style="color:#E6EEF6">10 minutes</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="display: inline-block; letter-spacing: 12px; font-size: 2.4rem; font-weight: 800; color: #4F7FFF; background: rgba(79,127,255,0.1); padding: 18px 28px; border-radius: 12px; border: 1px solid rgba(79,127,255,0.25);">${otp}</span>
        </div>
        <p style="color: #9AA3B2; font-size: 0.85rem;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTP };
