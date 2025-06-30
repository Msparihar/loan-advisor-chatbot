export interface ChatMessage {
  type: "chat";
  data: {
    content: string;
  };
}

export interface LenderMessage {
  type: "lenders";
  data: {
    match_score: number;
    top_lenders: {
      name: string;
      interest_rate: number;
      reason: string;
    }[];
  };
}

export type BotMessage = ChatMessage | LenderMessage;

export type MessageStatus = "sent" | "delivered" | "error";

export interface Message {
  id: string;
  content: string | BotMessage;
  sender: "user" | "assistant";
  timestamp: Date;
  status: MessageStatus;
}
