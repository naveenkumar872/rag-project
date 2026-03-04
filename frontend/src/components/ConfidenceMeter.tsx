import { Info, TrendingUp, AlertTriangle } from "lucide-react";
import { getConfidenceLevel, ConfidenceData } from "@/lib/chat-types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ConfidenceMeterProps {
  confidence: number;
  confidenceData?: ConfidenceData;
  showDetails?: boolean;
}

export function ConfidenceMeter({ confidence, confidenceData, showDetails = false }: ConfidenceMeterProps) {
  const level = getConfidenceLevel(confidence);
  // R3 – rely solely on backend weak_context flag; never override with a local threshold
  const isWeakContext = confidenceData?.isWeakContext === true;
  const contextStrength = confidenceData?.contextStrength ?? confidence;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Confidence</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-xs">
              <p className="font-medium mb-1">{level.label}</p>
              <p className="text-muted-foreground">{level.description}</p>
              {confidenceData && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-muted-foreground">
                    Context Strength: {contextStrength.toFixed(1)}%
                  </p>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1.5">
          {isWeakContext && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Weak context detected - verify with additional sources
              </TooltipContent>
            </Tooltip>
          )}
          <span className="text-xs font-semibold text-foreground">{confidence.toFixed(1)}%</span>
        </div>
      </div>
      
      {/* Main confidence bar */}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${level.bg} transition-all duration-500 ease-out`}
          style={{ "--confidence-width": `${confidence}%`, width: `${confidence}%` } as React.CSSProperties}
        />
      </div>
      
      {/* Category label */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{confidenceData?.label || level.label}</span>
        {showDetails && confidenceData && (
          <span className="text-[10px] text-muted-foreground">
            Raw: {confidenceData.rawScore.toFixed(3)}
          </span>
        )}
      </div>
      
      {/* Context strength indicator (optional detailed view) */}
      {showDetails && confidenceData && confidenceData.contextStrength !== confidence && (
        <div className="pt-1">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Context Strength</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{contextStrength.toFixed(1)}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500/60 transition-all duration-500"
              style={{ width: `${contextStrength}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
