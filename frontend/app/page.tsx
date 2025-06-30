"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Send, Trash2, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useTheme } from "@/hooks/use-theme";
import { MessageList } from "@/components/message-list";
import { ConnectionStatus } from "@/components/connection-status";
import { TypingIndicator } from "@/components/typing-indicator";
import { Message, MessageStatus, BotMessage } from "@/types/chat";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    connectionStatus,
    sendMessage: sendWebSocketMessage,
    lastMessage,
    error,
  } = useWebSocket("ws://localhost:8000/ws");

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chat-messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const newMessage: Message = {
        id: Date.now().toString(),
        content: lastMessage,
        sender: "assistant",
        timestamp: new Date(),
        status: "delivered" as MessageStatus,
      };

      setMessages((prev) =>
        prev
          .map((msg) =>
            msg.sender === "user" && msg.status === "sent"
              ? { ...msg, status: "delivered" as MessageStatus }
              : msg
          )
          .concat(newMessage)
      );

      setIsTyping(false);

      // Play notification sound
      if (soundEnabled && lastMessage.type === "chat") {
        playNotificationSound();
      }
    }
  }, [lastMessage, soundEnabled]);

  // Handle connection errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Connection Error",
        description: error,
        variant: "destructive",
      });

      // Mark pending messages as error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.status === "sent" ? { ...msg, status: "error" as MessageStatus } : msg
        )
      );
      setIsTyping(false);
    }
  }, [error, toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT"
      );
      audio.play().catch(() => {
        // Ignore audio play errors (browser restrictions)
      });
    } catch (error) {
      // Ignore audio errors
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || connectionStatus !== "connected") return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: message.trim(),
      sender: "user",
      timestamp: new Date(),
      status: "sent" as MessageStatus,
    };

    setMessages((prev) => [...prev, newMessage]);
    sendWebSocketMessage(message.trim());
    setMessage("");
    setIsTyping(true);

    // Focus back to input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
    });
  };

  const clearConversation = () => {
    setMessages([]);
    localStorage.removeItem("chat-messages");
    toast({
      title: "Conversation cleared",
      description: "All messages have been removed",
    });
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        theme === "dark" ? "dark bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="container mx-auto max-w-4xl p-4 h-screen flex flex-col">
        {/* Header */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">LoanBot Chat</CardTitle>
                <ConnectionStatus status={connectionStatus} />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="h-8 w-8 p-0"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="h-8 w-8 p-0"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearConversation}
                  className="h-8 w-8 p-0"
                  disabled={messages.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Chat Messages */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 p-0 min-h-0">
            <ScrollArea className="h-full p-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <div className="text-lg font-medium mb-2">
                      Welcome to LoanBot
                    </div>
                    <div className="text-sm">
                      Start a conversation by typing a message below
                    </div>
                  </div>
                </div>
              ) : (
                <MessageList messages={messages} onCopyMessage={copyMessage} />
              )}

              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </ScrollArea>
          </CardContent>

          <Separator />

          {/* Message Input */}
          <div className="p-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={connectionStatus !== "connected"}
                className="flex-1"
                autoFocus
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || connectionStatus !== "connected"}
                size="sm"
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {connectionStatus !== "connected" && (
              <div className="text-sm text-muted-foreground mt-2">
                {connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected - trying to reconnect..."}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
