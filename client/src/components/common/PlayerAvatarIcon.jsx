import { getAvatarById } from "../../lib/avatars"
import { usePlayerImage } from "../../lib/queries"
import { cn } from "../../lib/utils"

// Small icon shown inline next to a player's name — the character avatar
// they picked (custom upload or preset). Lazy-fetches the custom avatar
// from DB when needed. Renders nothing if the player hasn't set one.
export default function PlayerAvatarIcon({ player, size = "w-[43px] h-[43px]", className }) {
  if (!player) return null
  const preset = getAvatarById(player.avatarId)

  // Only fetch from DB if player has no preset and no avatarUrl already in props
  const needsFetch = !preset && !player.avatarUrl && player.id
  const { data: imgData } = usePlayerImage(needsFetch ? player.id : null)

  const src = player.avatarUrl || imgData?.avatarUrl || preset?.thumb
  if (!src) return null

  return (
    <img
      src={src}
      alt={player.name ? `${player.name} avatar` : "Player avatar"}
      className={cn("inline-block rounded-md object-cover flex-shrink-0 align-middle", size, className)}
    />
  )
}