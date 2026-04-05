import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { 
  Camera, Calendar, MapPin, Plus, Trash2, History, ChevronRight, X, 
  Image as ImageIcon, Map as MapIcon, Layers, Loader2, Cloud, CloudOff, AlertCircle, Clock, CheckCircle2
} from 'lucide-react';

// --- Firebase 配置 ---
const firebaseConfig = {
  apiKey: "AIzaSyDCJ7OIam5w_7REdvUFOUCQ6HwMBd6osZs",
  authDomain: "my-baby-map.firebaseapp.com",
  projectId: "my-baby-map",
  storageBucket: "my-baby-map.firebasestorage.app",
  messagingSenderId: "188131541032",
  appId: "1:188131541032:web:7814e975fa9dfbf9fbf51d",
  measurementId: "G-M0S0X8BLJ2"
};

const appId = 'baby-growth-map';

const TAIWAN_COUNTIES_GEO = {
  "台北市": [25.0330, 121.5654], "新北市": [25.0125, 121.4657], "桃園市": [24.9936, 121.3010],
  "台中市": [24.1477, 120.6736], "台南市": [22.9997, 120.2270], "高雄市": [22.6273, 120.3014],
  "基隆市": [25.1283, 121.7419], "新竹縣": [24.8387, 121.0177], "新竹市": [24.8138, 120.9675],
  "苗栗縣": [24.5602, 120.8217], "彰化縣": [24.0518, 120.5161], "南投縣": [23.9101, 120.6961],
  "雲林縣": [23.7092, 120.4313], "嘉義縣": [23.4519, 120.2555], "嘉義市": [23.4815, 120.4537],
  "屏東縣": [22.6761, 120.4885], "宜蘭縣": [24.7021, 121.7377], "花蓮縣": [23.9872, 121.6016],
  "台東縣": [22.7583, 121.1444], "澎湖縣": [23.5711, 119.5793]
};

