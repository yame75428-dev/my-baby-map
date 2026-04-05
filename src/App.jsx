import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { 
  Camera, Calendar, MapPin, Plus, Trash2, History, ChevronRight, X, 
  Image as ImageIcon, Map as MapIcon, BarChart3, List, ChevronLeft, 
  Search, Loader2, Navigation, Sparkles, Wand2, Cloud, CloudOff 
} from 'lucide-react';

// --- Firebase 配置 (由環境提供) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'baby-growth-map';

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
  "花蓮縣": { center: [23.9872, 121.6016], districts: ["花蓮市", "鳳林鎮", "玉里鎮", "新城鄉", "吉安鄉", "壽豐鄉", "光復鄉", "豐濱鄉", "瑞穗鄉", "富里鄉", "秀林鄉", "萬榮鄉", "卓溪鄉"] },
  "台東縣": { center: [22.7583, 121.1444], districts: ["台東市", "成功鎮", "關山鎮", "卑南鄉", "大武鄉", "太麻里鄉", "東河鄉", "長濱鄉", "鹿野鄉", "池上鄉", "綠島鄉", "延平鄉", "海端鄉", "達仁鄉", "金峰鄉", "蘭嶼鄉"] },
  "澎湖縣": { center: [23.5711, 119.5793], districts: ["馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉"] }
};

