import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { supabase } from '../services/supabaseClient';

const LS_USER_CODE = 'timesheet_user_code';
const LS_DEADLINE_HOUR = 'timesheet_deadline_hour';
const LS_DEADLINE_MINUTE = 'timesheet_deadline_minute';
const LS_ALARM_DAYS = 'timesheet_alarm_days'; // Key baru

// Default
const DEFAULT_HOUR = 17;
const DEFAULT_MINUTE = 0;
const DEFAULT_DAYS = [1, 2, 3, 4, 5]; // Default: Senin - Jumat (0=Minggu, 6=Sabtu)

const ALARM_LOOP_INTERVAL = 3000; 
const SNOOZE_DURATION = 10 * 60 * 1000; 

// Helper Tanggal
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper Ambil Settingan
const getDeadlineSettings = () => {
  const h = parseInt(localStorage.getItem(LS_DEADLINE_HOUR));
  const m = parseInt(localStorage.getItem(LS_DEADLINE_MINUTE));
  const d = localStorage.getItem(LS_ALARM_DAYS);
  
  let days = DEFAULT_DAYS;
  try {
      if (d) days = JSON.parse(d);
  } catch (e) { console.error("Error parsing days", e); }

  return {
    hour: !isNaN(h) ? h : DEFAULT_HOUR,
    minute: !isNaN(m) ? m : DEFAULT_MINUTE,
    days: Array.isArray(days) ? days : DEFAULT_DAYS
  };
};

const timerWorkerScript = `
  let intervalId;
  self.onmessage = function(e) {
    if (e.data === 'start') {
      intervalId = setInterval(() => self.postMessage('tick'), 1000);
    } else if (e.data === 'stop') {
      clearInterval(intervalId);
    }
  };
`;

