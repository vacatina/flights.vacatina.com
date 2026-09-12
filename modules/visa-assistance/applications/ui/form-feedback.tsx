import { AlertCircleIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"

export function VisaFormError({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
