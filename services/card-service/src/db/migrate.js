require('dotenv').config();
const { pool } = require('./pool');
const logger = require('../logger');

const createTablesQuery = `
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'EUR', 'GBP')),
  card_number VARCHAR(16) NOT NULL,
  expiry_month INTEGER NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
  expiry_year INTEGER NOT NULL CHECK (expiry_year >= 2023),
  cvv VARCHAR(3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at);
`;

const migrate = async () => {
  const client = await pool.connect();
  try {
    logger.info('Starting database migration...');
    await client.query('BEGIN');
    await client.query(createTablesQuery);
    await client.query('COMMIT');
    logger.info('Database migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if this script is executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrate };
