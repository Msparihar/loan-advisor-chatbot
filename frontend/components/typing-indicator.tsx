import { Bot } from "lucide-react"

export function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start mb-4">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      </div>

      <div className="bg-muted rounded-lg px-4 py-2">
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
          </div>
          <span className="text-sm text-muted-foreground ml-2">AI is typing...</span>
        </div>
      </div>
    </div>
  )
}
