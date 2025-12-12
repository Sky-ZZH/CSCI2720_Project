這份開發計畫將根據您的項目需求（Node.js + MongoDB + SPA），將開發過程拆解為 5 個主要階段。這是一個典型的全端開發流程，建議按順序進行以確保邏輯清晰。

### 階段一：環境搭建與數據準備 (Environment & Data Prep)
這是項目的基石，確保數據源和開發環境符合規定版本。

#### 1. 環境配置
- **版本鎖定**：確保本地開發環境符合 `Node v24.9.0` 和 `MongoDB 8.0.13`。
(Node: https://nodejs.org/dist/v24.9.0/)
(MongoDB: https://www.mongodb.com/try/download/community)
（檢查安裝版本是否正確： node check_env.js）
- **專案結構初始化**：
  建立根目錄 `project-root/`：
  - `/backend` (後端 Node.js)
  - `/frontend` (前端 SPA，如 React/Vue)
  - `package.json` (根目錄配置，或分開配置)
（完成配置一鍵安裝： npm run install-all）

#### 2. 數據獲取與預處理 (Data Pre-processing)
- **數據源**：從 XML 數據集（如香港文化活動）中提取數據。
- **腳本編寫**：
  - 創建一個一次性的 `importData.js` 腳本。
  - **XML 解析**：使用 `xml2js` 或類似庫解析 XML。
  - **篩選邏輯**：編寫函數篩選出 10 個特定的場地（Venues），確保每個場地至少有 3 個事件。
  - **數據清洗**：僅保留英文（English only），提取 `Title`, `Venue`, `Date/Time`, `Description`, `Presenter`。
  - **地理編碼**：為這 10 個場地手動或自動查找經緯度（Latitude/Longitude），這是地圖功能的核心。
  - **測試**
    1. 確保 MongoDB 已啟動
      （  啟動MongoDB： brew services start mongodb-community@8.0
          停止MongoDB： brew services stop mongodb-community@8.0）
    2. 在 backend 目錄下執行  npm install axios xml2js mongoose dotenv 
    3. 執行  node utils/importData.js 
    4. 如果成功，終端機會顯示  🎉 Successfully imported ... events
  （Programme information： https://www.lcsd.gov.hk/datagovhk/event/events.xml
  Venues of programmes： https://www.lcsd.gov.hk/datagovhk/event/venues.xml
  Closed dates of venues： https://www.lcsd.gov.hk/datagovhk/event/holiday.xml
  Dates of programmes：https://www.lcsd.gov.hk/datagovhk/event/eventDates.xml）
  （測試： brew services start mongodb-community@8.0  ->   node utils/importData.js）
   (MongoDB Compass:  mongodb://127.0.0.1:27017 -Location -Event)

#### 3. 數據庫設計 (MongoDB Schema)
在 `/backend/models` 中定義 Mongoose Schemas：
- **User Schema**: `username`, `password` (記得 hash 加密), `role` ('admin' | 'user'), `favorites` (Array of Location IDs).
- **Location Schema**: `name`, `coords` {lat, lng}, `events` (Reference or Embedded).
- **Event Schema**: `title`, `description`, `date`, `venue` (Reference to Location), `presenter`.
- **Comment Schema**: `user` (Reference), `location` (Reference), `content`, `timestamp`
***

### 階段二：後端 API 開發 (Backend Development)
在前端開始之前，先確保後端能提供數據。使用 Express.js 構建 RESTful API。

#### 1. 認證模組 (Authentication)
- **API Endpoints**:
  - `POST /api/login`: 驗證用戶/管理員，返回 Token (JWT) 或設置 Session。
  - `POST /api/logout`: 清除 Session。
- **Middleware**: 創建 `isAdmin` 和 `isAuthenticated` 中間件來保護路由。

#### 2. 核心數據接口
- `GET /api/locations`: 獲取所有位置（支持 query 參數用於篩選）。
- `GET /api/locations/:id`: 獲取單個位置詳情（包含事件和評論）。
- `POST /api/locations/:id/comments`: 新增評論。

#### 3. 用戶操作接口
- `POST /api/user/favorites`: 添加/移除收藏。
- `GET /api/user/favorites`: 獲取收藏列表。

#### 4. 管理員接口 (Admin CRUD)
- `POST/PUT/DELETE /api/admin/events`: 管理事件數據。
- `POST/PUT/DELETE /api/admin/users`: 管理用戶數據。

***

### 階段三：前端 SPA 架構與組件 (Frontend Architecture)
建議使用 React 或 Vue 構建單頁應用 (SPA)，使用 React Router 或 Vue Router 處理路由。

#### 1. 路由設置 (frontend-side Routing)
- `/`: 登入頁/首頁 (Home)。
- `/locations`: 位置列表視圖。
- `/map`: 全局地圖視圖。
- `/location/:id`: 單個位置詳情頁。
- `/favorites`: 用戶收藏頁。
- `/admin`: 管理員儀表板。

#### 2. 核心組件開發 (Components)
- **Navbar**: 根據登入狀態顯示不同選項（顯示用戶名、登出按鈕）。
- **LocationList**:
  - **Table Component**: 顯示位置表格，包含排序功能（按名稱、距離、事件數）。
  - **Filter Component**: 搜索框、地區篩選、距離滑塊（Distance Slider）。
- **MapView**:
  - 集成 `Leaflet` (OpenStreetMap) 或 `Google Maps API`。
  - 標記 (Markers) 顯示所有位置，點擊跳轉。
- **LocationDetail**:
  - 顯示該地點的小地圖。
  - 事件列表。
  - **CommentSection**: 讀取評論列表 + 發表評論表單。

#### 3. 狀態管理 (State Management)
- 使用 Context API 或 Redux/Pinia 管理：
  - `AuthContext`: 存儲當前登入用戶信息 (`currentUser`, `role`)。
  - `DataCache`: 考慮緩存位置數據，避免每次切換視圖都請求後端（這也是 SPA 的優勢）。

***

### 階段四：功能整合與地圖實現 (Integration)

#### 1. 地圖交互
- **距離計算**：實現 Haversine 公式計算用戶（或中心點）與場地的距離，用於列表排序和篩選。
- **動態更新**：當 Filter Component 的狀態改變時，同時更新 LocationList 和 MapView 的顯示內容。

#### 2. 權限控制
- 在前端對管理員按鈕進行條件渲染（例如：只有 `role === 'admin'` 才顯示 "Edit Event" 按鈕）。
- 處理 403/401 錯誤，當 Token 過期時自動登出。

#### 3. 額外功能實現 (Extra Feature)
*選擇一個實現，例如「深色模式」：*
- 使用 CSS 變量 (`:root`) 定義顏色。
- 創建一個 ThemeContext 切換 `data-theme` 屬性。

***

### 階段五：測試與優化 (Polish & Review)

#### 1. UI/UX 優化
- 確保所有視圖切換無刷新。
- 添加 Loading 狀態（在數據加載時顯示轉圈圈）。
- **響應式檢查**：確保表格在手機上可橫向滾動或堆疊顯示。

#### 2. 最終檢查清單
- [ ] 數據是否在登入時從 API 獲取並存入數據庫？(檢查 `Last Updated Time`)
- [ ] 管理員能否刪除用戶？
- [ ] 普通用戶能否看到管理員界面？(應為否)
- [ ] 報告是否已包含所有引用和截圖？

#### 3. 撰寫報告
- 準備 100 字摘要。
- 截圖關鍵頁面（列表、地圖、管理後台）。
- 描述數據預處理邏輯。

這個開發流程將大任務拆解為小的可執行單元，建議您從**數據預處理**和**後端 API**開始，確保數據流動通暢後再構建前端界面。