const App = () => {
  // --- 狀態管理 ---
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('map'); 
  const [records, setRecords] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationName: '',
    county: '雲林縣',
    district: '古坑鄉',
    note: '',
    photo: null,
    coords: TAIWAN_DATA["雲林縣"].center
  });

  // --- Refs ---
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const heatGroup = useRef(null);
  const tempMarker = useRef(null);

  // --- 邏輯函數 ---

  // 輔助函式：確保顯示文字皆為字串，防止 React 渲染物件錯誤
  const safeText = (text) => (typeof text === 'object' ? JSON.stringify(text) : String(text || ''));

  // Gemini API 調用
  const callGeminiAPI = async (prompt, systemPrompt = "") => {
    const apiKey = "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    let retries = 0;
    const maxRetries = 5;
    while (retries <= maxRetries) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined
          })
        });
        if (!response.ok) throw new Error('API request failed');
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (error) {
        if (retries === maxRetries) throw error;
        await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000));
        retries++;
      }
    }
  };

  // 照片處理
  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 選擇紀錄並飛往地圖位置
  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
    setActiveTab('map');
    if (mapInstance.current) {
      setTimeout(() => {
        mapInstance.current.invalidateSize();
        mapInstance.current.flyTo(record.coords, 14);
      }, 300);
    }
  };

  // 縣市變更
  const handleCountyChange = (newCounty) => {
    const countyData = TAIWAN_DATA[newCounty];
    setFormData(prev => ({
      ...prev,
      county: newCounty,
      district: countyData.districts[0],
      coords: countyData.center
    }));
    if (mapInstance.current) mapInstance.current.flyTo(countyData.center, 12);
  };

  // AI 功能 1：景點小攻略
  const handleSpotAssistant = async () => {
    if (!formData.locationName) return setSearchError('請先輸入景點名稱');
    setIsAILoading(true);
    try {
      const prompt = `請為景點「${formData.county}${formData.district}${formData.locationName}」提供一段約 80 字的溫馨介紹，重點在為什麼適合親子同遊，並給出一個實用的建議。`;
      const result = await callGeminiAPI(prompt, "你是一位親切的台灣親子旅遊導覽員。");
      if (result) {
        setFormData(prev => ({ 
          ...prev, 
          note: prev.note ? `${prev.note}\n\n✨ AI 小攻略：\n${String(result)}` : `✨ AI 小攻略：\n${String(result)}` 
        }));
      }
    } catch (e) { setSearchError('AI 助手忙碌中'); } finally { setIsAILoading(false); }
  };

  // AI 功能 2：美化日記
  const handleDiaryAssistant = async () => {
    if (!formData.note) return setSearchError('請先在記事欄寫一點點今天的內容');
    setIsAILoading(true);
    try {
      const prompt = `使用者在「${formData.locationName}」留下了筆記：『${formData.note}』。請擴充成一段感人、溫暖的成長日記（約 150 字），記錄親子時光。`;
      const result = await callGeminiAPI(prompt, "你是一位感性且愛孩子的家長作家。");
      if (result) setFormData(prev => ({ ...prev, note: String(result) }));
    } catch (e) { setSearchError('AI 助手忙碌中'); } finally { setIsAILoading(false); }
  };

  // 地點搜尋
  const searchLocation = async () => {
    if (!formData.locationName) return setSearchError('請輸入景點名稱');
    setIsSearching(true);
    try {
      const queryStr = `台灣 ${formData.county} ${formData.district} ${formData.locationName}`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`);
      const data = await response.json();
      if (data?.[0]) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setFormData(prev => ({ ...prev, coords }));
        if (mapInstance.current) mapInstance.current.flyTo(coords, 16);
      } else setSearchError('找不到地點，請在地圖上手動點選');
    } catch (e) { setSearchError('搜尋連線失敗'); } finally { setIsSearching(false); }
  };

  // --- Firebase 副作用 ---

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const recordsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'records');
    const unsubscribe = onSnapshot(recordsCol, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(data);
    }, (err) => console.error("Firestore error:", err));
    return () => unsubscribe();
  }, [user]);

  // --- 地圖渲染 ---

  useEffect(() => {
    if (typeof window !== 'undefined' && !mapInstance.current) {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css'; link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        const L = window.L;
        if (!mapInstance.current) {
          mapInstance.current = L.map('map-view', { zoomControl: false, tap: true, touchZoom: true, dragging: true }).setView([23.6, 121.0], 7);
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '©OpenStreetMap' }).addTo(mapInstance.current);
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
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'map' && mapInstance.current) {
      const timer = setTimeout(() => { mapInstance.current.invalidateSize(); }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  useEffect(() => {
    if (window.L && mapInstance.current && activeTab === 'map') {
      const L = window.L;
      markersGroup.current.clearLayers();
      heatGroup.current.clearLayers();
      const counts = {};
      records.forEach(r => { counts[r.county] = (counts[r.county] || 0) + 1; });
      Object.keys(counts).forEach(county => {
        const center = TAIWAN_DATA[county].center;
        if (center) {
          const count = counts[county];
          const calculatedOpacity = Math.min((count / 25) * 0.5, 0.5);
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const recordsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'records');
      await addDoc(recordsCol, formData);
      setIsAdding(false);
      setFormData({ date: new Date().toISOString().split('T')[0], locationName: '', county: '雲林縣', district: '古坑鄉', note: '', photo: null, coords: TAIWAN_DATA["雲林縣"].center });
    } catch (error) { setSearchError("儲存失敗"); }
  };

  const deleteRecord = async (id) => {
    if (!user) return;
    try {
      const recordRef = doc(db, 'artifacts', appId, 'users', user.uid, 'records', id);
      await deleteDoc(recordRef);
      setSelectedRecord(null);
    } catch (error) { setSearchError("刪除失敗"); }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 select-none overflow-hidden">
      <header className="bg-white px-4 py-3 flex justify-between items-center shadow-sm z-10 shrink-0">
        <h1 className="text-lg font-black text-blue-600 flex items-center gap-2">
          <MapIcon size={20} /> 成長地圖
        </h1>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full uppercase">
              <Cloud size={12} /> 已連動雲端
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase">
              <CloudOff size={12} /> 連線中...
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
                <div key={r.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex p-3 gap-3 active:bg-slate-50 transition-colors" onClick={() => handleSelectRecord(r)}>
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
              <button onClick={() => deleteRecord(selectedRecord.id)} className="w-full py-3 text-red-500 font-bold flex items-center justify-center gap-2 text-sm bg-red-50 rounded-2xl active:scale-95 transition-transform">
                <Trash2 size={16} /> 刪除這段回憶
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
                {TAIWAN_DATA[formData.county].districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">地點名稱</label>
              <div className="flex gap-2">
                <input type="text" required placeholder="如：劍湖山世界" value={formData.locationName} onChange={e => setFormData({...formData, locationName: e.target.value})} className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={searchLocation} disabled={isSearching} className="bg-slate-100 text-slate-600 px-3 rounded-xl flex items-center justify-center"><Search size={20} /></button>
                <button type="button" onClick={handleSpotAssistant} disabled={isAILoading} className="bg-indigo-600 text-white px-3 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100"><Sparkles size={20} /></button>
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
              <div className="flex justify-between items-end mb-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">成長筆記</label>
                <button type="button" onClick={handleDiaryAssistant} disabled={isAILoading} className="text-blue-600 text-[10px] font-black flex items-center gap-1 active:scale-95 transition-all bg-blue-50 px-2 py-1 rounded-full"><Wand2 size={12} /> ✨ AI 美化</button>
              </div>
              <textarea rows="4" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-base outline-none resize-none" placeholder="隨手記錄..." />
            </div>
            
            <button type="submit" disabled={!user} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-transform flex items-center justify-center gap-2">
              <Cloud size={20} /> 雲端儲存
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
