import { useNavigate } from "react-router-dom"
import { X, Users, GitCompare, Shield, Trophy, TrendingUp, Award } from "lucide-react"
import { cn } from "../../lib/utils"

const MENU_ITEMS = [
  { value: "players",  label: "Total Players",   icon: Users       },
  { value: "compare",  label: "Compare Players", icon: GitCompare  },
  { value: "teams",    label: "Teams",           icon: Shield      },
  { value: "bdr",      label: "BDR Rankings",    icon: Trophy      },
  { value: "market",   label: "Market Value",    icon: TrendingUp  },
  { value: "trophies", label: "Trophies",        icon: Award       },
]

export default function MobileMenu({ open, onClose }) {
  const navigate = useNavigate()

  const goTo = (view) => {
    navigate(`/?view=${view}`)
    onClose()
  }

  return (
    <>
      {/* Dimmed backdrop — covers the rest of the page, click to close */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Left-side drawer — partial width, slides in from the left */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-[61] w-72 sm:w-80 max-w-[80vw]",
          "bg-pitch-900 border-r border-surface-border flex flex-col",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-surface-border flex-shrink-0">
          <span className="text-sm font-bold text-accent tracking-widest uppercase">Menu</span>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {MENU_ITEMS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => goTo(value)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-left text-white
                         hover:bg-surface transition-colors"
            >
              <Icon className="w-5 h-5 text-accent flex-shrink-0" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  )
}