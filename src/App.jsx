import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { 
  Camera, Calendar, MapPin, Plus, Trash2, History, ChevronRight, X, 
  Image as ImageIcon, Map as MapIcon, BarChart3, List, ChevronLeft, 
  Search, Loader2, Navigation, Sparkles, Wand2, Cloud, CloudOff, AlertCircle, RefreshCw, Bug, CheckCircle2
} from 'lucide-react';

// --- 您提供的 Firebase 配置 ---
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

const TAIWAN_DATA = {
  "台北市": { center: [25.0330, 121.5654], districts: ["中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"] },
  "新北市": { center: [25.0125, 121.4657], districts: ["板橋區", "三重區", "中和區", "永和區", "新莊區", "新店區", "樹林區", "鶯歌區", "三峽區", "淡水區", "汐止區", "瑞芳區", "土城區", "蘆洲區", "五股區", "泰山區", "林口區", "深坑區", "石碇區", "坪林區", "三芝區", "石門區", "八里區", "平溪區", "雙溪區", "貢寮區", "金山區", "萬里區", "烏來區"] },
  "桃園市": { center: [24.9936, 121.3010], districts: ["桃園區", "中壢區", "大溪區", "楊梅區", "蘆竹區", "大園區", "龜山區", "八德區", "龍潭區", "平鎮區", "新屋區", "觀音區", "復興區"] },
  "台中市": { center: [24.1477, 120.6736], districts: ["中區", "東區", "南區", "西區", "北區", "北屯區", "西屯區", "南屯區", "太平區", "大里區", "霧峰區", "烏日區", "豐原區", "後里區", "石岡區", "東勢區", "和平區", "新社區", "潭子區", "大雅區", "神岡區", "大肚區", "沙鹿區", "龍井區", "梧棲區", "清水區", "大甲區", "外埔區", "大安區"] },
  "台南市": { center: [22.9997, 120.2270], districts: ["中西區", "東區", "南區", "北區", "安平區", "安南區", "永康區", "歸仁區", "新化區", "左鎮區", "玉井區", "楠西區", "南化區", "仁德區", "關廟區", "龍崎區", "官田區", "麻豆區", "佳里區", "西港區", "七股區", "將軍區", "學甲區", "北門區", "新營區", "後壁區", "白河區", "東山區", "六甲區", "下營區", "柳營區", "鹽水區", "善化區", "大內區", "山上區", "新市區", "安定區"] },
  "高雄市": { center: [22.6273, 120.3014], districts: ["楠梓區", "左營區", "鼓山區", "三民區", "鹽埕區", "前金區", "新興區", "苓雅區", "前鎮區", "旗津區", "小港區", "鳳山區", "林園區", "大寮區", "大樹區", "大社區", "仁武區", "鳥松區", "岡山區", "橋頭區", "燕巢區", "田寮區", "阿蓮區", "路竹區", "湖內區", "茄萣區", "永安區", "彌陀區", "梓官區", "旗山區", "美濃區", "六龜區", "甲仙區", "杉林區", "內門區", "茂林區", "桃源區", "那瑪夏區"] },
  "雲林縣": { center: [23.7092, 120.4313], districts: ["斗六市", "斗南鎮", "虎尾鎮", "西螺鎮", "土庫鎮", "北港鎮", "古坑鄉", "大埤鄉", "莿桐鄉", "林內鄉", "二崙鄉", "崙背鄉", "麥寮鄉", "東勢鄉", "褒忠鄉", "台西鄉", "元長鄉", "四湖鄉", "口湖鄉", "水林鄉"] }
};

