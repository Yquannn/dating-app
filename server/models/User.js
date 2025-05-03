const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  interestedIn: { type: String, required: true },
  bio: { type: String },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  photos: [String],
  preferences: {
    ageRange: { min: Number, max: Number },
    distance: Number
  },
  createdAt: { type: Date, default: Date.now }
});

// Add the 2dsphere index on location.coordinates
UserSchema.index({ "location.coordinates": "2dsphere" });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', UserSchema);