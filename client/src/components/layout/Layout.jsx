import Navbar from "./Navbar"

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-pitch-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
