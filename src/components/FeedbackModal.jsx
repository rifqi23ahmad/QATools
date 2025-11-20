import React, { useState } from 'react';
import styles from './FeedbackModal.module.css';

function FeedbackModal({ isOpen, onClose, supabase, visitorId }) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          visitor_id: visitorId,
          message: message,
          user_agent: navigator.userAgent
        });

      if (error) throw error;

      setStatus('success');
      setMessage('');
      // Tutup otomatis setelah 2 detik jika sukses
      setTimeout(() => {
        setStatus(null);
        onClose();
      }, 2000);

    } catch (error) {
      console.error("Feedback error:", error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Kirim Masukan</h3>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--success-color)' }}>
            <i className="fas fa-check-circle fa-3x" style={{ marginBottom: '1rem' }}></i>
            <p>Terima kasih! Masukan Anda telah terkirim.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <textarea
              className={styles.textarea}
              placeholder="Tulis saran, kritik, atau request fitur..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
            
            {status === 'error' && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Gagal mengirim. Silakan coba lagi.
              </p>
            )}

            <div className={styles.actions}>
              <button 
                type="button" 
                className="button secondary" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="button primary"
                disabled={isSubmitting || !message.trim()}
              >
                {isSubmitting ? 'Mengirim...' : 'Kirim'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default FeedbackModal;