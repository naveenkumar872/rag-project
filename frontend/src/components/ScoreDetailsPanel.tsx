import { ChevronDown, ChevronUp, AlertTriangle, BookOpen } from "lucide-react";
import { useState } from "react";
import { ConfidenceData, Source, getConfidenceLevel } from "@/lib/chat-types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ScoreDetailsPanelProps {
  confidence: number;
  confidenceData?: ConfidenceData;
  sources?: Source[];
}

export function ScoreDetailsPanel({ confidence, confidenceData, sources }: ScoreDetailsPanelProps) {
  const [showChunks, setShowChunks] = useState(false);
  const level = getConfidenceLevel(confidence);
  const isWeakContext = confidenceData?.isWeakContext === true;
  const contextStrength = confidenceData?.contextStrength ?? confidence;

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
      {/* Score Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Confidence Score
          </span>
          <span className="text-lg font-bold text-foreground">{confidence.toFixed(1)}%</span>
        </div>

        {/* Main confidence bar */}
        <div className="h-2.5 w-full rounded-full bg-background overflow-hidden shadow-sm">
          <div
            className={`h-full rounded-full ${level.bg} transition-all duration-500 ease-out`}
            style={{ width: `${confidence}%` }}
          />
        </div>

        {/* Category badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${level.bg}`} />
            <span className="text-xs font-medium text-foreground">{confidenceData?.label || level.label}</span>
          </div>
          {isWeakContext && (
            <div className="flex items-center gap-1 rounded-sm bg-amber-500/20 px-2 py-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">Weak Context</span>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-border/30" />

      {/* Score Breakdown */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score Metrics</h4>

        {/* Normalized Score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Normalized Score</span>
            <span className="text-xs font-semibold text-foreground">{confidence.toFixed(2)}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Rescaled from cosine similarity for better readability
          </p>
        </div>

        {/* Raw Score (if available) */}
        {confidenceData?.rawScore !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Raw Score</span>
              <span className="text-xs font-semibold text-foreground">
                {(confidenceData.rawScore as number).toFixed(3)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Direct cosine similarity (0–1)
            </p>
          </div>
        )}

        {/* Context Strength */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Context Strength</span>
            <span className="text-xs font-semibold text-foreground">{contextStrength.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-background overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500/70 transition-all duration-500"
              style={{ width: `${contextStrength}%` }}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-sm bg-background/50 px-3 py-2">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{level.label}:</span> {level.description}
        </p>
      </div>

      {/* Retrieved Chunks / Sources */}
      {sources && sources.length > 0 && (
        <div className="space-y-2">
          <Collapsible open={showChunks} onOpenChange={setShowChunks}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-sm hover:bg-background/50 px-2 py-1.5 transition-colors">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Retrieved Chunks ({sources.length})
                </span>
              </div>
              {showChunks ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>

            {showChunks && (
              <CollapsibleContent className="mt-2 space-y-2 pt-2 border-t border-border/30">
                {sources.slice(0, 5).map((source, idx) => (
                  <div key={idx} className="rounded-md border border-border/50 bg-background p-3 text-xs space-y-2">
                    {/* Rank label */}
                    <span className="font-semibold text-foreground">Chunk {idx + 1}</span>

                    {/* Chunk Preview */}
                    <p className="line-clamp-3 leading-relaxed text-muted-foreground">
                      {source.content}
                    </p>

                    {/* Distance (if available) */}
                    {source.distance > 0 && (
                      <div className="text-[10px] text-muted-foreground/50">
                        Distance: {source.distance.toFixed(4)}
                      </div>
                    )}
                  </div>
                ))}

                {sources.length > 5 && (
                  <p className="text-center text-[10px] text-muted-foreground py-2">
                    … and {sources.length - 5} more chunks
                  </p>
                )}
              </CollapsibleContent>
            )}
          </Collapsible>
        </div>
      )}

      {/* Footer Notes */}
      <div className="rounded-sm bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-400 leading-relaxed space-y-1">
        <p>
          <span className="font-semibold">💡 How to interpret:</span> Higher confidence means the answer is based on closer
          matches in your knowledge base. Weak context warnings appear when sources don't fully align with your question.
        </p>
      </div>
    </div>
  );
}
