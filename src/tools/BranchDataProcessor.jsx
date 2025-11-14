import React, { useState } from 'react';

// Data mapping dari file asli Anda
// (Disimpan di sini agar komponen tetap mandiri)
const branchMapping = { "ACEH": { "code": "5600", "id": 155 }, "ALUE BILIE": { "code": "5613", "id": 159 }, "AMARTHA PUSAT": { "code": "1006", "id": 317 }, "AMARTHA PUSAT BVT": { "code": "1006B", "id": 316 }, "AMBON": { "code": "6200", "id": 236 }, "AMPANA": { "code": "6021", "id": 189 }, "ARGA MAKMUR": { "code": "5701", "id": 166 }, "ASERA": { "code": "6115", "id": 365 }, "BABAT TOMAN": { "code": "5108", "id": 107 }, "BACAN": { "code": "6111", "id": 232 }, "BAHODOPI": { "code": "6057", "id": 363 }, "BAJAWA": { "code": "9004", "id": 361 }, "BALARAJA": { "code": "1104", "id": 20 }, "BALIGE": { "code": "5531", "id": 352 }, "BALIKPAPAN": { "code": "7000", "id": 257 }, "BANDAR JAYA": { "code": "5006", "id": 89 }, "BANDUNG": { "code": "2300", "id": 31 }, "BANGGAI": { "code": "6058", "id": 364 }, "BANGKA": { "code": "5200", "id": 114 }, "BANGKALA": { "code": "6050", "id": 216 }, "BANGKO": { "code": "5303", "id": 127 }, "BANJAR": { "code": "2501", "id": 44 }, "BANJARAN": { "code": "2305", "id": 36 }, "BANJARMASIN": { "code": "7100", "id": 261 }, "BANTAENG": { "code": "6047", "id": 213 }, "BARABAI": { "code": "7107", "id": 268 }, "BARRU": { "code": "6042", "id": 208 }, "BATU LICIN": { "code": "7105", "id": 266 }, "BATURAJA": { "code": "5102", "id": 101 }, "BATU SANGKAR": { "code": "5403", "id": 136 }, "BAWEN": { "code": "3201", "id": 61 }, "BAYUNG LENCIR": { "code": "5114", "id": 113 }, "BEKASI": { "code": "1200", "id": 21 }, "BELINYU": { "code": "5209", "id": 123 }, "BELITANG": { "code": "5106", "id": 105 }, "BELITUNG": { "code": "5201", "id": 115 }, "BELOPA": { "code": "6040", "id": 206 }, "BELTIM": { "code": "5205", "id": 119 }, "BENGKULU": { "code": "5700", "id": 165 }, "BERAU": { "code": "7202", "id": 271 }, "BETUNG": { "code": "5110", "id": 109 }, "BIMA": { "code": "9105", "id": 359 }, "BINJAI": { "code": "5501", "id": 146 }, "BIREUEN": { "code": "5630", "id": 164 }, "BITUNG": { "code": "6304", "id": 246 }, "BLANG PIDIE": { "code": "5611", "id": 157 }, "BLITAR": { "code": "4302", "id": 82 }, "BOALEMO": { "code": "6502", "id": 256 }, "BOEPINANG": { "code": "6106", "id": 227 }, "BOGOR": { "code": "2000", "id": 23 }, "BOJONEGORO": { "code": "4003", "id": 74 }, "BONE": { "code": "6014", "id": 182 }, "BOROKO": { "code": "6307", "id": 249 }, "BOYOLALI": { "code": "3101", "id": 57 }, "BUKITTINGGI": { "code": "5408", "id": 141 }, "BULI": { "code": "6113", "id": 234 }, "BULUKUMBA": { "code": "6002", "id": 170 }, "BUNGKU": { "code": "6035", "id": 202 }, "BUNGO": { "code": "5305", "id": 129 }, "BUNTA": { "code": "6027", "id": 195 }, "BUOL": { "code": "6022", "id": 190 }, "BUTON": { "code": "6101", "id": 222 }, "CIANJUR": { "code": "2400", "id": 37 }, "CIAWI": { "code": "2503", "id": 46 }, "CIBINONG": { "code": "2002", "id": 25 }, "CIGUDEG": { "code": "2003", "id": 26 }, "CIKARANG": { "code": "1201", "id": 22 }, "CILACAP": { "code": "3305", "id": 68 }, "CILEDUG": { "code": "1101", "id": 18 }, "CILEUNGSI": { "code": "2100", "id": 28 }, "CIMAHI": { "code": "2303", "id": 34 }, "CINERE": { "code": "1004", "id": 16 }, "CIREBON": { "code": "2600", "id": 47 }, "CURUP": { "code": "5321", "id": 133 }, "DAYA MURNI": { "code": "5012", "id": 95 }, "DOMPU": { "code": "9102", "id": 287 }, "DONGGALA": { "code": "6034", "id": 201 }, "ENDE": { "code": "9000", "id": 282 }, "ENREKANG": { "code": "6019", "id": 187 }, "EREKE": { "code": "6110", "id": 231 }, "GARUT": { "code": "2302", "id": 33 }, "GORONTALO": { "code": "6500", "id": 254 }, "GOWA": { "code": "6032", "id": 199 }, "GOWA 2": { "code": "6049", "id": 215 }, "GRESIK": { "code": "4002", "id": 73 }, "IDIE": { "code": "5512", "id": 150 }, "INDRALAYA": { "code": "5109", "id": 108 }, "JAILOLO": { "code": "6402", "id": 253 }, "JAMBI": { "code": "5300", "id": 124 }, "JAMPANG": { "code": "2411", "id": 42 }, "JATIBARANG": { "code": "2601", "id": 48 }, "JAYAPURA": { "code": "8001", "id": 280 }, "JEBUS": { "code": "5207", "id": 21 }, "JEMBER": { "code": "4102", "id": 79 }, "JENEPONTO": { "code": "6004", "id": 172 }, "KADIPATEN": { "code": "2602", "id": 49 }, "KALIANDA": { "code": "5005", "id": 88 }, "KAPUAS": { "code": "7104", "id": 265 }, "KARANGANYAR": { "code": "3102", "id": 58 }, "KARAWANG": { "code": "2200", "id": 29 }, "KARIMUN": { "code": "5802", "id": 355 }, "KASIPUTE": { "code": "6109", "id": 230 }, "KASONGAN": { "code": "7301", "id": 318 }, "KAYU AGUNG": { "code": "5104", "id": 103 }, "KEBUMEN": { "code": "3500", "id": 70 }, "KEDIRI": { "code": "4300", "id": 80 }, "KELAPA": { "code": "5203", "id": 117 }, "KENDARI": { "code": "6100", "id": 221 }, "KEPULAUAN SELAYAR": { "code": "6052", "id": 218 }, "KOBA": { "code": "5206", "id": 120 }, "KOLAKA": { "code": "6102", "id": 223 }, "KOTA AGUNG": { "code": "5008", "id": 91 }, "KOTABARU": { "code": "7106", "id": 267 }, "KOTABUMI": { "code": "5004", "id": 87 }, "KOTA CANE": { "code": "5623", "id": 351 }, "KOTA FAJAR": { "code": "5615", "id": 160 }, "KOTAMOBAGU": { "code": "6305", "id": 247 }, "KOTARAYA": { "code": "6023", "id": 191 }, "KOTOBARU": { "code": "5404", "id": 137 }, "KUALA KURUN": { "code": "7302", "id": 345 }, "KUALA SIMPANG": { "code": "5511", "id": 149 }, "KUNINGAN": { "code": "2606", "id": 52 }, "KUPANG": { "code": "9003", "id": 360 }, "LABUAN BAJO": { "code": "9002", "id": 284 }, "LADONGI": { "code": "6105", "id": 226 }, "LAHAT": { "code": "5112", "id": 111 }, "LAMANDAU": { "code": "7503", "id": 344 }, "LAMPUNG": { "code": "5000", "id": 83 }, "LANGSA ACEH": { "code": "5510", "id": 148 }, "LASUSUA": { "code": "6104", "id": 225 }, "LEUWILIANG": { "code": "2099", "id": 27 }, "LHOKSEUMAWE": { "code": "5620", "id": 161 }, "LHOKSUKON": { "code": "5622", "id": 163 }, "LIMBOTO": { "code": "6503", "id": 376 }, "LIWA": { "code": "5011", "id": 94 }, "LUBUKBASUNG": { "code": "5405", "id": 138 }, "LUBUK LINGGAU": { "code": "5304", "id": 128 }, "LUWUK": { "code": "6010", "id": 178 }, "MADIUN": { "code": "4004", "id": 75 }, "MAGELANG": { "code": "3303", "id": 66 }, "MAJENE": { "code": "6043", "id": 209 }, "MAKALE": { "code": "6053", "id": 219 }, "MAKASSAR": { "code": "6000", "id": 168 }, "MAKASSAR 2": { "code": "6099", "id": 220 }, "MAKASSAR 3": { "code": "6046", "id": 212 }, "MALANG": { "code": "4100", "id": 77 }, "MALILI": { "code": "6038", "id": 204 }, "MALINO": { "code": "6051", "id": 217 }, "MAMASA": { "code": "6056", "id": 362 }, "MAMUJU": { "code": "6006", "id": 174 }, "MANADO": { "code": "6300", "id": 242 }, "MANGKUTANA": { "code": "6013", "id": 181 }, "MANOKWARI": { "code": "8002", "id": 281 }, "MANTIS": { "code": "5503", "id": -1 }, "MARISA": { "code": "6501", "id": 255 }, "MAROS": { "code": "6033", "id": 200 }, "MARTAPURA-KAL": { "code": "7103", "id": 264 }, "MARTAPURA-SUM": { "code": "5111", "id": 110 }, "MASAMBA": { "code": "6012", "id": 180 }, "MASBAGIK": { "code": "9100", "id": 285 }, "MASOHI": { "code": "6201", "id": 237 }, "MATARAM": { "code": "9103", "id": 357 }, "MEDAN": { "code": "5500", "id": 145 }, "MENTENG": { "code": "41000", "id": 1 }, "MENTOK": { "code": "5204", "id": 118 }, "MERAUKE": { "code": "6209", "id": 377 }, "METRO": { "code": "5001", "id": 84 }, "MEULABOH": { "code": "5610", "id": 156 }, "MOJOKERTO": { "code": "4005", "id": 76 }, "MOLIBAGU": { "code": "6114", "id": 235 }, "MOROTAI": { "code": "6112", "id": 233 }, "MOROWALI": { "code": "6020", "id": 188 }, "MUARA BULIAN": { "code": "5302", "id": 126 }, "MUARA ENIM": { "code": "5103", "id": 102 }, "MUARA TEWEH": { "code": "7502", "id": 278 }, "NABIRE": { "code": "6208", "id": 368 }, "NAGAN": { "code": "5612", "id": 158 }, "NAMLEA": { "code": "6202", "id": 238 }, "NUNUKAN": { "code": "7600", "id": 314 }, "PADANG": { "code": "5430", "id": 144 }, "PALANGKARAYA": { "code": "7300", "id": 274 }, "PALEMBANG": { "code": "5100", "id": 99 }, "PALOPO": { "code": "6001", "id": 169 }, "PALU": { "code": "6005", "id": 173 }, "PALU 2": { "code": "6041", "id": 207 }, "PALU 3": { "code": "6055", "id": 326 }, "PANGANDARAN": { "code": "2502", "id": 45 }, "PANGKALAN BRANDAN": { "code": "5502", "id": 147 }, "PANGKALANBUN": { "code": "7500", "id": 276 }, "PANGKEP": { "code": "6011", "id": 179 }, "PANTON LABU": { "code": "5514", "id": 151 }, "PAREPARE": { "code": "6003", "id": 171 }, "PARIAMAN": { "code": "5407", "id": 140 }, "PARIGI": { "code": "6008", "id": 176 }, "PARUNG": { "code": "2001", "id": 24 }, "PARUNGKUDA": { "code": "2403", "id": 40 }, "PASAMAN": { "code": "5410", "id": 142 }, "PASANGKAYU": { "code": "6025", "id": 193 }, "PATI": { "code": "3202", "id": 62 }, "PATROL": { "code": "2603", "id": 50 }, "PAYAKUMBUH": { "code": "5401", "id": 134 }, "PEKALONGAN": { "code": "3302", "id": 65 }, "PEKANBARU": { "code": "5800", "id": 167 }, "PELABUHAN RATU": { "code": "2410", "id": 41 }, "PEMATANG SIANTAR": { "code": "5530", "id": 154 }, "PENAJAM": { "code": "7002", "id": 259 }, "PENDOLO": { "code": "6039", "id": 205 }, "PINRANG": { "code": "6017", "id": 185 }, "PLEIHARI": { "code": "7102", "id": 263 }, "POLMAS": { "code": "6015", "id": 183 }, "PONTIANAK": { "code": "7400", "id": 275 }, "POSO": { "code": "6024", "id": 192 }, "PRABUMULIH": { "code": "5101", "id": 100 }, "PRAYA": { "code": "9104", "id": 358 }, "PRINGSEWU": { "code": "5003", "id": 86 }, "PROBOLINGGO": { "code": "4101", "id": 78 }, "PUNGGALUKU": { "code": "6108", "id": 229 }, "PURWAKARTA": { "code": "2201", "id": 30 }, "PURWOKERTO": { "code": "3301", "id": 64 }, "PUSAT": { "code": "0100", "id": 15 }, "RAHA": { "code": "6103", "id": 224 }, "RANTAU PRAPAT": { "code": "5504", "id": 353 }, "RATAHAN": { "code": "6306", "id": 248 }, "RAWAJITU": { "code": "5014", "id": 97 }, "RUMBIA": { "code": "5009", "id": 92 }, "RUTENG": { "code": "9001", "id": 283 }, "SABAK": { "code": "5307", "id": 131 }, "SALAKAN": { "code": "6037", "id": 203 }, "SAMARINDA": { "code": "7200", "id": 269 }, "SAMARINDA SEBERANG": { "code": "7204", "id": 273 }, "SAMPIT": { "code": "7501", "id": 277 }, "SANGATTA": { "code": "7203", "id": 272 }, "SAROLANGUN": { "code": "5308", "id": 132 }, "SAUMLAKI": { "code": "6204", "id": 240 }, "SEBABI": { "code": "7303", "id": 346 }, "SEBATIK": { "code": "7601", "id": 350 }, "SEKAYU": { "code": "5107", "id": 106 }, "SEMARANG": { "code": "3200", "id": 60 }, "SENGKANG": { "code": "6016", "id": 184 }, "SEPAKU": { "code": "7004", "id": 349 }, "SERANG": { "code": "1102", "id": 19 }, "SIAU": { "code": "6303", "id": 245 }, "SIDIKALANG": { "code": "5505", "id": 356 }, "SIDOARJO": { "code": "4001", "id": 72 }, "SIDRAP": { "code": "6018", "id": 186 }, "SIGLI": { "code": "5520", "id": 152 }, "SIJUNJUNG": { "code": "5420", "id": 143 }, "SIMPANG PEMATANG": { "code": "5010", "id": 93 }, "SINJAI": { "code": "6048", "id": 214 }, "SOLO": { "code": "3100", "id": 56 }, "SOLOK": { "code": "5402", "id": 135 }, "SOPPENG": { "code": "6044", "id": 210 }, "SORONG": { "code": "8000", "id": 279 }, "SRAGEN": { "code": "3400", "id": 69 }, "SUBANG": { "code": "2607", "id": 53 }, "SUBULUSSALAM": { "code": "5616", "id": 319 }, "SUKABUMI": { "code": "2401", "id": 38 }, "SUMBAWA": { "code": "9101", "id": 286 }, "SUMEDANG": { "code": "2301", "id": 32 }, "SUNGAI DANAU": { "code": "7108", "id": 343 }, "SUNGAI LIAT": { "code": "5202", "id": 116 }, "SUNGAI LILIN": { "code": "5113", "id": 112 }, "SURABAYA": { "code": "4000", "id": 71 }, "TAHUNA": { "code": "6301", "id": 243 }, "TAKALAR": { "code": "6031", "id": 198 }, "TAKENGON": { "code": "5621", "id": 162 }, "TALAUD": { "code": "6302", "id": 244 }, "TALISAYAN": { "code": "7206", "id": 347 }, "TANAH GROGOT": { "code": "7001", "id": 258 }, "TANGERANG": { "code": "1100", "id": 17 }, "TANGGEUNG": { "code": "2402", "id": 39 }, "TANJUNG": { "code": "7101", "id": 262 }, "TANJUNG BINTANG": { "code": "5013", "id": 96 }, "TANJUNG PINANG": { "code": "5801", "id": 354 }, "TANJUNG SELOR": { "code": "7205", "id": 369 }, "TARAKAN": { "code": "7003", "id": 260 }, "TASIKMALAYA": { "code": "2500", "id": 43 }, "TEBO": { "code": "5301", "id": 125 }, "TEGAL": { "code": "2605", "id": 51 }, "TEMANGGUNG": { "code": "3300", "id": 63 }, "TENGGARONG": { "code": "7201", "id": 270 }, "TENTENA": { "code": "6045", "id": 211 }, "TERNATE": { "code": "6400", "id": 251 }, "TOBELO": { "code": "6401", "id": 252 }, "TOBOALI": { "code": "5208", "id": 122 }, "TOILI": { "code": "6028", "id": 196 }, "TOLI TOLI": { "code": "6009", "id": 177 }, "TOMOHON": { "code": "6308", "id": 250 }, "TOMPE": { "code": "6030", "id": 197 }, "TOPOYO": { "code": "6026", "id": 194 }, "TORAJA": { "code": "6007", "id": 175 }, "TUAL": { "code": "6205", "id": 241 }, "TUGUMULYO": { "code": "5105", "id": 104 }, "TULANG BAWANG": { "code": "5002", "id": 85 }, "TULUNGAGUNG": { "code": "4301", "id": 81 }, "TUNGKAL": { "code": "5306", "id": 130 }, "UJUNG BERUNG": { "code": "2304", "id": 35 }, "UJUNG GADING": { "code": "5406", "id": 139 }, "ULEE GLEE": { "code": "5521", "id": 153 }, "UMROH PUSAT": { "code": "1000", "id": 312 }, "UMROH PUSAT BVT": { "code": "1000B", "id": 313 }, "UNAAHA": { "code": "6107", "id": 228 }, "WAHAU": { "code": "7207", "id": 348 }, "WAISARISSA": { "code": "6203", "id": 239 }, "WAKATOBI": { "code": "6116", "id": 366 }, "WAY JEPARA": { "code": "5007", "id": 90 }, "WAY KANAN": { "code": "5015", "id": 98 }, "WEDA": { "code": "6403", "id": 367 }, "WONOGIRI": { "code": "3103", "id": 59 }, "WONOSARI": { "code": "3001", "id": 55 }, "WONOSOBO": { "code": "3304", "id": 67 }, "YOGYAKARTA": { "code": "3000", "id": 54 } };

