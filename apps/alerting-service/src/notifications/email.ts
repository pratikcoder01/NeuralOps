import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { config } from '../config';

if (config.SENDGRID_API_KEY) {
  sgMail.setApiKey(config.SENDGRID_API_KEY);
}

export interface EmailPayloadOptions {
  to: string;
  incident: {
    id: string;
    title: string;
    severity: string;
    status: string;
    anomalyScore: number;
    anomalyType: string;
    detectedAt: string;
    hostname: string;
  };
  workspaceId: string;
}

export function compileHtmlTemplate(options: EmailPayloadOptions): string {
  const { incident, workspaceId } = options;
  const incidentUrl = `${config.FRONTEND_URL}/workspaces/${workspaceId}/incidents/${incident.id}`;
  const severityColor = incident.severity.toUpperCase() === 'CRITICAL' ? '#E01E5A' : '#ECB22E';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f4F5F7;
            margin: 0;
            padding: 0;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          }
          .header {
            background-color: ${severityColor};
            padding: 30px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
          }
          .details-table td {
            padding: 12px;
            border-bottom: 1px solid #E2E8F0;
          }
          .details-table td.label {
            font-weight: bold;
            color: #4A5568;
            width: 30%;
          }
          .details-table td.value {
            color: #2D3748;
          }
          .btn-container {
            text-align: center;
            margin: 35px 0 15px 0;
          }
          .btn {
            background-color: #4F46E5;
            color: #ffffff !important;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            display: inline-block;
          }
          .footer {
            background-color: #F7FAFC;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #718096;
            border-top: 1px solid #E2E8F0;
          }
          .footer a {
            color: #4F46E5;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Incident Alert: ${incident.severity}</h1>
          </div>
          <div class="content">
            <p>An infrastructure anomaly has been detected on host <strong>${incident.hostname}</strong>. Please investigate immediately.</p>
            <table class="details-table">
              <tr>
                <td class="label">Incident:</td>
                <td class="value">${incident.title}</td>
              </tr>
              <tr>
                <td class="label">Severity:</td>
                <td class="value">${incident.severity}</td>
              </tr>
              <tr>
                <td class="label">Anomaly Score:</td>
                <td class="value">${(incident.anomalyScore * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td class="label">Anomaly Type:</td>
                <td class="value">${incident.anomalyType}</td>
              </tr>
              <tr>
                <td class="label">Detected At:</td>
                <td class="value">${new Date(incident.detectedAt).toUTCString()}</td>
              </tr>
            </table>
            <div class="btn-container">
              <a href="${incidentUrl}" class="btn">View Incident Details</a>
            </div>
          </div>
          <div class="footer">
            <p>Sent by NeuralOps SaaS Platform. You are receiving this because your email is configured as an alert target.</p>
            <p><a href="${config.FRONTEND_URL}/unsubscribe">Unsubscribe</a> | <a href="${config.FRONTEND_URL}">Manage Preferences</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendEmailNotification(options: EmailPayloadOptions): Promise<void> {
  const html = compileHtmlTemplate(options);
  const subject = `🚨 [NeuralOps] ${options.incident.severity}: ${options.incident.title} on ${options.incident.hostname}`;

  if (config.SENDGRID_API_KEY && config.NODE_ENV !== 'test') {
    try {
      await sgMail.send({
        to: options.to,
        from: 'alerts@neuralops.com',
        subject: subject,
        html: html,
      });
      return;
    } catch (err: any) {
      console.error('❌ SendGrid delivery failed, attempting Nodemailer fallback:', err.message);
    }
  }

  // Fallback / local test transporter using direct SMTP or Mock
  try {
    let transporter: nodemailer.Transporter;
    if (config.NODE_ENV === 'test') {
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    } else {
      // Mock SMTP credentials or standard local port
      transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025, // e.g. Mailhog local port
        ignoreTLS: true,
      });
    }

    await transporter.sendMail({
      from: 'alerts@neuralops.com',
      to: options.to,
      subject: subject,
      html: html,
    });
  } catch (err: any) {
    console.error('❌ Nodemailer SMTP fallback delivery failed:', err.message);
    throw err;
  }
}
export default sendEmailNotification;
