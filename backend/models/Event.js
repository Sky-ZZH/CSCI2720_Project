import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' }, // 關聯 Location
  dateTime: String,
  description: String,
  presenter: String,
  price: String
});

const Event = mongoose.model('Event', EventSchema);
export default Event;

