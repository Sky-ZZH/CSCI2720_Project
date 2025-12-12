import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  location: {type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true},
  content: {type: String, required: true, trim: true},
  timestamp: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', CommentSchema);
export default Comment;
