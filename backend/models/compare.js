import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  }, 
  name: { 
    type: String, 
    required: true 
  },
  latitude: { 
    type: Number, 
    required: true 
  },
  longitude: { 
    type: Number, 
    required: true 
  },
  events: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event' 
  }]
});

// add virtual property for coordinates
LocationSchema.virtual('coords').get(function() {
  return { lat: this.latitude, lng: this.longitude };
});

// make sure virtual fields are serialized
LocationSchema.set('toJSON', { virtuals: true });
LocationSchema.set('toObject', { virtuals: true });

const Location = mongoose.model('Location', LocationSchema);
export default Location;
