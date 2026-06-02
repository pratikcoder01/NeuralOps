"use client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";
import { formatTimestamp } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { MLModel } from "@/types";

const SAMPLE_MODELS: MLModel[] = [
  {
    id: "model-001",
    name: "NeuralOps Transformer v2",
    version: "2.4.1",
    status: "PRODUCTION",
    f1Score: 0.927,
    aucRoc: 0.961,
    precision: 0.941,
    recall: 0.913,
    trainedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    deployedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    featureCount: 15,
    description: "Transformer autoencoder trained on 60-step multivariate time-series. Weekly retrained on labeled incidents.",
  },
  {
    id: "model-002",
    name: "NeuralOps Transformer v2",
    version: "2.3.9",
    status: "STAGING",
    f1Score: 0.918,
    aucRoc: 0.954,
    precision: 0.928,
    recall: 0.908,
    trainedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    featureCount: 15,
    description: "Previous production version, now in staging for comparison.",
  },
  {
    id: "model-003",
    name: "NeuralOps Transformer v1",
    version: "1.9.2",
    status: "ARCHIVED",
    f1Score: 0.884,
    aucRoc: 0.921,
    precision: 0.901,
    recall: 0.868,
    trainedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    featureCount: 12,
  },
];

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function ModelsPage() {
  return (
    <div className="max-w-[1200px] space-y-6">
      <PageHeader
        title="ML Model Registry"
        description="Transformer autoencoder versions and performance metrics"
        breadcrumbs={[{ label: "ML Models" }]}
      />

      <div className="space-y-4">
        {SAMPLE_MODELS.map((model) => (
          <Card key={model.id} className={cn(
            model.status === "PRODUCTION" && "border-green-500/30",
            model.status === "STAGING" && "border-blue-500/20",
            model.status === "ARCHIVED" && "opacity-60",
          )}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{model.name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      v{model.version} · {model.featureCount} features
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    model.status === "PRODUCTION" ? "low" :
                    model.status === "STAGING" ? "default" : "outline"
                  }
                >
                  {model.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {model.description && (
                <p className="text-sm text-muted-foreground mb-5">{model.description}</p>
              )}
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-3">
                  <MetricBar label="F1 Score" value={model.f1Score} />
                  <MetricBar label="AUC-ROC" value={model.aucRoc} />
                </div>
                <div className="space-y-3">
                  <MetricBar label="Precision" value={model.precision} />
                  <MetricBar label="Recall" value={model.recall} />
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs text-muted-foreground border-t border-border pt-4">
                <span>Trained: <span className="font-mono text-foreground">{formatTimestamp(model.trainedAt)}</span></span>
                {model.deployedAt && (
                  <span>Deployed: <span className="font-mono text-foreground">{formatTimestamp(model.deployedAt)}</span></span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
