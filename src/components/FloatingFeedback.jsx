import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './FloatingFeedback.module.css';

// --- PALET WARNA UNTUK PENGGUNA LAIN (Pastels yang berbeda) ---
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

// Fungsi Hashing Sederhana untuk menghasilkan warna yang konsisten dari string
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
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


function FloatingFeedback({ supabase, visitorId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  
  const [time, setTime] = useState(new Date());

  const messagesEndRef = useRef(null);

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
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
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
    if (!inputMsg.trim()) return;
    
    setIsSending(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        visitor_id: visitorId,
        message: inputMsg,
        user_agent: 'WebChat'
      });
      if (error) throw error;
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

          <div className={styles.messageList}>
            {feedbacks.length === 0 && (
              <div style={{textAlign:'center', color:'#a0aec0', marginTop:'40px', fontSize:'0.85rem'}}>
                <i className="far fa-comments fa-2x" style={{marginBottom:'10px'}}></i><br/>
                Belum ada pesan. Sapa kami!
              </div>
            )}

            {feedbacks.map((msg) => {
              const isMe = msg.visitor_id === visitorId;
              
              // --- LOGIKA WARNA DINAMIS ---
              const color = getColorForVisitor(msg.visitor_id);
              const messageStyle = isMe 
                ? {} // Gunakan styles.myMessage
                : { 
                    backgroundColor: color, 
                    color: '#1a202c', // Teks gelap agar terbaca di latar terang
                    border: '1px solid ' + color.replace('f5', 'e0'), // Border sedikit lebih gelap
                  };
              // --- AKHIR LOGIKA WARNA DINAMIS ---

              return (
                <div 
                  key={msg.id} 
                  className={`${styles.messageItem} ${isMe ? styles.myMessage : styles.otherMessage}`}
                  style={messageStyle} // Terapkan style dinamis di sini
                >
                  {msg.message}
                  <span className={styles.meta} style={{color: isMe ? 'rgba(255,255,255,0.8)' : '#718096'}}>
                    {isMe ? 'Anda' : 'Guest'} • {formatTimeStr(msg.created_at)}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.footer} onSubmit={handleSend}>
            <input 
              className={styles.input}
              placeholder="Ketik pesan..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              disabled={isSending}
            />
            <button type="submit" className={styles.sendBtn} disabled={isSending || !inputMsg.trim()}>
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