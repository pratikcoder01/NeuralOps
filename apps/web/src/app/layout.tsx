import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NeuralOps — AI-Powered Infrastructure Intelligence",
    template: "%s | NeuralOps",
  },
  description:
    "Stop firefighting. Start preventing. NeuralOps uses transformer-based ML to detect anomalies, explain root causes, and auto-remediate incidents — before they wake your team.",
  keywords: ["SRE", "DevOps", "anomaly detection", "incident management", "AIOps", "observability"],
  openGraph: {
    title: "NeuralOps — AI-Powered Infrastructure Intelligence",
    description: "Detect, explain, and remediate infrastructure anomalies automatically.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head />
      <body className="min-h-screen bg-background antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Providers>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "#111111",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f4f4f5",
                  fontSize: "13px",
                  fontFamily: "Inter, sans-serif",
                },
                duration: 4000,
              }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
