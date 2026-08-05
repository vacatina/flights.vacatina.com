import { cn } from "@/lib/utils"

interface MaterialIconProps extends React.ComponentProps<"span"> {
  name: string
  filled?: boolean
}

export function MaterialIcon({
  name,
  filled = false,
  className,
  ...props
}: MaterialIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-rounded", className)}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}` }}
      {...props}
    >
      {name}
    </span>
  )
}