const App = () => {
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [records, setRecords] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationName: '',
    county: '雲林縣',
    note: '',
    photo: null,
    coords: [23.7092, 120.4313]
  });

  const mapInstance = useRef(null);
  const markersGroup = useRef(null);
  const heatCirclesGroup = useRef(null);

  useEffect(() => {
    try {
      const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      const auth = getAuth(firebaseApp);
      const firestore = getFirestore(firebaseApp);
      setDb(firestore);

      const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (u) {
          setUser(u);
          setErrorMsg(null);
        } else {
          signInAnonymously(auth).catch(e => setErrorMsg("雲端連線失敗，請稍後再試"));
        }
      });
      return () => unsubscribe();
    } catch (e) {
      setErrorMsg("初始化失敗: " + e.message);
    }
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const recordsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'records');
    const unsubscribe = onSnapshot(recordsCol, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(data);
    }, (err) => setErrorMsg("讀取資料失敗"));
    return () => unsubscribe();
  }, [user, db]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !mapInstance.current) {
      const L_CSS_ID = 'leaflet-css';
      if (!document.getElementById(L_CSS_ID)) {
        const link = document.createElement('link');
        link.id = L_CSS_ID; link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        const L = window.L;
        mapInstance.current = L.map('main-map', { zoomControl: false, tap: true }).setView([23.6, 121.0], 8);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '©OSM'
        }).addTo(mapInstance.current);

        markersGroup.current = L.layerGroup().addTo(mapInstance.current);
        heatCirclesGroup.current = L.layerGroup().addTo(mapInstance.current);
        mapInstance.current.on('click', (e) => {
          const { lat, lng } = e.latlng;
          setFormData(prev => ({ ...prev, coords: [lat, lng] }));
          setIsAdding(true);
        });
      };
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (window.L && mapInstance.current) {
      const L = window.L;
      markersGroup.current.clearLayers();
      heatCirclesGroup.current.clearLayers();
      const counts = {};
      records.forEach(r => { counts[r.county] = (counts[r.county] || 0) + 1; });
      Object.keys(counts).forEach(county => {
        const center = TAIWAN_COUNTIES_GEO[county];
        if (center) {
          const count = counts[county];
          L.circle(center, {
            radius: 10000 + (count * 2000),
            fillColor: '#4f46e5',
            fillOpacity: Math.min(0.1 + (count * 0.1), 0.4),
            color: 'transparent',
            interactive: false
          }).addTo(heatCirclesGroup.current);
        }
      });
      records.forEach(record => {
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden bg-indigo-500 flex items-center justify-center">
            ${record.photo ? `<img src="${record.photo}" class="w-full h-full object-cover" />` : `<span class="text-white text-xs font-bold">📍</span>`}
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        });
        L.marker(record.coords, { icon: customIcon }).addTo(markersGroup.current).on('click', () => setSelectedRecord(record));
      });
    }
  }, [records]);

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_VAL = 600; 
          if (width > height) {
            if (width > MAX_VAL) { height *= MAX_VAL / width; width = MAX_VAL; }
          } else {
            if (height > MAX_VAL) { width *= MAX_VAL / height; height = MAX_VAL; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
      reader.onerror = () => reject(new Error("照片讀取失敗"));
    });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsCompressing(true);
      setErrorMsg(null);
      try {
        const compressedData = await compressImage(file);
        setFormData(prev => ({ ...prev, photo: compressedData }));
      } catch (err) {
        setErrorMsg("照片處理失敗");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const saveRecord = async (e) => {
    e.preventDefault();
    if (!user || !db) return setErrorMsg("尚未連線到雲端，請檢查網路");
    if (!formData.locationName) return setErrorMsg("請輸入景點名稱");
    if (isSaving) return;

    setIsSaving(true);
    setErrorMsg(null);

    const timeout = setTimeout(() => {
      if (isSaving) {
        setIsSaving(false);
        setErrorMsg("儲存過久，請檢查網路後再試");
      }
    }, 15000);

    try {
      const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'records');
      await addDoc(colRef, {
        ...formData,
        timestamp: new Date().toISOString()
      });
      clearTimeout(timeout);
      setIsAdding(false);
      setFormData({ 
        date: new Date().toISOString().split('T')[0], 
        locationName: '', 
        county: '雲林縣', 
        note: '', 
        photo: null, 
        coords: [23.7092, 120.4313] 
      });
    } catch (err) {
      clearTimeout(timeout);
      setErrorMsg("儲存失敗: " + (err.message.includes('permission') ? "權限不足" : "網路異常"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <nav className="bg-white border-b px-4 py-3 flex justify-between items-center z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <MapIcon size={18} />
          </div>
          <h1 className="text-base font-black text-slate-800">成長足跡</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase ${user ? 'text-green-500 bg-green-50' : 'text-orange-400 bg-orange-50 animate-pulse'}`}>
            {user ? <CheckCircle2 size={10} /> : <CloudOff size={10} />}
            {user ? '已連線' : '連線中'}
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 shadow-sm">新增</button>
        </div>
      </nav>

      <div className="flex-1 flex relative">
        <div id="main-map" className="flex-1 z-0"></div>

        {errorMsg && (
          <div className="absolute top-4 left-4 right-4 z-[1000] bg-red-600 text-white p-3 shadow-2xl rounded-xl flex items-center gap-3 animate-in slide-in-from-top">
            <AlertCircle size={20} />
            <p className="flex-1 text-xs font-bold">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-white/70">✕</button>
          </div>
        )}

        {selectedRecord && (
          <div className="absolute inset-0 bg-black/40 z-[100] flex items-end">
            <div className="w-full bg-white rounded-t-[2rem] shadow-2xl p-6 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" onClick={() => setSelectedRecord(null)}></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{selectedRecord.locationName}</h3>
                  <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">{selectedRecord.date} · {selectedRecord.county}</p>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={18} /></button>
              </div>
              {selectedRecord.photo && (
                <div className="mb-4 rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                  <img src={selectedRecord.photo} className="w-full object-contain bg-slate-50 max-h-64 mx-auto" />
                </div>
              )}
              <div className="bg-slate-50 p-4 rounded-2xl text-sm text-slate-600 leading-relaxed mb-6 whitespace-pre-wrap italic">
                {selectedRecord.note || "留下了一段美好的足跡。"}
              </div>
              <button 
                onClick={async () => {
                  if(window.confirm("確定要刪除這段記憶嗎？")) {
                    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'records', selectedRecord.id));
                    setSelectedRecord(null);
                  }
                }}
                className="w-full py-4 text-red-500 font-bold text-sm bg-red-50 rounded-2xl active:scale-95 transition-transform"
              >
                <Trash2 size={16} className="inline mr-1" /> 刪除紀錄
              </button>
            </div>
          </div>
        )}

        {isAdding && (
          <div className="fixed inset-0 bg-white z-[200] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
              <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400"><X /></button>
              <h2 className="font-black text-slate-800 tracking-tight">紀錄足跡</h2>
              <div className="w-10"></div>
            </div>

            <form onSubmit={saveRecord} className="flex-1 overflow-y-auto p-6 space-y-6 pb-12">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">日期</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">縣市</label>
                  <select value={formData.county} onChange={e => setFormData({...formData, county: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                    {Object.keys(TAIWAN_COUNTIES_GEO).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">景點名稱 (必填)</label>
                <input type="text" required placeholder="例如：飛牛牧場" value={formData.locationName} onChange={e => setFormData({...formData, locationName: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center justify-between">
                  照片回憶 {isCompressing && <span className="text-indigo-600 animate-pulse">壓縮中...</span>}
                </label>
                <div className="relative h-48 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center hover:border-indigo-400 overflow-hidden group transition-all">
                  {formData.photo ? (
                    <img src={formData.photo} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      {isCompressing ? <Loader2 className="animate-spin text-indigo-400" size={24} /> : <Camera className="text-slate-300 mb-2" size={24} />}
                      <span className="text-xs font-bold text-slate-400">{isCompressing ? '處理中...' : '點擊選擇照片 (可不傳)'}</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoChange} disabled={isCompressing || isSaving} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">成長筆記</label>
                <textarea rows="4" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="記錄當下的感動..." />
              </div>

              <button 
                type="submit" 
                disabled={isSaving || isCompressing}
                className={`w-full py-4 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${isSaving || isCompressing ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white active:scale-95 shadow-indigo-100'}`}
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Cloud size={18} />}
                {isSaving ? '正在同步雲端...' : '存入回憶'}
              </button>
            </form>
          </div>
        )}
      </div>

      <footer className="bg-white border-t px-10 py-4 flex justify-between items-center z-50">
        <button onClick={() => { setIsAdding(false); setSelectedRecord(null); }} className="flex flex-col items-center gap-1 text-indigo-600">
          <MapIcon size={24} />
          <span className="text-[10px] font-black">地圖首頁</span>
        </button>
        <button onClick={() => setIsAdding(true)} className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center -top-6 relative active:scale-90 transition-transform border-4 border-white">
          <Plus size={32} />
        </button>
        <div className="w-12 opacity-20"><History size={24} /></div>
      </footer>

      <style>{`
        .custom-marker { background: none; border: none; }
        .leaflet-container { font-family: inherit; }
        input, select, textarea { font-size: 16px !important; }
      `}</style>
    </div>
  );
};

export default App;
