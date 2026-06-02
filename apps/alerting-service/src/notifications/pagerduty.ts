import axios from 'axios';
import { config } from '../config';

export interface PagerDutyOptions {
  routingKey: string;
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

export function mapSeverityToPagerDuty(severity: string): 'critical' | 'error' | 'warning' | 'info' {
  const sev = severity.toUpperCase();
  if (sev === 'CRITICAL') return 'critical';
  if (sev === 'HIGH') return 'error';
  if (sev === 'MEDIUM') return 'warning';
  return 'info';
}

export async function sendPagerDutyNotification(options: PagerDutyOptions): Promise<void> {
  const { routingKey, incident, workspaceId } = options;
  const incidentUrl = `${config.FRONTEND_URL}/workspaces/${workspaceId}/incidents/${incident.id}`;

  const payload = {
    routing_key: routingKey,
    event_action: 'trigger',
    dedup_key: incident.id,
    payload: {
      summary: `🚨 [NeuralOps] ${incident.severity}: ${incident.title} on ${incident.hostname}`,
      severity: mapSeverityToPagerDuty(incident.severity),
      source: incident.hostname,
      component: incident.anomalyType || 'ML Anomaly Engine',
      custom_details: {
        anomalyScore: incident.anomalyScore,
        status: incident.status,
        detectedAt: incident.detectedAt,
        incidentId: incident.id,
        workspaceId: workspaceId,
      },
    },
    links: [
      {
        href: incidentUrl,
        text: 'View in NeuralOps Dashboard',
      },
    ],
  };

  if (config.NODE_ENV === 'test') {
    // Skip real network calls during testing
    return;
  }

  try {
    const response = await axios.post('https://events.pagerduty.com/v2/enqueue', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status !== 202) {
      throw new Error(`Unexpected PagerDuty status code: ${response.status}`);
    }
  } catch (err: any) {
    const errMsg = err.response?.data?.message || err.message;
    console.error('❌ PagerDuty API integration delivery failed:', errMsg);
    throw new Error(`PagerDuty error: ${errMsg}`);
  }
}
export default sendPagerDutyNotification;
