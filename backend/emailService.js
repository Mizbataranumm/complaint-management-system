// backend/emailService.js
// Email notification service using Nodemailer + Gmail SMTP

const nodemailer = require('nodemailer');

// Create transporter
// NOTE: Set GMAIL_USER and GMAIL_APP_PASSWORD in .env file
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'your-email@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD || 'your-app-password'
    }
  });
};

// Email templates
const emailTemplates = {
  complaintSubmitted: (complaint, user) => ({
    subject: `✅ Complaint Submitted - ${complaint.id}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🏛️ College Complaint Portal</h1>
          <p style="color: #bfdbfe; margin: 5px 0 0;">ABC Engineering College</p>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e2e8f0;">
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #065f46; margin: 0 0 5px;">✅ Complaint Submitted Successfully</h2>
            <p style="color: #047857; margin: 0;">Your complaint has been registered in our system.</p>
          </div>
          <p>Dear <strong>${user.name}</strong>,</p>
          <p>Your complaint has been successfully submitted. Here are the details:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Complaint ID</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; color: #2563eb; font-weight: bold;">${complaint.id}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Title</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${complaint.title}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Category</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${complaint.category}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Priority</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">
                <span style="background: ${complaint.priority === 'Critical' ? '#fee2e2' : complaint.priority === 'High' ? '#fef3c7' : '#f0fdf4'}; 
                             color: ${complaint.priority === 'Critical' ? '#dc2626' : complaint.priority === 'High' ? '#d97706' : '#16a34a'};
                             padding: 3px 10px; border-radius: 20px; font-size: 13px; font-weight: bold;">
                  ${complaint.priority}
                </span>
              </td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #475569;">Status</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">Submitted</td>
            </tr>
          </table>
          <div style="background: #eff6ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #1e40af;"><strong>📋 What's Next?</strong></p>
            <p style="margin: 8px 0 0; color: #3b82f6;">Our team will review your complaint and assign it to the appropriate department. You will receive email updates at every stage.</p>
          </div>
          <p>Track your complaint using ID: <strong style="color: #2563eb;">${complaint.id}</strong></p>
        </div>
        <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; color: #64748b; font-size: 13px;">© 2024 ABC Engineering College | Complaint Management System</p>
          <p style="margin: 5px 0 0; color: #94a3b8; font-size: 12px;">This is an automated message. Please do not reply directly.</p>
        </div>
      </div>
    `
  }),

  complaintAssigned: (complaint, user) => ({
    subject: `🔔 Complaint Assigned - ${complaint.id}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🏛️ College Complaint Portal</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e2e8f0;">
          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e40af; margin: 0 0 5px;">🔔 Complaint Assigned</h2>
            <p style="color: #3b82f6; margin: 0;">Your complaint has been assigned to a department.</p>
          </div>
          <p>Dear <strong>${user.name}</strong>,</p>
          <p>Your complaint <strong style="color: #2563eb;">${complaint.id}</strong> has been assigned.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Complaint ID</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; color: #2563eb;"><strong>${complaint.id}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Assigned To</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${complaint.assignedTo}</strong></td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Status</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">In Progress</td>
            </tr>
          </table>
          <p>You will receive further updates as the complaint progresses.</p>
        </div>
        <div style="background: #f1f5f9; padding: 15px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; color: #64748b; font-size: 13px;">© 2024 ABC Engineering College | Complaint Management System</p>
        </div>
      </div>
    `
  }),

  complaintResolved: (complaint, user) => ({
    subject: `✅ Complaint Resolved - ${complaint.id}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #064e3b, #10b981); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🏛️ College Complaint Portal</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e2e8f0;">
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #065f46; margin: 0 0 5px;">🎉 Complaint Resolved!</h2>
            <p style="color: #047857; margin: 0;">Your complaint has been resolved successfully.</p>
          </div>
          <p>Dear <strong>${user.name}</strong>,</p>
          <p>We're happy to inform you that your complaint <strong style="color: #10b981;">${complaint.id}</strong> has been resolved.</p>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46; font-weight: bold;">Resolution Notes:</p>
            <p style="margin: 8px 0 0; color: #047857;">${complaint.resolutionNotes || 'Issue has been addressed and resolved.'}</p>
          </div>
          <p>Please log in to submit your <strong>feedback and rating</strong> for this resolution.</p>
          <a href="#" style="display: inline-block; background: #10b981; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Submit Feedback →</a>
        </div>
        <div style="background: #f1f5f9; padding: 15px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; color: #64748b; font-size: 13px;">© 2024 ABC Engineering College | Complaint Management System</p>
        </div>
      </div>
    `
  }),

  complaintEscalated: (complaint, user) => ({
    subject: `⚠️ Complaint Escalated - ${complaint.id}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #7c2d12, #ea580c); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🏛️ College Complaint Portal</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e2e8f0;">
          <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #9a3412; margin: 0 0 5px;">⚠️ Complaint Escalated</h2>
            <p style="color: #c2410c; margin: 0;">Your complaint has been escalated for priority handling.</p>
          </div>
          <p>Dear <strong>${user.name}</strong>,</p>
          <p>Your complaint <strong style="color: #ea580c;">${complaint.id}</strong> has been escalated because it was not resolved within the expected timeframe.</p>
          <p>This means it is now being handled with <strong>higher priority</strong> by senior management.</p>
          <p>We apologize for the delay and assure you that this will be resolved at the earliest.</p>
        </div>
        <div style="background: #f1f5f9; padding: 15px; text-align: center; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; color: #64748b; font-size: 13px;">© 2024 ABC Engineering College | Complaint Management System</p>
        </div>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (to, templateName, complaint, user) => {
  // If no email config, log and skip
  if (!process.env.GMAIL_USER || process.env.GMAIL_USER === 'your-email@gmail.com') {
    console.log(`[EMAIL SKIPPED] Would send "${templateName}" to ${to}`);
    console.log(`[EMAIL] Complaint: ${complaint.id}, User: ${user.name}`);
    return { success: true, message: 'Email logging mode (configure GMAIL_USER in .env to enable)' };
  }

  try {
    const transporter = createTransporter();
    const template = emailTemplates[templateName](complaint, user);
    
    await transporter.sendMail({
      from: `"College Complaint System" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: template.subject,
      html: template.html
    });

    console.log(`[EMAIL SENT] ${templateName} to ${to}`);
    return { success: true };
  } catch (error) {
    console.error(`[EMAIL ERROR] ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
