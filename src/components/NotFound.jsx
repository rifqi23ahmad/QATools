import React from 'react';
import { Link } from 'react-router-dom';

// Komponen sederhana untuk halaman 404
function NotFound() {
  return (
    <div style={{ 
      padding: '3rem', 
      textAlign: 'center', 
      lineHeight: '1.6',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{ fontSize: '3rem', margin: 0 }}>404</h1>
      <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Halaman Tidak Ditemukan</h2>
      <p style={{ margin: 0, marginBottom: '1.5rem' }}>
        Maaf, halaman yang Anda cari tidak ada atau mungkin telah dipindahkan.
      </p>
      <Link 
        to="/" 
        style={{ 
          color: '#fff', 
          backgroundColor: '#007bff', 
          padding: '0.5rem 1rem', 
          borderRadius: '5px',
          textDecoration: 'none'
        }}
      >
        Kembali ke Halaman Utama
      </Link>
    </div>
  );
}

export default NotFound;