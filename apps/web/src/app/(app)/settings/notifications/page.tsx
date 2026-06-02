"use client";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, PhoneCall, Save, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const Slack = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 0 1-2.52-2.52 2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.52 2.522v2.52h-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.522H3.78a2.528 2.528 0 0 1-2.522-2.522V8.824a2.528 2.528 0 0 1 2.522-2.52h5.043zm10.135 3.78a2.528 2.528 0 0 1 2.522-2.52 2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.52h-2.522v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V3.78a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043zm-3.78 10.135a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.522 2.528 2.528 0 0 1-2.52-2.522v-2.52h2.52zm0-1.262a2.528 2.528 0 0 1-2.52-2.52v-5.043a2.528 2.528 0 0 1 2.52-2.522h5.043a2.528 2.528 0 0 1 2.522 2.522v5.043a2.528 2.528 0 0 1-2.522 2.52h-5.043z" />
  </svg>
);

export default function NotificationsSettingsPage() {
  const [slackWebhook, setSlackWebhook] = useState("https://hooks.slack.com/services/mock-slack-incoming-webhook-url-placeholder");
  const [slackChannel, setSlackChannel] = useState("#ops-alerts");
  const [slackEnabled, setSlackEnabled] = useState(true);

  const [emailRecipients, setEmailRecipients] = useState("oncall@neuralops.io, dev-alerts@neuralops.io");
  const [emailEnabled, setEmailEnabled] = useState(true);

  const [pdKey, setPdKey] = useState("pd-key-xxxx-xxxx-xxxx");
  const [pdEnabled, setPdEnabled] = useState(false);

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Notification settings saved successfully");
    }, 800);
  };

  const handleTestNotification = (channel: "slack" | "email" | "pagerduty") => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: `Sending test message via ${channel}...`,
        success: `Test message dispatched successfully!`,
        error: `Could not send test notification. Check credentials.`,
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Channels"
        description="Configure how and where your team is alerted when anomalies are detected."
      />

      <div className="grid gap-6">
        {/* Slack Channel Settings */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Slack className="h-5 w-5 text-emerald-400" />
                Slack Integration
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Publish alerts to a Slack channel via webhooks.
              </CardDescription>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={slackEnabled}
                onChange={(e) => setSlackEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
              />
            </div>
          </CardHeader>
          {slackEnabled && (
            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">Webhook URL</label>
                  <Input
                    type="password"
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    className="bg-surface font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground uppercase font-semibold">Channel</label>
                  <Input
                    value={slackChannel}
                    onChange={(e) => setSlackChannel(e.target.value)}
                    placeholder="#channel-name"
                    className="bg-surface"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestNotification("slack")}
                  className="text-xs border-border"
                >
                  Send Test Message
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Email Alerting Settings */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-400" />
                Email Alerts
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Send email reports and high priority alerts to team aliases.
              </CardDescription>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
              />
            </div>
          </CardHeader>
          {emailEnabled && (
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-semibold">Recipient List (Comma-separated)</label>
                <Input
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="alerts@company.com"
                  className="bg-surface max-w-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestNotification("email")}
                  className="text-xs border-border"
                >
                  Send Test Email
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* PagerDuty Settings */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-red-400" />
                PagerDuty Integration
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Trigger incidents on PagerDuty for on-call engineers.
              </CardDescription>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={pdEnabled}
                onChange={(e) => setPdEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
              />
            </div>
          </CardHeader>
          {pdEnabled && (
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-semibold">Integration/Routing Key</label>
                <Input
                  type="password"
                  value={pdKey}
                  onChange={(e) => setPdKey(e.target.value)}
                  className="bg-surface font-mono text-xs max-w-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestNotification("pagerduty")}
                  className="text-xs border-border"
                >
                  Send Test Alert
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Save Settings */}
        <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            Any changes saved here immediately apply to all incoming incidents.
          </p>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </div>
  );
}
