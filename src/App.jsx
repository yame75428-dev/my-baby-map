import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { 
  Camera, Calendar, MapPin, Plus, Trash2, History, ChevronRight, X, 
  Image as ImageIcon, Map as MapIcon, BarChart3, List, ChevronLeft, 
  Search, Loader2, Navigation, Sparkles, Wand2, Cloud, CloudOff, AlertCircle, RefreshCw, Bug
} from 'lucide-react';

// --- 配置與初始化診斷 ---
const getTargetConfig = () => {
  try {
    // 1. 優先嘗試 Canvas 預覽環境變數
    if (typeof __firebase_config !== 'undefined') return __firebase_config;
    
    // 2. 嘗試 Vite/Vercel 環境變數 (必須以 VITE_ 開頭)
    if (import.meta.env && import.meta.env.VITE_FIREBASE_CONFIG) {
      return import.meta.env.VITE_FIREBASE_CONFIG;
    }
  } catch (e) {
    console.error("讀取配置異常", e);
  }
  return null;
};

const rawConfig = getTargetConfig();
let firebaseConfig = null;
let configError = null;

if (rawConfig) {
  try {
    firebaseConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
  } catch (e) {
    configError = "配置格式錯誤：請確保 Vercel 的 Value 內容只有大括號 {...}，不包含 const 或分號。";
  }
} else {
  configError = "找不到配置：請確認 Vercel 設定中 Key 是否為 VITE_FIREBASE_CONFIG";
}

// 初始化 Firebase 實體
let auth, db, appId = 'baby-growth-map';
if (firebaseConfig) {
  try {
    const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    if (typeof __app_id !== 'undefined') appId = __app_id;
  } catch (e) {
    configError = "Firebase 連線失敗: " + e.message;
  }
}

