// backend/utils/importData.js
import axios from 'axios';
import xml2js from 'xml2js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 引入正式的模型
import Location from '../models/Location.js';
import Event from '../models/Event.js';

// 環境配置
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// ==========================================
// 1. 從 URL 獲取 XML 數據
// ==========================================

const LCSD_API_URLS = {
  EVENTS: 'https://www.lcsd.gov.hk/datagovhk/event/events.xml',
  VENUES: 'https://www.lcsd.gov.hk/datagovhk/event/venues.xml',
  HOLIDAYS: 'https://www.lcsd.gov.hk/datagovhk/event/holiday.xml',
  EVENT_DATES: 'https://www.lcsd.gov.hk/datagovhk/event/eventDates.xml'
};

/**
 * 從指定 URL 獲取 XML 數據並解析
 * @param {string} url - 數據源 URL
 * @returns {Promise<Object>} 解析後的 JavaScript 對象
 */
const fetchAndParseXML = async (url) => {
  try {
    console.log(`📡 正在獲取: ${url}`);
    const response = await axios.get(url);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    console.log(`✅ 成功解析: ${url}`);
    return result;
  } catch (error) {
    console.error(`❌ 獲取或解析失敗 (${url}):`, error.message);
    throw error;
  }
};

/**
 * 根據 venueid 統計每個場地的活動數量
 * @param {Array} events - 所有事件陣列
 * @returns {Map} venueId -> 事件數量
 */
const countEventsByVenue = (events) => {
  const venueEventCount = new Map();
  
  for (const evt of events) {
    const venueId = evt.venueid?.[0];
    if (venueId) {
      venueEventCount.set(venueId, (venueEventCount.get(venueId) || 0) + 1);
    }
  }
  
  return venueEventCount;
};

/**
 * 建立 venueid -> venue 信息的映射表
 * @param {Object} venuesData - 解析後的 venues.xml 數據
 * @returns {Map} venueId -> {name, latitude, longitude}
 */
const buildVenueMap = (venuesData) => {
  const venueMap = new Map();
  const venues = venuesData.venues.venue || [];
  
  for (const venue of venues) {
    const id = venue.$.id;
    const nameE = venue.venuee?.[0] || 'Unknown Venue';
    const latitude = venue.latitude?.[0];
    const longitude = venue.longitude?.[0];
    
    venueMap.set(id, {
      name: nameE,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null
    });
  }
  
  console.log(`✅ 已加載 ${venueMap.size} 個場地信息`);
  return venueMap;
};

/**
 * 處理重複座標：在同一座標的多個場地中，只保留事件數最多的
 * @param {Array} venueIds - 候選場地 ID 列表
 * @param {Map} venueMap - 場地信息映射表
 * @param {Map} venueEventCount - 場地事件數量映射表
 * @returns {Array} 去重後的場地 ID 列表
 */
const removeDuplicateCoordinates = (venueIds, venueMap, venueEventCount) => {
  // 按座標分組
  const coordGroups = new Map();
  
  for (const venueId of venueIds) {
    const venueInfo = venueMap.get(venueId);
    
    if (!venueInfo || !venueInfo.latitude || !venueInfo.longitude) {
      continue; // 跳過無座標的場地
    }
    
    const coordKey = `${venueInfo.latitude},${venueInfo.longitude}`;
    
    if (!coordGroups.has(coordKey)) {
      coordGroups.set(coordKey, []);
    }
    
    coordGroups.get(coordKey).push({
      venueId,
      name: venueInfo.name,
      eventCount: venueEventCount.get(venueId) || 0
    });
  }
  
  // 對每組重複座標，只選擇事件數最多的場地
  const selectedVenues = [];
  const removedVenues = [];
  
  console.log('\n🔍 處理重複座標...');
  
  for (const [coord, venues] of coordGroups) {
    if (venues.length === 1) {
      // 無重複，直接保留
      selectedVenues.push(venues[0].venueId);
    } else {
      // 有重複，按事件數量排序，選擇第一個
      venues.sort((a, b) => b.eventCount - a.eventCount);
      const winner = venues[0];
      const losers = venues.slice(1);
      
      selectedVenues.push(winner.venueId);
      
      console.log(`\n📍 座標 ${coord} 有 ${venues.length} 個場地：`);
      console.log(`   ✅ 保留: ${winner.name} (${winner.venueId}) - ${winner.eventCount} 個事件`);
      
      for (const loser of losers) {
        removedVenues.push(loser);
        console.log(`   ❌ 移除: ${loser.name} (${loser.venueId}) - ${loser.eventCount} 個事件`);
      }
    }
  }
  
  if (removedVenues.length > 0) {
    console.log(`\n⚠️  共移除 ${removedVenues.length} 個重複座標的場地`);
  } else {
    console.log('\n✅ 沒有發現重複座標的場地');
  }
  
  return selectedVenues;
};

/**
 * 選擇前 N 個最繁忙的場地（至少有指定數量的活動）
 * @param {Map} venueEventCount - 場地與事件數量的映射
 * @param {Map} venueMap - 場地信息映射表
 * @param {number} minEvents - 最少事件數
 * @param {number} topCount - 要選擇的場地數量
 * @returns {Array} 選中的 venueId 陣列
 */
