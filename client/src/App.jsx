import { BrowserRouter, Routes, Route } from "react-router-dom"
import ProtectedRoute    from "./components/common/ProtectedRoute"
import CommonDashboard  from "./pages/CommonDashboard"
import TeamDashboard    from "./pages/TeamDashboard"
import AdminPage        from "./pages/AdminPage"
import Login            from "./pages/Login"
import PlayerProfile    from "./pages/PlayerProfile"
import HallOfFame       from "./pages/HallOfFame"
import WeeklyDraw       from "./pages/WeeklyDraw"
import WeeklyBracket    from "./pages/WeeklyBracket"
import QuickTournamentDraw    from "./pages/QuickTournamentDraw"
import QuickTournamentBracket from "./pages/QuickTournamentBracket"
import UclDraw          from "./pages/UclDraw"
import UclKODraw    from "./pages/UclKODraw"
import UclKOBracket from "./pages/UclKOBracket"
import TeamRosterPage from "./pages/TeamRosterPage"
import AuctionEntry  from "./pages/AuctionEntry"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<CommonDashboard />} />
        <Route path="/login"        element={<Login />} />
        <Route path="/player/:id"   element={<PlayerProfile />} />
        <Route path="/team-roster/:id" element={<TeamRosterPage />} />
        <Route path="/hall-of-fame"      element={<HallOfFame />} />
        <Route path="/auction"           element={<AuctionEntry />} />
        <Route path="/weekly/draw/:id"    element={<WeeklyDraw />} />
        <Route path="/weekly/bracket/:id" element={<WeeklyBracket />} />
        <Route path="/quick-tournament/draw/:id"    element={<QuickTournamentDraw />} />
        <Route path="/quick-tournament/bracket/:id" element={<QuickTournamentBracket />} />
        <Route path="/ucl/draw"                element={<UclDraw />} />
        <Route path="/ucl-knockout/draw/:id"    element={<UclKODraw />} />
        <Route path="/ucl-knockout/bracket/:id" element={<UclKOBracket />} />
        <Route path="/team"         element={
          <ProtectedRoute><TeamDashboard /></ProtectedRoute>
        } />
        <Route path="/admin"        element={
          <ProtectedRoute role="admin"><AdminPage /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}