// 台灣行政區劃資料
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
  // --- 狀態管理 ---
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('map');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchError, setSearchError] = useState('');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationName: '', county: '雲林縣', district: '古坑鄉',
    note: '', photo: null, coords: TAIWAN_DATA["雲林縣"].center
  });

  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const heatGroup = useRef(null);

  // --- 安全渲染函式 ---
  const safeText = (val) => (typeof val === 'object' ? JSON.stringify(val) : String(val || ''));

  // --- Firebase 邏輯 ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth Error", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const recordsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'records');
    const unsubscribe = onSnapshot(recordsCol, (snap) => {
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(data);
    });
    return () => unsubscribe();
  }, [user]);

  // --- 地圖邏輯 ---
  useEffect(() => {
    if (typeof window === 'undefined' || configError) return;
    
    const initMap = () => {
      const L = window.L;
      if (!L || mapInstance.current) return;
      
      mapInstance.current = L.map('map-view', { zoomControl: false, tap: true }).setView([23.6, 121.0], 7);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '©OSM' }).addTo(mapInstance.current);
      markersGroup.current = L.layerGroup().addTo(mapInstance.current);
      heatGroup.current = L.layerGroup().addTo(mapInstance.current);

      mapInstance.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setFormData(prev => {
          let closest = prev.county;
          let minD = Infinity;
          Object.entries(TAIWAN_DATA).forEach(([name, data]) => {
            const d = Math.pow(lat - data.center[0], 2) + Math.pow(lng - data.center[1], 2);
            if (d < minD) { minD = d; closest = name; }
          });
          return { ...prev, coords: [lat, lng], county: closest, district: TAIWAN_DATA[closest].districts[0] };
        });
        setIsAdding(true);
      });
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
  }, [configError]);

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
          const opacity = Math.min((counts[county] / 25) * 0.5, 0.5);
          L.circle(center, { radius: 12000, fillColor: '#3b82f6', fillOpacity: Math.max(0.1, opacity), color: 'transparent', interactive: false }).addTo(heatGroup.current);
        }
      });

      records.forEach(r => {
        const icon = L.divIcon({
          className: 'custom-icon',
          html: `<div class="w-10 h-10 rounded-full border-4 border-white shadow-xl overflow-hidden bg-blue-600">
            ${r.photo ? `<img src="${r.photo}" class="w-full h-full object-cover" />` : `<div class="w-full h-full flex items-center justify-center text-white text-xs">📍</div>`}
          </div>`,
          iconSize: [40, 40], iconAnchor: [20, 40]
        });
        L.marker(r.coords, { icon }).addTo(markersGroup.current).on('click', () => {
          setSelectedRecord(r);
          mapInstance.current.flyTo(r.coords, 14);
        });
      });
    }
  }, [records, activeTab]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || !db) return;
    try {
      const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'records');
      await addDoc(colRef, formData);
      setIsAdding(false);
      setFormData({ date: new Date().toISOString().split('T')[0], locationName: '', county: '雲林縣', district: '古坑鄉', note: '', photo: null, coords: TAIWAN_DATA["雲林縣"].center });
    } catch (err) { setSearchError("儲存失敗"); }
  };

  // --- 故障排除 UI ---
  if (configError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-800 mb-2">啟動障礙診斷</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed bg-white p-4 rounded-xl border">{configError}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold flex items-center gap-2 active:scale-95 transition-all">
          <RefreshCw size={18} /> 重新嘗試
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 select-none overflow-hidden font-sans">
      <header className="bg-white px-4 py-3 flex justify-between items-center shadow-sm z-10 shrink-0">
        <h1 className="text-lg font-black text-blue-600 flex items-center gap-2"><MapIcon size={20} /> 成長地圖</h1>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase ${user ? 'text-green-500 bg-green-50' : 'text-slate-400 bg-slate-100'}`}>
            <Cloud size={12} /> {user ? '雲端同步中' : '連線中'}
          </div>
          <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{records.length} 則</div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <div id="map-view" className="w-full h-full" style={{ visibility: activeTab === 'map' ? 'visible' : 'hidden', position: 'absolute', inset: 0, zIndex: activeTab === 'map' ? 1 : -1 }}></div>
        
        {activeTab === 'timeline' && (
          <div className="absolute inset-0 bg-slate-50 z-20 overflow-y-auto pb-24 p-4 space-y-4">
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
            {records.length === 0 && <div className="text-center py-20 text-slate-400 font-bold">還沒有任何足跡喔</div>}
          </div>
        )}

        {selectedRecord && activeTab === 'map' && (
          <div className="fixed inset-0 bg-black/20 z-[100] flex items-end">
            <div className="w-full bg-white rounded-t-[2.5rem] p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" onClick={() => setSelectedRecord(null)}></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{safeText(selectedRecord.locationName)}</h3>
                  <p className="text-sm text-slate-400 font-bold mt-1 tracking-tighter">{safeText(selectedRecord.date)} · {safeText(selectedRecord.county)}{safeText(selectedRecord.district)}</p>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
              </div>
              {selectedRecord.photo && <div className="mb-4"><img src={selectedRecord.photo} className="w-full h-56 object-cover rounded-3xl shadow-sm" /></div>}
              <div className="bg-blue-50/50 p-4 rounded-2xl text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-wrap max-h-40 overflow-y-auto font-medium">
                {safeText(selectedRecord.note || "留下了一段美好的回憶。")}
              </div>
              <button 
                onClick={() => { if(window.confirm("確定要刪除嗎？")) { deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'records', selectedRecord.id)); setSelectedRecord(null); } }} 
                className="w-full py-3 text-red-500 font-bold flex items-center justify-center gap-2 text-sm bg-red-50 rounded-2xl active:scale-95 transition-transform"
              >
                <Trash2 size={16} /> 刪除紀錄
              </button>
            </div>
          </div>
        )}
      </main>

      {isAdding && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center p-4 border-b">
            <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400"><ChevronLeft /></button>
            <h2 className="font-black text-slate-800">新增回憶</h2>
            <div className="w-10"></div>
          </div>
          
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">日期</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">縣市</label>
                <select value={formData.county} onChange={e => handleCountyChange(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none appearance-none">
                  {Object.keys(TAIWAN_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
            </div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">鄉鎮市區</label>
              <select value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none appearance-none">
                {TAIWAN_DATA[formData.county]?.districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">景點名稱</label>
              <input type="text" required placeholder="如：劍湖山世界" value={formData.locationName} onChange={e => setFormData({...formData, locationName: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">回憶照片</label>
              <div className="relative h-48 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden">
                {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <><Camera className="text-blue-500 mb-1" size={24} /><span className="text-xs font-bold text-slate-400">點擊上傳</span></>}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) { const reader = new FileReader(); reader.onloadend = () => setFormData(prev => ({ ...prev, photo: reader.result })); reader.readAsDataURL(file); }
                }} /></div></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">成長小語</label>
              <textarea rows="4" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none resize-none" placeholder="記錄一下..." /></div>
            <button type="submit" disabled={!user} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-transform flex items-center justify-center gap-2">
              <Cloud size={20} /> 存入回憶
            </button>
          </form>
        </div>
      )}

      <footer className="bg-white border-t px-6 py-2 pb-8 flex justify-between items-center z-50 shrink-0">
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-blue-600' : 'text-slate-300'}`}><MapIcon size={24} /><span className="text-[10px] font-bold font-black">地圖</span></button>
        <button onClick={() => setActiveTab('timeline')} className={`flex flex-col items-center gap-1 ${activeTab === 'timeline' ? 'text-blue-600' : 'text-slate-300'}`}><List size={24} /><span className="text-[10px] font-bold font-black">時光軸</span></button>
        <div className="relative -top-6"><button onClick={() => setIsAdding(true)} className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center active:scale-90 transition-transform"><Plus size={32} /></button></div>
        <div className="w-12 text-center opacity-0"><BarChart3 /></div>
      </footer>
      <style>{`.custom-icon { background: none; border: none; } .leaflet-container { font-family: inherit; } input, select, textarea { font-size: 16px !important; }`}</style>
    </div>
  );
};

export default App;
