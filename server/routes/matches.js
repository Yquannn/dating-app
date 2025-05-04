// // routes/matches.js
// const router = require('express').Router();
// const Match = require('../models/Match');
// const User = require('../models/User');
// const Message = require('../models/Message');
// const auth = require('../middleware/auth');
// const mongoose = require('mongoose');

// // Get potential matches - Exclude only matched/liked users
// router.get('/potential-matches', auth, async (req, res) => {
//   try {
//     const currentUser = await User.findById(req.userId);
//     if (!currentUser) return res.status(404).json('User not found');
    
//     const matches = await Match.find({
//       users: req.userId
//     });
    
//     const matchedUserIds = matches.map(match => 
//       match.users.find(id => id.toString() !== req.userId)
//     ).filter(Boolean);
    
//     const excludedUserIds = [
//       req.userId,
//       ...matchedUserIds
//     ];
    
//     const potentialMatches = await User.find({
//       _id: { $nin: excludedUserIds }
//     }).select('-password');
    
//     res.status(200).json(potentialMatches);
//   } catch (error) {
//     console.error('Error in potential-matches:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get potential matches with preferences
// router.get('/potential-matches-with-preferences', auth, async (req, res) => {
//   try {
//     const currentUser = await User.findById(req.userId);
//     if (!currentUser) return res.status(404).json('User not found');
    
//     const query = {
//       _id: { $ne: req.userId }
//     };
    
//     if (currentUser.interestedIn) {
//       query.gender = currentUser.interestedIn;
//     }
    
//     if (currentUser.gender) {
//       query.interestedIn = currentUser.gender;
//     }
    
//     const potentialMatches = await User.find(query).select('-password');
    
//     res.status(200).json(potentialMatches);
//   } catch (error) {
//     console.error('Error in potential-matches:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get mutual matches with enhanced debugging
// router.get('/matches', auth, async (req, res) => {
//   try {
//     console.log('User ID:', req.userId);
    
//     // Check all matches again to see the updated data
//     const allMatches = await Match.find({ users: req.userId });
//     console.log('All matches after migration:', allMatches);
    
//     // Check specifically for mutual matches
//     const mutualMatches = await Match.find({
//       users: req.userId,
//       isMatched: true
//     });
//     console.log('Mutual matches found:', mutualMatches);
    
//     if (mutualMatches.length === 0) {
//       console.log('No mutual matches found. This could mean:');
//       console.log('1. No one has liked you back yet');
//       console.log('2. The migration set isMatched to false (one-sided likes)');
//       console.log('3. You need to like someone who has already liked you');
//     }
    
//     // Get details for each match partner
//     const matchesWithDetails = await Promise.all(mutualMatches.map(async (match) => {
//       const partnerId = match.users.find(id => id.toString() !== req.userId);
//       const partner = await User.findById(partnerId).select('-password');
      
//       return {
//         _id: match._id,
//         createdAt: match.createdAt,
//         partner: partner
//       };
//     }));
    
//     res.status(200).json(matchesWithDetails);
//   } catch (error) {
//     console.error('Error getting matches:', error);
//     res.status(500).json({ error: error.message });
//   }
// });



// // routes/matches.js

// // Test endpoint to create a mutual match between current user and another user
// router.post('/create-mutual-match/:partnerId', auth, async (req, res) => {
//   try {
//     const partnerId = req.params.partnerId;
    
//     if (req.userId === partnerId) {
//       return res.status(400).json('Cannot match with yourself');
//     }
    
//     // Check if match already exists
//     let match = await Match.findOne({
//       users: { $all: [req.userId, partnerId] }
//     });
    
//     if (!match) {
//       // Create new mutual match
//       match = new Match({
//         users: [req.userId, partnerId],
//         isMatched: true,
//         likedBy: req.userId
//       });
//     } else {
//       // Update existing match to mutual
//       match.isMatched = true;
//     }
    
//     await match.save();
    
//     // Get partner details
//     const partner = await User.findById(partnerId).select('-password');
    
//     res.status(200).json({
//       message: 'Mutual match created',
//       match: {
//         _id: match._id,
//         createdAt: match.createdAt,
//         partner: partner
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });



// // Add this endpoint to your matches.js to fix existing matches
// router.post('/migrate-matches', auth, async (req, res) => {
//   try {
//     // Update all one-sided matches
//     const oneSidedMatches = await Match.find({ 
//       isMatched: { $exists: false },
//       likedBy: { $exists: true }
//     });
    
