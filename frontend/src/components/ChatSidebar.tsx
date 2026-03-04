import { useState } from "react";
import { Plus, Search, MessageSquare, PanelLeftClose, Upload, Database } from "lucide-react";
import { Chat } from "@/lib/chat-types";

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenUploadPanel: () => void;
  isApiAvailable: boolean | null;
}

export function ChatSidebar({ chats, activeChatId, onSelectChat, onNewChat, isOpen, onClose, onOpenUploadPanel, isApiAvailable }: ChatSidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = chats.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <Database className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-sidebar-foreground truncate">Smart Knowledge</h1>
            <p className="text-[11px] text-muted-foreground">AI Assistant</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-sidebar-accent transition-colors">
            <PanelLeftClose className="h-5 w-5 text-sidebar-foreground" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-3 space-y-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
          <button
            onClick={onOpenUploadPanel}
            disabled={!isApiAvailable}
            className="w-full flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-4 w-4" />
            Upload PDFs
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-muted px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Recent
          </p>
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground text-center">No chats found</p>
          ) : (
            filtered.map((chat) => (
              <button
                key={chat.id}
                onClick={() => { onSelectChat(chat.id); onClose(); }}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors mb-0.5 ${
                  chat.id === activeChatId
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chat.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {chat.messages.length} messages
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
