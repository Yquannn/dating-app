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
  // Save message and emit to recipient
  const message = await Message.create(messageData);
  io.to(messageData.chatId).emit('receive_message', message);
  
  // Find recipient's user document
  const recipient = await User.findOne({ 
    _id: { $ne: messageData.sender },
    // Find the user who is part of this chat
  });
  
  if (recipient && recipient.pushSubscription) {
    const payload = JSON.stringify({
      title: `New message from ${senderName}`,
      body: messageData.text,
      chatId: messageData.chatId,
      url: `/chat/${messageData.chatId}`
    });
    
    try {
      await webPush.sendNotification(
        recipient.pushSubscription,
        payload
      );
    } catch (error) {
      console.error('Error sending push notification:', error);
      // Handle error (subscription might be expired)
    }
  }
});