// backend/utils/seedComments.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 引入模型
import User from '../models/User.js';
import Location from '../models/Location.js';
import Comment from '../models/Comment.js';

// 環境配置
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedComments = async () => {
  try {
    // 1. 連接數據庫
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 2. 獲取基礎數據（用戶和場地）
    // 確保至少有一個用戶（比如剛才創建的 admin）
    const adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      console.error('❌ No admin user found. Please run "node utils/createAdmin.js" first.');
      process.exit(1);
    }

    // 獲取前 3 個場地
    const locations = await Location.find().limit(3);
    if (locations.length === 0) {
      console.error('❌ No locations found. Please run "node utils/importData.js" first.');
      process.exit(1);
    }

    // 3. 準備測試評論數據
    // 我們將為前 3 個場地各添加一條評論
    const dummyComments = [
      {
        user: adminUser._id,
        location: locations[0]._id,
        content: `Great venue! I attended an event at ${locations[0].name} last week.`,
        timestamp: new Date('2025-12-01')
      },
      {
        user: adminUser._id,
        location: locations[1]._id,
        content: `The acoustics at ${locations[1].name} are amazing. Highly recommended.`,
        timestamp: new Date('2025-12-05')
      },
      {
        user: adminUser._id, // 同一個用戶評論多個地點
        location: locations[2]._id,
        content: `A bit crowded, but ${locations[2].name} is still a nice place.`,
        timestamp: new Date() // 當前時間
      }
    ];

    // 4. 清除舊評論（可選，防止重複運行導致數據過多）
    console.log('🧹 Clearing existing comments...');
    await Comment.deleteMany({});
    
    // 5. 插入新評論
    console.log('📝 Seeding comments...');
    const result = await Comment.insertMany(dummyComments);

    console.log(`✅ Successfully added ${result.length} comments!`);
    console.log('📋 Sample comment:', result[0]);

    process.exit();

  } catch (error) {
    console.error('❌ Error seeding comments:', error);
    process.exit(1);
  }
};

// 執行腳本
seedComments();
