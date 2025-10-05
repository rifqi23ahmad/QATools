# QA Tools

<div align="center">
  <h3>🛠️ Kumpulan Tools untuk Quality Assurance & Developer</h3>
  <p>Aplikasi web all-in-one untuk mempermudah pekerjaan QA testing, development, dan data processing</p>
  
  <p>
    <a href="https://toolsqa.netlify.app/"><strong>🚀 Live Demo »</strong></a>
  </p>
</div>

---

## 📋 Tentang Aplikasi

**QA Tools** adalah aplikasi web yang dirancang khusus untuk membantu Quality Assurance Engineers, Developers, dan Data Analysts dalam pekerjaan sehari-hari. Aplikasi ini menyediakan berbagai tools yang sering dibutuhkan dalam testing, debugging, dan processing data.

## ✨ Fitur Utama

### 🔷 JSON Tools

#### 1. **JSON Formatter**
- Format/beautify JSON dengan indentasi yang rapi
- Minify/compact JSON untuk menghemat space
- Validasi struktur JSON
- Support upload file JSON
- Download hasil format
- Copy hasil dengan satu klik

#### 2. **JSON Compare**
- Bandingkan dua objek JSON secara visual
- Highlight perbedaan properti dan nilai
- Ringkasan perubahan otomatis
- Deteksi penambahan, penghapusan, dan modifikasi data

#### 3. **JSON Value Extractor**
- Ekstrak nilai dari JSON berdasarkan key tertentu
- Filter data sesuai kebutuhan
- Format otomatis untuk klausa SQL IN
- Sangat berguna untuk membuat test data queries

### 🔷 SQL & Data Tools

#### 4. **Data Compare**
- Bandingkan dua set data (ID + Status)
- Deteksi perbedaan antara data lama dan baru
- Visualisasi perubahan data
- Export hasil perbandingan ke CSV

#### 5. **SQL IN Clause Formatter**
- Convert daftar ID menjadi format SQL IN clause
- Support untuk angka, UUID, dan text
- Auto-formatting dengan quotes sesuai tipe data
- Copy hasil dengan mudah

#### 6. **SQL INSERT Query Generator**
- Generate form input otomatis dari query INSERT
- Deteksi kolom JSON dan pecah otomatis
- Support paste data dari Excel
- Download template Excel
- Upload Excel untuk bulk data
- Generate multiple INSERT statements sekaligus

### 🔷 File & Document Tools

#### 7. **File Splitter**
- Split file CSV atau TXT menjadi beberapa bagian
- Tentukan jumlah file output yang diinginkan
- Download semua file hasil split
- Ideal untuk handling large files

#### 8. **Image Compare**
- Bandingkan dua gambar secara visual
- Overlay image dengan transparansi yang bisa diatur
- Zoom dan pan untuk detail inspection
- Support paste (Ctrl+V) dan drag & drop
- Kontrol keyboard untuk navigasi presisi

#### 9. **Doc Compare (PDF)**
- Bandingkan perubahan text antara dua PDF
- Sync scroll untuk navigasi mudah
- Highlight semua perubahan
- Detail change report

#### 10. **Dummy File Generator**
- Generate file dummy untuk testing
- Support berbagai format: PNG, JPG, PDF, XLSX, DOC
- Atur ukuran file sesuai kebutuhan (< 2MB, < 5MB, > 2MB, > 5MB, custom)
- **Generate file corrupt** untuk negative testing
- Deskripsi custom untuk setiap file

## 🚀 Teknologi

Aplikasi ini dibangun menggunakan:

- **React** - Frontend framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool & dev server
- **React Router** - Navigation
- **Shadcn UI** - Component library
- **Lucide Icons** - Icon set

## 📦 Instalasi & Menjalankan Lokal

### Prerequisites

- Node.js (v18 atau lebih tinggi)
- npm atau bun

### Langkah Instalasi

```bash
# Clone repository
git clone https://github.com/rifqi23ahmad/QATools.git

# Masuk ke direktori project
cd QATools

# Install dependencies
npm install
# atau
bun install

# Jalankan development server
npm run dev
# atau
bun dev
```

Aplikasi akan berjalan di `http://localhost:8080`

### Build untuk Production

```bash
npm run build
# atau
bun run build
```

## 🎯 Use Cases

### Untuk QA Engineers:
- Generate test data dengan Dummy File Generator
- Compare hasil testing dengan Doc/Image Compare
- Validate JSON responses dari API
- Extract specific values dari complex JSON untuk assertion
- Split large test data files

### Untuk Developers:
- Format dan validate JSON
- Generate SQL INSERT statements dengan cepat
- Compare data changes
- Debug JSON API responses

### Untuk Data Analysts:
- Compare data sets untuk data migration
- Format data untuk SQL queries
- Extract values dari nested JSON
- Split large data files

## 🤝 Kontribusi

Kontribusi sangat welcome! Berikut cara berkontribusi:

1. Fork repository ini
2. Buat branch untuk fitur baru (`git checkout -b feature/QAtoolsUpdate`)
3. Commit perubahan (`git commit -m 'Add some QAtoolsUpdate'`)
4. Push ke branch (`git push origin feature/QAtoolsUpdate`)
5. Buat Pull Request

## 📝 Roadmap

- [ ] Export comparison results ke berbagai format
- [ ] Batch processing untuk multiple files
- [ ] API endpoint untuk automation
- [ ] Dark mode support
- [ ] More file format support
- [ ] History/cache untuk frequent operations

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 👤 Author
**Gemini** and **Me**


- GitHub: [@rifqi23ahmad](https://github.com/rifqi23ahmad)
- Demo: [https://toolsqa.netlify.app/](https://toolsqa.netlify.app/)

## 🙏 Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) untuk component library
- [Lucide](https://lucide.dev/) untuk icon set
- Semua open source contributors

---

<div align="center">
  <p>Dibuat dengan ❤️ untuk QA Community</p>
  <p>⭐ Star repository ini jika bermanfaat!</p>
</div>
