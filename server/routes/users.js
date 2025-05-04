// routes/users.js
const router = require('express').Router();
const User = require('../models/User');
const Match = require('../models/Match');
const auth = require('../middleware/auth');

// Get potential matches - Updated to show all users without match restrictions
router.get('/potential-matches', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(404).json('User not found');
    
    // Simply get all users except the current user
    const potentialMatches = await User.find({
      _id: { $ne: req.userId }  // Exclude only the current user
    }).select('-password');
    
    res.status(200).json(potentialMatches);
  } catch (error) {
    console.error('Error in potential-matches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json('User not found');
    res.status(200).json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user information
router.put('/:id', auth, async (req, res) => {
  // Check if user is updating their own profile
  if (req.userId !== req.params.id) {
    return res.status(403).json('You can only update your own profile');
  }

  try {
    const { password, ...updateData } = req.body;
    
    // Don't allow password updates through this route
    if (password) {
      return res.status(400).json('Password updates should be done through a separate route');
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { ...updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json('User not found');
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user location
router.put('/:id/location', auth, async (req, res) => {
  if (req.userId !== req.params.id) {
    return res.status(403).json('You can only update your own location');
  }

  try {
    const { longitude, latitude } = req.body;
    
    if (!longitude || !latitude) {
      return res.status(400).json('Longitude and latitude are required');
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        'location.coordinates': [longitude, latitude]
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json('User not found');
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user location:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user preferences
router.put('/:id/preferences', auth, async (req, res) => {
  if (req.userId !== req.params.id) {
    return res.status(403).json('You can only update your own preferences');
  }

  try {
    const { ageRange, distance } = req.body;
    
    const updateData = {};
    if (ageRange) updateData['preferences.ageRange'] = ageRange;
    if (distance) updateData['preferences.distance'] = distance;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json('User not found');
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add photo to user profile
router.post('/:id/photos', auth, async (req, res) => {
  if (req.userId !== req.params.id) {
    return res.status(403).json('You can only update your own photos');
  }

  try {
    const { photoUrl } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json('Photo URL is required');
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $push: { photos: photoUrl } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json('User not found');
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error adding photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove photo from user profile
router.delete('/:id/photos/:photoIndex', auth, async (req, res) => {
  if (req.userId !== req.params.id) {
    return res.status(403).json('You can only update your own photos');
  }

  try {
    const photoIndex = parseInt(req.params.photoIndex);
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json('User not found');
    
    // Remove photo at specified index
    user.photos.splice(photoIndex, 1);
    await user.save();
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error removing photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alternative potential matches with preferences
router.get('/potential-matches-with-preferences', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    if (!currentUser) return res.status(404).json('User not found');
    
    // Build query object
    const query = {
      _id: { $ne: req.userId }  // Exclude only the current user
    };
    
    // Optional: Keep basic preferences if you want
    if (currentUser.interestedIn) {
      query.gender = currentUser.interestedIn;
    }
    
    if (currentUser.gender) {
      query.interestedIn = currentUser.gender;
    }
    
    // Find all users based on the query (no match restriction)
    const potentialMatches = await User.find(query).select('-password');
    
    res.status(200).json(potentialMatches);
  } catch (error) {
    console.error('Error in potential-matches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Like a user - Fixed to handle mutual matches properly
router.post('/like/:id', auth, async (req, res) => {
  if (req.userId === req.params.id) 
    return res.status(400).json('You cannot like yourself');
  
  try {
    // Check if a match already exists (one-sided or mutual)
    const existingMatch = await Match.findOne({
      users: { $all: [req.userId, req.params.id] }
    });
    
    if (existingMatch) {
      if (!existingMatch.isMatched) {
        // If match exists but not mutual, check if current user already liked
        if (existingMatch.likedBy && existingMatch.likedBy.toString() === req.userId) {
          return res.status(400).json('You already liked this user');
        }
        
        // If the other user liked first, now it's a mutual match
        existingMatch.isMatched = true;
        await existingMatch.save();
        return res.status(200).json({ 
          message: 'It\'s a match!', 
          match: existingMatch 
        });
      } else {
        return res.status(400).json('Match already exists');
      }
    }
    
    // Create a new one-sided match
    const newMatch = new Match({
      users: [req.userId, req.params.id],
      isMatched: false,
      likedBy: req.userId  // Track who initiated the like
    });
    
    await newMatch.save();
    res.status(200).json({ 
      message: 'User liked successfully',
      match: newMatch 
    });
  } catch (error) {
    console.error('Error in like route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to get mutual matches
router.get('/matches', auth, async (req, res) => {
  try {
    const matches = await Match.find({
      users: req.userId,
      isMatched: true
    }).populate('users', '-password');
    
    res.status(200).json(matches);
  } catch (error) {
    console.error('Error getting matches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to get pending likes (users who liked you)
router.get('/liked-by', auth, async (req, res) => {
  try {
    const pendingLikes = await Match.find({
      users: req.userId,
      isMatched: false,
      likedBy: { $ne: req.userId }  // Users who liked you but you haven't liked back
    }).populate('users', '-password');
    
    res.status(200).json(pendingLikes);
  } catch (error) {
    console.error('Error getting likes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unlike a user
router.post('/unlike/:id', auth, async (req, res) => {
  try {
    const match = await Match.findOne({
      users: { $all: [req.userId, req.params.id] }
    });
    
    if (!match) {
      return res.status(404).json('No match found');
    }
    
    // Remove the match
    await Match.deleteOne({ _id: match._id });
    
    res.status(200).json('User unliked successfully');
  } catch (error) {
    console.error('Error unliking user:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;