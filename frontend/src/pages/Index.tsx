import { useState, useEffect } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatArea } from "@/components/ChatArea";
import { UploadPanel } from "@/components/UploadPanel";
import { useChatState } from "@/hooks/use-chat-state";

const Index = () => {
  const { 
    chats, 
    activeChat, 
    activeChatId, 
    setActiveChatId, 
    createNewChat, 
    sendMessage,
    isLoading,
    isApiAvailable,
    checkApiHealth,
    uploadDocument,
    addTextToKnowledgeBase,
  } = useChatState();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadPanelOpen, setUploadPanelOpen] = useState(false);

  // Check API health on mount
  useEffect(() => {
    checkApiHealth();
  }, [checkApiHealth]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={createNewChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenUploadPanel={() => setUploadPanelOpen(true)}
        isApiAvailable={isApiAvailable}
      />
      <ChatArea
        chat={activeChat}
        onSend={sendMessage}
        onOpenSidebar={() => setSidebarOpen(true)}
        isLoading={isLoading}
        isApiAvailable={isApiAvailable}
      />

      {/* Upload Panel (Slide-in from right) */}
      <UploadPanel
        isOpen={uploadPanelOpen}
        onClose={() => setUploadPanelOpen(false)}
        onUploadDocument={uploadDocument}
        onAddText={addTextToKnowledgeBase}
        isApiAvailable={isApiAvailable}
      />
    </div>
  );
};

export default Index;
