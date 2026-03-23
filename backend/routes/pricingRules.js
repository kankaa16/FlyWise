const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
} = require('../controllers/pricingRuleController');

const ctrl = require('../controllers/pricingRuleController');
console.log('Controller exports:', ctrl);

router.get('/', protect, adminOnly, getPricingRules);
router.post('/', protect, adminOnly, createPricingRule);
router.put('/:id', protect, adminOnly, updatePricingRule);
router.delete('/:id', protect, adminOnly, deletePricingRule);

module.exports = router;