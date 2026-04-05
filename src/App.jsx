import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { 
  Camera, Calendar, MapPin, Plus, Trash2, History, ChevronRight, X, 
  Image as ImageIcon, Map as MapIcon, BarChart3, List, ChevronLeft, 
  Search, Loader2, Navigation, Sparkles, Wand2, Cloud, CloudOff, AlertCircle, RefreshCw, Bug
} from 'lucide-react';

// --- 全域變數讀取與安全解析 ---
const getGlobalConfig = () => {
  let config = null;
  let source = "none";
  try {
    // 1. 嘗試抓取 Canvas 環境注入的變數
    if (typeof __firebase_config !== 'undefined') {
      config = __firebase_config;
      source = "window.__firebase_config";
    } 
    // 2. 嘗試抓取 Vercel 注入的環境變數 (Vite 模式)
    else if (import.meta.env && import.meta.env.VITE_FIREBASE_CONFIG) {
      config = import.meta.env.VITE_FIREBASE_CONFIG;
      source = "import.meta.env.VITE_FIREBASE_CONFIG";
    }
    // 3. 嘗試抓取標準環境變數 (Vercel Node/Standard 模式)
    else if (typeof process !== 'undefined' && process.env && process.env.__firebase_config) {
      config = process.env.__firebase_config;
      source = "process.env.__firebase_config";
    }
  } catch (e) {
    console.warn("讀取配置時發生預期外的錯誤:", e);
  }
  
  // 解析 JSON
  if (config && typeof config === 'string') {
    try {
      config = JSON.parse(config);
    } catch (e) {
      return { error: "JSON 解析失敗，請檢查 Vercel 設定中的 Value 是否包含完整的大括號且格式正確。", source };
    }
  }
  
  return { config, source };
};

const { config: firebaseConfig, source: configSource } = getGlobalConfig();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'baby-growth-map';

