const PricingRule = require('../models/PricingRule');

//Get all pricing rules
//GET /api/pricing-rules
const getPricingRules = async (req, res) => {
  const rules = await PricingRule.find({}).sort({ createdAt: -1 });
  res.json({ success: true, count: rules.length, rules });
};

//Create a pricing rule
//POST /api/pricing-rules
const createPricingRule = async (req, res) => {
  const { name, description, type, condition, charge, isActive } = req.body;

  if (!name || !type || charge == null) {
    return res
      .status(400)
      .json({ success: false, message: 'name, type, and charge are required.' });
  }

  //validate that the required condition field is present for each type
  const conditionErrors = {
    DEMAND: !condition?.threshold,
    TIME: !condition?.hoursBeforeDeparture,
    SEAT_TYPE: !condition?.seatType,
    CLASS: !condition?.class,
  };
  if (conditionErrors[type]) {
    return res.status(400).json({
      success: false,
      message: `Condition field missing for rule type "${type}".`,
    });
  }

  const rule = await PricingRule.create({
    name,
    description,
    type,
    condition,
    charge,
    isActive: isActive ?? true,
  });

  res.status(201).json({ success: true, rule });
};

//Update a pricing rule
//PUT /api/pricing-rules/:id
const updatePricingRule = async (req, res) => {
  const rule = await PricingRule.findById(req.params.id);
  if (!rule)
    return res.status(404).json({ success: false, message: 'Pricing rule not found.' });

  const { name, description, type, condition, charge, isActive } = req.body;
  if (name !== undefined) rule.name = name;
  if (description !== undefined) rule.description = description;
  if (type !== undefined) rule.type = type;
  if (condition !== undefined) rule.condition = condition;
  if (charge !== undefined) rule.charge = charge;
  if (isActive !== undefined) rule.isActive = isActive;

  await rule.save();
  res.json({ success: true, rule });
};

//Delete a pricing rule
//DELETE /api/pricing-rules/:id
const deletePricingRule = async (req, res) => {
  const rule = await PricingRule.findByIdAndDelete(req.params.id);
  if (!rule)
    return res.status(404).json({ success: false, message: 'Pricing rule not found.' });

  res.json({ success: true, message: 'Pricing rule deleted.' });
};

module.exports = {
  getPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
};