// routes/auth.js
const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    
    // Create token
    const token = jwt.sign(
      { id: savedUser._id }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const { password, ...userWithoutPassword } = savedUser._doc;
    res.status(201).json({ ...userWithoutPassword, token });
  } catch (error) {
    res.status(500).json(error);
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json('User not found');
    
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).json('Wrong password');
    
    // Create token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const { password, ...userWithoutPassword } = user._doc;
    res.status(200).json({ ...userWithoutPassword, token });
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;