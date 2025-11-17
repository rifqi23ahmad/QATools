import React, { useState, useEffect } from 'react'; 
import ApiRequestor from './ApiRequestor'; 
import styles from './ApiRequestorManager.module.css'; 

const TABS_LS_KEY = 'apiRequestorTabs';
const ACTIVE_TAB_LS_KEY = 'apiRequestorActiveTabId';

// State default untuk tab baru
const createNewTab = (id) => ({
  id: id,
  name: `Request ${Math.floor(id / 1000)}`, 
  request: {
    method: 'GET',
    url: '',
    body: '',
    headers: [
      { id: 1, key: 'Content-Type', value: 'application/json' },
      { id: 2, key: 'Accept', value: 'application/json' },
    ],
  },
  response: null,
  isLoading: false,
  responseTab: 'response-body', 
});

function ApiRequestorManager() {
  // Muat 'tabs' dari localStorage saat inisialisasi
  const [tabs, setTabs] = useState(() => {
    try {
      const savedTabs = localStorage.getItem(TABS_LS_KEY);
      if (savedTabs) {
        const parsedTabs = JSON.parse(savedTabs);
        if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
          // --- PERUBAHAN 1 DI SINI: Hapus 'response: null' ---
          // Kita ingin mempertahankan respons yang tersimpan
          return parsedTabs.map(tab => ({ ...tab, isLoading: false })); 
        }
      }
    } catch (e) {
      console.error("Gagal memuat tabs dari localStorage:", e);
      localStorage.removeItem(TABS_LS_KEY); // Hapus data korup
    }
    // Fallback jika tidak ada data
    return [createNewTab(Date.now())];
  });

  // Muat 'activeTabId' dari localStorage
  const [activeTabId, setActiveTabId] = useState(() => {
    try {
      const savedActiveId = localStorage.getItem(ACTIVE_TAB_LS_KEY);
      if (savedActiveId) {
        const parsedId = JSON.parse(savedActiveId);
        // Cek apakah 'tabs' (dari baris di atas) masih mengandung ID ini
        const tabsList = JSON.parse(localStorage.getItem(TABS_LS_KEY) || '[]');
        if (tabsList.find(t => t.id === parsedId)) {
          return parsedId;
        }
      }
    } catch (e) {
      console.error("Gagal memuat activeTabId dari localStorage:", e);
      localStorage.removeItem(ACTIVE_TAB_LS_KEY);
    }
    // Fallback ke tab pertama (jika tabs masih kosong, ambil dari default)
    const fallbackTabs = JSON.parse(localStorage.getItem(TABS_LS_KEY) || '[{"id": 0}]');
    return fallbackTabs[0]?.id || 0;
  });

  // useEffect untuk MENYIMPAN 'tabs' ke localStorage
  useEffect(() => {
    try {
      // --- PERUBAHAN 2 DI SINI: Hanya hapus 'isLoading' ---
      // Kita ingin 'response' tetap tersimpan
      const tabsToSave = tabs.map(tab => {
        const { isLoading, ...rest } = tab; // <-- HANYA 'isLoading' yang dihapus
        return rest; // 'response' akan ikut tersimpan di 'rest'
      });
      localStorage.setItem(TABS_LS_KEY, JSON.stringify(tabsToSave));
    } catch (e) {
      console.error("Gagal menyimpan tabs ke localStorage:", e);
    }
  }, [tabs]); // Dijalankan setiap kali 'tabs' berubah

  // useEffect untuk MENYIMPAN 'activeTabId' ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_LS_KEY, JSON.stringify(activeTabId));
    } catch (e) {
      console.error("Gagal menyimpan activeTabId ke localStorage:", e);
    }
  }, [activeTabId]); // Dijalankan setiap kali 'activeTabId' berubah


  const activeTab = tabs.find(t => t.id === activeTabId);

  // Fungsi untuk mengubah data di tab yang aktif
  const handleStateChange = (field, value) => {
    setTabs(tabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, [field]: value }
        : tab
    ));
  };
  
  // Fungsi ini sekarang bisa menerima (field, value) ATAU ({...updates})
  const handleRequestChange = (fieldOrObject, value) => {
     setTabs(tabs.map(tab => {
      if (tab.id === activeTabId) {
        // Cek apakah argumen pertama adalah string (cara lama)
        if (typeof fieldOrObject === 'string') {
          return { ...tab, request: { ...tab.request, [fieldOrObject]: value } };
        }
        // Jika bukan string, pasti object (cara baru/batch)
        return { ...tab, request: { ...tab.request, ...fieldOrObject } };
      }
      return tab;
    }));
  };

  // Fungsi untuk mengirim request, sekarang dikelola di sini
  const handleSendRequest = async (request) => {
    if (!request.url) return alert('URL tidak boleh kosong.');

    // 1. Set loading state untuk tab spesifik
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, isLoading: true, response: null } : t));
    handleStateChange('responseTab', 'response-body'); // Selalu reset ke tab body

    const { method, url, headers, body } = request;
    const requestHeaders = new Headers();
    headers.forEach(h => { if (h.key) requestHeaders.append(h.key, h.value) });

    const requestOptions = { method, headers: requestHeaders };
    if (method !== 'GET' && method !== 'HEAD' && body) {
      requestOptions.body = body;
    }

    const startTime = performance.now();
    let newResponse = {};

    try {
      const res = await fetch(url, requestOptions); 
      const endTime = performance.now();
      let responseBodyText = await res.text();
      let responseHeadersText = '';
      res.headers.forEach((value, key) => { responseHeadersText += `${key}: ${value}\n`; });
      
      // Simpan body mentah (sudah di-stringify jika JSON)
      newResponse = {
        status: { code: res.status, text: res.statusText, ok: res.ok },
        time: (endTime - startTime).toFixed(0),
        size: new TextEncoder().encode(responseBodyText).length,
        body: responseBodyText, // <-- Simpan body mentah
        headers: responseHeadersText
      };

    } catch (error) {
      const endTime = performance.now();
      let responseBodyText = `${error.message}\n\n(Ini kemungkinan besar adalah error CORS. Pastikan Anda sudah mengaktifkan browser extension 'Allow CORS'.)`;
      newResponse = {
        status: { code: 'Error', text: 'Gagal Fetch', ok: false },
        time: (endTime - startTime).toFixed(0),
        size: new TextEncoder().encode(responseBodyText).length,
        body: responseBodyText,
        headers: ''
      };
    } finally {
      // 2. Update tab yang benar dengan respons-nya
      setTabs(tabs.map(t => 
        t.id === activeTabId 
          ? { ...t, isLoading: false, response: newResponse } 
          : t
      ));
    }
  };

  const handleAddTab = () => {
    const newId = Date.now();
    const newTab = createNewTab(newId);
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const handleRemoveTab = (e, tabId) => {
    e.stopPropagation(); // Hentikan event agar tidak memicu setActiveTab
    if (tabs.length === 1) return; // Jangan biarkan tab terakhir ditutup

    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    // Jika tab aktif yang ditutup, pindah ke tab lain
    if (activeTabId === tabId) {
      const newActiveTab = newTabs[tabIndex] || newTabs[tabIndex - 1] || newTabs[0];
      setActiveTabId(newActiveTab.id);
    }
  };
  
  return (
    <div 
      id="ApiRequestorManager" 
      style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}
    >
      <div className="tool-header" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--card-border)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>API Requestor (cURL Runner)</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
          Buat request baru dengan tombol (+). Tempel cURL atau URL biasa di input. (State tersimpan otomatis)
        </p>
      </div>
      
      <div className={styles.apiTabsNav} style={{ marginBottom: 0, borderBottom: 'none' }}>
        {tabs.map(tab => (
          <div 
            key={tab.id}
            className={`${styles.apiTabBtn} ${tab.id === activeTabId ? styles.active : ''}`}
            onClick={() => setActiveTabId(tab.id)}
            style={{ 
              borderBottom: '1px solid var(--card-border)', 
              borderTopLeftRadius: '6px', 
              borderTopRightRadius: '6px',
              ...(tab.id === activeTabId && { 
                borderColor: 'var(--card-border)', 
                borderBottomColor: 'var(--card-bg)' 
              })
            }}
          >
            <span>{tab.name}</span>
            <button 
              className="close-tab-btn" 
              onClick={(e) => handleRemoveTab(e, tab.id)}
              disabled={tabs.length === 1}
              style={{
                background: 'transparent',
                border: 'none',
                marginLeft: '0.5rem',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              &times;
            </button>
          </div>
        ))}
        <button 
          className="add-tab-btn" 
          onClick={handleAddTab}
          style={{
            background: '#f0f2f5',
            border: '1px solid var(--card-border)',
            borderBottom: '1px solid var(--card-border)',
            padding: '0.5rem 0.75rem',
            borderTopRightRadius: '6px',
            cursor: 'pointer'
          }}
        >+</button>
      </div>

      {activeTab && (
        <ApiRequestor
          key={activeTab.id}
          requestState={activeTab.request}
          responseState={activeTab.response}
          isLoading={activeTab.isLoading}
          responseTab={activeTab.responseTab} 
          onResponseTabChange={(value) => handleStateChange('responseTab', value)} 
          onRequestChange={handleRequestChange}
          onSendRequest={handleSendRequest}
        />
      )}
    </div>
  );
}

export default ApiRequestorManager;