// --- 台灣行政區劃資料 ---
const TAIWAN_DATA = {
  "台北市": { center: [25.0330, 121.5654], districts: ["中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"] },
  "新北市": { center: [25.0125, 121.4657], districts: ["板橋區", "三重區", "中和區", "永和區", "新莊區", "新店區", "樹林區", "鶯歌區", "三峽區", "淡水區", "汐止區", "瑞芳區", "土城區", "蘆洲區", "五股區", "泰山區", "林口區", "深坑區", "石碇區", "坪林區", "三芝區", "石門區", "八里區", "平溪區", "雙溪區", "貢寮區", "金山區", "萬里區", "烏來區"] },
  "桃園市": { center: [24.9936, 121.3010], districts: ["桃園區", "中壢區", "大溪區", "楊梅區", "蘆竹區", "大園區", "龜山區", "八德區", "龍潭區", "平鎮區", "新屋區", "觀音區", "復興區"] },
  "台中市": { center: [24.1477, 120.6736], districts: ["中區", "東區", "南區", "西區", "北區", "北屯區", "西屯區", "南屯區", "太平區", "大里區", "霧峰區", "烏日區", "豐原區", "後里區", "石岡區", "東勢區", "和平區", "新社區", "潭子區", "大雅區", "神岡區", "大肚區", "沙鹿區", "龍井區", "梧棲區", "清水區", "大甲區", "外埔區", "大安區"] },
  "台南市": { center: [22.9997, 120.2270], districts: ["中西區", "東區", "南區", "北區", "安平區", "安南區", "永康區", "歸仁區", "新化區", "左鎮區", "玉井區", "楠西區", "南化區", "仁德區", "關廟區", "龍崎區", "官田區", "麻豆區", "佳里區", "西港區", "七股區", "將軍區", "學甲區", "北門區", "新營區", "後壁區", "白河區", "東山區", "六甲區", "下營區", "柳營區", "鹽水區", "善化區", "大內區", "山上區", "新市區", "安定區"] },
  "高雄市": { center: [22.6273, 120.3014], districts: ["楠梓區", "左營區", "鼓山區", "三民區", "鹽埕區", "前金區", "新興區", "苓雅區", "前鎮區", "旗津區", "小港區", "鳳山區", "林園區", "大寮區", "大樹區", "大社區", "仁武區", "鳥松區", "岡山區", "橋頭區", "燕巢區", "田寮區", "阿蓮區", "路竹區", "湖內區", "茄萣區", "永安區", "彌陀區", "梓官區", "旗山區", "美濃區", "六龜區", "甲仙區", "杉林區", "內門區", "茂林區", "桃源區", "那瑪夏區"] },
  "基隆市": { center: [25.1283, 121.7419], districts: ["仁愛區", "信義區", "中正區", "中山區", "安樂區", "暖暖區", "七堵區"] },
  "新竹縣": { center: [24.8387, 121.0177], districts: ["竹北市", "竹東鎮", "新埔鎮", "關西鎮", "湖口鄉", "新豐鄉", "芎林鄉", "橫山鄉", "北埔鄉", "寶山鄉", "峨眉鄉", "尖石鄉", "五峰鄉"] },
  "新竹市": { center: [24.8138, 120.9675], districts: ["東區", "北區", "香山區"] },
  "苗栗縣": { center: [24.5602, 120.8217], districts: ["苗栗市", "頭份市", "竹南鎮", "後龍鎮", "通霄鎮", "苑裡鎮", "卓蘭鎮", "造橋鄉", "西湖鄉", "頭屋鄉", "公館鄉", "銅鑼鄉", "三義鄉", "大湖鄉", "獅潭鄉", "三灣鄉", "南庄鄉", "泰安鄉"] },
  "彰化縣": { center: [24.0518, 120.5161], districts: ["彰化市", "員林市", "和美鎮", "鹿港鎮", "溪湖鎮", "田中鎮", "北斗鎮", "二林鎮", "線西鄉", "伸港鄉", "福興鄉", "秀水鄉", "花壇鄉", "芬園鄉", "大村鄉", "埔鹽鄉", "埔心鄉", "永靖鄉", "社頭鄉", "二水鄉", "田尾鄉", "埤頭鄉", "芳苑鄉", "大城鄉", "竹塘鄉", "溪州鄉"] },
  "南投縣": { center: [23.9101, 120.6961], districts: ["南投市", "埔里鎮", "草屯鎮", "竹山鎮", "集集鎮", "名間鄉", "鹿谷鄉", "中寮鄉", "魚池鄉", "國姓鄉", "水里鄉", "信義鄉", "仁愛鄉"] },
  "雲林縣": { center: [23.7092, 120.4313], districts: ["斗六市", "斗南鎮", "虎尾鎮", "西螺鎮", "土庫鎮", "北港鎮", "古坑鄉", "大埤鄉", "莿桐鄉", "林內鄉", "二崙鄉", "崙背鄉", "麥寮鄉", "東勢鄉", "褒忠鄉", "台西鄉", "元長鄉", "四湖鄉", "口湖鄉", "水林鄉"] },
  "嘉義縣": { center: [23.4519, 120.2555], districts: ["太保市", "朴子市", "布袋鎮", "大林鎮", "民雄鄉", "溪口鄉", "新港鄉", "六腳鄉", "東石鄉", "義竹鄉", "鹿草鄉", "水上鄉", "中埔鄉", "竹崎鄉", "梅山鄉", "番路鄉", "大埔鄉", "阿里山鄉"] },
  "嘉義市": { center: [23.4815, 120.4537], districts: ["東區", "西區"] },
  "屏東縣": { center: [22.6761, 120.4885], districts: ["屏東市", "潮州鎮", "東港鎮", "恆春鎮", "萬丹鄉", "長治鄉", "麟洛鄉", "九如鄉", "里港鄉", "高樹鄉", "鹽埔鄉", "內埔鄉", "竹田鄉", "萬巒鄉", "新埤鄉", "枋寮鄉", "新園鄉", "崁頂鄉", "林邊鄉", "南州鄉", "佳冬鄉", "琉球鄉", "車城鄉", "滿州鄉", "枋山鄉", "三地門鄉", "霧臺鄉", "瑪家鄉", "泰武鄉", "來義鄉", "春日鄉", "獅子鄉", "牡丹鄉"] },
  "宜蘭縣": { center: [24.7021, 121.7377], districts: ["宜蘭市", "羅東鎮", "蘇澳鎮", "頭城鎮", "礁溪鄉", "壯圍鄉", "員山鄉", "冬山鄉", "五結鄉", "三星鄉", "大同鄉", "南澳鄉"] },
  "花蓮縣": { center: [23.9872, 121.6016], districts: ["花蓮市", "鳳林鎮", "玉里鎮", "新城鄉", "吉安鄉", "壽豐鄉", "光復鄉", "豐濱鄉", "禮穗鄉", "富里鄉", "秀林鄉", "萬榮鄉", "卓溪鄉"] },
  "台東縣": { center: [22.7583, 121.1444], districts: ["台東市", "成功鎮", "關山鎮", "卑南鄉", "大武鄉", "太麻里鄉", "東河鄉", "長濱鄉", "鹿野鄉", "池上鄉", "綠島鄉", "延平鄉", "海端鄉", "達仁鄉", "金峰鄉", "蘭嶼鄉"] },
  "澎湖縣": { center: [23.5711, 119.5793], districts: ["馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉"] }
};

