import pg from "pg"
import dotenv from "dotenv"
dotenv.config()

const { Pool } = pg

// ── Connection string ─────────────────────────────────────────────────────
// Use Supabase's TRANSACTION-mode pooler (port 6543) in production, not the
// session-mode direct connection (port 5432).
//
// Session mode holds one DB connection open per app connection for the entire
// lifetime of the connection — with Render's free tier spinning up under burst
// load, this exhausts Supabase's 15-session limit immediately.
//
// Transaction mode returns the connection to Supabase's pool after every single
// query, so 5 app connections can serve hundreds of concurrent requests without
// ever hitting the session limit.
//
// How to set this up:
//   1. In Supabase → Project Settings → Database → Connection pooling
//   2. Copy the "Connection string" for Mode = Transaction (port 6543)
//   3. Set that as DATABASE_URL in Render → Environment
//
// The session-mode URL (port 5432) still works for local dev since there's no
// connection pressure. Set DATABASE_URL_DIRECT to the port-5432 URL for local.
const connectionString =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL          // must be the port-6543 transaction-mode URL
    : (process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL)

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  // Keep well under Supabase's session limit even as a hard backstop.
  // Transaction mode can multiplex many app requests through fewer real
  // DB connections, so 7 is more than enough for this app's traffic.
  max: 7,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on("error", (err) => {
  console.error("Unexpected DB client error:", err)
})

// Thin query helper — always releases the client
export async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  if (process.env.NODE_ENV === "development") {
    console.log(`[db] ${Date.now() - start}ms → ${text.slice(0, 80)}`)
  }
  return res
}

// Transaction helper — pass an async fn that receives { query }
export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await fn({ query: (t, p) => client.query(t, p) })
    await client.query("COMMIT")
    return result
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export default pool