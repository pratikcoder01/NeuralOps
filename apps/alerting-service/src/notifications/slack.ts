import { IncomingWebhook } from '@slack/webhook';
import { config } from '../config';

export function getSlackColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return '#E01E5A'; // Slack Red
    case 'HIGH':
      return '#ECB22E'; // Slack Yellow/Orange
    case 'MEDIUM':
      return '#36C5F0'; // Slack Cyan/Medium
    default:
      return '#2EB67D'; // Slack Green/Low
  }
}

export interface SlackPayloadOptions {
  webhookUrl: string;
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

export async function sendSlackNotification(options: SlackPayloadOptions): Promise<void> {
  const { webhookUrl, incident, workspaceId } = options;
  const webhook = new IncomingWebhook(webhookUrl);

  const incidentUrl = `${config.FRONTEND_URL}/workspaces/${workspaceId}/incidents/${incident.id}`;
  const color = getSlackColor(incident.severity);

  await webhook.send({
    text: `🚨 ${incident.severity}: ${incident.title} on ${incident.hostname}`,
    attachments: [
      {
        color: color,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🚨 ${incident.severity}: ${incident.title}`,
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Host:*\n${incident.hostname}`,
              },
              {
                type: 'mrkdwn',
                text: `*Severity:*\n${incident.severity}`,
              },
              {
                type: 'mrkdwn',
                text: `*Anomaly Score:*\n${(incident.anomalyScore * 100).toFixed(1)}%`,
              },
              {
                type: 'mrkdwn',
                text: `*Anomaly Type:*\n${incident.anomalyType || 'Unknown'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Detected At:*\n${new Date(incident.detectedAt).toLocaleString()}`,
              },
              {
                type: 'mrkdwn',
                text: `*Status:*\n${incident.status}`,
              },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Incident 🔍',
                  emoji: true,
                },
                style: 'primary',
                url: incidentUrl,
              },
            ],
          },
        ],
      },
    ],
  });
}
