const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
    origin: ["http://localhost:3000", "https://https://dating-app-backend-hpju.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join a chat room
  socket.on('join_chat', (data) => {
    socket.join(data.chatId);
    console.log(`User ${data.userId} joined chat: ${data.chatId}`);
  });
  
  // Send message
  socket.on('send_message', (data) => {
    io.to(data.chatId).emit('receive_message', data);
  });
  
  // User is typing
  socket.on('typing', (data) => {
    socket.to(data.chatId).emit('user_typing', data.userId);
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/messages', require('./routes/messages'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));