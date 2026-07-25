import { cn } from "../../lib/utils"

// Plain spinner loading indicator (previously a branded video).
export default function Loading({ className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20", className)}>
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  )
}