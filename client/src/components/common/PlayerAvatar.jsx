import { cn } from "../../lib/utils"

export default function PlayerAvatar({ player, size = "md", className }) {
  const sizes = {
    sm:  "w-8 h-8 text-xs rounded-lg border",
    md:  "w-10 h-10 text-sm rounded-xl border",
    lg:  "w-16 h-16 text-xl rounded-2xl border-2",
    xl:  "w-20 h-20 text-2xl rounded-2xl border-2",
  }

  const initials = player.name?.split(" ").map(n => n[0]).join("") || "?"
  const colorCls = "bg-accent/20 text-accent border-accent/40"

  if (player.imageUrl) {
    return (
      <img
        src={player.imageUrl}
        alt={player.name}
        className={cn(
          "object-cover flex-shrink-0",
          sizes[size],
          "border border-surface-border",
          className
        )}
      />
    )
  }

  return (
    <div className={cn(
      "flex items-center justify-center font-extrabold flex-shrink-0",
      sizes[size],
      colorCls,
      className
    )}>
      {initials}
    </div>
  )
}