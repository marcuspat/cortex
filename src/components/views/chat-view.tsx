'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import {
  MessageSquare,
  Plus,
  Send,
  Bot,
  User,
  Clock,
  BookOpen,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useCortexStore } from '@/lib/store';
import type { ChatSession, ChatMessage } from '@/lib/types';
import { formatRelativeTime, parseJson } from '@/lib/helpers';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_QUERIES = [
  'What did Sarah Chen say about the API review?',
  'Summarize our Q4 planning decisions',
  'What are the pending commitments?',
  'How is the performance against targets?',
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionListItem {
  id: string;
  title: string;
  _count: { messages: number };
  createdAt: string;
  updatedAt: string;
}

type MemoryTitleMap = Record<string, string>;

// ─── Markdown Components ──────────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  return (
    <Markdown
      components={{
        p({ children }) {
          return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
        },
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>;
        },
        ul({ children }) {
          return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        pre({ children }) {
          return (
            <pre className="bg-zinc-900 dark:bg-zinc-800 text-zinc-100 rounded-lg p-4 overflow-x-auto my-2 text-sm leading-relaxed">
              {children}
            </pre>
          );
        },
        code({ className, children, ...props }) {
          if (className) {
            return (
              <code className={`text-sm ${className ?? ''}`} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code
              className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        hr() {
          return <hr className="my-3 border-border" />;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-3 my-2 italic text-muted-foreground">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-sm border border-border rounded">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border-b border-border px-3 py-2 text-left font-semibold bg-muted/50">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border-b border-border px-3 py-2">{children}</td>
          );
        },
      }}
    >
      {content}
    </Markdown>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Citation Section ────────────────────────────────────────────────────────

function CitationSection({
  isExpanded,
  memoryCount,
  memoryIds,
  memoryTitles,
  titlesLoading,
  onToggle,
  onLoadTitles,
}: {
  isExpanded: boolean;
  memoryCount: number;
  memoryIds: string[];
  memoryTitles: MemoryTitleMap;
  titlesLoading: boolean;
  onToggle: () => void;
  onLoadTitles: () => void;
}) {
  if (memoryCount === 0) return null;

  const titles = memoryIds.map((id) => memoryTitles[id]).filter(Boolean);

  const handleClick = () => {
    if (!isExpanded && titles.length === 0 && !titlesLoading) {
      onLoadTitles();
    }
    onToggle();
  };

  return (
    <div className="mt-3">
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <BookOpen className="h-3 w-3" />
        <span>
          {memoryCount} {memoryCount === 1 ? 'memory' : 'memories'} referenced
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1 pl-4 border-l-2 border-primary/20">
              {titlesLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading sources...
                </div>
              ) : titles.length > 0 ? (
                titles.map((title, idx) => (
                  <div
                    key={`${title}-${idx}`}
                    className="flex items-center gap-2 text-xs text-muted-foreground py-0.5"
                  >
                    <div className="h-1 w-1 rounded-full bg-primary/40 shrink-0" />
                    <span className="truncate">{title}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-1">
                  Source details unavailable
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isExpanded,
  memoryTitles,
  titlesLoadingIds,
  onToggleCitation,
  onLoadCitationTitles,
}: {
  message: ChatMessage;
  isExpanded: boolean;
  memoryTitles: MemoryTitleMap;
  titlesLoadingIds: Set<string>;
  onToggleCitation: (messageId: string) => void;
  onLoadCitationTitles: (messageId: string, memoryIds: string[]) => void;
}) {
  const isUser = message.role === 'user';
  const memoryIds = parseJson<string[]>(message.memoryIds, []);

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-start gap-3 justify-end"
      >
        <div className="max-w-[80%] md:max-w-[70%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-right pr-1">
            {formatRelativeTime(message.createdAt)}
          </p>
        </div>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </motion.div>
    );
  }

  // Assistant message
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3"
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="max-w-[80%] md:max-w-[70%] min-w-0">
        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
          <div className="text-sm text-foreground [&_p]:mb-2 [&_p:last-child]:mb-0">
            <MarkdownContent content={message.content} />
          </div>
          <CitationSection
            isExpanded={isExpanded}
            memoryCount={memoryIds.length}
            memoryIds={memoryIds}
            memoryTitles={memoryTitles}
            titlesLoading={titlesLoadingIds.has(message.id)}
            onToggle={() => onToggleCitation(message.id)}
            onLoadTitles={() => onLoadCitationTitles(message.id, memoryIds)}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 pl-1">
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Welcome Screen ──────────────────────────────────────────────────────────

function WelcomeScreen({ onQueryClick }: { onQueryClick: (query: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="rounded-full bg-primary/10 p-5 mb-6">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Ask me anything about your connected data
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mb-8">
          I can search through your memories, surface insights, and help you find
          answers across all your connected sources.
        </p>
        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
          {SUGGESTED_QUERIES.map((query, idx) => (
            <motion.button
              key={query}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + idx * 0.05 }}
              onClick={() => onQueryClick(query)}
              className="px-3 py-2 text-sm rounded-full border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all text-left cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {query}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Session Skeleton ────────────────────────────────────────────────────────

function SessionListSkeleton() {
  return (
    <div className="space-y-1 px-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-lg">
          <Skeleton className="h-4 w-4 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main ChatView Component ─────────────────────────────────────────────────

export default function ChatView() {
  const isMobile = useIsMobile();
  const { selectedSessionId, selectSession } = useCortexStore();

  // ── State ────────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(
    new Set()
  );
  const [memoryTitles, setMemoryTitles] = useState<MemoryTitleMap>({});
  const [titlesLoadingIds, setTitlesLoadingIds] = useState<Set<string>>(
    new Set()
  );
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ── Fetch Sessions ───────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch {
      // Silently fail
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // ── Load Session Messages ────────────────────────────────────────────────
  const loadSession = useCallback(
    async (sessionId: string) => {
      selectSession(sessionId);
      setExpandedCitations(new Set());
      setMessages([]);

      try {
        const res = await fetch(`/api/chat/sessions/${sessionId}`);
        if (res.ok) {
          const session = (await res.json()) as ChatSession & {
            messages: ChatMessage[];
          };
          setMessages(session.messages ?? []);
          setCurrentTitle(session.title);
        }
      } catch {
        // Silently fail
      }
    },
    [selectSession]
  );

  // ── Create New Session ───────────────────────────────────────────────────
  const handleNewChat = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' }),
      });

      if (res.ok) {
        const newSession = await res.json();
        await fetchSessions();
        await loadSession(newSession.id);
        if (isMobile) {
          setSessionPanelOpen(false);
        }
      }
    } catch {
      // Silently fail
    }
  }, [fetchSessions, loadSession, isMobile]);

  // ── Delete Session ───────────────────────────────────────────────────────
  const handleDeleteSession = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeletingSessionId(sessionId);
      try {
        const res = await fetch(`/api/chat/sessions/${sessionId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const remaining = sessions.filter((s) => s.id !== sessionId);
          setSessions(remaining);

          if (selectedSessionId === sessionId) {
            if (remaining.length > 0) {
              loadSession(remaining[0].id);
            } else {
              selectSession(null);
              setMessages([]);
              setCurrentTitle('');
            }
          }
        }
      } catch {
        // Silently fail
      } finally {
        setDeletingSessionId(null);
      }
    },
    [sessions, selectedSessionId, loadSession, selectSession]
  );

  // ── Fetch Memory Titles ──────────────────────────────────────────────────
  const loadCitationTitles = useCallback(
    async (messageId: string, memoryIds: string[]) => {
      if (memoryIds.length === 0) return;

      // Check if already loaded
      const unloaded = memoryIds.filter((id) => !memoryTitles[id]);
      if (unloaded.length === 0) return;

      setTitlesLoadingIds((prev) => new Set(prev).add(messageId));

      try {
        const newTitles: MemoryTitleMap = {};
        await Promise.all(
          unloaded.map(async (id) => {
            try {
              const res = await fetch(`/api/memories/${id}`);
              if (res.ok) {
                const memory = await res.json();
                newTitles[id] = memory.title || 'Untitled Memory';
              }
            } catch {
              // Ignore individual failures
            }
          })
        );
        if (Object.keys(newTitles).length > 0) {
          setMemoryTitles((prev) => ({ ...prev, ...newTitles }));
        }
      } finally {
        setTitlesLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }
    },
    [memoryTitles]
  );

  // ── Toggle Citation ──────────────────────────────────────────────────────
  const toggleCitation = useCallback((messageId: string) => {
    setExpandedCitations((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  // ── Send Message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const content = inputText.trim();
    if (!content || isLoading) return;

    // If no active session, create one first
    let sessionId = selectedSessionId;
    if (!sessionId) {
      try {
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: content.length > 50 ? content.slice(0, 50) + '...' : content,
          }),
        });
        if (res.ok) {
          const newSession = await res.json();
          sessionId = newSession.id;
          selectSession(sessionId);
          setCurrentTitle(newSession.title);
          await fetchSessions();
        } else {
          return;
        }
      } catch {
        return;
      }
    }

    // Clear input
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      sessionId: sessionId!,
      role: 'user',
      content,
      memoryIds: '[]',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    // Scroll to bottom
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();

        // Replace temp user message with real one, add assistant message
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
          return [
            ...filtered,
            data.userMessage,
            data.assistantMessage,
          ];
        });

        // Pre-fetch memory titles for citations
        const memIds = parseJson<string[]>(
          data.assistantMessage.memoryIds,
          []
        );
        if (memIds.length > 0) {
          // Fetch in background without blocking
          Promise.all(
            memIds.map(async (id) => {
              try {
                const memRes = await fetch(`/api/memories/${id}`);
                if (memRes.ok) {
                  const mem = await memRes.json();
                  setMemoryTitles((prev) => ({
                    ...prev,
                    [id]: mem.title || 'Untitled Memory',
                  }));
                }
              } catch {
                // Ignore
              }
            })
          );
        }

        // Update session list (message count changed)
        fetchSessions();
      }
    } catch {
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [
    inputText,
    isLoading,
    selectedSessionId,
    selectSession,
    fetchSessions,
    scrollToBottom,
  ]);

  // ── Handle Suggested Query Click ─────────────────────────────────────────
  const handleSuggestedQuery = useCallback(
    (query: string) => {
      setInputText(query);
      // Focus textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    },
    []
  );

  // ── Handle Key Down in Textarea ──────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ── Handle Textarea Change (auto-grow) ───────────────────────────────────
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputText(e.target.value);
      const textarea = e.target;
      textarea.style.height = 'auto';
      const maxRows = 4;
      const lineHeight = 24;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxRows * lineHeight)}px`;
    },
    []
  );

  // ── Effects ──────────────────────────────────────────────────────────────

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load selected session on mount or when it changes externally
  useEffect(() => {
    if (selectedSessionId && messages.length === 0) {
      loadSession(selectedSessionId);
    }
  }, [selectedSessionId, loadSession, messages.length]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [messages, isLoading, isNearBottom, scrollToBottom]);

  // Close mobile panel when selecting a session
  const handleSelectSession = useCallback(
    (sessionId: string) => {
      loadSession(sessionId);
      if (isMobile) {
        setSessionPanelOpen(false);
      }
    },
    [loadSession, isMobile]
  );

  // ── Derived Values ───────────────────────────────────────────────────────
  const hasMessages = messages.length > 0;
  const activeSession = sessions.find((s) => s.id === selectedSessionId);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex relative">
      {/* ── Session Panel (Left) ─────────────────────────────────────────── */}
      {/* Mobile overlay */}
      {isMobile && sessionPanelOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setSessionPanelOpen(false)}
        />
      )}

      <motion.aside
        initial={false}
        animate={{
          width: isMobile ? 280 : 260,
          x: isMobile && !sessionPanelOpen ? -280 : 0,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`shrink-0 flex flex-col bg-card border-r border-border overflow-hidden ${
          isMobile ? 'fixed left-0 top-0 bottom-0 z-50' : ''
        }`}
      >
        {/* Panel Header */}
        <div className="shrink-0 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Chats</h3>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSessionPanelOpen(false)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2 h-9 text-sm"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <Separator />

        {/* Session List */}
        <div className="flex-1 overflow-y-auto py-2 min-h-0">
          {sessionsLoading ? (
            <SessionListSkeleton />
          ) : sessions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-0.5 px-2">
              {sessions.map((session) => {
                const isActive = session.id === selectedSessionId;
                return (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={`group w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <MessageSquare
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">
                        {session.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(session.updatedAt)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {session._count.messages} msg{session._count.messages !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) =>
                            handleDeleteSession(session.id, e)
                          }
                          disabled={deletingSessionId === session.id}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive shrink-0 mt-0.5"
                        >
                          {deletingSessionId === session.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        Delete conversation
                      </TooltipContent>
                    </Tooltip>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.aside>

      {/* ── Chat Area (Right) ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Chat Header */}
        <div className="shrink-0 flex items-center gap-2 h-12 px-3 border-b border-border">
          {/* Mobile panel toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSessionPanelOpen(true)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">
              {selectedSessionId ? currentTitle || 'Loading...' : 'Cortex Chat'}
            </h3>
          </div>

          {/* Desktop panel toggle */}
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleNewChat}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          )}

          {activeSession && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {activeSession._count.messages} messages
            </Badge>
          )}
        </div>

        {/* Messages Area */}
        {hasMessages ? (
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4 scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--color-border) transparent',
            }}
          >
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isExpanded={expandedCitations.has(msg.id)}
                  memoryTitles={memoryTitles}
                  titlesLoadingIds={titlesLoadingIds}
                  onToggleCitation={toggleCitation}
                  onLoadCitationTitles={loadCitationTitles}
                />
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <TypingIndicator />
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          <WelcomeScreen onQueryClick={handleSuggestedQuery} />
        )}

        {/* Input Area */}
        <div className="shrink-0 border-t border-border bg-background p-3 md:p-4">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your knowledge base..."
                disabled={isLoading}
                rows={1}
                className="resize-none min-h-[40px] max-h-[96px] pr-12 py-2.5 text-sm leading-relaxed rounded-xl"
              />
            </div>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className="h-10 w-10 shrink-0 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Press Enter to send, Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
