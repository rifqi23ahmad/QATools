import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './FloatingFeedback.module.css';

// --- CONSTANTS & UTILITIES ---

// Palet Warna untuk pengguna lain
const OTHER_COLORS = [
    '#e1f5e1', // Hijau Muda
    '#f5e1e1', // Merah Muda
    '#e1e1f5', // Biru Muda
    '#f5f5e1', // Kuning Muda
    '#e1f5f5', // Cyan Muda
    '#f5e1f5', // Ungu Muda
    '#fff0e1', // Oranye Muda
    '#f0e1f5', // Lavender
];

// Key Local Storage
const LS_DISPLAY_NAME_KEY = 'chat.displayname';
const LS_NAME_SET_KEY = 'chat.isnameset';

// Fungsi Hashing Sederhana
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; 
  }
  return Math.abs(hash);
}

// Fungsi untuk mendapatkan warna berdasarkan visitor_id
const getColorForVisitor = (visitorId) => {
    if (!visitorId) return OTHER_COLORS[0];
    const hash = simpleHash(visitorId);
    const index = hash % OTHER_COLORS.length;
    return OTHER_COLORS[index];
};

// Fungsi untuk menghasilkan nama Guest yang unik (contoh: Guest-ABCD)
function generateUniqueGuestName() {
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `Guest-${randomSuffix}`;
}

// Fungsi untuk membuat ID yang mudah dibaca dari visitorId (contoh: Guest-A4B7)
const getReadableId = (id) => {
    const hash = simpleHash(id).toString(16);
    return `Guest-${hash.substring(0, 4).toUpperCase()}`;
};

