import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import styles from './TimesheetTracker.module.css';

// ... (CONSTANTS & HELPER FUNCTIONS TIDAK BERUBAH) ...
const LS_USER_CODE = 'timesheet_user_code';
const LS_DEADLINE_HOUR = 'timesheet_deadline_hour';
const LS_DEADLINE_MINUTE = 'timesheet_deadline_minute';
const LS_ALARM_DAYS = 'timesheet_alarm_days'; 
const DEFAULT_HOUR = 17;
const DEFAULT_MINUTE = 0;
const DEFAULT_DAYS = [1, 2, 3, 4, 5]; 

const DAYS_LABEL = [
    { id: 1, label: 'Sen' }, { id: 2, label: 'Sel' }, { id: 3, label: 'Rab' },
    { id: 4, label: 'Kam' }, { id: 5, label: 'Jum' }, { id: 6, label: 'Sab' }, { id: 0, label: 'Min' },
];

const getTodayStr = () => { /* ... */ const d = new Date(); const year = d.getFullYear(); const month = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };
const formatDateToID = (isoDate) => { /* ... */ if (!isoDate) return '-'; const [year, month, day] = isoDate.split('-'); return `${day}-${month}-${year}`; };

function TimesheetTracker() {
  // ... (State lama tetap sama) ...
  const [userCode, setUserCode] = useState(localStorage.getItem(LS_USER_CODE) || '');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem(LS_USER_CODE));
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFilledToday, setHasFilledToday] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [inputDate, setInputDate] = useState(getTodayStr());
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingHour, setSettingHour] = useState(DEFAULT_HOUR);
  const [settingMinute, setSettingMinute] = useState(DEFAULT_MINUTE);
  const [settingDays, setSettingDays] = useState(DEFAULT_DAYS);
  const [toast, setToast] = useState(null);

  // --- STATE BARU UNTUK MODAL HAPUS ---
  const [idToDelete, setIdToDelete] = useState(null); 

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ... (handleLogin, handleLogout, fetchEntries, useEffect timer, Settings Logic, handleEditClick, handleCancelEdit, handleSubmit TETAP SAMA) ...
  
  const handleLogin = (e) => { e.preventDefault(); const code = userCode.trim().toLowerCase(); if (!code) { showToast("Masukkan kode unik!", 'error'); return; } localStorage.setItem(LS_USER_CODE, code); setUserCode(code); setIsLoggedIn(true); window.dispatchEvent(new Event('timesheet_auth_changed')); if (Notification.permission !== 'granted') Notification.requestPermission(); };
  const handleLogout = () => { localStorage.removeItem(LS_USER_CODE); setUserCode(''); setIsLoggedIn(false); setEntries([]); window.dispatchEvent(new Event('timesheet_auth_changed')); };
  const fetchEntries = useCallback(async () => { if (!userCode) return; setLoading(true); const { data, error } = await supabase.rpc('getTimesheets', { p_user_code: userCode }); if (!error) { setEntries(data || []); const todayStr = getTodayStr(); const filled = (data || []).some(item => item.work_date === todayStr); setHasFilledToday(filled); } else { console.error("RPC Error:", error); showToast("Gagal memuat data.", "error"); } setLoading(false); }, [userCode]);
  useEffect(() => { if (isLoggedIn) { fetchEntries(); const h = localStorage.getItem(LS_DEADLINE_HOUR); const m = localStorage.getItem(LS_DEADLINE_MINUTE); const d = localStorage.getItem(LS_ALARM_DAYS); if (h !== null) setSettingHour(parseInt(h)); if (m !== null) setSettingMinute(parseInt(m)); if (d !== null) { try { setSettingDays(JSON.parse(d)); } catch(e){} } } }, [isLoggedIn, fetchEntries]);
  useEffect(() => { if (!isLoggedIn) return; const timer = setInterval(() => { const now = new Date(); const h = String(now.getHours()).padStart(2,'0'); const m = String(now.getMinutes()).padStart(2,'0'); const s = String(now.getSeconds()).padStart(2,'0'); setCurrentTimeStr(`${h}:${m}:${s}`); }, 1000); return () => clearInterval(timer); }, [isLoggedIn]);
  const toggleDay = (dayId) => { if (settingDays.includes(dayId)) { setSettingDays(settingDays.filter(d => d !== dayId)); } else { setSettingDays([...settingDays, dayId]); } };
  const saveSettings = () => { localStorage.setItem(LS_DEADLINE_HOUR, settingHour); localStorage.setItem(LS_DEADLINE_MINUTE, settingMinute); localStorage.setItem(LS_ALARM_DAYS, JSON.stringify(settingDays)); setShowSettings(false); showToast("Pengaturan alarm berhasil disimpan.", "success"); window.dispatchEvent(new Event('timesheet_settings_changed')); };
  const handleEditClick = (entry) => { setEditingId(entry.id); setInputDate(entry.work_date); setActivity(entry.activity); setDuration(entry.duration); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleCancelEdit = () => { setEditingId(null); setActivity(''); setDuration(''); setInputDate(getTodayStr()); };
  const handleSubmit = async (e) => { e.preventDefault(); if (!activity) { showToast("Aktivitas wajib diisi!", "error"); return; } const durationVal = duration ? parseFloat(duration) : 0; if (durationVal > 10) { showToast("Durasi maksimal 10 jam!", "error"); return; } setIsSubmitting(true); const params = { p_user_code: userCode, p_work_date: inputDate, p_activity: activity, p_duration: durationVal }; let error; if (editingId) { const { error: rpcError } = await supabase.rpc('updateTimesheet', { p_id: editingId, ...params }); error = rpcError; } else { const { error: rpcError } = await supabase.rpc('addTimesheet', params); error = rpcError; } if (error) { showToast("Gagal: " + error.message, "error"); } else { setActivity(''); setDuration(''); setInputDate(getTodayStr()); setEditingId(null); fetchEntries(); window.dispatchEvent(new Event('timesheet_data_updated')); showToast(editingId ? "Data diperbarui!" : "Data disimpan!", "success"); } setIsSubmitting(false); };

  // --- UPDATE: LOGIKA HAPUS DENGAN MODAL CUSTOM ---
  
  // 1. Trigger saat tombol sampah diklik (hanya set ID)
  const handleRequestDelete = (id) => {
    setIdToDelete(id);
  };

  // 2. Trigger saat tombol "Hapus" di modal diklik (eksekusi)
  const confirmDeleteAction = async () => {
    if (!idToDelete) return;
    
    const { error } = await supabase.rpc('deleteTimesheet', { p_id: idToDelete });
    
    if (!error) {
        if (editingId === idToDelete) handleCancelEdit();
        fetchEntries();
        window.dispatchEvent(new Event('timesheet_data_updated'));
        showToast("Data berhasil dihapus.", "success");
    } else {
        showToast("Gagal menghapus.", "error");
    }
    // Tutup modal
    setIdToDelete(null);
  };

  // 3. Batal hapus
  const cancelDeleteAction = () => {
    setIdToDelete(null);
  };

  // --- RENDER ---
  if (!isLoggedIn) return ( <div className={styles.loginContainer}> {toast && <div className={`${styles.toast} ${styles[toast.type]}`}><span>{toast.message}</span></div>} <div className={styles.loginCard}> <div className={styles.iconWrapper}><i className="fas fa-user-astronaut"></i></div> <h2 className={styles.loginTitle}>Selamat Datang</h2> <p className={styles.loginSubtitle}>Masukkan Kode Unik untuk mengakses Timesheet</p> <form onSubmit={handleLogin}> <div className={styles.inputGroup}> <input type="text" className={styles.styledInput} placeholder="Contoh: rifqi123" value={userCode} onChange={e=>setUserCode(e.target.value)} autoFocus /> <i className={`fas fa-key ${styles.inputIcon}`}></i> </div> <button className={styles.loginBtn}>Masuk Sekarang <i className="fas fa-arrow-right"></i></button> </form> </div> </div> );

  const deadlineStr = `${String(settingHour).padStart(2,'0')}:${String(settingMinute).padStart(2,'0')}`;

  return (
    <div className={styles.container}>
      {toast && <div className={`${styles.toast} ${styles[toast.type]}`}><span>{toast.message}</span></div>}

      <div className={styles.headerBoard}>
        <div className={styles.userInfo}>
          <h2>Halo, {userCode} 👋</h2>
          <div style={{fontSize: '0.9rem', color: '#718096', marginTop: '4px'}}>
             Jam: <span style={{fontWeight:'bold', color: '#2d3748', fontFamily:'monospace', fontSize:'1rem'}}>{currentTimeStr}</span>
          </div>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={() => setShowSettings(true)} className="button secondary" title="Atur Alarm"><i className="fas fa-cog"></i></button>
            <button onClick={handleLogout} className="button secondary">🚪 Keluar</button>
        </div>
      </div>

      <div className={`${styles.reminderBanner} ${hasFilledToday ? styles.success : ''}`}>
          {hasFilledToday ? (
              <>
                  <i className="fas fa-check-circle fa-2x"></i>
                  <div><strong>Aman!</strong> Timesheet hari ini sudah terisi.</div>
              </>
          ) : (
              <>
                  <i className="fas fa-clock fa-2x"></i>
                  <div>
                      <strong>Belum Isi!</strong> Deadline: {deadlineStr}. 
                      {parseInt(currentTimeStr.split(':')[0]) >= settingHour ? " (Telat!)" : ""}
                  </div>
              </>
          )}
      </div>

      {/* --- MODAL KONFIRMASI HAPUS BARU --- */}
      {idToDelete && (
        <div className={styles.modalOverlay}>
            <div className={styles.deleteCard}>
                <div className={styles.deleteIconWrapper}>
                    <i className="fas fa-trash-alt"></i>
                </div>
                <h3 className={styles.deleteTitle}>Hapus Entri?</h3>
                <p className={styles.deleteMessage}>
                    Apakah Anda yakin ingin menghapus aktivitas ini? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className={styles.deleteActions}>
                    <button onClick={cancelDeleteAction} className={styles.btnCancel}>Batal</button>
                    <button onClick={confirmDeleteAction} className={styles.btnConfirm}>Ya, Hapus</button>
                </div>
            </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
          <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                  <div className={styles.modalHeader}>
                      <h3>⏰ Pengaturan Alarm</h3>
                      <button onClick={() => setShowSettings(false)} className={styles.closeBtn}>&times;</button>
                  </div>
                  <div className={styles.modalBody}>
                      <p style={{marginBottom: '0.5rem', color: '#666', fontSize:'0.9rem'}}>Waktu Deadline:</p>
                      <div style={{display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', marginBottom:'1.5rem'}}>
                          <div><label className="label" style={{fontSize:'0.8rem'}}>Jam</label><input type="number" min="0" max="23" className={styles.timeInput} value={settingHour} onChange={e => setSettingHour(parseInt(e.target.value))} /></div>
                          <span style={{fontSize: '2rem', fontWeight: 'bold', marginTop: '1rem'}}>:</span>
                          <div><label className="label" style={{fontSize:'0.8rem'}}>Menit</label><input type="number" min="0" max="59" className={styles.timeInput} value={settingMinute} onChange={e => setSettingMinute(parseInt(e.target.value))} /></div>
                      </div>

                      <p style={{marginBottom: '0.5rem', color: '#666', fontSize:'0.9rem'}}>Hari Alarm Aktif:</p>
                      <div className={styles.daySelector}>
                          {DAYS_LABEL.map((d) => (
                              <button 
                                  key={d.id} 
                                  className={`${styles.dayBtn} ${settingDays.includes(d.id) ? styles.dayBtnActive : ''}`}
                                  onClick={() => toggleDay(d.id)}
                              >
                                  {d.label}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div className={styles.modalFooter}>
                      <button onClick={saveSettings} className="button primary" style={{width: '100%'}}>Simpan Pengaturan</button>
                  </div>
              </div>
          </div>
      )}

      {/* FORM */}
      <div className={`${styles.formCard} ${editingId ? styles.editingMode : ''}`}>
        <div className={styles.formHeader}>
            <h3 className="label" style={{margin:0, fontSize: '1.1rem'}}>
                {editingId ? '✏️ Edit Aktivitas' : '📝 Tambah Aktivitas Baru'}
            </h3>
            {editingId && <button onClick={handleCancelEdit} className="button secondary" style={{padding:'4px 10px', fontSize:'0.85rem'}}>Batal Edit</button>}
        </div>
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.rowTwoColumns}>
            <div className={styles.formGroup}><label className="label">Tanggal</label><input type="date" className="input" value={inputDate} onChange={e=>setInputDate(e.target.value)} required /></div>
            <div className={styles.formGroup}>
                <label className="label">Jam (Durasi)</label>
                <input type="number" step="0.5" max="10" className="input" placeholder="(Opsional) Max 10 jam" value={duration} onChange={e=>setDuration(e.target.value)} />
            </div>
          </div>
          <div className={styles.formGroup}><label className="label">Aktivitas Detail</label><textarea className={styles.textareaInput} placeholder="Tulis deskripsi pekerjaan..." value={activity} onChange={e=>setActivity(e.target.value)} required rows={4} /></div>
          <div className={styles.formActions}>
            <button className={`button ${editingId ? 'success' : 'primary'}`} disabled={isSubmitting} style={{minWidth:'140px', height:'44px', fontSize:'1rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                {isSubmitting ? 'Menyimpan...' : (editingId ? <><i className="fas fa-check"></i><span>Update</span></> : <><i className="fas fa-save"></i><span>Simpan</span></>)}
            </button>
          </div>
        </form>
      </div>

      {/* HISTORY */}
      <div className={styles.historySection}>
        <div className={styles.tableScrollWrapper}>
            <table className={styles.historyTable}>
            <thead className={styles.stickyHeader}>
                <tr>
                    <th style={{width: '130px'}}>Tanggal</th>
                    <th>Aktivitas</th>
                    <th style={{textAlign:'right', width: '100px'}}>Aksi</th>
                </tr>
            </thead>
            <tbody>
                {entries.length === 0 ? (
                    <tr><td colSpan="3" style={{textAlign:'center', padding:'2rem', color:'#999'}}>Belum ada data.</td></tr>
                ) : (
                    entries.map(e => (
                        <tr key={e.id} className={editingId === e.id ? styles.rowEditing : ''}>
                            <td style={{verticalAlign: 'top'}}>
                                <span className={styles.dateBadge}>{formatDateToID(e.work_date)}</span>
                                {e.duration > 0 && <div style={{fontSize:'0.8rem', color:'#718096', marginTop:'4px'}}>{e.duration} Jam</div>}
                            </td>
                            <td style={{fontWeight: '500', color: '#2d3748', whiteSpace: 'pre-wrap', verticalAlign: 'top'}}>{e.activity}</td>
                            <td style={{textAlign:'right', verticalAlign: 'top'}}>
                                <div style={{display:'flex', justifyContent:'flex-end', gap:'6px'}}>
                                    <button className="button secondary" onClick={()=>handleEditClick(e)} title="Edit" style={{padding:'6px 10px', color:'var(--primary-color)'}}><i className="fas fa-pencil-alt"></i></button>
                                    
                                    {/* UPDATE TOMBOL HAPUS: Panggil handleRequestDelete */}
                                    <button 
                                        className="button secondary" 
                                        onClick={()=>handleRequestDelete(e.id)} 
                                        title="Hapus" 
                                        style={{padding:'6px 10px', color:'#e53e3e', borderColor:'#fed7d7', background:'#fff5f5'}}
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

export default TimesheetTracker;