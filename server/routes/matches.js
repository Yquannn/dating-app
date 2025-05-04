// routes/matches.js
const router = require('express').Router();
const Match = require('../models/Match');
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Get potential matches - Exclude only matched/liked users
router.get('/potential-matches', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(404).json('User not found');
    
    // Get all matches (both one-sided and mutual) involving the current user
    const matches = await Match.find({
      users: req.userId
    });
    
    // Extract user IDs from matches to exclude them
    const matchedUserIds = matches.map(match => 
      match.users.find(id => id.toString() !== req.userId)
    );
    
    // Exclude current user and matched/liked users
    const excludedUserIds = [
      req.userId,
      ...matchedUserIds
    ];
    
    // Find all users except excluded ones
    const potentialMatches = await User.find({
      _id: { $nin: excludedUserIds }
    }).select('-password');
    
    res.status(200).json(potentialMatches);
  } catch (error) {
    console.error('Error in potential-matches:', error);
    res.status(500).json({ error: error.message });
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