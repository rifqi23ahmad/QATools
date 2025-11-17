import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toolGroups } from '../toolConfig';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Klien Supabase
const supabaseUrl = 'https://aekpdgjnrkkhrdczrspz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFla3BkZ2pucmtraHJkY3pyc3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODk0NTEsImV4cCI6MjA3ODk2NTQ1MX0.bKLYQEucOXplidBQ18xA6L4-NJXUpiXbOoxQ27n0_5Y';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Fungsi Helper (di luar komponen) ---

// Mendapatkan tanggal YYYY-MM-DD
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Mendapatkan atau membuat Visitor ID unik di localStorage
const getVisitorId = () => {
  let visitorId = localStorage.getItem('qatools_visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID(); // Buat ID unik baru
    localStorage.setItem('qatools_visitor_id', visitorId);
  }
  return visitorId;
};


function Sidebar() {
  const [isMinimized, setIsMinimized] = useState(
    localStorage.getItem('sidebarMinimized') === 'true'
  );
  
  // State untuk 3 metrik
  const [counts, setCounts] = useState({ totalLikes: '...', totalVisitors: '...' });
  const [activeSessions, setActiveSessions] = useState('...'); // Terpisah untuk real-time
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  
  // State untuk tombol Like
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const visitorId = getVisitorId(); // Dapatkan ID unik untuk sesi browser ini

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', isMinimized);
  }, [isMinimized]);

  
  // --- useEffect [1]: Log Daily Visitor (HANYA SEKALI SAAT LOAD) ---
  // PERBAIKAN UTAMA ADA DI SINI
  useEffect(() => {
    
    // Logika GET-then-POST
    const logDailyVisitorIfNeeded = async () => {
      const today = getTodayDateString();

      try {
        console.log(`Checking DB for visitor: ${visitorId} on ${today}`);
        
        // LANGKAH 1: GET (Cek dulu)
        const { data, error: getError } = await supabase
          .from('visitors_daily')
          .select('id') // Hanya butuh 1 kolom
          .eq('visitor_id', visitorId)
          .eq('date', today)
          .limit(1); // Cukup 1 baris untuk konfirmasi

        if (getError) {
          throw getError; // Gagal GET
        }

        // LANGKAH 2: Analisis hasil GET
        if (data && data.length > 0) {
          // Data sudah ada di DB. Tidak perlu POST.
          console.log("DB check: Visitor already logged today. No POST needed.");
        } else {
          // Data tidak ada (data.length === 0). Ini kunjungan pertama hari ini.
          // LANGKAH 3: POST
          console.log(`DB check: Visitor not found. Logging new visitor...`);
          const { error: postError } = await supabase
            .from('visitors_daily')
            .insert({ visitor_id: visitorId, date: today });
          
          if (postError) {
            throw postError; // Gagal POST
          }
          console.log("DB check: New visitor logged successfully.");
        }
        
      } catch (error) {
        // Tangani error jika POST gagal (misal RLS)
        console.error("Gagal log daily_visitor (cek GET/POST):", error);
      }
    };
    
    // Jalankan fungsi
    logDailyVisitorIfNeeded();
    
    // 'page_views' sudah dihapus, tidak ada log lain di sini.
    
  }, [visitorId]); // <-- DEPENDENSI DIUBAH! Hanya 'visitorId'
  // Ini berarti useEffect [1] hanya berjalan SATU KALI saat komponen dimuat.
  // Ini tidak akan berjalan lagi saat Anda pindah menu.
  
  
  // --- FUNGSI FETCH DIPISAHKAN (useCallback) ---
  // 'isInitial' parameter untuk mengontrol spinner loading
  const fetchAnalyticsCounts = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsLoadingCounts(true);
    }
    try {
      const [likesRes, totalVisitorsRes] = await Promise.all([
        // 1. Total Likes (dari tabel 'likes')
        supabase.from('likes').select('*', { count: 'exact', head: true }),
                
        // 2. Total Visitors (dari 'visitors_daily' TANPA filter tanggal)
        supabase.from('visitors_daily').select('*', { count: 'exact', head: true })
      ]);

      if (likesRes.error) throw likesRes.error;
      if (totalVisitorsRes.error) throw totalVisitorsRes.error;

      setCounts({
        totalLikes: likesRes.count ?? 0,
        totalVisitors: totalVisitorsRes.count ?? 0
      });

    } catch (error) {
      console.error("Fetch analytics error:", error);
      if (isInitial) {
        setCounts({ totalLikes: 'Err', totalVisitors: 'Err' });
      }
    } finally {
      if (isInitial) {
        setIsLoadingCounts(false); 
      }
    }
  }, []); // <-- Dependensi kosong, fungsi ini tidak akan berubah

  // --- useEffect [2]: Fetch Analytics (Hanya jalan sekali saat load) ---
  useEffect(() => {
    fetchAnalyticsCounts(true); // Panggil dengan 'true' untuk initial load
  }, [fetchAnalyticsCounts]); // <-- Panggil fungsi 'useCallback'


  // --- useEffect [3]: REAL-TIME Active Session (Presence) ---
  useEffect(() => {
    const channel = supabase.channel('presence-sessions', {
      config: {
        presence: {
          key: visitorId, // Kunci unik untuk user ini
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      setActiveSessions(Object.keys(channel.presenceState()).length);
    });
    channel.on('presence', { event: 'join' }, () => {
      setActiveSessions(Object.keys(channel.presenceState()).length);
    });
    channel.on('presence', { event: 'leave' }, () => {
      setActiveSessions(Object.keys(channel.presenceState()).length);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ visitor_id: visitorId, joined_at: new Date().toISOString() });
      }
    });

    return () => {
      channel.untrack(); 
      supabase.removeChannel(channel);
    };

  }, [visitorId]); // <-- Jalankan ulang jika visitorId (seharusnya tidak) berubah

  // --- useEffect [4]: Cek Status Like dari localStorage ---
  useEffect(() => {
    const alreadyLiked = localStorage.getItem('qatools_has_liked') === 'true';
    setHasLiked(alreadyLiked);
  }, []);
  
  // --- FUNGSI BARU: handleLike ---
  const handleLike = async () => {
    if (hasLiked || isLiking) return; // Mencegah klik ganda

    setIsLiking(true); // Nonaktifkan tombol sementara
    
    // Optimistic Update: Set UI & localStorage dulu
    setHasLiked(true);
    localStorage.setItem('qatools_has_liked', 'true');

    try {
      // Kirim data ke Supabase
      const { error } = await supabase.from('likes').insert(
        { 
          visitor_id: visitorId, 
          item_id: 'qatools_app' // 'item_id' unik untuk seluruh aplikasi
        },
        { onConflict: 'visitor_id, item_id' } // Sesuai skema Anda
      );

      if (error) {
        throw error;
      }
      
      // Jika berhasil, panggil ulang fetch analytics (tanpa loading spinner)
      // untuk update angka "Total Likes"
      fetchAnalyticsCounts(false); 
      
    } catch (error) {
      console.error("Gagal mengirim 'Like':", error.message);
      // Jika gagal, kembalikan state (roll back)
      setHasLiked(false);
      localStorage.setItem('qatools_has_liked', 'false');
    } finally {
      setIsLiking(false); // Aktifkan tombol kembali
    }
  };
  
  
  // --- Sisa JSX (Render) ---
  return (
    <aside className={`sidebar ${isMinimized ? 'minimized' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-wrapper">
          <img 
            src="/qalogo.png" 
            alt="QaTools Logo" 
            className="sidebar-logo-open" 
          />
        </div>
        <img 
          src="/qasidebar.png" 
          alt="QaTools Icon" 
          className="sidebar-logo-minimized" 
        />
      </div>

      <nav className="sidebar-nav">
        <ul>
          {toolGroups.map(group => (
            <React.Fragment key={group.title}>
              <li className="nav-group-header"><span>{group.title}</span></li>
              {group.tools.map(tool => {
                const isActive = location.pathname === tool.path;
                return (
                  <li
                    key={tool.id}
                    className="nav-item" 
                    title={tool.name} 
                  >
                    <div 
                      role="link"
                      tabIndex="0"
                      className={`nav-link-custom ${isActive ? 'active' : ''}`}
                      onClick={() => navigate(tool.path)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(tool.path)}
                    >
                      <i className={`fas ${tool.icon} fa-fw`} />
                      <span>{tool.name}</span>
                    </div>
                  </li>
                );
              })}
            </React.Fragment>
          ))}
        </ul>
      </nav>
      
      {/* --- Tampilan JSX (Label sudah disesuaikan) --- */}
      <div className="sidebar-footer">
        
        {!isMinimized && (
          <div 
            className="supabase-counter-container" 
            style={{ 
              flex: 1, 
              minHeight: '110px', 
              padding: '0.5rem 0 0 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: '#1a202c', 
              color: '#a0aec0',
              fontSize: '14px',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {isLoadingCounts ? ( // Hanya gunakan spinner untuk data analitik
              <div style={{ fontSize: '12px', padding: '6px', color: '#a0aec0' }}>
                Memuat statistik...
              </div>
            ) : (
              <>
                {/* 1. Total Likes */}
                <div className="counter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-thumbs-up fa-fw" style={{ color: '#4299e1', fontSize: '16px' }} />
                  <span style={{ fontWeight: 500 }}>{counts.totalLikes.toLocaleString('id-ID')} Total Likes</span>
                </div>
                
                {/* 2. Online (Real-time dari Presence) */}
                <div className="counter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-user-clock fa-fw" style={{ color: '#48bb78', fontSize: '16px' }} />
                  <span style={{ fontWeight: 500 }}>{activeSessions.toLocaleString('id-ID')} Online</span>
                </div>

                {/* 3. Total Visitors (Total dari 'visitors_daily') */}
                <div className="counter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-users fa-fw" style={{ color: '#ecc94b', fontSize: '16px' }} />
                  <span style={{ fontWeight: 500 }}>{counts.totalVisitors.toLocaleString('id-ID')} Total Visitors</span>
                </div>
              </>
            )}
            
            {/* --- TOMBOL LIKE BARU --- */}
            <div style={{ marginTop: 'auto', paddingBottom: '8px' }}>
              <button 
                onClick={handleLike}
                disabled={hasLiked || isLiking} // Nonaktifkan jika sudah like atau sedang proses
                style={{
                  background: hasLiked ? 'transparent' : '#2d3748',
                  color: hasLiked ? '#48bb78' : '#a0aec0',
                  border: hasLiked ? '1px solid #48bb78' : '1px solid #4a5568',
                  width: '90%',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  cursor: hasLiked ? 'default' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
              >
                <i className={`fas ${hasLiked ? 'fa-check' : 'fa-thumbs-up'} fa-fw`} style={{ marginRight: '6px' }} />
                {hasLiked ? 'Liked!' : 'Like This App'}
              </button>
            </div>
            
          </div>
        )}

        {/* Tombol Sidebar Toggle (Tidak berubah) */}
        <button
          id="sidebar-toggle"
          title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
          onClick={() => setIsMinimized(prev => !prev)}
          style={{
            transform: isMinimized ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            marginLeft: isMinimized ? '0' : '0', 
            backgroundColor: 'var(--sidebar-active-bg)',
            color: 'var(--sidebar-text)',
            alignSelf: 'center' 
          }}
        >
          <i className="fas fa-chevron-left" />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;