const selectTopVenues = (venueEventCount, venueMap, minEvents = 3, topCount = 10) => {
  // 先選出事件數量最多的場地（暫時不考慮座標重複）
  const candidateVenues = Array.from(venueEventCount.entries())
    .filter(([id, count]) => {
      const venueInfo = venueMap.get(id);
      // 過濾條件：
      // 1. 至少有 minEvents 個活動
      // 2. 有座標信息
      return count >= minEvents && 
             venueInfo && 
             venueInfo.latitude && 
             venueInfo.longitude;
    })
    .sort((a, b) => b[1] - a[1]) // 按事件數量降序排序
    .slice(0, topCount * 3) // 先取較多候選（因為後面會去重），取 3 倍以確保足夠
    .map(([id]) => id);
  
  console.log(`\n🎯 初選了 ${candidateVenues.length} 個候選場地（至少有 ${minEvents} 個活動）`);
  
  // 處理重複座標，只保留事件數最多的
  const finalVenues = removeDuplicateCoordinates(candidateVenues, venueMap, venueEventCount);
  
  // 確保不超過 topCount
  const selectedVenues = finalVenues.slice(0, topCount);
  
  console.log(`\n📍 最終選擇了 ${selectedVenues.length} 個場地：`);
  selectedVenues.forEach((venueId, index) => {
    const venueInfo = venueMap.get(venueId);
    const eventCount = venueEventCount.get(venueId);
    console.log(`   ${index + 1}. ${venueInfo.name} (${venueId}) - ${eventCount} 個事件`);
  });
  
  return selectedVenues;
};

// ==========================================
// 2. 主導入函數
// ==========================================

const importData = async () => {
  try {
    // A. 連接數據庫
    await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_db'
    );
    console.log('✅ 已連接到 MongoDB');

    // B. 獲取並解析所有 XML 數據
    console.log('\n📥 正在獲取數據...\n');
    const [eventsData, venuesData] = await Promise.all([
      fetchAndParseXML(LCSD_API_URLS.EVENTS),
      fetchAndParseXML(LCSD_API_URLS.VENUES)
    ]);

    const events = eventsData.events.event;
    console.log(`\n📊 共獲取 ${events.length} 個事件`);

    // C. 建立場地信息映射表
    console.log('\n🏛️  正在加載場地信息...');
    const venueMap = buildVenueMap(venuesData);

    // D. 統計場地並選擇前 10 個（會自動處理重複座標）
    console.log('\n📊 正在統計場地事件數量...');
    const venueEventCount = countEventsByVenue(events);
    const selectedVenueIds = selectTopVenues(venueEventCount, venueMap, 3, 10);

    // E. 清空舊數據
    console.log('\n🧹 正在清空舊數據...');
    await Location.deleteMany({});
    await Event.deleteMany({});
    console.log('   ✅ 已刪除舊數據');

    // F. 建立 Location 文檔
    console.log('\n🏛️  正在建立場地文檔...');
    const locationDocMap = new Map();

    for (const venueId of selectedVenueIds) {
      const venueInfo = venueMap.get(venueId);

      try {
        const newLoc = await Location.create({
          id: venueId,
          name: venueInfo.name,
          latitude: venueInfo.latitude,
          longitude: venueInfo.longitude,
          events: []
        });
        locationDocMap.set(venueId, newLoc);
        console.log(`   ✅ ${venueInfo.name}`);
      } catch (error) {
        console.error(`   ❌ 建立失敗 ${venueInfo.name}:`, error.message);
      }
    }

    console.log(`\n📍 已建立 ${locationDocMap.size} 個場地`);

    // G. 遍歷並篩選事件
    console.log('\n🎬 正在導入事件...');
    let importedCount = 0;
    let skippedCount = 0;

    for (const evt of events) {
      const venueId = evt.venueid?.[0];

      // 只處理選中場地的事件
      if (!locationDocMap.has(venueId)) {
        skippedCount++;
        continue;
      }

      const locationDoc = locationDocMap.get(venueId);

      const title = evt.titlee?.[0] || 'No Title';
      const dateTime = evt.predateE?.[0] || 'TBA';
      
      let description = evt.desce?.[0];
      if (!description || typeof description !== 'string') {
        description = 'No description available.';
      }
      description = description.trim();

      const presenter = evt.presenterorge?.[0] || 'Unknown Presenter';
      const price = evt.pricee?.[0] || 'Free';

      try {
        const newEvent = await Event.create({
          title: title,
          venue: locationDoc._id,
          dateTime: dateTime,
          description: description.substring(0, 500) + (description.length > 500 ? '...' : ''),
          presenter: presenter,
          price: price
        });

        locationDoc.events.push(newEvent._id);
        await locationDoc.save();

        importedCount++;
      } catch (error) {
        console.error(`   ❌ 事件導入失敗 (${title}):`, error.message);
      }
    }

    // H. 輸出摘要
    console.log('\n' + '='.repeat(60));
    console.log('✅ 導入完成');
    console.log('='.repeat(60));
    console.log(`📍 已建立場地: ${locationDocMap.size} 個`);
    console.log(`🎬 已導入事件: ${importedCount} 個`);
    console.log(`⏭️  已跳過事件: ${skippedCount} 個（不在選中場地中）`);
    console.log(`🕒 更新時間: ${new Date().toLocaleString('zh-HK')}`);
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 導入過程中發生錯誤:');
    console.error(error);
    process.exit(1);
  }
};

// 執行導入
importData();
