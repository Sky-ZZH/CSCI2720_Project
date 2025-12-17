import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_db');
    console.log('✅ Connected to MongoDB');

    const users = [
      {
        username: 'testuser',
        password: 'password123',
        role: 'user'
      },
      {
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      }
    ];

    for (const u of users) {
      const exists = await User.findOne({ username: u.username });
      if (exists) {
        console.log(`⚠️ User ${u.username} already exists. Updating password...`);
        exists.password = u.password;
        exists.role = u.role;
        await exists.save();
        console.log(`✅ User ${u.username} updated.`);
      } else {
        await User.create(u);
        console.log(`✅ User ${u.username} created.`);
      }
    }

    console.log('🎉 Seeding complete!');
    process.exit();

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();
