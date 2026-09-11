"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, User, Bot, AlertCircle } from "lucide-react";
import Link from "next/link";
import { usePostHog } from 'posthog-js/react';

const PLACEHOLDERS = [
  "How does paracetamol work?",
  "What is the first-line treatment for hypertension?",
  "Are there any clinical trials for long COVID?",
  "Show me guidelines for pediatric asthma.",
];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posthog = usePostHog();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length > 0 || input.length > 0) {
      // Stop animation and reset to empty placeholder if user is typing or has sent a message
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayText("");
      return;
    }

    const currentString = PLACEHOLDERS[placeholderIndex];
    let timeout: NodeJS.Timeout;

    if (isDeleting) {
      timeout = setTimeout(() => {
        setDisplayText((prev) => prev.slice(0, -1));
        if (displayText.length === 0) {
          setIsDeleting(false);
          setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        }
      }, 50); // Deleting speed
    } else {
      timeout = setTimeout(() => {
        setDisplayText(currentString.slice(0, displayText.length + 1));
        if (displayText.length === currentString.length) {
          timeout = setTimeout(() => setIsDeleting(true), 2000); // Pause before deleting
        }
      }, 100); // Typing speed
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, placeholderIndex, messages.length, input.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    if (posthog) {
      posthog.capture('ask_library_query_submitted', { query_length: input.trim().length });
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          session_id: "ephemeral-session", // Placeholder for future DB integration
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from server");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching the response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-[calc(100vh-73px)]">
      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-90 w-full max-w-3xl mx-auto px-4 pt-20 md:pt-22">
            <h2 className="text-4xl font-bold mb-4 text-foreground tracking-tight">Ask the Library</h2>
            <p className="max-w-md text-foreground/80 mb-8">
              Search for medical guidelines, clinical trials, or protocols using natural language.
            </p>

            {/* Centered Input Area for Empty State */}
            <div className="w-full">
              <form
                onSubmit={handleSubmit}
                className="flex relative items-end shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl border border-foreground/20 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent text-left"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={displayText || "Ask a medical question..."}
                  className="w-full max-h-48 min-h-[56px] resize-none py-4 pl-4 pr-14 bg-transparent outline-none text-foreground placeholder:text-foreground/50"
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 bottom-2 p-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:bg-foreground/20 hover:bg-blue-700 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
              <div className="text-center mt-3">
                <span className="text-xs text-foreground/40">
                  AI can make mistakes. Please verify important medical information.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-blue-600" />
                  </div>
                )}

                <div
                  className={`px-4 py-3 rounded-2xl max-w-[85%] ${m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-foreground/5 border border-foreground/10 text-foreground rounded-bl-none"
                    }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>

                {m.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-foreground/70" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-foreground/5 border border-foreground/10 text-foreground rounded-bl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-foreground/70">Thinking...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-lg mx-auto max-w-fit">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Area - Only show at bottom if there are messages */}
      {messages.length > 0 && (
        <footer className="p-4 bg-background border-t border-foreground/10">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={handleSubmit}
              className="flex relative items-end shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl border border-foreground/20 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask a medical question..."
                className="w-full max-h-48 min-h-[56px] resize-none py-4 pl-4 pr-14 bg-transparent outline-none text-foreground placeholder:text-foreground/50"
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 p-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:bg-foreground/20 hover:bg-blue-700 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
            <div className="text-center mt-2">
              <span className="text-xs text-foreground/40">
                AI can make mistakes. Please verify important medical information.
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
