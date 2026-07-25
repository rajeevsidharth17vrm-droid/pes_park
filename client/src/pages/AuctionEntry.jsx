import { Gavel, ExternalLink } from "lucide-react"
import Layout from "../components/layout/Layout"

const AUCTION_SITE_URL = "https://pes-park-auction.vercel.app/auction.html"

export default function AuctionEntry() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-24 sm:py-32 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center mb-6">
          <Gavel className="w-8 h-8 sm:w-10 sm:h-10 text-gold" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          Player Auction
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-md mb-8">
          The live player auction runs on its own dedicated site. Tap below to enter.
        </p>

        <a
          href={AUCTION_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-pitch-900 font-bold text-sm sm:text-base
                     hover:bg-gold/90 transition-colors shadow-[0_0_30px_rgba(245,158,11,0.25)]"
        >
          <Gavel className="w-4 h-4 sm:w-5 sm:h-5" />
          Enter Auction
          <ExternalLink className="w-4 h-4 opacity-70" />
        </a>
      </div>
    </Layout>
  )
}