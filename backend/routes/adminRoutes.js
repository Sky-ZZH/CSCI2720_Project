import express from 'express';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Location from '../models/Location.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(admin);

// --- Events Management ---

// POST /api/admin/events
router.post('/events', async (req, res) => {
  try {
    const event = new Event(req.body);
    const createdEvent = await event.save();

    // Update the Location to include this new event
    if (req.body.venue) {
      const loc = await Location.findByIdAndUpdate(
        req.body.venue,
        { $addToSet: { events: createdEvent._id } }, // Use $addToSet to prevent duplicates
        { new: true }
      );
      if (!loc) {
        console.error(`Location not found for update: ${req.body.venue}`);
      }
    }

    res.status(201).json(createdEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/admin/events/:id
router.put('/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (event) {
      const oldVenueId = event.venue;
      
      Object.assign(event, req.body);
      const updatedEvent = await event.save();

      // If venue changed, update both old and new locations
      if (req.body.venue && oldVenueId && oldVenueId.toString() !== req.body.venue.toString()) {
        // Remove from old location
        await Location.findByIdAndUpdate(oldVenueId, { $pull: { events: event._id } });
        // Add to new location
        await Location.findByIdAndUpdate(req.body.venue, { $addToSet: { events: event._id } });
      }

      res.json(updatedEvent);
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/admin/events/:id
router.delete('/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (event) {
      await event.deleteOne();

      // Remove event reference from Location
      if (event.venue) {
        await Location.findByIdAndUpdate(
          event.venue,
          { $pull: { events: event._id } }
        );
      }

      res.json({ message: 'Event removed' });
    } else {
      res.status(404).json({ message: 'Event not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Users Management ---

// GET /api/admin/users
router.get('/users', async (req, res) => {
    const users = await User.find({});
    res.json(users);
});

// POST /api/admin/users
router.post('/users', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const user = await User.create({ username, password, role });
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.username = req.body.username || user.username;
            if (req.body.password) {
                user.password = req.body.password;
            }
            user.role = req.body.role || user.role;
            const updatedUser = await user.save();
            res.json(updatedUser);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            await user.deleteOne();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            if (user._id.toString() === req.user._id.toString()) {
                res.status(400).json({ message: 'You cannot delete your own admin account.' });
                return; 
            }
            await user.deleteOne();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
});

export default router;
