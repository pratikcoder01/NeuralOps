"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Brain, Shield, ArrowRight, CheckCircle, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const TERMINAL_LINES = [
  { type: "comment", text: "# NeuralOps Agent — Real-time anomaly detection" },
  { type: "output", text: "[2026-06-02 09:41:23] Agent v2.4.1 initialized" },
  { type: "output", text: "[2026-06-02 09:41:53] Batch #4820 received (15 metrics, 60 steps)" },
  { type: "output", text: "[2026-06-02 09:41:53] Running transformer inference…" },
  { type: "alert", text: "⚠  ANOMALY DETECTED  score=0.94  host=k8s-node-primary-01" },
  { type: "output", text: "[2026-06-02 09:41:54] Triggering LLM root-cause analysis…" },
  { type: "info", text: "→ Cause: CPU spike driven by memory leak in JVM heap" },
  { type: "output", text: "[2026-06-02 09:41:55] Runbook matched: SCALE_OUT_K8S_NODE" },
  { type: "success", text: "✓ Remediation approved & executed in 3.2s" },
  { type: "success", text: "✓ Incident auto-resolved  MTTR=47s  (baseline: 38min)" },
];

const TEXT_COLORS: Record<string, string> = {
  comment: "text-zinc-500",
  output: "text-zinc-300",
  alert: "text-red-400 font-bold",
  info: "text-blue-400",
  success: "text-green-400",
};

const COUNTERS = [
  { label: "Incidents Auto-Resolved", value: 28_492, suffix: "" },
  { label: "Avg MTTR Reduction", value: 94, suffix: "%" },
  { label: "Engineering Hours Saved", value: 18_700, suffix: "h" },
];

const FEATURES = [
  {
    icon: Activity,
    title: "Detect",
    subtitle: "Transformer ML — 15D multivariate time-series",
    description:
      "Our autoencoder-based transformer analyses 60-step windows of 15 infrastructure metrics to catch anomalies 38× faster than threshold-based alerting.",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  {
    icon: Brain,
    title: "Explain",
    subtitle: "GPT-4o root-cause analysis",
    description:
      "Every anomaly is instantly explained in plain English. Feature importance scores show exactly which metrics triggered the alert and why.",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
  {
    icon: Shield,
    title: "Remediate",
    subtitle: "Automated runbook execution",
    description:
      "Matched runbooks execute automatically (or with one-click approval). Scale out nodes, restart services, purge logs — resolved before users notice.",
    color: "text-green-400 bg-green-500/10 border-green-500/20",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: 299,
    period: "mo",
    features: [
      "Up to 50 hosts",
      "ML anomaly detection",
      "LLM explanations",
      "Slack & email notifications",
      "7-day metric history",
      "3 team members",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Growth",
    price: 999,
    period: "mo",
    features: [
      "Up to 500 hosts",
      "Auto-remediation actions",
      "Custom runbooks",
      "PagerDuty integration",
      "90-day metric history",
      "Unlimited team members",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: null,
    period: "",
    features: [
      "Unlimited hosts",
      "Custom ML model training",
      "On-prem deployment",
      "SOC 2 Type II",
      "Unlimited history",
      "SLA guarantees",
      "Dedicated CSM",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <span className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= TERMINAL_LINES.length) return;
    const t = setTimeout(() => setVisibleLines((v) => v + 1), 600);
    return () => clearTimeout(t);
  }, [visibleLines]);

  return (
    <div className="rounded-xl border border-border bg-black/60 overflow-hidden shadow-2xl shadow-black/50">
      {/* Window bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-zinc-900/60">
        <div className="h-3 w-3 rounded-full bg-red-500/80" />
        <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
        <div className="h-3 w-3 rounded-full bg-green-500/80" />
        <span className="ml-3 text-xs text-muted-foreground font-mono">neuralops-agent — k8s-node-primary-01</span>
      </div>
      {/* Terminal output */}
      <div className="p-5 font-mono text-sm space-y-1.5 min-h-[240px]">
        <AnimatePresence>
          {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={TEXT_COLORS[line.type]}
            >
              {line.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {visibleLines < TERMINAL_LINES.length && (
          <span className="inline-block h-4 w-2 bg-zinc-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-lg">NeuralOps</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Demo</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden pt-24 pb-20 px-6">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-20 right-1/4 h-64 w-64 rounded-full bg-violet-500/5 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Now in production at 200+ SRE teams
            </div>
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
              Stop firefighting.<br />
              <span className="gradient-text">Start preventing.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl">
              NeuralOps uses transformer-based ML to detect infrastructure anomalies 38× faster,
              explain root causes with GPT-4o, and auto-remediate — all before your on-call engineer
              even sees a page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/register">
                <Button size="xl" className="w-full sm:w-auto gap-2">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="xl" variant="outline" className="w-full sm:w-auto">
                  View Live Demo
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-400" /> No credit card</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-400" /> 14-day free trial</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-green-400" /> Cancel anytime</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            id="demo"
          >
            <TerminalDemo />
          </motion.div>
        </div>
      </section>

      {/* ─── Live stats ─── */}
      <section className="border-y border-border bg-card/50 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-3 gap-8 text-center">
          {COUNTERS.map((c) => (
            <div key={c.label}>
              <div className="text-3xl font-extrabold font-mono gradient-text mb-1">
                <AnimatedCounter target={c.value} suffix={c.suffix} />
              </div>
              <p className="text-sm text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Three steps. Zero paging.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              NeuralOps closes the loop from detection to resolution — automatically.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${f.color} mb-4`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="text-xs text-muted-foreground font-mono mb-1">{`0${i + 1}`}</div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-xs text-primary mb-3">{f.subtitle}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, predictable pricing</h2>
            <p className="text-muted-foreground">Save 20% with annual billing</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-6 flex flex-col ${
                  plan.popular
                    ? "border-primary/50 bg-primary/5 glow-blue"
                    : "border-border bg-card"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-xs px-3 py-1 rounded-full bg-primary text-white font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="font-bold text-lg mb-2">{plan.name}</h3>
                <div className="mb-6">
                  {plan.price ? (
                    <div>
                      <span className="text-4xl font-extrabold font-mono">${plan.price}</span>
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold">Custom</div>
                  )}
                </div>
                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.price ? "/register" : "mailto:sales@neuralops.ai"}>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-6 text-center border-t border-border">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold mb-4">Ready to stop firefighting?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join 200+ SRE teams who have reduced their MTTR by 94% with NeuralOps.
          </p>
          <Link href="/register">
            <Button size="xl" className="gap-2">
              Start Your Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">NeuralOps</span>
            <span>© 2026</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
            <a href="#" className="hover:text-foreground transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
