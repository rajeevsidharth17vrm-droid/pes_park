/**
 * main.jsx — updated to add QueryClientProvider + auth init
 * Replace your existing src/main.jsx with this.
 */
import { StrictMode, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "./index.css"
import App from "./App.jsx"
import { useAuthStore } from "./store/authStore"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          1000 * 60 * 2,   // 2 min
      retry:              1,
      refetchOnWindowFocus: false,
    },
  },
})

function Root() {
  const init = useAuthStore((s) => s.init)
  useEffect(() => { init() }, [init])
  return <App />
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </StrictMode>
)
