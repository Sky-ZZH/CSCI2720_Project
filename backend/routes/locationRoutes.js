import express from 'express';
import Location from '../models/Location.js';
import Comment from '../models/Comment.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/locations
router.get('/', async (req, res) => {
  try {
    const keyword = req.query.keyword
      ? {
          name: {
            $regex: req.query.keyword,
            $options: 'i',
          },
        }
      : {};

    const locations = await Location.find({ ...keyword });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/locations/:id
router.get('/:id', async (req, res) => {
  try {
    const location = await Location.findOne({ id: req.params.id }).populate('events');

    if (location) {
      const comments = await Comment.find({ location: location._id }).populate('user', 'username');
      
      const locationObj = location.toObject();
      locationObj.comments = comments;
      
      res.json(locationObj);
    } else {
      res.status(404).json({ message: 'Location not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/locations/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
  const { content } = req.body;
  try {
    const location = await Location.findOne({ id: req.params.id });
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const comment = new Comment({
      user: req.user._id,
      location: location._id,
      content,
    });

    const createdComment = await comment.save();
    res.status(201).json(createdComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/locations/:id/comments/:commentId
router.delete('/:id/comments/:commentId', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is owner or admin
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
       return res.status(401).json({ message: 'Not authorized to delete this comment' });
    }

    await comment.deleteOne();
    res.json({ message: 'Comment removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
