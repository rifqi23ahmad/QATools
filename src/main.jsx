import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import './style.css' // Impor file CSS Anda

// Impor konfigurasi tool yang sudah kita buat
import { allTools, toolComponentMap } from './toolConfig.jsx'

// Default redirect path (pakai path pertama kalau ada)
const defaultToolPath = allTools.length > 0 ? allTools[0].path : '/'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* App bertindak sebagai layout yang merender Sidebar + <Outlet /> */}
        <Route path="/" element={<App />}>
          {/* Index route: langsung redirect ke tool pertama */}
          <Route index element={<Navigate to={defaultToolPath} replace />} />

          {/* Buat <Route> untuk setiap tool secara dinamis */}
          {allTools.map((tool) => {
            // Pastikan kita memberikan element berupa JSX (<Comp />), bukan fungsi
            const Comp = toolComponentMap[tool.id]
            // normalisasi path: jika tool.path diawali '/', hapus sehingga menjadi nested path
            const childPath = tool.path.replace(/^\//, '')

            return (
              <Route
                key={tool.id}
                path={childPath}
                element={
                  Comp
                    ? <Comp />
                    : <div style={{ padding: 20 }}>Tool "{tool.name}" belum tersedia.</div>
                }
              />
            )
          })}

          {/* Fallback untuk rute yang tidak cocok */}
          <Route
            path="*"
            element={
              <div style={{ padding: 20 }}>
                <h2>404 - Tool Tidak Ditemukan</h2>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
