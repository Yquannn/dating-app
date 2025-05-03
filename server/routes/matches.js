// routes/matches.js
const router = require('express').Router();
const Match = require('../models/Match');
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Get all matches for a user
router.get('/', auth, async (req, res) => {
  try {
    // Find all matches where the current user is included
    const matches = await Match.find({
      users: req.userId
    });
    
    // Get details for each match with the partner's information
    const matchesWithDetails = await Promise.all(
      matches.map(async (match) => {
        // Find the other user in the match
        const partnerId = match.users.find(id => id.toString() !== req.userId);
        const partner = await User.findById(partnerId).select('-password');
        
        // Get the last message if any
        const lastMessage = await Message.findOne({ chatId: match._id })
          .sort({ createdAt: -1 })
          .limit(1);
        
        return {
          _id: match._id,
          createdAt: match.createdAt,
          partner: partner,
          lastMessage: lastMessage
        };
      })
    );
    
    res.status(200).json(matchesWithDetails);
  } catch (error) {
    res.status(500).json(error);
  }
});

// Get a specific match
router.get('/:id', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json('Match not found');
    
    // Ensure the current user is part of this match
    if (!match.users.includes(req.userId)) {
      return res.status(403).json('Not authorized to view this match');
    }
    
    // Get partner details
    const partnerId = match.users.find(id => id.toString() !== req.userId);
    const partner = await User.findById(partnerId).select('-password');
    
    res.status(200).json({
      _id: match._id,
      createdAt: match.createdAt,
      partner: partner,
      partnerName: partner.name // For easy reference in chat
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

// Delete/unmatch
router.delete('/:id', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json('Match not found');
    
    // Ensure the current user is part of this match
    if (!match.users.includes(req.userId)) {
      return res.status(403).json('Not authorized to delete this match');
    }
    
    // Delete all messages associated with this match
    await Message.deleteMany({ chatId: match._id });
    
    // Delete the match
    await Match.findByIdAndDelete(req.params.id);
    
    res.status(200).json('Match deleted successfully');
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;