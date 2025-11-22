import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toolGroups } from '../toolConfig';
import FloatingFeedback from './FloatingFeedback';
import { supabase } from '../services/supabaseClient';

// --- Fungsi Helper (di luar komponen) ---

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getVisitorId = () => {
  let visitorId = localStorage.getItem('qatools_visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('qatools_visitor_id', visitorId);
  }
  return visitorId;
};

function Sidebar() {
  const [isMinimized, setIsMinimized] = useState(
    localStorage.getItem('sidebarMinimized') === 'true'
  );
  
  const [counts, setCounts] = useState({ totalLikes: '...', totalVisitors: '...' });
  const [activeSessions, setActiveSessions] = useState('...');
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const visitorId = getVisitorId(); 

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', isMinimized);
  }, [isMinimized]);

  // --- Log Daily Visitor ---
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
  
  // --- Fetch Analytics ---
  const fetchAnalyticsCounts = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoadingCounts(true);
    try {
      const { data, error } = await supabase.rpc('getSidebarStats');
      if (error) throw error;
      setCounts({
        totalLikes: data.totalLikes ?? 0,
        totalVisitors: data.totalVisitors ?? 0
      });
    } catch (error) {
      if (isInitial) setCounts({ totalLikes: 'Err', totalVisitors: 'Err' });
    } finally {
      if (isInitial) setIsLoadingCounts(false); 
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsCounts(true);
  }, [fetchAnalyticsCounts]);

  // --- Active Session ---
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

  // --- Realtime Listener ---
  useEffect(() => {
    const statsChannel = supabase
      .channel('realtime-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => fetchAnalyticsCounts(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors_daily' }, () => fetchAnalyticsCounts(false))
      .subscribe();
    return () => { supabase.removeChannel(statsChannel); };
  }, [fetchAnalyticsCounts]);

  // --- Like Handler ---
  useEffect(() => {
    const alreadyLiked = localStorage.getItem('qatools_has_liked') === 'true';
    setHasLiked(alreadyLiked);
  }, []);
  
  const handleLike = async () => {
    if (hasLiked || isLiking) return;
    setIsLiking(true);
    setHasLiked(true);
    localStorage.setItem('qatools_has_liked', 'true');
    try {
      const { error } = await supabase.rpc('submitLike', { visitorId: visitorId });
      if (error) throw error;
    } catch (error) {
      setHasLiked(false);
      localStorage.setItem('qatools_has_liked', 'false');
    } finally {
      setIsLiking(false);
    }
  };
  
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
      
      <div className="sidebar-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '1rem' }}>
        
        <FloatingFeedback 
            supabase={supabase} 
            visitorId={visitorId}
            isSidebarMinimized={isMinimized} 
        />

        {!isMinimized && (
          <div 
            className="supabase-counter-container" 
            style={{ 
              padding: '0.5rem 0.5rem 0 0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              color: '#a0aec0',
              fontSize: '13px',
              fontFamily: 'Inter, system-ui, sans-serif',
              borderTop: '1px solid #2d3748',
              marginTop: '5px'
            }}
          >
            {isLoadingCounts ? (
              <div style={{ fontSize: '11px', color: '#a0aec0' }}>Memuat statistik...</div>
            ) : (
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px'}}>
                 <span title="Total Likes"><i className="fas fa-thumbs-up" style={{ color: '#4299e1' }}/> {counts.totalLikes.toLocaleString('id-ID')}</span>
                 {/* UPDATE: Menambahkan kata "Online" */}
                 <span title="Online"><i className="fas fa-user-clock" style={{ color: '#48bb78' }}/> {activeSessions.toLocaleString('id-ID')} Online</span>
                 <span title="Visitors"><i className="fas fa-users" style={{ color: '#ecc94b' }}/> {counts.totalVisitors.toLocaleString('id-ID')}</span>
              </div>
            )}
            
            <div>
              <button 
                onClick={handleLike}
                disabled={hasLiked || isLiking}
                style={{
                  background: hasLiked ? 'transparent' : '#2d3748',
                  color: hasLiked ? '#48bb78' : '#a0aec0',
                  border: hasLiked ? '1px solid #48bb78' : '1px solid #4a5568',
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  cursor: hasLiked ? 'default' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                <i className={`fas ${hasLiked ? 'fa-check' : 'fa-thumbs-up'} fa-fw`} style={{ marginRight: '6px' }} />
                {hasLiked ? 'Liked!' : 'Like App'}
              </button>
            </div>
          </div>
        )}

        <button
          id="sidebar-toggle"
          title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
          onClick={() => setIsMinimized(prev => !prev)}
          style={{
            marginTop: '5px', width: '100%', height: '30px',
            backgroundColor: 'transparent', color: '#4a5568',
            border: '1px dashed #4a5568', borderRadius: '6px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2d3748'; e.currentTarget.style.color = '#a0aec0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#4a5568'; }}
        >
          <i className={`fas ${isMinimized ? 'fa-chevron-right' : 'fa-chevron-left'}`} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;