const App = () => {
  // --- 錯誤攔截狀態 ---
  const [errorMsg, setErrorMsg] = useState(null);
  const [debugMode, setDebugMode] = useState(false);

  // --- 核心實體 (Firebase) ---
  const [firebaseInstance, setFirebaseInstance] = useState({ auth: null, db: null });
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);

  // --- UI 狀態 ---
  const [activeTab, setActiveTab] = useState('map'); 
  const [isAdding, setIsAdding] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationName: '', county: '雲林縣', district: '古坑鄉',
    note: '', photo: null, coords: TAIWAN_DATA["雲林縣"].center
  });

  // --- Refs ---
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const heatGroup = useRef(null);

  // --- 初始化診斷 ---
  useEffect(() => {
    // 捕捉全域未處理錯誤
    const handleError = (e) => setErrorMsg("運行時錯誤: " + e.message);
    window.addEventListener('error', handleError);
    
    // 初始化 Firebase
    if (firebaseConfig && typeof firebaseConfig === 'object') {
      try {
        const appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        const authInstance = getAuth(appInstance);
        const dbInstance = getFirestore(appInstance);
        setFirebaseInstance({ auth: authInstance, db: dbInstance });
        
        // 監聽登入
        const unsubscribeAuth = onAuthStateChanged(authInstance, (u) => {
          if (u) setUser(u);
          else signInAnonymously(authInstance).catch(e => setErrorMsg("匿名登入失敗: " + e.message));
        });
        
        return () => {
          window.removeEventListener('error', handleError);
          unsubscribeAuth();
        };
      } catch (err) {
        setErrorMsg("Firebase 初始化失敗，請檢查配置格式是否正確。");
      }
    } else if (firebaseConfig && firebaseConfig.error) {
      setErrorMsg(firebaseConfig.error);
    } else {
      setErrorMsg("找不到 Firebase 配置。請至 Vercel 設定環境變數 __firebase_config");
    }
  }, []);

  // --- 資料同步 ---
  useEffect(() => {
    if (!user || !firebaseInstance.db) return;
    try {
      const recordsCol = collection(firebaseInstance.db, 'artifacts', appId, 'users', user.uid, 'records');
      const unsubscribe = onSnapshot(recordsCol, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          data.sort((a, b) => new Date(b.date) - new Date(a.date));
          setRecords(data);
        },
        (err) => console.error("Firestore error:", err)
      );
      return () => unsubscribe();
    } catch (err) { console.error("Snapshot error:", err); }
  }, [user, firebaseInstance.db]);

  // --- 地圖處理 ---
  useEffect(() => {
    if (typeof window === 'undefined' || errorMsg) return;
    
    const initMap = () => {
      const L = window.L;
      if (!L) return;
      if (!mapInstance.current) {
        mapInstance.current = L.map('map-view', { zoomControl: false, tap: true, touchZoom: true, dragging: true }).setView([23.6, 121.0], 7);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '©OSM' }).addTo(mapInstance.current);
        markersGroup.current = L.layerGroup().addTo(mapInstance.current);
        heatGroup.current = L.layerGroup().addTo(mapInstance.current);

        mapInstance.current.on('click', (e) => {
          const { lat, lng } = e.latlng;
          setFormData(prev => {
            let closestCounty = prev.county;
            let minDistance = Infinity;
            Object.entries(TAIWAN_DATA).forEach(([name, data]) => {
              const d = Math.pow(lat - data.center[0], 2) + Math.pow(lng - data.center[1], 2);
              if (d < minDistance) { minDistance = d; closestCounty = name; }
            });
            return { 
              ...prev, coords: [lat, lng], county: closestCounty,
              district: prev.county === closestCounty ? prev.district : TAIWAN_DATA[closestCounty].districts[0]
            };
          });
          setIsAdding(true);
        });
      }
    };

    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [errorMsg]);

  // 更新標記
  useEffect(() => {
    if (window.L && mapInstance.current && activeTab === 'map') {
      const L = window.L;
      markersGroup.current.clearLayers();
      heatGroup.current.clearLayers();
      const counts = {};
      records.forEach(r => { counts[r.county] = (counts[r.county] || 0) + 1; });
      Object.keys(counts).forEach(county => {
        const center = TAIWAN_DATA[county]?.center;
        if (center) {
          const calculatedOpacity = Math.min((counts[county] / 25) * 0.5, 0.5);
          L.circle(center, { radius: 12000, fillColor: '#3b82f6', fillOpacity: Math.max(0.1, calculatedOpacity), color: 'transparent', interactive: false }).addTo(heatGroup.current);
        }
      });
      records.forEach(record => {
        const markerIcon = L.divIcon({
          className: 'custom-icon',
          html: `<div class="w-10 h-10 rounded-full border-4 border-white shadow-xl overflow-hidden bg-blue-600 transform -translate-y-2">
            ${record.photo ? `<img src="${record.photo}" class="w-full h-full object-cover" />` : `<div class="w-full h-full flex items-center justify-center text-white text-xs">📍</div>`}
          </div>`,
          iconSize: [40, 40], iconAnchor: [20, 40]
        });
        L.marker(record.coords, { icon: markerIcon }).addTo(markersGroup.current).on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedRecord(record);
          mapInstance.current.flyTo(record.coords, 14);
        });
      });
    }
  }, [records, activeTab]);

  // --- 輔助函式 ---
  const safeText = (text) => (typeof text === 'object' ? JSON.stringify(text) : String(text || ''));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photo: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || !firebaseInstance.db) return;
    try {
      const recordsCol = collection(firebaseInstance.db, 'artifacts', appId, 'users', user.uid, 'records');
      await addDoc(recordsCol, formData);
      setIsAdding(false);
      setFormData({ date: new Date().toISOString().split('T')[0], locationName: '', county: '雲林縣', district: '古坑鄉', note: '', photo: null, coords: TAIWAN_DATA["雲林縣"].center });
    } catch (error) { setSearchError("儲存失敗: " + error.message); }
  };

  // --- 渲染畫面 ---
  if (errorMsg) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
        <AlertCircle size={64} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">啟動失敗</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">{errorMsg}</p>
        <div className="flex gap-4">
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold flex items-center gap-2">
            <RefreshCw size={18} /> 重新整理
          </button>
          <button onClick={() => setDebugMode(!debugMode)} className="px-6 py-2 bg-slate-200 text-slate-600 rounded-full font-bold flex items-center gap-2">
            <Bug size={18} /> 診斷資訊
          </button>
        </div>
        {debugMode && (
          <div className="mt-8 p-4 bg-white border rounded-xl text-left w-full max-w-sm font-mono text-[10px] overflow-auto max-h-40">
            <p>Source: {configSource}</p>
            <p>AppID: {appId}</p>
            <p>Config Detect: {firebaseConfig ? "Detected" : "Missing"}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 select-none overflow-hidden font-sans">
      <header className="bg-white px-4 py-3 flex justify-between items-center shadow-sm z-10 shrink-0">
        <h1 className="text-lg font-black text-blue-600 flex items-center gap-2">
          <MapIcon size={20} /> 成長地圖
        </h1>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full uppercase">
              <Cloud size={12} /> 連線成功
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase">
              <CloudOff size={12} /> 同步中
            </div>
          )}
          <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{records.length} 則</div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <div id="map-view" className="w-full h-full" style={{ visibility: activeTab === 'map' ? 'visible' : 'hidden', position: 'absolute', inset: 0, zIndex: activeTab === 'map' ? 1 : -1 }}></div>
        
        {activeTab === 'timeline' && (
          <div className="absolute inset-0 bg-slate-50 z-20 overflow-y-auto pb-24 animate-in slide-in-from-right duration-200">
            <div className="p-4 space-y-4">
              <h2 className="text-xl font-black mb-4">回憶時光軸</h2>
              {records.map(r => (
                <div key={r.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex p-3 gap-3 active:bg-slate-50 transition-colors" onClick={() => setSelectedRecord(r)}>
                  <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                    {r.photo ? <img src={r.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24} /></div>}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-slate-800 truncate">{safeText(r.locationName)}</h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Calendar size={12} /> {safeText(r.date)}</p>
                    <div className="mt-1 text-[10px] text-blue-500 font-bold uppercase">{safeText(r.county)} · {safeText(r.district)}</div>
                  </div>
                  <ChevronRight size={16} className="self-center text-slate-300" />
                </div>
              ))}
              {records.length === 0 && <div className="text-center py-20 text-slate-400">目前尚無紀錄</div>}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="absolute inset-0 bg-slate-50 z-20 overflow-y-auto pb-24 animate-in slide-in-from-right duration-200">
            <div className="p-4">
              <h2 className="text-xl font-black mb-6">縣市冒險排行</h2>
              {Object.entries(records.reduce((acc, r) => ({ ...acc, [r.county]: (acc[r.county] || 0) + 1 }), {}))
                .sort((a, b) => b[1] - a[1])
                .map(([county, count]) => (
                  <div key={county} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${count > 5 ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                        {count}
                      </div>
                      <span className="font-bold text-slate-700">{safeText(county)}</span>
                    </div>
                    <div className="h-2 flex-1 mx-4 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${Math.min(count * 10, 100)}%` }}></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {selectedRecord && activeTab === 'map' && (
          <div className="fixed inset-0 bg-black/20 z-[100] flex items-end">
            <div className="w-full bg-white rounded-t-[2.5rem] p-6 animate-in slide-in-from-bottom duration-300 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" onClick={() => setSelectedRecord(null)}></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{safeText(selectedRecord.locationName)}</h3>
                  <p className="text-sm text-slate-400 font-bold mt-1 tracking-tighter">{safeText(selectedRecord.date)} · {safeText(selectedRecord.county)}{safeText(selectedRecord.district)}</p>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
              </div>
              {selectedRecord.photo && <div className="mb-4"><img src={selectedRecord.photo} className="w-full h-56 object-cover rounded-3xl shadow-sm" /></div>}
              <div className="bg-blue-50/50 p-4 rounded-2xl text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {safeText(selectedRecord.note || "留下了一段美好的足跡。")}
              </div>
              <button 
                onClick={() => { if(window.confirm("確定要刪除這段記憶嗎？")) {
                  const recordRef = doc(firebaseInstance.db, 'artifacts', appId, 'users', user.uid, 'records', selectedRecord.id);
                  deleteDoc(recordRef);
                  setSelectedRecord(null);
                }}} 
                className="w-full py-3 text-red-500 font-bold flex items-center justify-center gap-2 text-sm bg-red-50 rounded-2xl active:scale-95 transition-transform"
              >
                <Trash2 size={16} /> 刪除這段記憶
              </button>
            </div>
          </div>
        )}
      </main>

      {isAdding && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center p-4 border-b">
            <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400"><ChevronLeft /></button>
            <h2 className="font-black text-slate-800">新增足跡</h2>
            <div className="w-10 text-blue-600 flex justify-center">{isAILoading && <Loader2 size={24} className="animate-spin" />}</div>
          </div>
          
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">日期</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">縣市</label>
                <select value={formData.county} onChange={e => handleCountyChange(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none appearance-none">
                  {Object.keys(TAIWAN_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">鄉鎮市區</label>
              <select value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none appearance-none">
                {TAIWAN_DATA[formData.county]?.districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">地點名稱</label>
              <div className="flex gap-2">
                <input type="text" required placeholder="如：劍湖山世界" value={formData.locationName} onChange={e => setFormData({...formData, locationName: e.target.value})} className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {searchError && <p className="text-[10px] text-orange-600 mt-2 ml-1 font-bold">{searchError}</p>}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">回憶照片</label>
              <div className="relative h-48 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden">
                {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <><Camera className="text-blue-500 mb-1" size={24} /><span className="text-xs font-bold text-slate-400">點擊上傳</span></>}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={handlePhoto} />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">成長筆記</label>
              <textarea rows="4" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none resize-none" placeholder="隨手記錄..." />
            </div>
            
            <button type="submit" disabled={!user} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-transform flex items-center justify-center gap-2">
              <Cloud size={20} /> 儲存到雲端
            </button>
          </form>
        </div>
      )}

      <footer className="bg-white border-t px-6 py-2 pb-8 flex justify-between items-center z-50 shrink-0">
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-blue-600' : 'text-slate-300'}`}><MapIcon size={24} /><span className="text-[10px] font-bold">地圖</span></button>
        <button onClick={() => setActiveTab('timeline')} className={`flex flex-col items-center gap-1 ${activeTab === 'timeline' ? 'text-blue-600' : 'text-slate-300'}`}><List size={24} /><span className="text-[10px] font-bold">時光軸</span></button>
        <div className="relative -top-6"><button onClick={() => setIsAdding(true)} className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center active:scale-90 transition-transform"><Plus size={32} /></button></div>
        <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 ${activeTab === 'stats' ? 'text-blue-600' : 'text-slate-300'}`}><BarChart3 size={24} /><span className="text-[10px] font-bold">統計</span></button>
        <div className="w-6"></div>
      </footer>
      <style>{`.custom-icon { background: none; border: none; } .leaflet-container { font-family: inherit; } input, select, textarea { font-size: 16px !important; }`}</style>
    </div>
  );
};

export default App;
