import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Loader2 } from "lucide-react"

interface ConnectionStatusProps {
  status: "connecting" | "connected" | "disconnected" | "error"
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: "Connected",
          variant: "default" as const,
          className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        }
      case "connecting":
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: "Connecting",
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        }
      case "disconnected":
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: "Disconnected",
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        }
      case "error":
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: "Error",
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge variant={config.variant} className={`${config.className} flex items-center gap-1`}>
      {config.icon}
      {config.text}
    </Badge>
  )
}
