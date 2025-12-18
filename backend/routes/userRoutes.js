import express from 'express';
import User from '../models/User.js';
import Location from '../models/Location.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/user/favorites
router.post('/favorites', protect, async (req, res) => {
  const { locationId } = req.body;
  
  try {
    if (!locationId) {
        return res.status(400).json({ message: "Location ID is required" });
    }

    let location = await Location.findOne({ id: locationId });
    if (!location) {
        if (locationId.match(/^[0-9a-fA-F]{24}$/)) {
             location = await Location.findById(locationId);
        }
    }

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const user = await User.findById(req.user._id);

    if (user.favorites.includes(location._id)) {
      user.favorites = user.favorites.filter(
        (fav) => fav.toString() !== location._id.toString()
      );
      await user.save();
      res.json({ message: 'Removed from favorites', favorites: user.favorites });
    } else {
      user.favorites.push(location._id);
      await user.save();
      res.json({ message: 'Added to favorites', favorites: user.favorites });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/user/favorites
router.get('/favorites', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    // Filter out nulls (in case referenced locations were deleted)
    const validFavorites = user.favorites.filter(fav => fav !== null);
    res.json(validFavorites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
