// routes/users.js
const router = require('express').Router();
const User = require('../models/User');
const Match = require('../models/Match');
const auth = require('../middleware/auth');

// Get potential matches
router.get('/potential-matches', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(404).json('User not found');
    
    // Get existing likes and matches
    const matches = await Match.find({ users: req.userId });
    const existingUserIds = matches.flatMap(match => match.users);
    
    // Find potential matches based on preferences
    const potentialMatches = await User.find({
      _id: { $ne: req.userId, $nin: existingUserIds },
      gender: currentUser.interestedIn,
      interestedIn: currentUser.gender,
      age: { 
        $gte: currentUser.preferences.ageRange.min, 
        $lte: currentUser.preferences.ageRange.max 
      },
      'location.coordinates': {
  $near: {
    $geometry: currentUser.location,
    $maxDistance: currentUser.preferences.distance * 1000 // convert km to meters
  }
}
    }).select('-password');
    
    res.status(200).json(potentialMatches);
  } catch (error) {
    res.status(500).json(error);
  }
});

// Like a user
router.post('/like/:id', auth, async (req, res) => {
  if (req.userId === req.params.id) 
    return res.status(400).json('You cannot like yourself');
  
  try {
    // Check if the other user has already liked current user
    const existingMatch = await Match.findOne({
      users: { $all: [req.userId, req.params.id] }
    });
    
    if (existingMatch) {
      return res.status(400).json('Match already exists');
    }
    
    // Create a new match
    const newMatch = new Match({
      users: [req.userId, req.params.id],
      isMatched: false
    });
    
    await newMatch.save();
    res.status(200).json('User liked successfully');
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;