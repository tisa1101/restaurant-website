const express = require("express");
const router = express.Router();

// Emergency admin login (temporary)
router.post("/login", (req, res) => {

  const { username } = req.body;

  if (username === "admin") {
    return res.json({
      success: true,
      username: "admin"
    });
  }

  return res.status(401).json({
    error: "Invalid login"
  });

});

module.exports = router;