// --- KOMPONEN UTAMA ---
function FloatingFeedback({ supabase, visitorId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  
  // --- NEW STATES FOR NAME VALIDATION ---
  const [isNameSet, setIsNameSet] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [inputName, setInputName] = useState('');
  // -------------------------------------

  const [time, setTime] = useState(new Date());
  const messagesEndRef = useRef(null);

  // Efek untuk memuat nama dari Local Storage saat mount
  useEffect(() => {
    const savedName = localStorage.getItem(LS_DISPLAY_NAME_KEY);
    const savedIsSet = localStorage.getItem(LS_NAME_SET_KEY) === 'true';

    if (savedIsSet && savedName) {
      setDisplayName(savedName);
      setIsNameSet(true);
    }
  }, []);

  // --- LOGIKA SET NAMA PENGGUNA ---
  const handleSetName = (isGuest = false) => {
    let name = '';
    if (isGuest) {
      name = generateUniqueGuestName();
    } else {
      const trimmedName = inputName.trim();
      if (trimmedName.length < 3) {
        alert("Nama harus lebih dari 2 karakter.");
        return;
      }
      name = trimmedName;
    }

    setDisplayName(name);
    setIsNameSet(true);
    localStorage.setItem(LS_DISPLAY_NAME_KEY, name);
    localStorage.setItem(LS_NAME_SET_KEY, 'true');
    setInputName(''); // Clear input after setting
  };

  // Efek Jam Hidup
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();
  
  const secDeg = (seconds / 60) * 360;
  const minDeg = ((minutes * 60 + seconds) / 3600) * 360;
  const hourDeg = ((hours % 12) / 12) * 360 + (minutes / 60) * 30;

  // Efek Chat (Fetch & Realtime) saat dibuka
  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks();
      
      const chatChannel = supabase
        .channel('public:feedback')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, (payload) => {
          setFeedbacks((prev) => [...prev, payload.new]);
          scrollToBottom();
        })
        .subscribe();

      const presenceChannel = supabase.channel('feedback_presence')
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          setOnlineCount(Object.keys(state).length);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ visitor_id: visitorId, online_at: new Date() });
          }
        });

      return () => {
        supabase.removeChannel(chatChannel);
        supabase.removeChannel(presenceChannel);
      };
    }
  }, [isOpen, supabase, visitorId]);

  const fetchFeedbacks = async () => {
    // NOTE: Kami berasumsi tabel Supabase sudah memiliki kolom 'display_name'.
    // Jika tidak, Supabase akan mengabaikannya, dan kami akan menggunakan fallback getReadableId.
    const { data, error } = await supabase
      .from('feedback')
      .select('*, display_name') 
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      setFeedbacks(data);
      scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    // Tambahkan validasi nama sudah di-set
    if (!inputMsg.trim() || !isNameSet) return; 
    
    setIsSending(true);
    try {
      // Mengirim display_name bersama pesan (asumsi kolom sudah ada)
      const { error } = await supabase.from('feedback').insert({
        visitor_id: visitorId,
        message: inputMsg,
        display_name: displayName, // Mengirim nama yang dipilih/dibuat
        user_agent: 'WebChat'
      });

      if (error) {
         console.warn("Gagal insert dengan display_name, mencoba tanpa.");
         // Fallback ke struktur lama
         const { error: fallbackError } = await supabase.from('feedback').insert({
            visitor_id: visitorId,
            message: inputMsg,
            user_agent: 'WebChat'
          });
         if(fallbackError) throw fallbackError;
      }
      
      setInputMsg('');
      scrollToBottom();
    } catch (err) {
      console.error("Gagal kirim:", err);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimeStr = (isoString) => {
    return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return createPortal(
    <div className={styles.wrapper}>
      
      {/* Chat Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
            
            {/* --- NAME SELECTION OVERLAY --- */}
            {!isNameSet && (
                 <div className={styles.nameOverlay}> 
                    <div className={styles.namePrompt}>
                        <h2>Bergabung ke Chat</h2>
                        <p>Masukkan nama Anda (min. 3 karakter) atau lanjutkan sebagai Tamu.</p>
                        
                        <input 
                            className={styles.input}
                            placeholder="Nama Panggilan Anda"
                            value={inputName}
                            onChange={(e) => setInputName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && inputName.trim().length >= 3) {
                                    handleSetName(false);
                                }
                            }}
                        />
                        <button 
                            className={styles.nameBtn} 
                            onClick={() => handleSetName(false)}
                            disabled={inputName.trim().length < 3}
                            style={{marginBottom: '10px'}}
                        >
                            Gunakan Nama Ini
                        </button>
                        
                        <div style={{borderBottom: '1px solid #e2e8f0', margin: '15px 0 10px 0'}}></div>
                        
                        <button 
                            className={styles.guestBtn} 
                            onClick={() => handleSetName(true)}
                        >
                            Lanjutkan sebagai Tamu Unik
                        </button>
                    </div>
                </div>
            )}
            {/* ------------------------------- */}


          <div className={styles.header}>
            <div className={styles.headerTop}>
              <span>Live Feedback</span>
              <button onClick={() => setIsOpen(false)} style={{background:'none',border:'none',color:'white',cursor:'pointer',fontSize:'1.5rem', lineHeight:1}}>&times;</button>
            </div>
            <div className={styles.onlineStatus}>
              <span className={styles.onlineDot}></span>
              {onlineCount > 1 ? `${onlineCount} orang online` : 'Online (Hanya Anda)'}
            </div>
          </div>

          <div className={styles.messageList} style={{ filter: isNameSet ? 'none' : 'blur(2px)' }}>
            {feedbacks.length === 0 && (
              <div style={{textAlign:'center', color:'#a0aec0', marginTop:'40px', fontSize:'0.85rem'}}>
                <i className="far fa-comments fa-2x" style={{marginBottom:'10px'}}></i><br/>
                Belum ada pesan. Sapa kami!
              </div>
            )}

            {feedbacks.map((msg) => {
              const isMe = msg.visitor_id === visitorId;
              
              // Tentukan Nama Pengirim
              let senderName;
              if (isMe) {
                  senderName = displayName; // Gunakan nama lokal yang dipilih/dibuat
              } else if (msg.display_name) {
                  senderName = msg.display_name; // Jika DB support, pakai nama dari DB
              } else {
                  senderName = getReadableId(msg.visitor_id); // Fallback: Unique ID dari visitor_id
              }

              const color = getColorForVisitor(msg.visitor_id);
              const messageStyle = isMe 
                ? {} 
                : { 
                    backgroundColor: color, 
                    color: '#1a202c', 
                    border: '1px solid ' + color.replace('f5', 'e0'), 
                  };

              return (
                <div 
                  key={msg.id} 
                  className={`${styles.messageItem} ${isMe ? styles.myMessage : styles.otherMessage}`}
                  style={messageStyle}
                >
                  {msg.message}
                  <span className={styles.meta} style={{color: isMe ? 'rgba(255,255,255,0.8)' : '#718096'}}>
                    {senderName} • {formatTimeStr(msg.created_at)}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.footer} onSubmit={handleSend}>
            <input 
              className={styles.input}
              placeholder={isNameSet ? "Ketik pesan..." : "Harap tentukan nama dulu"}
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              disabled={isSending || !isNameSet}
            />
            <button type="submit" className={styles.sendBtn} disabled={isSending || !inputMsg.trim() || !isNameSet}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}

      {/* Floating Button (Jam Analog) */}
      <button 
        className={styles.floatingBtn} 
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Tutup Chat" : "Buka Feedback"}
      >
        {isOpen ? (
          <i className="fas fa-chevron-down" style={{fontSize:'1.5rem', color: '#ecc94b'}}></i>
        ) : (
          <div className={styles.clockFace}>
            <div className={`${styles.hand} ${styles.hourHand}`} style={{ transform: `translateX(-50%) rotate(${hourDeg}deg)` }}></div>
            <div className={`${styles.hand} ${styles.minuteHand}`} style={{ transform: `translateX(-50%) rotate(${minDeg}deg)` }}></div>
            <div className={`${styles.hand} ${styles.secondHand}`} style={{ transform: `translateX(-50%) rotate(${secDeg}deg)` }}></div>
          </div>
        )}
      </button>

    </div>,
    document.body
  );
}

export default FloatingFeedback;