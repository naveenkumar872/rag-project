import { useRef, useEffect, useState } from "react";
import { PanelLeft, Sparkles, Brain } from "lucide-react";
import { Chat } from "@/lib/chat-types";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

interface ChatAreaProps {
  chat: Chat;
  onSend: (content: string) => Promise<void> | void;
  onOpenSidebar: () => void;
  isLoading?: boolean;
  isApiAvailable?: boolean | null;
}

export function ChatArea({ 
  chat, 
  onSend, 
  onOpenSidebar, 
  isLoading, 
  isApiAvailable, 
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages, isTyping]);

  useEffect(() => {
    setIsTyping(isLoading ?? false);
  }, [isLoading]);

  const handleSend = async (content: string) => {
    setIsTyping(true);
    try {
      await onSend(content);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-screen min-w-0">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={onOpenSidebar} className="lg:hidden p-1 rounded-md hover:bg-accent transition-colors">
          <PanelLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">Smart Knowledge</h2>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${isApiAvailable === true ? "bg-confidence-high" : isApiAvailable === false ? "bg-amber-500" : "bg-muted-foreground"} ${isApiAvailable === true ? "animate-pulse-dot" : ""}`} />
            <span className="text-[11px] text-muted-foreground">
              {isApiAvailable === true ? "Connected to Qdrant" : isApiAvailable === false ? "Offline Mode" : "Checking..."}
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-fade-in-up">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Smart Knowledge Assistant</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Upload PDFs using the sidebar to build your knowledge base, then ask questions. 
                Each response includes a confidence score powered by Qdrant + Groq.
              </p>
            </div>
          </div>
        ) : (
          chat.messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        {isTyping && (
          <div className="flex gap-3 items-start animate-fade-in-up">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="chat-bubble-bot rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "200ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "400ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isTyping} />
    </div>
  );
}
