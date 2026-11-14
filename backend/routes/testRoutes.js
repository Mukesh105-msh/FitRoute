
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FitRoute API is working!"
  });
});

module.exports = router;