// Buat pemetaan terbalik
const codeToNameMapping = {};
for (const name in branchMapping) {
    const code = branchMapping[name].code;
    codeToNameMapping[code] = name;
}

function BranchDataProcessor() {
  const [originalData, setOriginalData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [originalHeaders, setOriginalHeaders] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileInfo, setFileInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('Pilih File Excel...');

  const PREVIEW_ROWS = 100;

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      setFileName(file.name);
      setFileInfo(`File dipilih: ${file.name}`);
      setProcessedData([]);
      setOriginalData([]);
      setOriginalHeaders([]);
    }
  };

  const handleProcess = () => {
    if (!uploadedFile) {
      alert("Silakan pilih file Excel terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setFileInfo('Membaca dan memproses file, harap tunggu...');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          throw new Error("File Excel kosong atau format tidak dapat dibaca.");
        }

        const headers = Object.keys(jsonData[0]);
        const processed = processDataLogic(jsonData); // Gunakan fungsi logika terpisah

        setOriginalData(jsonData);
        setProcessedData(processed);
        setOriginalHeaders(headers);

        if (jsonData.length > PREVIEW_ROWS) {
          setFileInfo(`Berhasil! Menampilkan pratinjau ${PREVIEW_ROWS} dari ${jsonData.length} total baris.`);
        } else {
          setFileInfo(`${jsonData.length} baris data berhasil diproses.`);
        }

      } catch (err) {
        console.error("Error processing Excel file:", err);
        const message = "Gagal memproses file. Pastikan file Excel tidak rusak dan format kolom benar.";
        setFileInfo(message);
        alert(message);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const processDataLogic = (data) => {
    // Buat salinan data agar tidak mengubah state asli
    const processed = JSON.parse(JSON.stringify(data));
    const isEmpty = (val) => val === null || val === undefined || String(val).trim() === '';

    processed.forEach(row => {
      const cleanRow = {};
      for (const key in row) {
          cleanRow[key.trim().toLowerCase()] = row[key];
      }

      // LANGKAH 1
      if (isEmpty(cleanRow.branch_name) && !isEmpty(cleanRow.branch_code)) {
        const code = String(cleanRow.branch_code).trim();
        if (codeToNameMapping[code]) {
          row.branch_name = codeToNameMapping[code];
        }
      } else if (!isEmpty(cleanRow.branch_name) && isEmpty(cleanRow.branch_code)) {
        const name = String(cleanRow.branch_name).trim().toUpperCase();
        if (branchMapping[name]) {
          row.branch_code = branchMapping[name].code;
        }
      }

      // Perbarui cleanRow
      for (const key in row) {
          cleanRow[key.trim().toLowerCase()] = row[key];
      }

      // LANGKAH 2
      if (isEmpty(cleanRow.unit_location_name) && !isEmpty(cleanRow.unit_location_code)) {
         const code = String(cleanRow.unit_location_code).trim();
         if (codeToNameMapping[code]) {
            row.unit_location_name = codeToNameMapping[code];
         }
      }

      // LANGKAH 3
      if (isEmpty(row.unit_location_code) && isEmpty(row.unit_location_name)) {
        row.unit_location_code = row.branch_code; 
        row.unit_location_name = row.branch_name;
      }

      // LANGKAH 4
      const finalUnitLocationNameUpper = !isEmpty(row.unit_location_name) ? String(row.unit_location_name).trim().toUpperCase() : '';
      if (finalUnitLocationNameUpper && branchMapping[finalUnitLocationNameUpper]) {
        row.unit_location_code = branchMapping[finalUnitLocationNameUpper].code;
      }
    });

    return processed;
  };

  const handleDownload = () => {
    if (processedData.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }
    
    const newWorksheet = window.XLSX.utils.json_to_sheet(processedData);
    const newWorkbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Hasil Proses');

    const originalFilename = uploadedFile.name.replace(/\.(xlsx|xls)$/i, '');
    window.XLSX.writeFile(newWorkbook, `${originalFilename}_processed.xlsx`);
  };

  const renderTable = (data, headers) => {
    const previewData = data.slice(0, PREVIEW_ROWS);
    return (
      <tbody className="bg-white divide-y divide-gray-200">
        {previewData.map((item, index) => (
          <tr key={index}>
            {headers.map(header => {
              const value = item[header] === null || typeof item[header] === 'undefined' ? '' : item[header];
              const displayValue = value.toString().trim() === '' 
                ? <span className="text-red-500 font-semibold">KOSONG</span> 
                : value;
              return (
                <td key={header} className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {displayValue}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <div>
      <div className="tool-header">
        <h1>Alat Pemroses Data Cabang</h1>
        <p>Unggah file .xlsx Anda, proses, lalu unduh hasilnya.</p>
      </div>
      <div className="card">
        <div className="grid grid-cols-1 md-grid-cols-3 gap-4 items-center bg-gray-50 p-4 rounded-lg mb-6 border">
          <div>
            <input 
              type="file" 
              id="excel-file-input" 
              className="is-hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
            <label htmlFor="excel-file-input" className="button secondary" style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
              <i className="fas fa-upload" style={{ marginRight: '0.5rem' }}></i>
              <span>{fileName}</span>
            </label>
          </div>
          <button 
            id="process-btn" 
            className="button primary" 
            disabled={!uploadedFile || isLoading}
            onClick={handleProcess}
          >
            {isLoading ? 'Memproses...' : 'Proses Data'}
          </button>
          <button 
            id="download-btn" 
            className="button success" 
            disabled={processedData.length === 0 || isLoading}
            onClick={handleDownload}
          >
            Unduh Hasil (.xlsx)
          </button>
        </div>
        <p id="file-info" className="text-center text-gray-500 text-sm mb-6 h-5">{fileInfo}</p>

        {originalData.length > 0 && (
          <div id="table-area" className="grid grid-cols-1 lg-grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-3 text-gray-600">Pratinjau Data Asli</h2>
              <div className="table-container results-table-wrapper border rounded-lg">
                <table className="results-table">
                  <thead id="original-data-head" className="bg-gray-50 sticky top-0">
                    <tr>
                      {originalHeaders.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h.replace(/_/g, ' ')}</th>)}
                    </tr>
                  </thead>
                  {renderTable(originalData, originalHeaders)}
                </table>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-3 text-green-600">Pratinjau Hasil Proses</h2>
              <div className="table-container results-table-wrapper border rounded-lg">
                <table className="results-table">
                  <thead id="processed-data-head" className="bg-green-50 sticky top-0">
                    <tr>
                      {originalHeaders.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h.replace(/_/g, ' ')}</th>)}
                    </tr>
                  </thead>
                  {renderTable(processedData, originalHeaders)}
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BranchDataProcessor;