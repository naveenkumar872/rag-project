import { useState } from "react";
import { Message } from "@/lib/chat-types";
import { ScoreDetailsPanel } from "./ScoreDetailsPanel";
import { LowConfidenceCard } from "./LowConfidenceCard";
import { Bot, User, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const confidence = message.confidence ?? 0;
  // Only ever apply confidence logic to bot messages
  const isNoAnswer = !isUser && (message.confidenceData?.isNoAnswer === true);
  // R3 – Weak context: backend flagged it, but we have an answer
  const isWeakContext = !isUser && !isNoAnswer && (message.confidenceData?.isWeakContext === true);
  const [showScore, setShowScore] = useState(false);

  return (
    <div className={`flex gap-3 animate-fade-in-up ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-accent flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      <div className={`max-w-[75%] ${isUser ? "order-first" : ""}`}>
        {isNoAnswer ? (
          <LowConfidenceCard 
            confidence={confidence}
            confidenceData={message.confidenceData}
            sources={message.sources}
            content={message.content}
          />
        ) : (
          <div className={`rounded-2xl px-4 py-3 elevation-sm ${isUser ? "chat-bubble-user rounded-br-md" : "chat-bubble-bot rounded-bl-md"}`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

            {/* R3 – Weak context banner (always visible when flagged) */}
            {isWeakContext && (
              <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
                  Weak context — the retrieved content may not fully match your question. Verify this answer.
                </p>
              </div>
            )}

            {/* R5 – Collapsible detailed score report */}
            {!isUser && message.confidence !== undefined && (
              <div className="mt-2">
                <button
                  onClick={() => setShowScore(v => !v)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showScore ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showScore ? "Hide details" : "Show score details"}
                </button>
                {showScore && (
                  <ScoreDetailsPanel 
                    confidence={message.confidence} 
                    confidenceData={message.confidenceData}
                    sources={message.sources}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="h-4 w-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}
