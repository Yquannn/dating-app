// Backend route to handle push subscriptions
const webPush = require('web-push');

// Set VAPID keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

webPush.setVapidDetails(
  'mailto:dondonbautista1223@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Route to save subscription
app.post('/api/push/subscribe', async (req, res) => {
  const { subscription, userId } = req.body;
  
  // Save subscription to database
  await User.findByIdAndUpdate(userId, { pushSubscription: subscription });
  
  res.status(201).json({ message: 'Subscription saved' });
});




// When a message is received, send push notification
socket.on('send_message', async (messageData) => {
  try {
    // Save message and emit to recipient
    const message = await Message.create(messageData);
    io.to(messageData.chatId).emit('receive_message', message);
    
    // Get sender information
    const sender = await User.findById(messageData.sender);
    const senderName = sender ? sender.name : 'Unknown';
    
    // Get the match info to find out who the recipient is
    const match = await Match.findOne({ chatId: messageData.chatId });
    if (!match) {
      console.log('Match not found for chatId:', messageData.chatId);
      return;
    }
    
    // Determine the recipient ID
    let recipientId;
    if (match.user1._id.toString() === messageData.sender) {
      recipientId = match.user2._id;
    } else {
      recipientId = match.user1._id;
    }
    
    // Find recipient's user document
    const recipient = await User.findById(recipientId);
    
    if (recipient && recipient.pushSubscription) {
      const payload = JSON.stringify({
        title: `New message from ${senderName}`,
        body: messageData.text,
        data: {
          chatId: messageData.chatId,
          url: `/chat/${messageData.chatId}`,
          messageId: message._id,
          sender: messageData.sender,
          senderName: senderName
        }
      });
      
      try {
        await webPush.sendNotification(
          recipient.pushSubscription,
          payload
        );
        console.log('Push notification sent successfully to:', recipientId);
      } catch (error) {
        console.error('Error sending push notification:', error);
        
        // Handle subscription errors
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired, remove it from database
          await User.findByIdAndUpdate(recipientId, { pushSubscription: null });
          console.log('Removed expired subscription for user:', recipientId);
        }
      }
    } else {
      console.log('No push subscription found for recipient:', recipientId);
    }
  } catch (error) {
    console.error('Error in send_message handler:', error);
  }
});