const App = () => {
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('map');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationName: '', county: '雲林縣', district: '古坑鄉',
    note: '', photo: null, coords: TAIWAN_DATA["雲林縣"].center
  });

  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const heatGroup = useRef(null);

  // --- Firebase 初始化 ---
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(MY_FIREBASE_CONFIG);
        const auth = getAuth(firebaseApp);
        const firestore = getFirestore(firebaseApp);
        setDb(firestore);

        onAuthStateChanged(auth, (u) => {
          if (u) setUser(u);
          else signInAnonymously(auth).catch(err => setErrorMsg("登入失敗: " + err.message));
        });
      } catch (err) {
        setErrorMsg("Firebase 初始化異常");
      }
    };
    initFirebase();
  }, []);

  // --- 監聽資料 ---
  useEffect(() => {
    if (!user || !db) return;
    const recordsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'records');
    const unsubscribe = onSnapshot(recordsCol, (snap) => {
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(data);
    }, (err) => {
      if (err.code === 'permission-denied') setErrorMsg("權限不足，請檢查 Firebase Rules 設定");
    });
    return () => unsubscribe();
  }, [user, db]);

  // --- 地圖初始化 ---
  useEffect(() => {
    if (typeof window === 'undefined' || mapInstance.current) return;
    const initMap = () => {
      const L = window.L;
      if (!L) return;
      mapInstance.current = L.map('map-view', { zoomControl: false, tap: true }).setView([23.6, 121.0], 7);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '©OSM' }).addTo(mapInstance.current);
      markersGroup.current = L.layerGroup().addTo(mapInstance.current);
      heatGroup.current = L.layerGroup().addTo(mapInstance.current);
      mapInstance.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setFormData(prev => ({ ...prev, coords: [lat, lng] }));
        setIsAdding(true);
      });
    };
    if (!window.L) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload = initMap;
      document.head.appendChild(script);
    } else initMap();
  }, []);

  // --- 更新標記 ---
  useEffect(() => {
    if (window.L && mapInstance.current && activeTab === 'map') {
      const L = window.L;
      markersGroup.current.clearLayers();
      records.forEach(r => {
        const icon = L.divIcon({
          className: 'custom-icon',
          html: `<div class="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden bg-blue-600 flex items-center justify-center">
            ${r.photo ? `<img src="${r.photo}" class="w-full h-full object-cover" />` : `<span class="text-white text-xs">📍</span>`}
          </div>`,
          iconSize: [40, 40], iconAnchor: [20, 40]
        });
        L.marker(r.coords, { icon }).addTo(markersGroup.current).on('click', () => setSelectedRecord(r));
      });
    }
  }, [records, activeTab]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || !db) return;
    setIsSaving(true);
    setErrorMsg('');
    try {
      const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'records');
      await addDoc(colRef, formData);
      setIsAdding(false);
      setFormData({ date: new Date().toISOString().split('T')[0], locationName: '', county: '雲林縣', district: '古坑鄉', note: '', photo: null, coords: TAIWAN_DATA["雲林縣"].center });
    } catch (err) { 
      setErrorMsg("儲存失敗：" + err.message); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord || !user || !db) return;
    setIsDeleting(true);
    setErrorMsg('');
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'records', selectedRecord.id);
      await deleteDoc(docRef);
      setSelectedRecord(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      setErrorMsg("刪除失敗：" + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 select-none overflow-hidden font-sans">
      <header className="bg-white px-4 py-3 flex justify-between items-center shadow-sm z-10 shrink-0">
        <h1 className="text-lg font-black text-blue-600 flex items-center gap-2"><MapIcon size={20} /> 成長地圖</h1>
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase ${user ? 'text-green-500 bg-green-50' : 'text-slate-400 bg-slate-100 animate-pulse'}`}>
          {user ? <CheckCircle2 size={12} /> : <Cloud size={12} />} {user ? '已連線' : '連線中'}
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <div id="map-view" className="w-full h-full" style={{ visibility: activeTab === 'map' ? 'visible' : 'hidden', position: 'absolute', inset: 0, zIndex: 1 }}></div>
        
        {/* 錯誤提示 */}
        {errorMsg && (
          <div className="absolute top-4 left-4 right-4 z-[2000] bg-red-500 text-white p-3 rounded-xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold"><AlertCircle size={16} /> {errorMsg}</div>
            <button onClick={() => setErrorMsg('')}><X size={16} /></button>
          </div>
        )}

        {/* 詳情與刪除 */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-black/40 z-[1000] flex items-end">
            <div className="w-full bg-white rounded-t-[2.5rem] p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" onClick={() => setSelectedRecord(null)}></div>
              
              {!showDeleteConfirm ? (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{selectedRecord.locationName}</h3>
                      <p className="text-sm text-slate-400 font-bold mt-1">{selectedRecord.date} · {selectedRecord.county}</p>
                    </div>
                    <button onClick={() => setSelectedRecord(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                  </div>
                  {selectedRecord.photo && <img src={selectedRecord.photo} className="w-full rounded-2xl mb-4 max-h-64 object-cover border" />}
                  <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm italic mb-6">
                    {selectedRecord.note || "留下了一段美好的足跡。"}
                  </div>
                  <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-4 text-red-500 font-bold text-sm bg-red-50 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <Trash2 size={16} /> 刪除這段記憶
                  </button>
                </>
              ) : (
                <div className="py-6 text-center">
                  <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">確定要刪除嗎？</h3>
                  <p className="text-sm text-slate-400 mb-8">刪除後將無法恢復這段回憶喔！</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl">取消</button>
                    <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-100 flex items-center justify-center gap-2">
                      {isDeleting ? <Loader2 size={18} className="animate-spin" /> : null}
                      {isDeleting ? '正在刪除...' : '確定刪除'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isAdding && (
          <div className="fixed inset-0 bg-white z-[1500] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center p-4 border-b">
              <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400"><ChevronLeft /></button>
              <h2 className="font-black text-slate-800">新增足跡</h2>
              <div className="w-10"></div>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">日期</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">縣市</label>
                  <select value={formData.county} onChange={e => setFormData({...formData, county: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm outline-none appearance-none">
                    {Object.keys(TAIWAN_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">地點名稱 (必填)</label>
                <input type="text" required placeholder="例如：飛牛牧場" value={formData.locationName} onChange={e => setFormData({...formData, locationName: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">照片回憶</label>
                <div className="relative h-40 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden">
                  {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <><Camera className="text-blue-500 mb-1" size={24} /><span className="text-xs font-bold text-slate-400">選擇照片</span></>}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) { const reader = new FileReader(); reader.onloadend = () => setFormData(prev => ({ ...prev, photo: reader.result })); reader.readAsDataURL(file); }
                  }} /></div></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">成長筆記</label>
                <textarea rows="3" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm outline-none resize-none" placeholder="寫點什麼..." /></div>
              <button type="submit" disabled={isSaving} className={`w-full py-4 text-white rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2 ${isSaving ? 'bg-slate-300' : 'bg-blue-600 active:scale-95 shadow-blue-100'}`}>
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Cloud size={20} />}
                {isSaving ? '同步雲端中...' : '存入回憶'}
              </button>
            </form>
          </div>
        )}
      </main>

      <footer className="bg-white border-t px-6 py-2 pb-8 flex justify-between items-center z-50 shrink-0 shadow-lg">
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-blue-600' : 'text-slate-300'}`}><MapIcon size={24} /><span className="text-[10px] font-black uppercase">地圖</span></button>
        <button onClick={() => setIsAdding(true)} className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center -top-6 relative active:scale-90 transition-transform border-4 border-white"><Plus size={32} /></button>
        <button onClick={() => { setActiveTab('timeline'); setSelectedRecord(null); }} className={`flex flex-col items-center gap-1 ${activeTab === 'timeline' ? 'text-blue-600' : 'text-slate-300'}`}><List size={24} /><span className="text-[10px] font-black uppercase">列表</span></button>
      </footer>
      <style>{`.custom-icon { background: none; border: none; } .leaflet-container { font-family: inherit; } input, select, textarea { font-size: 16px !important; }`}</style>
    </div>
  );
};

export default App;
