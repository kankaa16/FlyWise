const express = require("express");
const router = express.Router();
const AddOn = require("../models/AddOn");

//get /api/addons
router.get("/", async (req, res) => {
  try {
    const { type, veg } = req.query;

    let filter ={};

    if (type) filter.type = type;
    if (veg !== undefined) filter.veg = veg === "true";

    const addons = await AddOn.find(filter);

    res.json(addons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;