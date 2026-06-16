import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
dotenv.config()
import { query } from '../src/db/pool.js'

const ADMIN_EMAIL    = 'admin@tamilEFL.com'
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'Admin@1234'

async function createAdmin() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  await query(`
    INSERT INTO users (username, email, password_hash, role)
    VALUES ($1, $2, $3, 'admin')
    ON CONFLICT (email) DO NOTHING
  `, [ADMIN_USERNAME, ADMIN_EMAIL, hash])

  console.log('✅ Admin created')
  console.log('   Email:   ', ADMIN_EMAIL)
  console.log('   Password:', ADMIN_PASSWORD)
  process.exit(0)
}

createAdmin().catch(err => {
  console.error('❌ Failed:', err.message)
  process.exit(1)
})