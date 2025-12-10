import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // XML 中的 Venue ID
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }] // 關聯 Event
});

const Location = mongoose.model('Location', LocationSchema);
export default Location;
