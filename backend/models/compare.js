import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  }, // XML 中的原始 Venue ID
  name: { 
    type: String, 
    required: true 
  },
  latitude: { // 保持扁平化結構以兼容 importData.js，或者您也可以改用 coords 對象
    type: Number, 
    required: true 
  },
  longitude: { 
    type: Number, 
    required: true 
  },
  events: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event' 
  }]
});

// 添加虛擬屬性 coords 以方便前端使用 {lat, lng} 格式
LocationSchema.virtual('coords').get(function() {
  return { lat: this.latitude, lng: this.longitude };
});

// 確保虛擬屬性在轉 JSON 時可見
LocationSchema.set('toJSON', { virtuals: true });
LocationSchema.set('toObject', { virtuals: true });

const Location = mongoose.model('Location', LocationSchema);
export default Location;
