import { attachDatabasePool } from '@neon/functions'
import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
})
attachDatabasePool(pool)

export { pool }
