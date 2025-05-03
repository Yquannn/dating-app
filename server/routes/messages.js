// routes/messages.js
const router = require('express').Router();
const Message = require('../models/Message');
const Match = require('../models/Match');
const auth = require('../middleware/auth');

// Get messages for a specific chat/match
router.get('/:matchId', auth, async (req, res) => {
  try {
    // Verify the match exists and user is part of it
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json('Match not found');
    
    if (!match.users.includes(req.userId)) {
      return res.status(403).json('Not authorized to view these messages');
    }
    
    // Get all messages for this chat
    const messages = await Message.find({ 
      chatId: req.params.matchId 
    }).sort({ createdAt: 1 });
    
    // Mark messages as read if they were sent to current user
    const unreadMessages = messages.filter(
      msg => !msg.read && msg.sender.toString() !== req.userId
    );
    
    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { 
          _id: { $in: unreadMessages.map(msg => msg._id) }
        },
        { read: true }
      );
    }
    
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json(error);
  }
});

// Create a new message
router.post('/', auth, async (req, res) => {
  const { chatId, text } = req.body;
  
  try {
    // Verify the match exists and user is part of it
    const match = await Match.findById(chatId);
    if (!match) return res.status(404).json('Match not found');
    
    if (!match.users.includes(req.userId)) {
      return res.status(403).json('Not authorized to send messages in this chat');
    }
    
    // Create and save the message
    const newMessage = new Message({
      chatId,
      sender: req.userId,
      text
    });
    
    const savedMessage = await newMessage.save();
    
    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json(error);
  }
});

// Delete a message (optional)
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json('Message not found');
    
    // Only allow deletion if sender is current user
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json('Not authorized to delete this message');
    }
    
    await Message.findByIdAndDelete(req.params.id);
    res.status(200).json('Message deleted successfully');
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;