function GlobalTimesheetManager() {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [userCode, setUserCode] = useState(localStorage.getItem(LS_USER_CODE) || '');
  const [hasFilledToday, setHasFilledToday] = useState(true);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [lastStopTimestamp, setLastStopTimestamp] = useState(0);
  
  // State untuk deadline dinamis
  const [deadline, setDeadline] = useState(getDeadlineSettings());
  
  const workerRef = useRef(null);
  const audioCtxRef = useRef(null);
  
  const stateRef = useRef({
    hasFilledToday: true,
    isAlarmRinging: false,
    lastStopTimestamp: 0,
    pathname: location.pathname,
    deadline: getDeadlineSettings()
  });

  // Sync State ke Ref
  useEffect(() => {
    stateRef.current.hasFilledToday = hasFilledToday;
    stateRef.current.isAlarmRinging = isAlarmRinging;
    stateRef.current.lastStopTimestamp = lastStopTimestamp;
    stateRef.current.pathname = location.pathname;
    stateRef.current.deadline = deadline;
    
    if (location.pathname === '/timesheet' && document.visibilityState === 'visible' && isAlarmRinging) {
        setIsAlarmRinging(false);
    }
  }, [hasFilledToday, isAlarmRinging, lastStopTimestamp, location.pathname, deadline]);

  // --- AUDIO ENGINE ---
  const initAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleInteraction = () => initAudioContext();
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [initAudioContext]);

  const playBeep = useCallback(() => {
    initAudioContext();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'square';
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.3);
      osc.frequency.setValueAtTime(800, now + 0.4);
      osc.frequency.linearRampToValueAtTime(600, now + 0.7);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.8);

      osc.start();
      osc.stop(now + 0.8);
    } catch (e) { console.error(e); }
  }, [initAudioContext]);


  // --- LOGIC CHECK & LISTENERS ---
  const checkStatus = useCallback(async () => {
    if (!userCode) return;
    const { data } = await supabase.rpc('checkTimesheetStatus', {
      p_user_code: userCode,
      p_date: getTodayStr()
    });
    const isFilled = !!data;
    setHasFilledToday(isFilled);
    if (isFilled) setIsAlarmRinging(false);
  }, [userCode]);

  useEffect(() => {
    const handleAuthChange = () => {
        const code = localStorage.getItem(LS_USER_CODE);
        setUserCode(code || '');
        if (code) checkStatus(); else setIsAlarmRinging(false);
    };
    const handleDataUpdate = () => checkStatus();
    
    const handleSettingsChange = () => {
        const newSettings = getDeadlineSettings();
        setDeadline(newSettings);
        setLastStopTimestamp(0); 
    };

    window.addEventListener('timesheet_auth_changed', handleAuthChange);
    window.addEventListener('timesheet_data_updated', handleDataUpdate);
    window.addEventListener('timesheet_settings_changed', handleSettingsChange);
    
    if (userCode) checkStatus();

    return () => {
      window.removeEventListener('timesheet_auth_changed', handleAuthChange);
      window.removeEventListener('timesheet_data_updated', handleDataUpdate);
      window.removeEventListener('timesheet_settings_changed', handleSettingsChange);
    };
  }, [checkStatus, userCode]);

  // --- WORKER LOGIC ---
  useEffect(() => {
    if (!userCode) return;

    const blob = new Blob([timerWorkerScript], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);

    workerRef.current.onmessage = () => {
      const now = new Date();
      const day = now.getDay(); // 0 (Minggu) - 6 (Sabtu)
      const h = now.getHours();
      const m = now.getMinutes();
      
      const { hasFilledToday, isAlarmRinging, lastStopTimestamp, pathname, deadline } = stateRef.current;
      
      // 1. Cek Hari: Apakah hari ini termasuk hari alarm aktif?
      const isDayActive = deadline.days.includes(day);

      if (isDayActive) {
          const isOnTimesheetPage = pathname === '/timesheet';
          const isTabHidden = document.visibilityState === 'hidden';

          // 2. Cek Waktu
          const isPast = (h > deadline.hour) || (h === deadline.hour && m >= deadline.minute);

          if (isPast && !hasFilledToday && !isAlarmRinging) {
              if (!isOnTimesheetPage || isTabHidden) {
                 const timeSinceStop = Date.now() - lastStopTimestamp;
                 if (timeSinceStop > SNOOZE_DURATION) {
                     setIsAlarmRinging(true);
                     if (Notification.permission === 'granted') {
                         new Notification("🚨 ALARM TIMESHEET!", { body: "Waktu habis! Isi sekarang.", requireInteraction: true });
                     }
                 }
              }
          }
      }
    };

    workerRef.current.postMessage('start');

    return () => {
      workerRef.current.postMessage('stop');
      workerRef.current.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, [userCode]); 

  // Loop Suara
  useEffect(() => {
    let interval;
    if (isAlarmRinging) {
      playBeep();
      interval = setInterval(playBeep, ALARM_LOOP_INTERVAL);
    }
    return () => clearInterval(interval);
  }, [isAlarmRinging, playBeep]);

  const handleSnooze = () => {
    setIsAlarmRinging(false);
    setLastStopTimestamp(Date.now());
  };

  const handleRedirect = () => {
    setIsAlarmRinging(false); 
    navigate('/timesheet');
  };

  if (!isAlarmRinging) return null;

  // --- OVERLAY ---
  const deadlineStr = `${String(deadline.hour).padStart(2,'0')}:${String(deadline.minute).padStart(2,'0')}`;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(220, 38, 38, 0.95)', zIndex: 99999, 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: 'white', textAlign: 'center', animation: 'fadeIn 0.3s'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem', fontWeight: 900, textShadow: '2px 2px 0 #000' }}>
        🚨 WAKTU HABIS! 🚨
      </h1>
      <p style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: 500 }}>
        Sudah lewat jam {deadlineStr} dan Timesheet belum diisi.
      </p>
      
      <div style={{display:'flex', gap:'1.5rem', flexWrap:'wrap', justifyContent:'center'}}>
        <button 
          onClick={handleRedirect}
          style={{
            padding: '18px 40px', fontSize: '1.3rem', border: 'none', borderRadius: '12px',
            backgroundColor: 'white', color: '#dc2626', fontWeight: '800', cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transform: 'scale(1)', transition: 'transform 0.1s'
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          📝 ISI SEKARANG
        </button>
        
        <button 
          onClick={handleSnooze}
          style={{
            padding: '18px 40px', fontSize: '1.3rem', border: '2px solid rgba(255,255,255,0.5)', borderRadius: '12px',
            backgroundColor: 'transparent', color: 'white', fontWeight: '600', cursor: 'pointer'
          }}
        >
          🔕 SNOOZE (10 Menit)
        </button>
      </div>
    </div>
  );
}

export default GlobalTimesheetManager;