//     for (let match of oneSidedMatches) {
//       match.isMatched = false;
//       await match.save();
//     }
    
//     // For matches without likedBy (older matches), you'll need to decide their status
//     // For now, let's mark them as one-sided
//     const oldMatches = await Match.find({ 
//       isMatched: { $exists: false },
//       likedBy: { $exists: false }
//     });
    
//     for (let match of oldMatches) {
//       match.isMatched = false;
//       match.likedBy = match.users[0]; // Assume first user initiated the like
//       await match.save();
//     }
    
//     res.status(200).json({ 
//       message: 'Migration complete',
//       updatedOneSided: oneSidedMatches.length,
//       updatedOld: oldMatches.length
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get pending likes (users who liked you)
// router.get('/liked-by', auth, async (req, res) => {
//   try {
//     const pendingLikes = await Match.find({
//       users: req.userId,
//       isMatched: false,
//       likedBy: { $ne: req.userId }
//     }).populate('users', '-password');
    
//     res.status(200).json(pendingLikes);
//   } catch (error) {
//     console.error('Error getting likes:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Like a user
// router.post('/like/:id', auth, async (req, res) => {
//   if (req.userId === req.params.id) 
//     return res.status(400).json('You cannot like yourself');
  
//   try {
//     // Check if a match already exists
//     const existingMatch = await Match.findOne({
//       users: { $all: [req.userId, req.params.id] }
//     });
    
//     if (existingMatch) {
//       if (!existingMatch.isMatched) {
//         // Check if this is a mutual match (other user already liked you)
//         if (existingMatch.likedBy && existingMatch.likedBy.toString() !== req.userId) {
//           // Make it mutual!
//           existingMatch.isMatched = true;
//           await existingMatch.save();
//           return res.status(200).json({ 
//             message: 'It\'s a mutual match!', 
//             match: existingMatch 
//           });
//         } else if (existingMatch.likedBy && existingMatch.likedBy.toString() === req.userId) {
//           return res.status(400).json('You already liked this user');
//         }
//       } else {
//         return res.status(400).json('This is already a mutual match');
//       }
//     }
    
//     // Create a new one-sided match
//     const newMatch = new Match({
//       users: [req.userId, req.params.id],
//       isMatched: false,
//       likedBy: req.userId
//     });
    
//     await newMatch.save();
//     res.status(200).json({ 
//       message: 'User liked successfully',
//       match: newMatch 
//     });
//   } catch (error) {
//     console.error('Error in like route:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Unlike a user
// router.post('/unlike/:id', auth, async (req, res) => {
//   try {
//     const match = await Match.findOne({
//       users: { $all: [req.userId, req.params.id] }
//     });
    
//     if (!match) {
//       return res.status(404).json('No match found');
//     }
    
//     await Match.deleteOne({ _id: match._id });
    
//     res.status(200).json('User unliked successfully');
//   } catch (error) {
//     console.error('Error unliking user:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get a specific match
// router.get('/:id', auth, async (req, res) => {
//   try {
//     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
//       return res.status(400).json('Invalid match ID format');
//     }
    
//     const match = await Match.findById(req.params.id);
//     if (!match) return res.status(404).json('Match not found');
    
//     if (!match.users.includes(req.userId)) {
//       return res.status(403).json('Not authorized to view this match');
//     }
    
//     const partnerId = match.users.find(id => id.toString() !== req.userId);
//     const partner = await User.findById(partnerId).select('-password');
    
//     res.status(200).json({
//       _id: match._id,
//       createdAt: match.createdAt,
//       partner: partner,
//       partnerName: partner.name
//     });
//   } catch (error) {
//     res.status(500).json(error);
//   }
// });

// // Delete/unmatch
// router.delete('/:id', auth, async (req, res) => {
//   try {
//     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
//       return res.status(400).json('Invalid match ID format');
//     }
    
//     const match = await Match.findById(req.params.id);
//     if (!match) return res.status(404).json('Match not found');
    
//     if (!match.users.includes(req.userId)) {
//       return res.status(403).json('Not authorized to delete this match');
//     }
    
//     await Message.deleteMany({ chatId: match._id });
//     await Match.findByIdAndDelete(req.params.id);
    
//     res.status(200).json('Match deleted successfully');
//   } catch (error) {
//     res.status(500).json(error);
//   }
// });

// module.exports = router;


// routes/matches.js
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