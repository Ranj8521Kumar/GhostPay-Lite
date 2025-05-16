const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const axios = require('axios');
const { pool } = require('../db/pool');
const logger = require('../logger');

const router = express.Router();

// Validation schema for charge creation
const chargeCreateSchema = Joi.object({
  cardId: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().valid('USD', 'EUR', 'GBP').required(),
  description: Joi.string().optional(),
  metadata: Joi.object().optional()
});

// Create a new charge
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    // Validate request body
    const { error, value } = chargeCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: error.details[0].message
      });
    }

    const { cardId, amount, currency, description, metadata } = value;

    // Start transaction
    await client.query('BEGIN');

    // Check if card exists and is valid for charging
    try {
      const cardResponse = await axios.get(`http://card-service:${process.env.CARD_SERVICE_PORT || 3001}/cards/${cardId}`);
      const card = cardResponse.data;

      // Check if card is active
      if (card.status !== 'active') {
        await client.query('ROLLBACK');
        return res.status(422).json({
          code: 'CARD_NOT_CHARGEABLE',
          message: `Card cannot be charged because it is ${card.status}`
        });
      }

      // Check if amount and currency match
      if (card.amount < amount) {
        await client.query('ROLLBACK');
        return res.status(422).json({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Card has insufficient funds for this charge'
        });
      }

      if (card.currency !== currency) {
        await client.query('ROLLBACK');
        return res.status(422).json({
          code: 'CURRENCY_MISMATCH',
          message: 'Charge currency must match card currency'
        });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.response && error.response.status === 404) {
        return res.status(404).json({
          code: 'CARD_NOT_FOUND',
          message: 'Card not found'
        });
      }
      throw error;
    }

    // Generate charge ID
    const id = uuidv4();

    // Insert charge into database
    const insertQuery = `
      INSERT INTO charges (id, card_id, status, amount, currency, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, card_id, status, amount, currency, description, created_at, metadata
    `;
    
    const insertValues = [
      id,
      cardId,
      'succeeded', // For simplicity, we're assuming all charges succeed
      amount,
      currency,
      description || null,
      metadata || {}
    ];

    const result = await client.query(insertQuery, insertValues);
    const charge = result.rows[0];

    // Update card status to 'used'
    try {
      await axios.put(`http://card-service:${process.env.CARD_SERVICE_PORT || 3001}/cards/${cardId}/status`, {
        status: 'used'
      });
    } catch (error) {
      // If we can't update the card status, we should roll back the charge
      await client.query('ROLLBACK');
      logger.error('Error updating card status:', error);
      return res.status(500).json({
        code: 'CARD_UPDATE_FAILED',
        message: 'Failed to update card status after charge'
      });
    }

    // Commit transaction
    await client.query('COMMIT');

    // Return the created charge
    res.status(201).json({
      id: charge.id,
      cardId: charge.card_id,
      status: charge.status,
      amount: parseFloat(charge.amount),
      currency: charge.currency,
      description: charge.description,
      createdAt: charge.created_at,
      metadata: charge.metadata
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating charge:', error);
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while processing the charge'
    });
  } finally {
    client.release();
  }
});

module.exports = router;
