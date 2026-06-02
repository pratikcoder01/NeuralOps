"use client";
import { useState, useEffect, useRef } from "react";
import { Brain, Loader2 } from "lucide-react";

interface LLMExplanationProps {
  explanation?: string;
  isLoading?: boolean;
}

export function LLMExplanation({ explanation, isLoading }: LLMExplanationProps) {
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!explanation) return;
    setDisplayed("");
    setIsTyping(true);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayed(explanation.slice(0, i));
      if (i >= explanation.length) {
        clearInterval(intervalRef.current);
        setIsTyping(false);
      }
    }, 12);
    return () => clearInterval(intervalRef.current);
  }, [explanation]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Brain className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">AI Root Cause Analysis</p>
          <p className="text-xs text-muted-foreground">Powered by GPT-4o</p>
        </div>
        {isTyping && (
          <div className="ml-auto flex items-center gap-1 text-xs text-violet-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Generating…
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[100, 90, 75, 60].map((w, i) => (
            <div key={i} className={`shimmer h-4 rounded`} style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {displayed || (
            <span className="italic text-muted-foreground/50">
              No explanation available yet.
            </span>
          )}
          {isTyping && (
            <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse align-middle" />
          )}
        </div>
      )}
    </div>
  );
}
