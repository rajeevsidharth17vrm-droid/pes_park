import { cn } from "../../lib/utils"

export default function Loading({ text = "Loading...", className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 gap-3", className)}>
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  )
}