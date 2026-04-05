import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { 
  Camera, Calendar, MapPin, Plus, Trash2, History, ChevronRight, X, 
  Image as ImageIcon, Map as MapIcon, BarChart3, List, ChevronLeft, 
  Search, Loader2, Navigation, Sparkles, Wand2, Cloud, CloudOff, AlertCircle, RefreshCw, Bug, CheckCircle2, Edit3, Flame, Baby, Settings as SettingsIcon, LogOut, Key, ShieldCheck, Globe
} from 'lucide-react';

// --- Firebase 配置 ---
const MY_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDCJ7OIam5w_7REdvUFOUCQ6HwMBd6osZs",
  authDomain: "my-baby-map.firebaseapp.com",
  projectId: "my-baby-map",
  storageBucket: "my-baby-map.firebasestorage.app",
  messagingSenderId: "188131541032",
  appId: "1:188131541032:web:7814e975fa9dfbf9fbf51d",
  measurementId: "G-M0S0X8BLJ2"
};

const appId = 'baby-growth-map';

// --- 台灣行政區資料庫 ---
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
  "澎湖縣": { center: [23.5711, 119.5793], districts: ["馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉"] },
  "其他(國外)": { center: [23.6, 121.0], districts: ["國外地區"] }
};

const App = () => {
  // --- 狀態定義 ---
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [familyCode, setFamilyCode] = useState('');
  const [isCodeAuthorized, setIsCodeAuthorized] = useState(false);
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('map');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [babyBirthday, setBabyBirthday] = useState('');
  const [isSettingBirthday, setIsSettingBirthday] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationName: '', county: '雲林縣', district: '古坑鄉',
    note: '', photo: null, coords: TAIWAN_DATA["雲林縣"].center
  });

  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const editingMarker = useRef(null);

  // --- 函式定義 (移到上方以解決 ReferenceError) ---

  const handleAuthCode = (e) => {
    if (e) e.preventDefault();
    if (familyCode.trim().length < 4) {
      setErrorMsg("暗號至少需要 4 個字元喔！");
      return;
    }
    setIsCodeAuthorized(true);
    setErrorMsg('');
  };

  const handleLogout = () => {
    setIsCodeAuthorized(false);
    setFamilyCode('');
    setRecords([]);
    setBabyBirthday('');
  };

  const updateEditingMarker = (coords) => {
    if (window.L && mapInstance.current) {
      if (editingMarker.current) editingMarker.current.remove();
      editingMarker.current = window.L.marker(coords, { 
        icon: window.L.divIcon({ 
          className: 'temp-marker', 
          html: `<div class="w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-lg animate-pulse flex items-center justify-center text-white"><MapPin size={16}/></div>`,
          iconSize: [32, 32], iconAnchor: [16, 16]
        }) 
      }).addTo(mapInstance.current);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width, height = img.height;
          const MAX_SIZE = 800;
          if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
          else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsCompressing(true);
      setErrorMsg('');
      try {
        const compressedData = await compressImage(file);
        setFormData(prev => ({ ...prev, photo: compressedData }));
      } catch (err) { setErrorMsg("圖片處理失敗：" + err.message); }
      finally { setIsCompressing(false); }
    }
  };

  const getAgeAtDate = (birthdayStr, targetDateInput) => {
    if (!birthdayStr || !targetDateInput) return "";
    const birth = new Date(birthdayStr), target = new Date(targetDateInput);
    if (isNaN(birth.getTime()) || isNaN(target.getTime())) return "";
    if (target < birth) return "出生前";
    let years = target.getFullYear() - birth.getFullYear(), months = target.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && target.getDate() < birth.getDate())) { years--; months += 12; }
    if (target.getDate() < birth.getDate()) months--;
    return years === 0 ? `${months}個月` : `${years}歲${months}個月`;
  };

  const fetchCoordsForArea = async (county, district) => {
    try {
      const queryStr = `${county}${district}`;
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`);
      const data = await resp.json();
      if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch (e) { console.error("定位服務連線失敗"); }
    return null;
  };

  const handleKeywordSearch = async () => {
    if (!searchKeyword.trim()) return;
    setIsSearching(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchKeyword)}`);
      const data = await resp.json();
      if (data && data.length > 0) {
        const newCoords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setFormData(prev => ({ ...prev, coords: newCoords, locationName: searchKeyword }));
        if (mapInstance.current) { mapInstance.current.flyTo(newCoords, 16); updateEditingMarker(newCoords); }
      } else { setErrorMsg("找不到地點，請換個詞試試"); }
    } catch (err) { setErrorMsg("搜尋服務暫時不可用"); }
    finally { setIsSearching(false); }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return setErrorMsg("設備不支援定位");
    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = [pos.coords.latitude, pos.coords.longitude];
        setFormData(prev => ({ ...prev, coords: newCoords }));
        if (mapInstance.current) { mapInstance.current.flyTo(newCoords, 17); updateEditingMarker(newCoords); }
        setIsSearching(false);
      },
      () => { setErrorMsg("請開啟 GPS 權限"); setIsSearching(false); }
    );
  };

  const handleCountyChange = (val) => {
    const coords = TAIWAN_DATA[val].center;
    const firstDistrict = TAIWAN_DATA[val].districts[0];
    setFormData(prev => ({ ...prev, county: val, district: firstDistrict, coords }));
    if (mapInstance.current) {
      const zoom = val === "其他(國外)" ? 7 : 12;
      mapInstance.current.flyTo(coords, zoom);
      updateEditingMarker(coords);
    }
  };

  const handleDistrictChange = async (val) => {
    setFormData(prev => ({ ...prev, district: val }));
    if (formData.county !== "其他(國外)") {
      setIsSearching(true);
      const newCoords = await fetchCoordsForArea(formData.county, val);
      if (newCoords && mapInstance.current) {
        setFormData(prev => ({ ...prev, coords: newCoords }));
        mapInstance.current.flyTo(newCoords, 15);
        updateEditingMarker(newCoords);
      }
      setIsSearching(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || !db || !familyCode) return;
    setIsSaving(true);
    try {
      const colPath = `family_records_${familyCode}`;
      if (isEditing && selectedRecord) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colPath, selectedRecord.id), formData);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colPath), formData);
      }
      setIsAdding(false); setIsEditing(false);
      if (editingMarker.current) editingMarker.current.remove();
      setFormData({ date: new Date().toISOString().split('T')[0], locationName: '', county: '雲林縣', district: '斗六市', note: '', photo: null, coords: TAIWAN_DATA["雲林縣"].center });
    } catch (err) { setErrorMsg("儲存失敗：" + err.message); } finally { setIsSaving(false); }
  };

  const saveBirthday = async (date) => {
    if (!user || !db || !familyCode) return;
    setBabyBirthday(date);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'family_configs', familyCode), { birthday: date });
    setIsSettingBirthday(false);
  };

  const handleDelete = async () => {
    if (!selectedRecord || !user || !db || !familyCode) return;
    setIsDeleting(true);
    try {
      const colPath = `family_records_${familyCode}`;
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', colPath, selectedRecord.id));
      setSelectedRecord(null); setShowDeleteConfirm(false);
    } catch (err) { setErrorMsg("刪除失敗：" + err.message); } finally { setIsDeleting(false); }
  };

  const countyStats = useMemo(() => {
    const stats = {};
    records.forEach(r => { stats[r.county] = (stats[r.county] || 0) + 1; });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [records]);

  // --- 副作用 (Side Effects) ---

  useEffect(() => {
    try {
      const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(MY_FIREBASE_CONFIG);
      const auth = getAuth(firebaseApp), firestore = getFirestore(firebaseApp);
      setDb(firestore);
      onAuthStateChanged(auth, (u) => {
        if (u) setUser(u); else signInAnonymously(auth);
      });
    } catch (err) { setErrorMsg("連線初始化異常"); }
  }, []);

  useEffect(() => {
    if (!user || !db || !isCodeAuthorized) return;
    const recordsCol = collection(db, 'artifacts', appId, 'public', 'data', `family_records_${familyCode}`);
    const unsub = onSnapshot(recordsCol, (snap) => {
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(data);
    }, (err) => setErrorMsg("資料庫連線失敗：" + err.message));

    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'family_configs', familyCode);
    getDoc(settingsDoc).then(s => { if (s.exists()) setBabyBirthday(s.data().birthday || ''); });
    return () => unsub();
  }, [user, db, isCodeAuthorized, familyCode]);

  useEffect(() => {
    if (typeof window === 'undefined' || mapInstance.current || !isCodeAuthorized) return;
    const init = () => {
      const L = window.L;
      mapInstance.current = L.map('map-view', { zoomControl: false, tap: true }).setView([23.6, 121.0], 7);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '©OSM' }).addTo(mapInstance.current);
      markersGroup.current = L.layerGroup().addTo(mapInstance.current);
      mapInstance.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setFormData(prev => ({ ...prev, coords: [lat, lng] }));
        setIsAdding(true); setIsEditing(false);
        updateEditingMarker([lat, lng]);
      });
    };
    if (!window.L) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload = init;
      document.head.appendChild(script);
    } else init();
  }, [isCodeAuthorized]);

  useEffect(() => {
    if (window.L && mapInstance.current && isCodeAuthorized) {
      const L = window.L; markersGroup.current.clearLayers();
      records.forEach(r => {
        const icon = L.divIcon({
          className: 'custom-icon',
          html: `<div class="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden bg-blue-600 flex items-center justify-center">
            ${r.photo ? `<img src="${r.photo}" class="w-full h-full object-cover" />` : `<span class="text-white text-[10px] font-bold">📍</span>`}
          </div>`,
          iconSize: [40, 40], iconAnchor: [20, 40]
        });
        L.marker(r.coords, { icon }).addTo(markersGroup.current).on('click', () => setSelectedRecord(r));
      });
    }
  }, [records, isCodeAuthorized]);

  // --- 子組件 ---

  const TimelineList = () => (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-4 space-y-5 pb-24">
      <section className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-start mb-3">
          <div className="flex items-center gap-2"><Baby size={20} /><h2 className="font-black text-lg">成長設定</h2></div>
          <button onClick={() => setIsSettingBirthday(!isSettingBirthday)} className="p-2 rounded-full bg-white/10"><SettingsIcon size={16} /></button>
        </div>
        {isSettingBirthday ? (
          <input type="date" className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-sm outline-none" value={babyBirthday} onChange={(e) => saveBirthday(e.target.value)} />
        ) : (
          <div className="flex justify-between items-end">
            <div><p className="text-[11px] opacity-70">生日</p><p className="text-xl font-black">{babyBirthday || '未設定'}</p></div>
            <div className="text-right"><p className="text-[11px] opacity-70">目前</p><p className="text-sm font-bold bg-white/20 px-2 py-1 rounded-lg">{getAgeAtDate(babyBirthday, new Date().toISOString()) || '--'}</p></div>
          </div>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-3 text-slate-400 font-bold">
          <h2 className="text-xs uppercase flex items-center gap-2"><Flame size={14} className="text-orange-500" /> 縣市熱力</h2>
          <button onClick={handleLogout} className="text-[10px] flex items-center gap-1 hover:text-red-500"><LogOut size={12}/> 登出</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {countyStats.map(([name, count]) => (
            <div key={name} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm ${count > 3 ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border'}`}>{name} <span>{count}</span></div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {records.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border p-3 flex gap-3 cursor-pointer shadow-sm active:bg-slate-50 transition-all" onClick={() => { setSelectedRecord(r); if(window.innerWidth < 768) setActiveTab('map'); if(mapInstance.current) mapInstance.current.flyTo(r.coords, 14); }}>
            <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden shrink-0">{r.photo ? <img src={r.photo} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="m-auto mt-5 text-slate-300"/>}</div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2"><h3 className="font-bold text-slate-800 truncate text-sm">{r.locationName}</h3><span className="text-[9px] text-blue-500 font-black">{getAgeAtDate(babyBirthday, r.date)}</span></div>
              <p className="text-[10px] text-slate-400 mt-0.5">{r.date} · {r.county}</p>
            </div>
            <ChevronRight size={14} className="self-center text-slate-300" />
          </div>
        ))}
      </section>
    </div>
  );

  // --- 主要渲染邏輯 (將 handleAuthCode 的使用放在定義之後) ---

  if (!isCodeAuthorized) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-8 text-center font-sans text-slate-800">
        <div className="w-20 h-20 bg-indigo-600 rounded-[2.2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-200 mb-8 animate-in zoom-in duration-500"><ShieldCheck size={40} /></div>
        <h1 className="text-3xl font-black mb-3">家庭回憶空間</h1>
        <p className="text-slate-500 mb-10 max-w-[280px] font-medium leading-relaxed text-sm">輸入暗號即可跨裝置同步。<br/>暗號相同，回憶就相同。</p>
        <form onSubmit={handleAuthCode} className="w-full max-w-xs space-y-4">
          <div className="relative">
            <Key className="absolute left-4 top-4 text-slate-400" size={20} />
            <input 
              type="text" 
              required 
              placeholder="請輸入專屬暗號" 
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold shadow-xl outline-none focus:ring-2 focus:ring-indigo-500" 
              value={familyCode} 
              onChange={(e) => setFamilyCode(e.target.value.toLowerCase())}
            />
          </div>
          <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">進入地圖</button>
        </form>
        {errorMsg && <p className="mt-4 text-xs font-bold text-red-500">{String(errorMsg)}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 select-none overflow-hidden font-sans">
      <header className="bg-white px-4 py-3 flex justify-between items-center shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-2"><div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-md"><MapIcon size={18} /></div><h1 className="text-lg font-black tracking-tight">成長足跡</h1></div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase flex items-center gap-1"><ShieldCheck size={10} /> {familyCode}</div>
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${user ? 'text-green-500' : 'text-slate-400'}`}>{user ? <CheckCircle2 size={12} /> : <CloudOff size={12} />}</div>
        </div>
      </header>

      <main className="flex-1 flex flex-row relative overflow-hidden">
        <div className="hidden md:block w-80 lg:w-96 border-r z-20 shrink-0"><TimelineList /></div>
        <div className="flex-1 relative">
          <div id="map-view" className="w-full h-full" style={{ visibility: (activeTab === 'map' || window.innerWidth >= 768) ? 'visible' : 'hidden', position: 'absolute', inset: 0, zIndex: 1 }}></div>
          {activeTab === 'timeline' && <div className="md:hidden absolute inset-0 bg-slate-50 z-20"><TimelineList /></div>}
          
          {errorMsg && (
            <div className="absolute top-4 left-4 right-4 z-[2000] bg-red-600 text-white p-3 rounded-xl shadow-xl flex items-center justify-between animate-in slide-in-from-top">
              <div className="flex items-center gap-2 text-xs font-bold"><AlertCircle size={16} /> {String(errorMsg)}</div>
              <button onClick={() => setErrorMsg('')}>✕</button>
            </div>
          )}

          {selectedRecord && (
            <div className="fixed inset-0 bg-black/40 z-[1000] flex items-end md:items-center md:justify-center md:p-6">
              <div className="w-full md:max-w-md bg-white rounded-t-[2.5rem] md:rounded-[2rem] p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto max-h-[85vh]">
                <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" onClick={() => setSelectedRecord(null)}></div>
                {!showDeleteConfirm ? (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div><h3 className="text-2xl font-black text-slate-800">{selectedRecord.locationName} <span className="text-sm text-indigo-600">({getAgeAtDate(babyBirthday, selectedRecord.date)})</span></h3><p className="text-sm text-slate-400 font-bold uppercase">{selectedRecord.date} · {selectedRecord.county}{selectedRecord.district}</p></div>
                      <button onClick={() => setSelectedRecord(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                    </div>
                    {selectedRecord.photo && <img src={selectedRecord.photo} className="w-full rounded-2xl mb-4 max-h-64 object-cover border" alt="紀錄照片" />}
                    <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm italic mb-6">{selectedRecord.note || "一段美好的足跡。"}</div>
                    <div className="flex gap-3">
                      <button onClick={() => { setFormData(selectedRecord); setIsEditing(true); setIsAdding(true); updateEditingMarker(selectedRecord.coords); }} className="flex-1 py-4 text-indigo-600 font-bold text-sm bg-indigo-50 rounded-2xl active:scale-95 flex items-center justify-center gap-2"><Edit3 size={16} /> 修改</button>
                      <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 py-4 text-red-500 font-bold text-sm bg-red-50 rounded-2xl active:scale-95 flex items-center justify-center gap-2"><Trash2 size={16} /> 刪除</button>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <Trash2 size={32} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-black mb-2">確定刪除嗎？</h3>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold">取消</button>
                      <button onClick={handleDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold">{isDeleting ? "正在刪除..." : "確定"}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isAdding && (
          <div className="fixed inset-0 bg-white z-[1500] flex flex-col animate-in slide-in-from-bottom duration-300 md:items-center md:justify-center md:bg-black/50">
            <div className="flex justify-between items-center p-4 border-b bg-white md:rounded-t-3xl md:w-full md:max-w-md shadow-sm">
              <button onClick={() => { setIsAdding(false); setIsEditing(false); if(editingMarker.current) editingMarker.current.remove(); }} className="p-1"><X /></button>
              <h2 className="font-black">{isEditing ? '修改這段回憶' : '紀錄新回憶'}</h2><div className="w-10"></div>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 bg-white md:w-full md:max-w-md md:flex-none">
              
              <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Search size={10}/> 關鍵字/GPS 精確找點</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type="text" placeholder="輸入景點名稱..." className="w-full pl-3 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleKeywordSearch())}/>
                    <button type="button" onClick={handleKeywordSearch} className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-indigo-600"><Search size={18}/></button>
                  </div>
                  <button type="button" onClick={handleGetLocation} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 active:bg-indigo-50">{isSearching ? <Loader2 size={18} className="animate-spin"/> : <Navigation size={18}/>}</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">1. 選擇縣市</label><select value={formData.county} onChange={e => handleCountyChange(e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">{Object.keys(TAIWAN_DATA).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">2. 選擇鄉鎮市</label><select value={formData.district} onChange={e => handleDistrictChange(e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">{TAIWAN_DATA[formData.county].districts.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              </div>

              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">日期</label><input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">景點名稱 (必填)</label><input type="text" required placeholder="例如：飛牛牧場" value={formData.locationName} onChange={e => setFormData({...formData, locationName: e.target.value})} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none font-bold" /></div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase flex justify-between items-center">上傳照片 {isCompressing && <span className="text-blue-500 animate-pulse text-[9px]">壓縮處理中...</span>}</label>
                <div className="relative h-40 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden">
                  {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <><Camera size={24} className="text-slate-300"/><span className="text-xs text-slate-400">點擊上傳</span></>}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} disabled={isCompressing || isSaving} />
                </div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">筆記</label><textarea rows="3" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none" placeholder="記錄當下的感動..." /></div>
              <button type="submit" disabled={isSaving || isCompressing} className={`w-full py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 transition-all ${isSaving || isCompressing ? 'bg-slate-300' : 'bg-indigo-600 text-white active:scale-95'}`}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Cloud size={20} />} 
                {isCompressing ? '處理照片中...' : (isSaving ? '正在同步雲端...' : (isEditing ? '更新紀錄' : '存入回憶'))}
              </button>
            </form>
          </div>
        )}
      </main>
      <footer className="md:hidden bg-white border-t px-6 py-2 pb-8 flex justify-between items-center z-50 shrink-0 shadow-lg">
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-indigo-600' : 'text-slate-300'}`}><MapIcon size={24} /><span className="text-[10px] font-black uppercase">地圖</span></button>
        <button onClick={() => { setIsAdding(true); setIsEditing(false); }} className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center -top-6 relative active:scale-90 border-4 border-white transition-transform"><Plus size={32} /></button>
        <button onClick={() => { setActiveTab('timeline'); setSelectedRecord(null); }} className={`flex flex-col items-center gap-1 ${activeTab === 'timeline' ? 'text-indigo-600' : 'text-slate-300'}`}><List size={24} /><span className="text-[10px] font-black uppercase">時光軸</span></button>
      </footer>
      <style>{`.custom-icon { background: none; border: none; } .leaflet-container { font-family: inherit; }`}</style>
    </div>
  );
};

export default App;
