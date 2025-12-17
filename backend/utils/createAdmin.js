// backend/utils/createAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js'; // 引入您的 User 模型

// 環境配置
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_db');
    console.log('✅ Connected to MongoDB');

    // 檢查管理員是否已存在
    const adminExists = await User.findOne({ username: 'admin' });
    if (adminExists) {
      console.log('⚠️ Admin user already exists.');
      process.exit();
    }

    // 創建新的管理員用戶
    await User.create({
      username: 'admin',
      password: 'password123', // 密碼會被自動加密
      role: 'admin'
    });

    console.log('✅ Admin user created successfully!');
    process.exit();

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();
