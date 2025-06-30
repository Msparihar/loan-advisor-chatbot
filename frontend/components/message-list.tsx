"use client";

import { Button } from "@/components/ui/button";
import { Copy, User, Bot, Clock, CheckCircle, XCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { LenderCard } from "@/components/lender-card";
import { Message, BotMessage } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  onCopyMessage: (content: string) => void;
}

export function MessageList({ messages, onCopyMessage }: MessageListProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusIcon = (status: Message["status"]) => {
    switch (status) {
      case "sent":
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />;
    }
  };

  const renderMarkdown = (content: string) => (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          code: ({ children }) => (
            <code className="bg-muted-foreground/20 px-1 py-0.5 rounded text-sm">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-muted-foreground/20 p-2 rounded mt-2 overflow-x-auto">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  const getBotMessageContent = (content: BotMessage) => {
    if (content.type === "chat") {
      return content.data.content;
    }
    return JSON.stringify(content.data, null, 2);
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-3 ${
            message.sender === "user" ? "justify-end" : "justify-start"
          }`}
        >
          {message.sender === "assistant" && (
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            </div>
          )}

          <div
            className={`max-w-[70%] ${
              message.sender === "user" ? "order-2" : ""
            }`}
          >
            <div
              className={`rounded-lg px-4 py-2 ${
                message.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {message.sender === "assistant" ? (
                typeof message.content === "string" ? (
                  renderMarkdown(message.content)
                ) : message.content.type === "chat" ? (
                  renderMarkdown(message.content.data.content)
                ) : (
                  <div className="space-y-4 w-full">
                    <div className="text-sm text-muted-foreground">
                      Match Score:{" "}
                      <span className="font-semibold text-primary">
                        {message.content.data.match_score}%
                      </span>
                    </div>
                    {message.content.data.top_lenders.map((lender, index) => (
                      <LenderCard
                        key={index}
                        name={lender.name}
                        interestRate={lender.interest_rate}
                        reason={lender.reason}
                      />
                    ))}
                  </div>
                )
              ) : (
                <p className="whitespace-pre-wrap">
                  {typeof message.content === "string"
                    ? message.content
                    : message.content.type === "chat"
                    ? message.content.data.content
                    : "Invalid message format"}
                </p>
              )}
            </div>

            <div
              className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <span>{formatTime(message.timestamp)}</span>
              {message.sender === "user" && getStatusIcon(message.status)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onCopyMessage(
                    typeof message.content === "string"
                      ? message.content
                      : getBotMessageContent(message.content)
                  )
                }
                className="h-auto p-1 hover:bg-muted"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {message.sender === "user" && (
            <div className="flex-shrink-0 order-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
