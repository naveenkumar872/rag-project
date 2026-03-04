import { useState, useCallback } from "react";
import { Chat, Message, ConfidenceData, Source, generateId } from "@/lib/chat-types";
import { apiService, QueryResponse } from "@/lib/api";

// Fallback responses when API is unavailable
const fallbackResponses = [
  { text: "Based on my analysis of the knowledge base, the answer relates to the core principles of machine learning algorithms and their applications in natural language processing.", confidence: 92, label: "High" },
  { text: "The document suggests that this topic involves multiple interdependent factors. Let me break it down: the primary driver is the integration of transformer architectures with attention mechanisms.", confidence: 78, label: "Medium" },
  { text: "I found partial references in the available documents. The concept you're asking about appears to relate to distributed systems architecture, though the context is limited.", confidence: 55, label: "Low" },
  { text: "I'm not confident enough to provide a reliable answer. The available documents don't contain sufficient context for this specific query.", confidence: 28, label: "Very Low" },
];

// Convert API response to frontend ConfidenceData
function toConfidenceData(response: QueryResponse): ConfidenceData {
  const categoryMap: Record<string, ConfidenceData["category"]> = {
    "High":   "high",
    "Medium": "medium",
    "Fair":   "low",    // R2 – 40-60% band
    "Low":    "weak",   // R2 – below 40%
  };
  
  return {
    rawScore: response.confidence / 100, // Convert percentage back to 0-1 for display
    normalizedScore: response.confidence,
    category: categoryMap[response.label] || (response.no_answer_mode ? "no_answer" : "weak"),
    label: response.label,
    isWeakContext: response.weak_context,
    isNoAnswer: response.no_answer_mode,
    contextStrength: response.confidence, // Use confidence as context strength
  };
}

// Convert top_chunks to Source format
function toSources(topChunks: string[]): Source[] {
  return topChunks.map((chunk, index) => ({
    content: chunk,
    metadata: {},
    distance: 0,
    confidence: 100 - (index * 5), // Estimate confidence based on ranking
  }));
}

export function useChatState() {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "demo-1",
      title: "New Conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const [activeChatId, setActiveChatId] = useState("demo-1");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];

  // Check API availability on mount
  const checkApiHealth = useCallback(async () => {
    try {
      await apiService.healthCheck();
      setIsApiAvailable(true);
      return true;
    } catch {
      setIsApiAvailable(false);
      return false;
    }
  }, []);

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: generateId(),
      title: "New Conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = { id: generateId(), role: "user", content, timestamp: new Date() };
    
    // Add user message immediately
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== activeChatId) return c;
        const isFirstMessage = c.messages.length === 0;
        return {
          ...c,
          title: isFirstMessage ? content.slice(0, 40) + (content.length > 40 ? "…" : "") : c.title,
          messages: [...c.messages, userMsg],
          updatedAt: new Date(),
        };
      })
    );

    setIsLoading(true);
    setError(null);

    try {
      // Try to use the API - note: uses 'question' field for Qdrant backend
      const response = await apiService.query({ question: content, top_k: 5, threshold: 40 });
      
      const botMsg: Message = {
        id: generateId(),
        role: "bot",
        content: response.answer,
        confidence: response.confidence,
        confidenceData: toConfidenceData(response),
        sources: toSources(response.top_chunks),
        timestamp: new Date(),
      };

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== activeChatId) return c;
          return {
            ...c,
            messages: [...c.messages, botMsg],
            updatedAt: new Date(),
          };
        })
      );
      setIsApiAvailable(true);
    } catch (err) {
      // Fallback to mock responses if API unavailable
      console.warn("API unavailable, using fallback:", err);
      setIsApiAvailable(false);
      
      const resp = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      const botMsg: Message = {
        id: generateId(),
        role: "bot",
        content: resp.text,
        confidence: resp.confidence,
        confidenceData: {
          rawScore: resp.confidence / 100,
          normalizedScore: resp.confidence,
          category: resp.confidence >= 80 ? "high" : resp.confidence >= 60 ? "medium" : resp.confidence >= 40 ? "low" : "weak",
          label: resp.label,
          isWeakContext: resp.confidence < 40,
          isNoAnswer: resp.confidence < 25,
          contextStrength: resp.confidence,
        },
        timestamp: new Date(),
      };

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== activeChatId) return c;
          return {
            ...c,
            messages: [...c.messages, botMsg],
            updatedAt: new Date(),
          };
        })
      );
      setError("Using offline mode - API not available");
    } finally {
      setIsLoading(false);
    }
  }, [activeChatId]);

  const uploadDocument = useCallback(async (file: File, sourceLabel?: string) => {
    try {
      setIsLoading(true);
      const result = await apiService.uploadFile(file, sourceLabel);
      setError(null);
      return result;
    } catch (err) {
      setError("Failed to upload document");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addTextToKnowledgeBase = useCallback(async (text: string, sourceLabel?: string) => {
    try {
      setIsLoading(true);
      const result = await apiService.addText(text, sourceLabel);
      setError(null);
      return result;
    } catch (err) {
      setError("Failed to add text");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getStats = useCallback(async () => {
    try {
      return await apiService.getStats();
    } catch (err) {
      console.warn("Failed to get stats:", err);
      return null;
    }
  }, []);

  return {
    chats,
    activeChat,
    activeChatId,
    setActiveChatId,
    createNewChat,
    sendMessage,
    isLoading,
    error,
    isApiAvailable,
    checkApiHealth,
    uploadDocument,
    addTextToKnowledgeBase,
    getStats,
  };
}
