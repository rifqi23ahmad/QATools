import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toolGroups } from '../toolConfig';
import { createClient } from '@supabase/supabase-js';
import FloatingFeedback from './FloatingFeedback';
import { supabase } from '../services/supabaseClient';


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
  const [activeSessions, setActiveSessions] = useState('...');
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  
  // State untuk tombol Like
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const visitorId = getVisitorId(); 

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', isMinimized);
  }, [isMinimized]);

  // --- useEffect [1]: Log Daily Visitor (RPC: logDailyVisitor) ---
  useEffect(() => {
    const logDailyVisitorIfNeeded = async () => {
      const today = getTodayDateString();
      try {
        const { error } = await supabase.rpc('logDailyVisitor', {
          visitorId: visitorId,
          date: today
        });

        if (error) throw error;
      } catch (error) {
        console.error("Gagal log daily_visitor:", error);
      }
    };
    
    logDailyVisitorIfNeeded();
  }, [visitorId]); 
  
  // --- Fetch Analytics Counts (RPC: getSidebarStats) ---
  const fetchAnalyticsCounts = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsLoadingCounts(true);
    }
    try {
      const { data, error } = await supabase.rpc('getSidebarStats');

      if (error) throw error;

      setCounts({
        totalLikes: data.totalLikes ?? 0,
        totalVisitors: data.totalVisitors ?? 0
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
  }, []);

  useEffect(() => {
    fetchAnalyticsCounts(true);
  }, [fetchAnalyticsCounts]);

  // --- useEffect [2]: REAL-TIME Active Session ---
  useEffect(() => {
    const channel = supabase.channel('presence-sessions', {
      config: { presence: { key: visitorId } },
    });

    const updateCount = () => setActiveSessions(Object.keys(channel.presenceState()).length);

    channel
      .on('presence', { event: 'sync' }, updateCount)
      .on('presence', { event: 'join' }, updateCount)
      .on('presence', { event: 'leave' }, updateCount)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ visitor_id: visitorId, joined_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.untrack(); 
      supabase.removeChannel(channel);
    };
  }, [visitorId]);

  // --- useEffect [3]: REAL-TIME Listener untuk Likes & Visitors (BARU) ---
  useEffect(() => {
    const statsChannel = supabase
      .channel('realtime-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => {
          // Jika ada like baru masuk, refresh counter
          fetchAnalyticsCounts(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitors_daily' },
        () => {
          // Jika ada visitor baru, refresh counter
          fetchAnalyticsCounts(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statsChannel);
    };
  }, [fetchAnalyticsCounts]);

  // --- useEffect [4]: Cek Status Like Lokal ---
  useEffect(() => {
    const alreadyLiked = localStorage.getItem('qatools_has_liked') === 'true';
    setHasLiked(alreadyLiked);
  }, []);
  
  // --- Handle Like (RPC: submitLike) ---
  const handleLike = async () => {
    if (hasLiked || isLiking) return;

    setIsLiking(true);
    setHasLiked(true);
    localStorage.setItem('qatools_has_liked', 'true');

    try {
      const { error } = await supabase.rpc('submitLike', {
        visitorId: visitorId
      });

      if (error) throw error;
      
      // Refresh counter tidak perlu dipanggil manual di sini karena
      // Realtime Listener di useEffect [3] akan menangkap perubahannya otomatis!
      
    } catch (error) {
      console.error("Gagal mengirim 'Like':", error.message);
      setHasLiked(false);
      localStorage.setItem('qatools_has_liked', 'false');
    } finally {
      setIsLiking(false);
    }
  };
  
  // --- Render ---
  return (
    <aside className={`sidebar ${isMinimized ? 'minimized' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-wrapper">
          <img src="/qalogo.png" alt="QaTools Logo" className="sidebar-logo-open" />
        </div>
        <img src="/qasidebar.png" alt="QaTools Icon" className="sidebar-logo-minimized" />
      </div>

      <nav className="sidebar-nav">
        <ul>
          {toolGroups.map(group => (
            <React.Fragment key={group.title}>
              <li className="nav-group-header"><span>{group.title}</span></li>
              {group.tools.map(tool => {
                const isActive = location.pathname === tool.path;
                return (
                  <li key={tool.id} className="nav-item" title={tool.name}>
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
            {isLoadingCounts ? (
              <div style={{ fontSize: '12px', padding: '6px', color: '#a0aec0' }}>
                Memuat statistik...
              </div>
            ) : (
              <>
                <div className="counter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-thumbs-up fa-fw" style={{ color: '#4299e1', fontSize: '16px' }} />
                  <span style={{ fontWeight: 500 }}>{counts.totalLikes.toLocaleString('id-ID')} Total Likes</span>
                </div>
                <div className="counter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-user-clock fa-fw" style={{ color: '#48bb78', fontSize: '16px' }} />
                  <span style={{ fontWeight: 500 }}>{activeSessions.toLocaleString('id-ID')} Online</span>
                </div>
                <div className="counter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-users fa-fw" style={{ color: '#ecc94b', fontSize: '16px' }} />
                  <span style={{ fontWeight: 500 }}>{counts.totalVisitors.toLocaleString('id-ID')} Total Visitors</span>
                </div>
              </>
            )}
            
            <div style={{ marginTop: 'auto', paddingBottom: '8px', paddingRight: '1rem' }}>
              <button 
                onClick={handleLike}
                disabled={hasLiked || isLiking}
                style={{
                  background: hasLiked ? 'transparent' : '#2d3748',
                  color: hasLiked ? '#48bb78' : '#a0aec0',
                  border: hasLiked ? '1px solid #48bb78' : '1px solid #4a5568',
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  cursor: hasLiked ? 'default' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                <i className={`fas ${hasLiked ? 'fa-check' : 'fa-thumbs-up'} fa-fw`} style={{ marginRight: '6px' }} />
                {hasLiked ? 'Liked!' : 'Like This App'}
              </button>
            </div>
          </div>
        )}

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

      <FloatingFeedback 
        supabase={supabase} 
        visitorId={visitorId} 
      />

    </aside>
  );
}

export default Sidebar;