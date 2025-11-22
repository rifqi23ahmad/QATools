import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './FloatingFeedback.module.css';

// --- CONSTANTS & UTILITIES ---

const EMOJIS = [
  '👍', '👋', '😀', '😂', '😅', '🥰', '😍', 
  '😎', '🤔', '😱', '😭', '😤', '🎉', '🔥', 
  '🐛', '🤖', '✅', '❌', '❤️', '💔', '👀'
];

const USER_COLORS = [
    '#e542a3', '#2ea6ff', '#c65500', '#029d00', 
    '#5c6bc0', '#b92b27', '#008f7a', '#d63031',
    '#1f7aec', '#fe5c5c', '#00a884', '#8c52ff'
];

// Konfigurasi Batas File
const MAX_FILE_SIZE_MB = 2; 
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

const LS_DISPLAY_NAME_KEY = 'chat.displayname';
const LS_NAME_SET_KEY = 'chat.isnameset';

function simpleHash(str) {
  let hash = 0;
  if (!str) return hash;
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

// --- FUNGSI KONVERSI BASE64 ---
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// --- KOMPONEN UTAMA ---
function FloatingFeedback({ supabase, visitorId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // State Attachment & Preview
  const [attachment, setAttachment] = useState(null); 
  const [expandedImage, setExpandedImage] = useState(null); 
  
  // State Admin & Sistem
  const [isAdmin, setIsAdmin] = useState(false);
  const [systemNotification, setSystemNotification] = useState(null); 
  
  // State Delete Confirmation
  const [deletingMsgId, setDeletingMsgId] = useState(null);

  const [isNameSet, setIsNameSet] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [inputName, setInputName] = useState('');

  const [time, setTime] = useState(new Date());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null); 
  const fileInputRef = useRef(null); 
  
  const emojiPickerRef = useRef(null);
  const emojiBtnRef = useRef(null);

  const pinnedMessage = feedbacks.filter(f => f.is_pinned).pop();

  useEffect(() => {
    const savedName = localStorage.getItem(LS_DISPLAY_NAME_KEY);
    const savedIsSet = localStorage.getItem(LS_NAME_SET_KEY) === 'true';

    if (savedIsSet && savedName) {
      setDisplayName(savedName);
      setIsNameSet(true);
    }
  }, []);

  // Tutup emoji picker saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker && 
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target) &&
        emojiBtnRef.current && 
        !emojiBtnRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const showToast = (text, type = 'info') => {
      setSystemNotification({ text, type });
      setTimeout(() => setSystemNotification(null), 3000);
  };

  const handleSetName = (isGuest = false) => {
    let name = '';
    if (isGuest) {
      name = generateUniqueGuestName();
    } else {
      const trimmedName = inputName.trim();
      if (trimmedName.length < 3) {
        showToast("Nama harus lebih dari 2 karakter.", 'error');
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setFeedbacks((prev) => [...prev, payload.new]);
            scrollToBottom();
          } else if (payload.eventType === 'DELETE') {
            setFeedbacks((prev) => prev.filter(msg => msg.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setFeedbacks((prev) => prev.map(msg => msg.id === payload.new.id ? payload.new : msg));
          }
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
    // UPDATE: Panggil fungsi 'getFeedbacks' (sesuai nama baru di DB)
    const { data, error } = await supabase.rpc('getFeedbacks'); 

    if (!error && data) {
      setFeedbacks(data);
      scrollToBottom();
    }
  };

  function scrollToBottom() {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

  const processFile = async (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
        showToast("Format file tidak didukung.", 'error');
        return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast(`File terlalu besar! Maksimal ${MAX_FILE_SIZE_MB}MB.`, 'error');
        return;
    }
    try {
        const base64 = await fileToBase64(file);
        setAttachment({
            name: file.name,
            type: file.type.includes('pdf') ? 'pdf' : 'image',
            data: base64,
            isPdf: file.type.includes('pdf')
        });
    } catch (e) {
        showToast("Gagal memproses file.", 'error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
    e.target.value = null; 
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handlePaste = (e) => {
    if (!isNameSet) return;
    const items = e.clipboardData.items;
    for (const item of items) {
        if (item.kind === 'file') {
            const file = item.getAsFile();
            processFile(file);
            e.preventDefault(); 
            return; 
        }
    }
  };

  const removeAttachment = () => {
      setAttachment(null);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    
    if ((!inputMsg.trim() && !attachment) || !isNameSet) return; 
    
    const trimmedMsg = inputMsg.trim();

    // --- ADMIN LOGIN ---
    if (trimmedMsg === '007') {
        setIsAdmin(true);
        setInputMsg('');
        showToast("🔓 Mode Admin Aktif!", 'success');
        return;
    }

    // --- ADMIN LOGOUT ---
    if (trimmedMsg === '008') {
        setIsAdmin(false);
        setInputMsg('');
        showToast("🔒 Mode Admin Nonaktif!", 'info');
        return;
    }

    setIsSending(true);
    setShowEmojiPicker(false); 

    try {
      const payload = {
        visitor_id: visitorId,
        message: inputMsg,
        display_name: displayName,
        user_agent: 'WebChat'
      };

      if (attachment) {
          payload.attachment_data = attachment.data;
          payload.attachment_type = attachment.type;
          payload.attachment_name = attachment.name;
      }

      const { error } = await supabase.from('feedback').insert(payload);

      if (error) throw error;
      
      setInputMsg('');
      setAttachment(null);
      scrollToBottom();
      inputRef.current?.focus();
    } catch (err) {
      showToast("Gagal kirim.", 'error');
    } finally {
      setIsSending(false);
    }
  };

  // --- FUNGSI HAPUS ---
  const handleRequestDelete = (id) => {
      setDeletingMsgId(id);
  };

  const cancelDelete = () => {
      setDeletingMsgId(null);
  };

  const confirmDelete = async () => {
      if (!deletingMsgId) return;
      
      const { error } = await supabase.from('feedback').delete().eq('id', deletingMsgId);
      if (error) {
          showToast("Gagal menghapus: " + error.message, 'error');
      } else {
          showToast("Pesan berhasil dihapus.", 'success');
      }
      setDeletingMsgId(null); 
  };

  const handleTogglePin = async (id, currentStatus) => {
      const { error } = await supabase
        .from('feedback')
        .update({ is_pinned: !currentStatus })
        .eq('id', id);
      
      if (error) showToast("Gagal update pin", 'error');
      else showToast(!currentStatus ? "Pesan disematkan 📌" : "Pin dilepas", 'success');
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

  const handleImageClick = (imgData) => {
      setExpandedImage(imgData);
  };

  const renderAttachment = (msg) => {
      if (!msg.attachment_data) return null;

      if (msg.attachment_type === 'image') {
          return (
              <div className={styles.attachmentImageWrapper}>
                  <img 
                    src={msg.attachment_data} 
                    alt="Lampiran" 
                    className={styles.chatImage} 
                    onClick={() => handleImageClick(msg.attachment_data)} 
                    title="Klik untuk memperbesar"
                  />
              </div>
          );
      } else if (msg.attachment_type === 'pdf') {
          return (
              <a 
                href={msg.attachment_data} 
                download={msg.attachment_name || "document.pdf"} 
                className={styles.chatPdfLink}
                target="_blank" 
                rel="noopener noreferrer"
              >
                  <i className="fas fa-file-pdf fa-2x"></i>
                  <span>{msg.attachment_name || "Dokumen PDF"}</span>
              </a>
          );
      }
      return null;
  };

  return createPortal(
    <div className={styles.wrapper}>
      
      {/* MODAL GAMBAR BESAR */}
      {expandedImage && (
          <div className={styles.imageModalOverlay} onClick={() => setExpandedImage(null)}>
              <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
                  <button className={styles.closeImageModalBtn} onClick={() => setExpandedImage(null)}>&times;</button>
                  <img src={expandedImage} alt="Preview Full" className={styles.expandedImage} />
              </div>
          </div>
      )}

      {isOpen && (
        <div className={styles.chatWindow}>
            
            {/* KONFIRMASI HAPUS (OVERLAY) */}
            {deletingMsgId && (
                <div className={styles.deleteOverlay}>
                    <div className={styles.deleteBox}>
                        <div className={styles.deleteIcon}>
                            <i className="fas fa-trash-alt"></i>
                        </div>
                        <p className={styles.deleteText}>Hapus pesan ini secara permanen?</p>
                        <div className={styles.deleteActions}>
                            <button className={styles.cancelDeleteBtn} onClick={cancelDelete}>Batal</button>
                            <button className={styles.confirmDeleteBtn} onClick={confirmDelete}>Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            <input 
                type="file" 
                ref={fileInputRef} 
                style={{display: 'none'}} 
                accept=".jpg,.jpeg,.png,.gif,.pdf"
                onChange={handleFileSelect}
            />

            {systemNotification && (
                <div className={`${styles.systemToast} ${styles[systemNotification.type]}`}>
                    {systemNotification.text}
                </div>
            )}

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
                            onKeyDown={(e) => { if (e.key === 'Enter' && inputName.trim().length >= 3) handleSetName(false); }}
                            style={{border: '1px solid #ccc'}}
                        />
                        <button className={styles.nameBtn} onClick={() => handleSetName(false)} disabled={inputName.trim().length < 3}>Masuk</button>
                        <button className={styles.guestBtn} onClick={() => handleSetName(true)}>Masuk sebagai Tamu</button>
                    </div>
                </div>
            )}

          <div className={styles.header}>
            <div className={styles.headerTop}>
              <span style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <i className="fab fa-whatsapp" style={{fontSize:'1.2rem'}}></i>
                Live Feedback {isAdmin && <span className={styles.adminBadge}>ADMIN</span>}
              </span>
              <button onClick={() => setIsOpen(false)} style={{background:'none',border:'none',color:'white',cursor:'pointer',fontSize:'1.5rem', lineHeight:1}}>&times;</button>
            </div>
            <div className={styles.onlineStatus}>
              <span className={styles.onlineDot}></span>
              {onlineCount > 1 ? `${onlineCount} anggota online` : 'Online (Hanya Anda)'}
            </div>
          </div>

          {pinnedMessage && (
              <div className={styles.pinnedPreview} onClick={() => document.getElementById(`msg-${pinnedMessage.id}`)?.scrollIntoView({behavior:'smooth'})}>
                  <div className={styles.pinnedIcon}><i className="fas fa-thumbtack"></i></div>
                  <div className={styles.pinnedContent}>
                      <div className={styles.pinnedTitle}>Pesan Tersemat</div>
                      <div className={styles.pinnedText}>
                          {pinnedMessage.attachment_data ? '📎 Lampiran' : pinnedMessage.message}
                      </div>
                  </div>
              </div>
          )}

          <div className={styles.messageList} style={{ filter: isNameSet ? 'none' : 'blur(2px)' }}>
            {feedbacks.length === 0 && (
              <div style={{textAlign:'center', padding:'20px', background:'rgba(255,255,255,0.6)', borderRadius:'8px', margin:'auto', fontSize:'0.85rem', color:'#54656f'}}>
                🔒 Laporan Bug & Feedback<br/>Lampirkan screenshot jika ada error.
              </div>
            )}

            {feedbacks.map((msg) => {
              const isMe = msg.visitor_id === visitorId;
              const isPinned = msg.is_pinned;
              const nameColor = getColorForVisitor(msg.visitor_id);
              const senderName = isMe ? displayName : (msg.display_name || getReadableId(msg.visitor_id));

              return (
                <div 
                  key={msg.id} 
                  id={`msg-${msg.id}`} 
                  className={`${styles.messageItem} ${isMe ? styles.myMessage : styles.otherMessage} ${isPinned ? styles.pinnedMessage : ''}`}
                >
                  {isPinned && <div className={styles.pinBadge}><i className="fas fa-thumbtack"></i> Disematkan</div>}

                  {!isMe && (
                    <div className={styles.senderName} style={{ color: nameColor }}>
                      {senderName}
                    </div>
                  )}
                  
                  {renderAttachment(msg)}

                  {msg.message && (
                      <div className={styles.messageContent}>
                        {msg.message}
                      </div>
                  )}

                  {isAdmin && (
                      <div className={styles.adminControls}>
                          <button className={styles.adminBtn} onClick={() => handleTogglePin(msg.id, isPinned)} title={isPinned ? "Lepas Pin" : "Sematkan"}>
                              <i className={`fas fa-thumbtack ${isPinned ? styles.iconActive : ''}`}></i>
                          </button>
                          <button className={`${styles.adminBtn} ${styles.deleteBtn}`} onClick={() => handleRequestDelete(msg.id)} title="Hapus">
                              <i className="fas fa-trash"></i>
                          </button>
                      </div>
                  )}

                  <div className={styles.timestamp}>
                    {formatTimeStr(msg.created_at)}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.footer}>
            {attachment && (
                <div className={styles.previewContainer}>
                    <div className={styles.previewContent}>
                        {attachment.isPdf ? (
                            <div className={styles.previewPdf}>
                                <i className="fas fa-file-pdf" style={{color: '#e53e3e'}}></i>
                                <span>PDF</span>
                            </div>
                        ) : (
                            <img src={attachment.data} alt="Preview" className={styles.previewImage} />
                        )}
                    </div>
                    <button className={styles.removeAttachmentBtn} onClick={removeAttachment}>&times;</button>
                </div>
            )}

            {showEmojiPicker && (
              <div className={styles.emojiPicker} ref={emojiPickerRef}>
                {EMOJIS.map((emoji) => (
                  <div key={emoji} className={styles.emojiItem} onClick={() => handleAddEmoji(emoji)}>{emoji}</div>
                ))}
              </div>
            )}

            <button 
              type="button" 
              className={styles.emojiBtn} 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              ref={emojiBtnRef}
            >
              😃
            </button>
            
            <button type="button" className={styles.attachBtn} onClick={handleAttachClick} title="Lampirkan Gambar/PDF">
                <i className="fas fa-paperclip"></i>
            </button>

            <textarea
              ref={inputRef} 
              className={styles.input}
              placeholder={isNameSet ? "Ketik pesan / Paste gambar..." : "Nama dulu..."}
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste} 
              disabled={isSending || !isNameSet}
              rows={1}
            />

            <button type="button" className={styles.sendBtn} onClick={handleSend} disabled={isSending || (!inputMsg.trim() && !attachment) || !isNameSet}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}

      <button className={styles.floatingBtn} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <i className="fas fa-chevron-down" style={{fontSize:'1.5rem', color: '#ecc94b'}}></i> : <div className={styles.clockFace}><div className={`${styles.hand} ${styles.hourHand}`} style={{ transform: `translateX(-50%) rotate(${hourDeg}deg)` }}></div><div className={`${styles.hand} ${styles.minuteHand}`} style={{ transform: `translateX(-50%) rotate(${minDeg}deg)` }}></div><div className={`${styles.hand} ${styles.secondHand}`} style={{ transform: `translateX(-50%) rotate(${secDeg}deg)` }}></div></div>}
      </button>

    </div>,
    document.body
  );
}

export default FloatingFeedback;