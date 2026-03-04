import { AlertTriangle, XCircle, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { ScoreDetailsPanel } from "./ScoreDetailsPanel";
import { ConfidenceData, Source } from "@/lib/chat-types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface LowConfidenceCardProps {
  confidence: number;
  confidenceData?: ConfidenceData;
  sources?: Source[];
  content?: string;
}

export function LowConfidenceCard({ confidence, confidenceData, sources, content }: LowConfidenceCardProps) {
  const [showSources, setShowSources] = useState(false);
  const [showScore, setShowScore] = useState(false);
  // R4 – trust only the backend no_answer_mode flag, never a local threshold
  const isNoAnswer = confidenceData?.isNoAnswer === true;
  // R3 – trust only the backend weak_context flag
  const isWeakContext = confidenceData?.isWeakContext === true;
  // R2 – use backend label directly
  const confidenceLabel = confidenceData?.label || "Low";

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${
      isNoAnswer 
        ? "border-destructive/30 bg-destructive/5" 
        : "border-amber-500/30 bg-amber-500/5"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        {isNoAnswer ? (
          <XCircle className="h-4 w-4 text-destructive" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
        <span className={`text-sm font-medium ${isNoAnswer ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`}>
          {isNoAnswer
            ? `Cannot Provide Reliable Answer — ${confidenceLabel} confidence`
            : `${confidenceLabel} Confidence Response`}
        </span>
      </div>
      
      {/* Warning Message */}
      <p className="text-xs text-muted-foreground italic mb-2">
        {isNoAnswer 
          ? "Low confidence - verify this information with additional sources."
          : "This response has limited confidence. Please verify with additional sources."
        }
      </p>
      
      {/* Actual AI Answer */}
      {content && (
        <div className="p-3 rounded-md bg-background border border-border">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      )}
      
      {/* Confidence Details (collapsible) */}
      <div>
        <button
          onClick={() => setShowScore(v => !v)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showScore ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showScore ? "Hide score details" : "Show score details"}
        </button>
        {showScore && (
          <ScoreDetailsPanel 
            confidence={confidence} 
            confidenceData={confidenceData}
            sources={sources}
          />
        )}
      </div>
      
      {/* Weak Context Warning */}
      {isWeakContext && !isNoAnswer && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            The context retrieved from the knowledge base may not be fully relevant to your query.
          </p>
        </div>
      )}
      
      {/* Sources (if available) */}
      {sources && sources.length > 0 && (
        <Collapsible open={showSources} onOpenChange={setShowSources}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <BookOpen className="h-3 w-3" />
            <span>{showSources ? "Hide" : "Show"} relevant sources ({sources.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {sources.slice(0, 3).map((source, idx) => (
              <div 
                key={idx} 
                className="p-2 rounded-md bg-muted/50 border border-border text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-muted-foreground">Source {idx + 1}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {source.confidence.toFixed(1)}% match
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2">{source.content}</p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
