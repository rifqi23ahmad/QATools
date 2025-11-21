import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './FloatingFeedback.module.css';

// --- CONSTANTS & UTILITIES ---

const EMOJIS = [
  '👍', '👋', '😀', '😂', '😅', '🥰', '😍', 
  '😎', '🤔', '😱', '😭', '😤', '🎉', '🔥', 
  '🐛', '🤖', '✅', '❌', '❤️', '💔', '👀'
];

// Palet Warna Teks untuk Nama (Mirip WA Group)
const USER_COLORS = [
    '#e542a3', '#2ea6ff', '#c65500', '#029d00', 
    '#5c6bc0', '#b92b27', '#008f7a', '#d63031',
    '#1f7aec', '#fe5c5c', '#00a884', '#8c52ff'
];

const LS_DISPLAY_NAME_KEY = 'chat.displayname';
const LS_NAME_SET_KEY = 'chat.isnameset';

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; 
  }
  return Math.abs(hash);
}

const getColorForVisitor = (visitorId) => {
    if (!visitorId) return USER_COLORS[0];
    const hash = simpleHash(visitorId);
    const index = hash % USER_COLORS.length;
    return USER_COLORS[index];
};

function generateUniqueGuestName() {
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `Guest-${randomSuffix}`;
}

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [isNameSet, setIsNameSet] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [inputName, setInputName] = useState('');

  const [time, setTime] = useState(new Date());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null); 

  useEffect(() => {
    const savedName = localStorage.getItem(LS_DISPLAY_NAME_KEY);
    const savedIsSet = localStorage.getItem(LS_NAME_SET_KEY) === 'true';

    if (savedIsSet && savedName) {
      setDisplayName(savedName);
      setIsNameSet(true);
    }
  }, []);

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
    setInputName('');
  };

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
    const { data, error } = await supabase.rpc('getFeedbacks');

    if (!error && data) {
      setFeedbacks(data);
      scrollToBottom();
    } else if (error) {
      console.error("Error fetching feedbacks:", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    
    if (!inputMsg.trim() || !isNameSet) return; 
    
    setIsSending(true);
    setShowEmojiPicker(false); 

    try {
      const { error } = await supabase.rpc('sendFeedback', {
        visitorId: visitorId,
        message: inputMsg,
        displayName: displayName,
        userAgent: 'WebChat'
      });

      if (error) throw error;
      
      setInputMsg('');
      scrollToBottom();
      inputRef.current?.focus();
    } catch (err) {
      console.error("Gagal kirim:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); 
      handleSend();
    }
  };

  const handleAddEmoji = (emoji) => {
    setInputMsg((prev) => prev + emoji);
    inputRef.current?.focus(); 
  };

  const formatTimeStr = (isoString) => {
    return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return createPortal(
    <div className={styles.wrapper}>
      
      {isOpen && (
        <div className={styles.chatWindow}>
            
            {!isNameSet && (
                 <div className={styles.nameOverlay}> 
                    <div className={styles.namePrompt}>
                        <h2>Bergabung</h2>
                        <p>Masukkan nama Anda untuk mulai chat.</p>
                        
                        <input 
                            className={styles.input}
                            placeholder="Nama Panggilan..."
                            value={inputName}
                            onChange={(e) => setInputName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && inputName.trim().length >= 3) {
                                    handleSetName(false);
                                }
                            }}
                            style={{border: '1px solid #ccc'}}
                        />
                        <button 
                            className={styles.nameBtn} 
                            onClick={() => handleSetName(false)}
                            disabled={inputName.trim().length < 3}
                        >
                            Masuk
                        </button>
                        
                        <button 
                            className={styles.guestBtn} 
                            onClick={() => handleSetName(true)}
                        >
                            Masuk sebagai Tamu
                        </button>
                    </div>
                </div>
            )}

          <div className={styles.header}>
            <div className={styles.headerTop}>
              <span style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <i className="fab fa-whatsapp" style={{fontSize:'1.2rem'}}></i>
                Live Feedback 
              </span>
              <button onClick={() => setIsOpen(false)} style={{background:'none',border:'none',color:'white',cursor:'pointer',fontSize:'1.5rem', lineHeight:1}}>&times;</button>
            </div>
            <div className={styles.onlineStatus}>
              <span className={styles.onlineDot}></span>
              {onlineCount > 1 ? `${onlineCount} anggota online` : 'Online (Hanya Anda)'}
            </div>
          </div>

          <div className={styles.messageList} style={{ filter: isNameSet ? 'none' : 'blur(2px)' }}>
            {feedbacks.length === 0 && (
              <div style={{textAlign:'center', padding:'20px', background:'rgba(255,255,255,0.6)', borderRadius:'8px', margin:'auto', fontSize:'0.85rem', color:'#54656f'}}>
                🔒 Pesan terenkripsi secara end-to-end (canda).<br/>Belum ada pesan di sini. Jadilah yang pertama!
              </div>
            )}

            {feedbacks.map((msg) => {
              const isMe = msg.visitor_id === visitorId;
              
              let senderName;
              if (isMe) {
                  senderName = displayName; 
              } else if (msg.display_name) {
                  senderName = msg.display_name; 
              } else {
                  senderName = getReadableId(msg.visitor_id); 
              }

              // Warna teks nama untuk orang lain
              const nameColor = getColorForVisitor(msg.visitor_id);

              return (
                <div 
                  key={msg.id} 
                  className={`${styles.messageItem} ${isMe ? styles.myMessage : styles.otherMessage}`}
                >
                  {/* Nama Pengirim (Hanya untuk orang lain) */}
                  {!isMe && (
                    <div className={styles.senderName} style={{ color: nameColor }}>
                      {senderName}
                    </div>
                  )}
                  
                  {/* Isi Pesan */}
                  <div className={styles.messageContent}>
                    {msg.message}
                  </div>

                  {/* Waktu */}
                  <div className={styles.timestamp}>
                    {formatTimeStr(msg.created_at)}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.footer}>
            {showEmojiPicker && (
              <div className={styles.emojiPicker}>
                {EMOJIS.map((emoji) => (
                  <div 
                    key={emoji} 
                    className={styles.emojiItem}
                    onClick={() => handleAddEmoji(emoji)}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            )}

            <button 
              type="button"
              className={styles.emojiBtn}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Emoji"
            >
              😃
            </button>

            <textarea
              ref={inputRef} 
              className={styles.input}
              placeholder={isNameSet ? "Ketik pesan..." : "Nama dulu..."}
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending || !isNameSet}
              rows={1}
            />

            <button 
              type="button" 
              className={styles.sendBtn} 
              onClick={handleSend}
              disabled={isSending || !inputMsg.trim() || !isNameSet}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}

      <button 
        className={styles.floatingBtn} 
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Tutup Chat" : "Buka Chat"}
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