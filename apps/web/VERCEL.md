# 🚀 Deploying NeuralOps Frontend to Vercel

This guide outlines how to deploy the production-ready **NeuralOps** Next.js dashboard frontend to **Vercel** within this Turborepo monorepo workspace.

---

## 📋 Vercel Project Settings Configuration

When importing this repository into Vercel, configure the following parameters in the **Project Settings** panel:

### 1. General Settings
* **Framework Preset**: `Next.js`
* **Root Directory**: `apps/web` *(Important: Keep the "Keep other directories" checkbox checked so Vercel can resolve global workspace configurations and packages).*

### 2. Build & Development Settings
Toggle **Override** on the following commands to ensure Turborepo runs optimal builds and caches dependencies correctly:

* **Build Command**: `cd ../.. && npx turbo run build --filter=web`
* **Install Command**: `cd ../.. && npm install`
* **Output Directory**: `.next` *(Automatically resolved by Next.js)*

---

## 🔒 Environment Variables (`.env`)

Add the following **Environment Variables** under the **Environment Variables** tab in your Vercel Dashboard to connect the frontend to your active NeuralOps backends:

| Environment Variable | Description | Recommended Local Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base REST API URL of the `ingestion-service` | `http://localhost:8000` |
| `NEXT_PUBLIC_GRAPHQL_URL` | HTTP gateway endpoint of the `alerting-service` | `http://localhost:4000/graphql` |
| `NEXT_PUBLIC_GRAPHQL_WS_URL` | WebSocket gateway endpoint for real-time alerts | `ws://localhost:4000/graphql` |

> [!NOTE]
> Make sure to replace `localhost` ports with your actual staging/production domain paths (e.g. `https://api.neuralops.yourcompany.com`) when deploying live.

---

## ⚡ Turborepo Remote Caching (Optional & Recommended)

To speed up Vercel builds by up to 90% using shared build caches:
1. Enable **Remote Caching** inside your Vercel team/account.
2. Vercel automatically injects `TURBO_TOKEN` and `TURBO_TEAM` env variables into the build environment.
3. Turborepo will now instantly retrieve previously cached builds and type-check steps, keeping deployment pipelines lightning-fast!
