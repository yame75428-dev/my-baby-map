import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { 
  Camera, Calendar, MapPin, Plus, Trash2, History, ChevronRight, X, 
  Image as ImageIcon, Map as MapIcon, BarChart3, List, ChevronLeft, 
  Search, Loader2, Navigation, Sparkles, Wand2, Cloud, CloudOff, AlertCircle, RefreshCw, Bug, CheckCircle2, Edit3, Flame, Baby, Settings as SettingsIcon
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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [babyBirthday, setBabyBirthday] = useState('');
  const [isSettingBirthday, setIsSettingBirthday] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    locationName: '', county: '雲林縣', district: '古坑鄉',
    note: '', photo: null, coords: TAIWAN_DATA["雲林縣"].center
  });

  const mapInstance = useRef(null);
  const markersGroup = useRef(null);

  // --- 計算年齡 ---
  const getAgeAtDate = (birthdayStr, targetDateStr) => {
    if (!birthdayStr || !targetDateStr) return "";
    const birth = new Date(birthdayStr);
    const target = new Date(targetDateStr);
    if (target < birth) return "出生前";
    let years = target.getFullYear() - birth.getFullYear();
    let months = target.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && target.getDate() < birth.getDate())) {
      years--; months += 12;
    }
    if (target.getDate() < birth.getDate()) months--;
    if (years === 0) return `${months}個月`;
    return `${years}歲${months}個月`;
  };

  const countyStats = useMemo(() => {
    const stats = {};
    records.forEach(r => { stats[r.county] = (stats[r.county] || 0) + 1; });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [records]);

  // --- 初始化 Firebase ---
  useEffect(() => {
    try {
      const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(MY_FIREBASE_CONFIG);
      const auth = getAuth(firebaseApp);
      const firestore = getFirestore(firebaseApp);
      setDb(firestore);
      onAuthStateChanged(auth, (u) => {
        if (u) { setUser(u); setErrorMsg(''); }
        else signInAnonymously(auth).catch(err => setErrorMsg("雲端連線失敗：" + err.code));
      });
    } catch (err) { setErrorMsg("初始化異常：" + err.message); }
  }, []);

  // --- 監聽資料 ---
  useEffect(() => {
    if (!user || !db) return;
    const recordsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'records');
    const unsubRecords = onSnapshot(recordsCol, (snap) => {
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(data);
    }, (err) => {
      if (err.code === 'permission-denied') setErrorMsg("權限不足，請在 Firebase 檢查 Rules");
    });
    const settingsDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
    getDoc(settingsDoc).then(s => { if (s.exists()) setBabyBirthday(s.data().birthday || ''); });
    return () => unsubRecords();
  }, [user, db]);

  // --- 地圖初始化 ---
  useEffect(() => {
    if (typeof window === 'undefined' || mapInstance.current) return;
    const initMap = () => {
      const L = window.L; if (!L) return;
      mapInstance.current = L.map('map-view', { zoomControl: false, tap: true }).setView([23.6, 121.0], 7);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '©OSM' }).addTo(mapInstance.current);
      markersGroup.current = L.layerGroup().addTo(mapInstance.current);
      mapInstance.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setFormData(prev => ({ ...prev, coords: [lat, lng] }));
        setIsAdding(true); setIsEditing(false);
      });
    };
    if (!window.L) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload = initMap;
      document.head.appendChild(script);
    } else initMap();
  }, []);

  useEffect(() => {
    if (window.L && mapInstance.current) {
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
  }, [records]);

  const handleCountyChange = (val) => {
    setFormData(prev => ({ ...prev, county: val, district: TAIWAN_DATA[val].districts[0], coords: TAIWAN_DATA[val].center }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || !db) return setErrorMsg("尚未連線，請檢查網路");
    setIsSaving(true); setErrorMsg('');
    try {
      const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'records');
      if (isEditing && selectedRecord) {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'records', selectedRecord.id);
        await updateDoc(docRef, formData);
      } else {
        await addDoc(colRef, formData);
      }
      setIsAdding(false); setIsEditing(false);
      setFormData({ date: new Date().toISOString().split('T')[0], locationName: '', county: '雲林縣', district: '古坑鄉', note: '', photo: null, coords: TAIWAN_DATA["雲林縣"].center });
    } catch (err) { 
      setErrorMsg(`儲存失敗：${err.code || err.message}`); 
    } finally { setIsSaving(false); }
  };

  const saveBirthday = async (date) => {
    if (!user || !db) return; setBabyBirthday(date);
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), { birthday: date });
    setIsSettingBirthday(false);
  };

  const handleDelete = async () => {
    if (!selectedRecord || !user || !db) return;
    setIsDeleting(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'records', selectedRecord.id);
      await deleteDoc(docRef); setSelectedRecord(null); setShowDeleteConfirm(false);
    } catch (err) { setErrorMsg("刪除失敗：" + err.code); } finally { setIsDeleting(false); }
  };

  const handleStartEdit = () => {
    if (!selectedRecord) return;
    setFormData({
      date: selectedRecord.date, locationName: selectedRecord.locationName, county: selectedRecord.county,
      district: selectedRecord.district || TAIWAN_DATA[selectedRecord.county].districts[0],
      note: selectedRecord.note || '', photo: selectedRecord.photo || null, coords: selectedRecord.coords
    });
    setIsEditing(true); setIsAdding(true);
  };

  const TimelineList = () => (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-4 space-y-5 pb-24">
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-start mb-3">
          <div className="flex items-center gap-2"><Baby size={20} /><h2 className="font-black text-lg">成長設定</h2></div>
          <button onClick={() => setIsSettingBirthday(!isSettingBirthday)} className="p-2 rounded-full bg-white/10"><SettingsIcon size={16} /></button>
        </div>
        {isSettingBirthday ? (
          <input type="date" className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-sm outline-none" value={babyBirthday} onChange={(e) => saveBirthday(e.target.value)} />
        ) : (
          <div className="flex justify-between items-end">
            <div><p className="text-[11px] opacity-70">生日</p><p className="text-xl font-black">{babyBirthday || '未設定'}</p></div>
            <div className="text-right"><p className="text-[11px] opacity-70">目前</p><p className="text-sm font-bold bg-white/20 px-2 py-1 rounded-lg">{getAgeAtDate(babyBirthday, new Date()) || '--'}</p></div>
          </div>
        )}
      </section>
      <section>
        <h2 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><Flame size={14} className="text-orange-500" /> 縣市足跡</h2>
        <div className="flex flex-wrap gap-2">
          {countyStats.map(([name, count]) => (
            <div key={name} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm ${count > 3 ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}>{name} <span>{count}</span></div>
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

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 select-none overflow-hidden font-sans">
      <header className="bg-white px-4 py-3 flex justify-between items-center shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-2"><div className="bg-blue-600 p-1.5 rounded-lg text-white"><MapIcon size={18} /></div><h1 className="text-lg font-black tracking-tight">成長足跡</h1></div>
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${user ? 'text-green-500 bg-green-50' : 'text-slate-400 animate-pulse'}`}>{user ? <CheckCircle2 size={12} /> : <Cloud size={12} />} {user ? '已連線' : '連線中'}</div>
      </header>
      <main className="flex-1 flex flex-row relative overflow-hidden">
        <div className="hidden md:block w-80 lg:w-96 border-r z-20 shrink-0"><TimelineList /></div>
        <div className="flex-1 relative">
          <div id="map-view" className="w-full h-full" style={{ visibility: (activeTab === 'map' || window.innerWidth >= 768) ? 'visible' : 'hidden', position: 'absolute', inset: 0, zIndex: 1 }}></div>
          {activeTab === 'timeline' && <div className="md:hidden absolute inset-0 bg-slate-50 z-20"><TimelineList /></div>}
          {errorMsg && (
            <div className="absolute top-4 left-4 right-4 z-[2000] bg-red-600 text-white p-3 rounded-xl shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold"><AlertCircle size={16} /> {errorMsg}</div>
              <button onClick={() => setErrorMsg('')}><X size={16} /></button>
            </div>
          )}
          {selectedRecord && (
            <div className="fixed inset-0 bg-black/40 z-[1000] flex items-end md:items-center md:justify-center md:p-6">
              <div className="w-full md:max-w-md bg-white rounded-t-[2.5rem] md:rounded-[2rem] p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-y-auto max-h-[85vh]">
                <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" onClick={() => setSelectedRecord(null)}></div>
                {!showDeleteConfirm ? (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div><h3 className="text-2xl font-black text-slate-800">{selectedRecord.locationName} <span className="text-sm text-blue-600">({getAgeAtDate(babyBirthday, selectedRecord.date)})</span></h3><p className="text-sm text-slate-400 font-bold uppercase">{selectedRecord.date} · {selectedRecord.county}{selectedRecord.district}</p></div>
                      <button onClick={() => setSelectedRecord(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                    </div>
                    {selectedRecord.photo && <img src={selectedRecord.photo} className="w-full rounded-2xl mb-4 max-h-64 object-cover border" />}
                    <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm italic mb-6">{selectedRecord.note || "一段美好的足跡。"}</div>
                    <div className="flex gap-3">
                      <button onClick={handleStartEdit} className="flex-1 py-4 text-blue-600 font-bold text-sm bg-blue-50 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"><Edit3 size={16} /> 修改</button>
                      <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 py-4 text-red-500 font-bold text-sm bg-red-50 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"><Trash2 size={16} /> 刪除</button>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <Trash2 size={32} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-black mb-2">確定刪除嗎？</h3>
                    <div className="flex gap-3 mt-6"><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl">取消</button><button onClick={handleDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl">確定</button></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {isAdding && (
          <div className="fixed inset-0 bg-white z-[1500] flex flex-col animate-in slide-in-from-bottom duration-300 md:items-center md:justify-center md:bg-black/50">
            <div className="flex justify-between items-center p-4 border-b bg-white md:rounded-t-3xl md:w-full md:max-w-md">
              <button onClick={() => { setIsAdding(false); setIsEditing(false); }}><X /></button>
              <h2 className="font-black">{isEditing ? '修改紀錄' : '紀錄新足跡'}</h2><div className="w-10"></div>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 bg-white md:w-full md:max-w-md md:flex-none">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">日期</label><input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">縣市</label><select value={formData.county} onChange={e => handleCountyChange(e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none">{Object.keys(TAIWAN_DATA).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">鄉鎮市區</label><select value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none">{TAIWAN_DATA[formData.county].districts.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">地點名稱 (必填)</label><input type="text" required placeholder="例如：飛牛牧場" value={formData.locationName} onChange={e => setFormData({...formData, locationName: e.target.value})} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">照片回憶</label><div className="relative h-40 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden">{formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <><Camera size={24} className="text-slate-300"/><span className="text-xs text-slate-400">上傳照片</span></>}<input type="file" accept="image/*" className="absolute inset-0 opacity-0" onChange={(e) => { const file = e.target.files[0]; if(file) { const reader = new FileReader(); reader.onloadend = () => setFormData(prev => ({ ...prev, photo: reader.result })); reader.readAsDataURL(file); } }} /></div></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">筆記</label><textarea rows="3" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none" placeholder="想寫點什麼..." /></div>
              <button type="submit" disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg disabled:bg-slate-300 flex items-center justify-center gap-2">{isSaving ? <Loader2 className="animate-spin" /> : <Cloud size={20} />} {isSaving ? '正在同步...' : (isEditing ? '更新紀錄' : '存入回憶')}</button>
            </form>
          </div>
        )}
      </main>
      <footer className="md:hidden bg-white border-t px-6 py-2 pb-8 flex justify-between items-center z-50 shrink-0 shadow-lg">
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-blue-600' : 'text-slate-300'}`}><MapIcon size={24} /><span className="text-[10px] font-black">地圖</span></button>
        <button onClick={() => { setIsAdding(true); setIsEditing(false); }} className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center -top-6 relative active:scale-90 border-4 border-white"><Plus size={32} /></button>
        <button onClick={() => { setActiveTab('timeline'); setSelectedRecord(null); }} className={`flex flex-col items-center gap-1 ${activeTab === 'timeline' ? 'text-blue-600' : 'text-slate-300'}`}><List size={24} /><span className="text-[10px] font-black">時光軸</span></button>
      </footer>
      <style>{`.custom-icon { background: none; border: none; } .leaflet-container { font-family: inherit; }`}</style>
    </div>
  );
};

export default App;
