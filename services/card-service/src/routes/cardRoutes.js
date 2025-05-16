const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { pool } = require('../db/pool');
const logger = require('../logger');

const router = express.Router();

// Validation schema for card creation
const cardCreateSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().valid('USD', 'EUR', 'GBP').required(),
  metadata: Joi.object().optional()
});

// Generate a random card number (for demo purposes only)
const generateCardNumber = () => {
  return '4' + Array(15).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
};

// Generate expiry date (1 year from now)
const generateExpiryDate = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear() + 1;
  return { month, year };
};

// Generate CVV
const generateCVV = () => {
  return Math.floor(100 + Math.random() * 900).toString();
};

// Create a new card
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = cardCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: error.details[0].message
      });
    }

    const { amount, currency, metadata } = value;

    // Generate card details
    const id = uuidv4();
    const cardNumber = generateCardNumber();
    const { month: expiryMonth, year: expiryYear } = generateExpiryDate();
    const cvv = generateCVV();

    // Insert card into database
    const query = `
      INSERT INTO cards (id, status, amount, currency, card_number, expiry_month, expiry_year, cvv, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, status, amount, currency, card_number, expiry_month, expiry_year, cvv, created_at, metadata
    `;
    
    const values = [
      id,
      'active',
      amount,
      currency,
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      metadata || {}
    ];

    const result = await pool.query(query, values);
    const card = result.rows[0];

    // Mask card number for response
    const maskedCardNumber = card.card_number.slice(-4).padStart(card.card_number.length, '*');

    // Return the created card
    res.status(201).json({
      id: card.id,
      status: card.status,
      amount: parseFloat(card.amount),
      currency: card.currency,
      cardNumber: maskedCardNumber,
      expiryMonth: card.expiry_month,
      expiryYear: card.expiry_year,
      cvv: card.cvv, // Only returned on creation
      createdAt: card.created_at,
      metadata: card.metadata
    });
  } catch (error) {
    logger.error('Error creating card:', error);
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while creating the card'
    });
  }
});

// Get a card by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        code: 'INVALID_ID',
        message: 'Invalid card ID format'
      });
    }

    // Query the database
    const query = `
      SELECT id, status, amount, currency, card_number, expiry_month, expiry_year, created_at, metadata
      FROM cards
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);

    // Check if card exists
    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 'CARD_NOT_FOUND',
        message: 'Card not found'
      });
    }

    const card = result.rows[0];

    // Mask card number for response
    const maskedCardNumber = card.card_number.slice(-4).padStart(card.card_number.length, '*');

    // Return the card
    res.status(200).json({
      id: card.id,
      status: card.status,
      amount: parseFloat(card.amount),
      currency: card.currency,
      cardNumber: maskedCardNumber,
      expiryMonth: card.expiry_month,
      expiryYear: card.expiry_year,
      createdAt: card.created_at,
      metadata: card.metadata
    });
  } catch (error) {
    logger.error('Error retrieving card:', error);
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while retrieving the card'
    });
  }
});

module.exports = router;
