import { useTeamLogo } from "../../lib/queries"
import { cn } from "../../lib/utils"

// Small logo shown inline next to a team name. Pass teamId to lazy-fetch
// the base64 logo from the DB. Falls back to nothing if no logo exists.
export function TeamLogoIcon({ teamId, logoUrl, name, size = "w-8 h-8", className }) {
  const { data } = useTeamLogo(teamId && !logoUrl ? teamId : null)
  const src = logoUrl || data?.logoUrl
  if (!src) return null
  return (
    <img
      src={src}
      alt={name ? `${name} logo` : "Team logo"}
      className={cn("inline-block rounded-md object-contain flex-shrink-0 align-middle", size, className)}
    />
  )
}

// Avatar-style team badge — shows real logo when available, otherwise
// letter-initial fallback so nothing breaks for teams without a logo.
export function TeamAvatar({ teamId, logoUrl, name, size = "w-7 h-7", textSize = "text-xs", className, fallbackClassName }) {
  const { data } = useTeamLogo(teamId && !logoUrl ? teamId : null)
  const src = logoUrl || data?.logoUrl

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Team"}
        className={cn("rounded-md object-cover flex-shrink-0", size, className)}
      />
    )
  }
  return (
    <div className={cn(
      "rounded-md flex items-center justify-center font-bold flex-shrink-0",
      size, textSize,
      fallbackClassName || "bg-surface-border text-slate-400",
      className
    )}>
      {name?.charAt(0) || "?"}
    </div>
  )
}