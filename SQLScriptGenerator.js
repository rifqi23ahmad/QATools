function initSqlScriptGenerator() {
    const page = document.getElementById('SqlScriptGenerator');
    page.innerHTML = `
        <div class="tool-header">
            <h1>Integrated SQL Script Generator</h1>
            <p>Satu input untuk menghasilkan skrip 'Consumer' dan 'Mapping' yang saling terkait.</p>
        </div>

        <div class="flex flex-col" style="gap: 1.5rem;">
            <div class="card">
                <div class="flex items-center mb-4">
                    <span class="step-number">1</span>
                    <h2 class="text-xl font-semibold" style="margin-left: 1rem;">Unggah Data Afiliasi (.csv)</h2>
                </div>
                <p class="text-sm" style="color: var(--text-secondary); margin-left: 3.5rem; margin-bottom: 1rem;">Pilih file .csv dari komputer Anda. Pastikan urutan kolom: Warehouse, Cabang, No. HP, Nama PIC, Alamat Balai Lelang.</p>
                <div style="margin-left: 3.5rem;">
                    <label for="sql-gen-file-input" class="file-input-label">
                         <div id="sql-gen-file-label">
                            <i class="fas fa-file-arrow-up fa-3x" style="color: #cbd5e0;"></i>
                            <span style="margin-top: 1rem; display: block; font-weight: 500;">Klik untuk mengunggah file .csv</span>
                        </div>
                    </label>
                    <input type="file" id="sql-gen-file-input" class="is-hidden" accept=".csv, text/csv">
                </div>
            </div>
            
            <div class="card">
                 <div class="flex items-center mb-4">
                    <span class="step-number">2</span>
                    <h2 class="text-xl font-semibold" style="margin-left: 1rem;">Konfigurasi & Generate</h2>
                </div>
                 <div style="margin-left: 3.5rem;">
                    <div class="grid grid-cols-2" style="gap: 1rem; margin-bottom: 1.5rem;">
                        <div>
                            <label for="createdBy" class="label">Created By / Updated By (ID)</label>
                            <input type="text" id="createdBy" class="input" value="2133">
                        </div>
                        <div>
                            <label for="consumerType" class="label">Consumer Type</label>
                            <input type="text" id="consumerType" class="input" value="AUCTION_HOUSE">
                        </div>
                        <div>
                            <label for="branchCode" class="label">Branch Code (Fallback)</label>
                            <input type="text" id="branchCode" class="input" value="0100">
                        </div>
                        <div>
                            <label for="branchId" class="label">Branch ID (Fallback)</label>
                            <input type="text" id="branchId" class="input" value="179">
                        </div>
                    </div>
                    <button id="generateAll" class="button primary" style="width: 100%; padding: 0.8rem;">
                        Generate All Scripts
                    </button>
                 </div>
            </div>

            <div class="card">
                <div class="flex items-center mb-4">
                     <span class="step-number">3</span>
                    <h2 class="text-xl font-semibold" style="margin-left: 1rem;">Hasil Skrip SQL</h2>
                </div>
                <div id="summary" class="text-center" style="margin: 1rem 0; margin-left: 3.5rem;"></div>
                <div class="grid grid-cols-2" style="gap: 1.5rem; margin-left: 3.5rem;">
                    <div>
                        <div class="flex justify-between items-center" style="margin-bottom: 0.5rem;">
                            <h3 class="font-semibold">Consumer Table Scripts</h3>
                            <button id="copyConsumer" class="button secondary">Copy</button>
                        </div>
                        <textarea id="sqlOutputConsumer" class="textarea textarea-editor" style="height: 40vh;" readonly placeholder="-- Skrip untuk tabel consumer akan muncul di sini..."></textarea>
                    </div>
                    <div>
                         <div class="flex justify-between items-center" style="margin-bottom: 0.5rem;">
                            <h3 class="font-semibold">Consumer Mapping Scripts</h3>
                            <button id="copyMapping" class="button secondary">Copy</button>
                        </div>
                        <textarea id="sqlOutputMapping" class="textarea textarea-editor" style="height: 40vh;" readonly placeholder="-- Skrip untuk tabel mapping akan muncul di sini..."></textarea>
                    </div>
                </div>
            </div>
        </div>
        <div id="sql-gen-toast" class="toast"></div>
    `;

    // --- Start of User's Provided Logic (Adapted for QaTools) ---
    let uploadedCsvData = '';
    const branchMapping = { "ACEH": { "code": "5600", "id": 319 }, "ALUE BILIE": { "code": "5613", "id": 323 }, "AMBON": { "code": "6200", "id": 400 }, "AMPANA": { "code": "6021", "id": 353 }, "ARGA MAKMUR": { "code": "5701", "id": 330 }, "ASERA": { "code": "6115", "id": 546 }, "BABAT TOMAN": { "code": "5108", "id": 271 }, "BACAN": { "code": "6111", "id": 396 }, "BAHODOPI": { "code": "6057", "id": 998 }, "BAJAWA": { "code": "9004", "id": 542 }, "BALARAJA": { "code": "1104", "id": 184 }, "BALIGE": { "code": "5531", "id": 536 }, "BALIKPAPAN": { "code": "7000", "id": 421 }, "BANDAR JAYA": { "code": "5006", "id": 253 }, "BANDUNG": { "code": "8506", "id": 463 }, "BANGGAI": { "code": "6058", "id": 545 }, "BANGKA": { "code": "5200", "id": 278 }, "BANGKALA": { "code": "6050", "id": 380 }, "BANGKO": { "code": "5303", "id": 291 }, "BANJAR": { "code": "2501", "id": 208 }, "BANJARAN": { "code": "2305", "id": 200 }, "BANJARMASIN": { "code": "7100", "id": 425 }, "BANTAENG": { "code": "6047", "id": 377 }, "BARABAI": { "code": "7107", "id": 432 }, "BARRU": { "code": "6042", "id": 372 }, "BATULICIN": { "code": "7105", "id": 430 }, "BATURAJA": { "code": "5102", "id": 265 }, "BATU SANGKAR": { "code": "5403", "id": 300 }, "BAWEN": { "code": "3201", "id": 225 }, "BAYUNG LENCIR": { "code": "5114", "id": 277 }, "BEKASI": { "code": "1200", "id": 185 }, "BELINYU": { "code": "5209", "id": 287 }, "BELITANG": { "code": "5106", "id": 269 }, "BELITUNG": { "code": "5201", "id": 279 }, "BELOPA": { "code": "6040", "id": 370 }, "BELTIM": { "code": "5205", "id": 283 }, "BENGKULU": { "code": "5700", "id": 329 }, "BERAU": { "code": "7202", "id": 435 }, "BETUNG": { "code": "5110", "id": 273 }, "BINJAI": { "code": "5501", "id": 310 }, "BIREUEN": { "code": "5630", "id": 328 }, "BITUNG": { "code": "6304", "id": 410 }, "BLANG PIDIE": { "code": "5611", "id": 321 }, "BLITAR": { "code": "4302", "id": 246 }, "BOALEMO": { "code": "6502", "id": 420 }, "BOEPINANG": { "code": "6106", "id": 391 }, "BOGOR": { "code": "2000", "id": 187 }, "BOJONEGORO": { "code": "4003", "id": 238 }, "BONE": { "code": "6014", "id": 346 }, "BOROKO": { "code": "6307", "id": 413 }, "BOYOLALI": { "code": "3101", "id": 221 }, "BUKIT TINGGI": { "code": "5408", "id": 305 }, "BULI": { "code": "6113", "id": 398 }, "BULUKUMBA": { "code": "6002", "id": 334 }, "BUNGKU": { "code": "6035", "id": 366 }, "BUNGO": { "code": "5305", "id": 293 }, "BUNTA": { "code": "6027", "id": 359 }, "BUOL": { "code": "6022", "id": 354 }, "BUTON": { "code": "6101", "id": 386 }, "CIANJUR": { "code": "2400", "id": 201 }, "CIAWI": { "code": "2503", "id": 210 }, "CIBINONG": { "code": "2002", "id": 189 }, "CIGUDEG": { "code": "2003", "id": 190 }, "CIKARANG": { "code": "1201", "id": 186 }, "CILACAP": { "code": "3305", "id": 232 }, "CILEDUG": { "code": "1101", "id": 182 }, "CILEUNGSI": { "code": "2100", "id": 192 }, "CIMAHI": { "code": "2303", "id": 198 }, "CINERE": { "code": "1004", "id": 180 }, "CIREBON": { "code": "2600", "id": 211 }, "CURUP": { "code": "5321", "id": 297 }, "DAYA MURNI": { "code": "5012", "id": 259 }, "DOMPU": { "code": "9102", "id": 451 }, "DONGGALA": { "code": "6034", "id": 365 }, "ENDE": { "code": "9000", "id": 446 }, "ENREKANG": { "code": "6019", "id": 351 }, "EREKE": { "code": "6110", "id": 395 }, "GARUT": { "code": "2302", "id": 197 }, "GORONTALO": { "code": "6500", "id": 418 }, "GOWA": { "code": "6032", "id": 363 }, "GOWA 2": { "code": "6049", "id": 379 }, "GRESIK": { "code": "4002", "id": 237 }, "IDIE": { "code": "5512", "id": 314 }, "INDRALAYA": { "code": "5109", "id": 272 }, "JAILOLO": { "code": "6402", "id": 417 }, "JAKARTA": { "code": "8502", "id": 459 }, "JAMBI": { "code": "5300", "id": 288 }, "JAMPANG": { "code": "2411", "id": 206 }, "JATIBARANG": { "code": "2601", "id": 212 }, "JAYAPURA": { "code": "8001", "id": 444 }, "JEBUS": { "code": "5207", "id": 285 }, "JEMBER": { "code": "4102", "id": 243 }, "JENEPONTO": { "code": "6004", "id": 336 }, "KADIPATEN": { "code": "2602", "id": 213 }, "KALIANDA": { "code": "5005", "id": 252 }, "KAPUAS": { "code": "7104", "id": 429 }, "KARANGANYAR": { "code": "3102", "id": 222 }, "KARAWANG": { "code": "2200", "id": 193 }, "KARIMUN": { "code": "5802", "id": 539 }, "KASIPUTE": { "code": "6109", "id": 394 }, "KASONGAN": { "code": "7301", "id": 532 }, "KAYU AGUNG": { "code": "5104", "id": 267 }, "KEBUMEN": { "code": "3500", "id": 234 }, "KEDIRI": { "code": "4300", "id": 244 }, "KELAPA": { "code": "5203", "id": 281 }, "KENDARI": { "code": "6100", "id": 385 }, "KEPULAUAN SELAYAR": { "code": "6052", "id": 382 }, "KOBA": { "code": "5206", "id": 284 }, "KOLAKA": { "code": "6102", "id": 387 }, "KOTA AGUNG": { "code": "5008", "id": 255 }, "KOTABARU": { "code": "7106", "id": 431 }, "KOTABUMI": { "code": "5004", "id": 251 }, "KOTA CANE": { "code": "5623", "id": 535 }, "KOTA FAJAR": { "code": "5615", "id": 324 }, "KOTAMOBAGU": { "code": "6305", "id": 411 }, "KOTARAYA": { "code": "6023", "id": 355 }, "KOTOBARU": { "code": "5404", "id": 301 }, "KUALA KURUN": { "code": "7302", "id": 528 }, "KUALA SIMPANG": { "code": "5511", "id": 313 }, "KUNINGAN": { "code": "2606", "id": 216 }, "KUPANG": { "code": "9003", "id": 541 }, "LABUAN BAJO": { "code": "9002", "id": 448 }, "LADONGI": { "code": "6105", "id": 390 }, "LAHAT": { "code": "5112", "id": 275 }, "LAMANDAU": { "code": "7503", "id": 527 }, "LAMPUNG": { "code": "5000", "id": 247 }, "LANGSA ACEH": { "code": "5510", "id": 312 }, "LASUSUA": { "code": "6104", "id": 389 }, "LEUWILIANG": { "code": "2099", "id": 191 }, "LHOKSEUMAWE": { "code": "5620", "id": 325 }, "LHOKSUKON": { "code": "5622", "id": 327 }, "LIMBOTO": { "code": "6503", "id": 550 }, "LIWA": { "code": "5011", "id": 258 }, "LUBUKBASUNG": { "code": "5405", "id": 302 }, "LUBUK LINGGAU": { "code": "5304", "id": 292 }, "LUWUK": { "code": "6010", "id": 342 }, "MADIUN": { "code": "4004", "id": 239 }, "MAGELANG": { "code": "3303", "id": 230 }, "MAJENE": { "code": "6043", "id": 373 }, "MAKALE": { "code": "6053", "id": 383 }, "MAKASSAR": { "code": "6000", "id": 332 }, "MAKASSAR 2": { "code": "6099", "id": 384 }, "MAKASSAR 3": { "code": "6046", "id": 376 }, "MALANG": { "code": "4100", "id": 241 }, "MALILI": { "code": "6038", "id": 368 }, "MALINO": { "code": "6051", "id": 381 }, "MAMASA": { "code": "6056", "id": 999 }, "MAMUJU": { "code": "6006", "id": 338 }, "MANADO": { "code": "6300", "id": 406 }, "MANGKUTANA": { "code": "6013", "id": 345 }, "MANOKWARI": { "code": "8002", "id": 445 }, "MANTIS": { "code": "5503", "id": -1 }, "MARISA": { "code": "6501", "id": 419 }, "MAROS": { "code": "6033", "id": 364 }, "MARTAPURA-KAL": { "code": "7103", "id": 428 }, "MARTAPURA-SUM": { "code": "5111", "id": 274 }, "MASAMBA": { "code": "6012", "id": 344 }, "MASBAGIK": { "code": "9100", "id": 449 }, "MASOHI": { "code": "6201", "id": 401 }, "MEDAN": { "code": "5500", "id": 309 }, "MENTOK": { "code": "5204", "id": 282 }, "MERAUKE": { "code": "6209", "id": 549 }, "METRO": { "code": "5001", "id": 248 }, "MEULABOH": { "code": "5610", "id": 320 }, "MOJOKERTO": { "code": "4005", "id": 240 }, "MOLIBAGU": { "code": "6114", "id": 399 }, "MOROTAI": { "code": "6112", "id": 397 }, "MOROWALI": { "code": "6020", "id": 352 }, "MUARA BULIAN": { "code": "5302", "id": 290 }, "MUARA ENIM": { "code": "5103", "id": 266 }, "MUARA TEWEH": { "code": "7502", "id": 442 }, "NABIRE": { "code": "6208", "id": 544 }, "NAGAN": { "code": "5612", "id": 322 }, "NAMLEA": { "code": "6202", "id": 402 }, "NUNUKAN": { "code": "7600", "id": 464 }, "PADANG": { "code": "5430", "id": 308 }, "PALANGKARAYA": { "code": "7300", "id": 438 }, "PALEMBANG": { "code": "5100", "id": 263 }, "PALOPO": { "code": "6001", "id": 333 }, "PALU": { "code": "6005", "id": 337 }, "PALU 2": { "code": "6041", "id": 371 }, "PALU 3": { "code": "6055", "id": 1000 }, "PANGANDARAN": { "code": "2502", "id": 209 }, "PANGKALAN BRANDAN": { "code": "5502", "id": 311 }, "PANGKALANBUN": { "code": "7500", "id": 440 }, "PANGKEP": { "code": "6011", "id": 343 }, "PANTON LABU": { "code": "5514", "id": 315 }, "PARE-PARE": { "code": "6003", "id": 335 }, "PARIAMAN": { "code": "5407", "id": 304 }, "PARIGI": { "code": "6008", "id": 340 }, "PARUNG": { "code": "2001", "id": 188 }, "PARUNGKUDA": { "code": "2403", "id": 204 }, "PASAMAN": { "code": "5410", "id": 306 }, "PASANGKAYU": { "code": "6025", "id": 357 }, "PATI": { "code": "3202", "id": 226 }, "PATROL": { "code": "2603", "id": 214 }, "PAYAKUMBUH": { "code": "5401", "id": 298 }, "PEKALONGAN": { "code": "3302", "id": 229 }, "PEKANBARU": { "code": "5800", "id": 331 }, "PELABUHAN RATU": { "code": "2410", "id": 205 }, "PEMATANG SIANTAR": { "code": "5530", "id": 318 }, "PENAJAM": { "code": "7002", "id": 423 }, "PENDOLO": { "code": "6039", "id": 369 }, "PINRANG": { "code": "6017", "id": 349 }, "PLEIHARI": { "code": "7102", "id": 427 }, "POLMAS": { "code": "6015", "id": 347 }, "PONTIANAK": { "code": "7400", "id": 439 }, "POSO": { "code": "6024", "id": 356 }, "PRABUMULIH": { "code": "5101", "id": 264 }, "PRINGSEWU": { "code": "5003", "id": 250 }, "PROBOLINGGO": { "code": "4101", "id": 242 }, "PUNGGALUKU": { "code": "6108", "id": 393 }, "PURWAKARTA": { "code": "2201", "id": 194 }, "PURWOKERTO": { "code": "3301", "id": 228 }, "PUSAT": { "code": "0100", "id": 179 }, "RAHA": { "code": "6103", "id": 388 }, "RANTAU PRAPAT": { "code": "5504", "id": 537 }, "RATAHAN": { "code": "6306", "id": 412 }, "RAWAJITU": { "code": "5014", "id": 261 }, "RUMBIA": { "code": "5009", "id": 256 }, "RUTENG": { "code": "9001", "id": 447 }, "SABAK": { "code": "5307", "id": 295 }, "SALAKAN": { "code": "6037", "id": 367 }, "SAMARINDA": { "code": "7200", "id": 433 }, "SAMARINDA SEBERANG": { "code": "7204", "id": 437 }, "SAMPIT": { "code": "7501", "id": 441 }, "SANGATTA": { "code": "7203", "id": 436 }, "SAROLANGUN": { "code": "5308", "id": 296 }, "SAUMLAKI": { "code": "6204", "id": 404 }, "SEBABI": { "code": "7303", "id": 529 }, "SEBATIK": { "code": "7601", "id": 534 }, "SEKAYU": { "code": "5107", "id": 270 }, "SEMARANG": { "code": "3200", "id": 224 }, "SENGKANG": { "code": "6016", "id": 348 }, "SENTRA OPS. JABOTABEK 1": { "code": "0900", "id": -10 }, "SENTRA OPS. JABOTABEK 2": { "code": "0901", "id": -11 }, "SEPAKU": { "code": "7004", "id": 533 }, "SERANG": { "code": "1102", "id": 183 }, "SIAU": { "code": "6303", "id": 409 }, "SIDIKALANG": { "code": "5505", "id": 540 }, "SIDOARJO": { "code": "4001", "id": 236 }, "SIDRAP": { "code": "6018", "id": 350 }, "SIGLI": { "code": "5520", "id": 316 }, "SIJUNJUNG": { "code": "5420", "id": 307 }, "SIMPANG PEMATANG": { "code": "5010", "id": 257 }, "SINJAI": { "code": "6048", "id": 378 }, "SOLO": { "code": "3100", "id": 220 }, "SOLOK": { "code": "5402", "id": 299 }, "SOPPENG": { "code": "6044", "id": 374 }, "SORONG": { "code": "8000", "id": 443 }, "SRAGEN": { "code": "3400", "id": 233 }, "SUBANG": { "code": "2607", "id": 217 }, "SUBULUSSALAM": { "code": "5616", "id": 475 }, "SUKABUMI": { "code": "2401", "id": 202 }, "SUMBAWA": { "code": "9101", "id": 450 }, "SUMEDANG": { "code": "2301", "id": 196 }, "SUNGAI DANAU": { "code": "7108", "id": 526 }, "SUNGAI LIAT": { "code": "5202", "id": 280 }, "SUNGAI LILIN": { "code": "5113", "id": 276 }, "SURABAYA": { "code": "4000", "id": 235 }, "TAHUNA": { "code": "6301", "id": 407 }, "TAKALAR": { "code": "6031", "id": 362 }, "TAKENGON": { "code": "5621", "id": 326 }, "TALAUD": { "code": "6302", "id": 408 }, "TALISAYAN": { "code": "7206", "id": 530 }, "TANAH GROGOT": { "code": "7001", "id": 422 }, "TANGERANG": { "code": "8503", "id": 461 }, "TANGGEUNG": { "code": "2402", "id": 203 }, "TANJUNG": { "code": "7101", "id": 426 }, "TANJUNG BINTANG": { "code": "5013", "id": 260 }, "TANJUNG PINANG": { "code": "5801", "id": 538 }, "TANJUNG SELOR": { "code": "7205", "id": 548 }, "TARAKAN": { "code": "7003", "id": 424 }, "TASIKMALAYA": { "code": "2500", "id": 207 }, "TEBO": { "code": "5301", "id": 289 }, "TEGAL": { "code": "2605", "id": 215 }, "TEMANGGUNG": { "code": "3300", "id": 227 }, "TENGGARONG": { "code": "7201", "id": 434 }, "TENTENA": { "code": "6045", "id": 375 }, "TERNATE": { "code": "6400", "id": 415 }, "TOBELO": { "code": "6401", "id": 416 }, "TOBOALI": { "code": "5208", "id": 286 }, "TOILI": { "code": "6028", "id": 360 }, "TOLI TOLI": { "code": "6009", "id": 341 }, "TOMOHON": { "code": "6308", "id": 414 }, "TOMPE": { "code": "6030", "id": 361 }, "TOPOYO": { "code": "6026", "id": 358 }, "TORAJA": { "code": "6007", "id": 339 }, "TUAL": { "code": "6205", "id": 405 }, "TUGUMULYO": { "code": "5105", "id": 268 }, "TULANG BAWANG": { "code": "5002", "id": 249 }, "TULUNGAGUNG": { "code": "4301", "id": 245 }, "TUNGKAL": { "code": "5306", "id": 294 }, "UJUNG BERUNG": { "code": "2304", "id": 199 }, "UJUNG GADING": { "code": "5406", "id": 303 }, "ULEE GLEE": { "code": "5521", "id": 317 }, "UNAAHA": { "code": "6107", "id": 392 }, "WAHAU": { "code": "7207", "id": 531 }, "WAISARISSA": { "code": "6203", "id": 403 }, "WAKATOBI": { "code": "6116", "id": 543 }, "WAY JEPARA": { "code": "5007", "id": 254 }, "WAY KANAN": { "code": "5015", "id": 262 }, "WEDA": { "code": "6403", "id": 547 }, "WONOGIRI": { "code": "3103", "id": 223 }, "WONOSARI": { "code": "3001", "id": 219 }, "WONOSOBO": { "code": "3304", "id": 231 }, "YOGYAKARTA": { "code": "3000", "id": 218 } };

    const fileInput = page.querySelector('#sql-gen-file-input');
    const fileLabel = page.querySelector('#sql-gen-file-label');
    const generateBtn = page.querySelector('#generateAll');
    const copyConsumerBtn = page.querySelector('#copyConsumer');
    const copyMappingBtn = page.querySelector('#copyMapping');

    function showToast(message = 'Skrip disalin!', isError = false) {
        const toast = page.querySelector('#sql-gen-toast');
        toast.textContent = message;
        toast.className = 'toast show';
        if (isError) toast.classList.add('error');
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            fileLabel.innerHTML = `<i class="fas fa-check-circle fa-3x" style="color: var(--success-color);"></i><span style="margin-top: 1rem; display: block; font-weight: 600;">${file.name}</span>`;
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedCsvData = e.target.result;
                showToast(`${file.name} berhasil dimuat.`);
            };
            reader.onerror = () => {
                uploadedCsvData = '';
                fileLabel.innerHTML = `<i class="fas fa-times-circle fa-3x" style="color: var(--danger-color);"></i><span style="margin-top: 1rem; display: block; font-weight: 600;">Gagal membaca file.</span>`;
                showToast('Error saat membaca file.', true);
            };
            reader.readAsText(file);
        }
    });

    generateBtn.addEventListener('click', () => {
        const csvData = uploadedCsvData.trim();
        const createdBy = page.querySelector('#createdBy').value;
        const consumerType = page.querySelector('#consumerType').value;
        const branchCodeDefault = page.querySelector('#branchCode').value;
        const branchIdFallback = page.querySelector('#branchId').value;
        const outputConsumer = page.querySelector('#sqlOutputConsumer');
        const outputMapping = page.querySelector('#sqlOutputMapping');
        const summaryEl = page.querySelector('#summary');

        outputConsumer.value = '';
        outputMapping.value = '';
        summaryEl.textContent = '';

        if (!csvData) {
            showToast('Error: Silakan unggah file CSV terlebih dahulu.', true);
            return;
        }

        // --- Start of processing logic (copied from user's script) ---
        function generateUUID() { return crypto.randomUUID(); }
        function getFormattedTimestamp() {
            const now = new Date();
            const pad = (num) => num.toString().padStart(2, '0');
            return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${now.getMilliseconds().toString().padStart(3, '0')}`;
        }
        function escapeSqlString(value, isNumeric = false) {
            if (value === null || typeof value === 'undefined') return 'NULL';
            if (isNumeric) return value;
            if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
                 return `'${value.replace(/'/g, "''")}'`;
            }
            return `'${String(value).replace(/'/g, "''")}'`;
        }
        function generateRandomEmail(name) {
            const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const randomNum = Math.floor(Math.random() * 9000) + 1000;
            return `${sanitizedName}${randomNum}@generatedmail.com`;
        }
        function generateRandomNumericString(length) {
            let result = '';
            for (let i = 0; i < length; i++) { result += Math.floor(Math.random() * 10); }
            return result;
        }
        function generateRandomNpwp() { return `${generateRandomNumericString(2)}.${generateRandomNumericString(3)}.${generateRandomNumericString(3)}.${generateRandomNumericString(1)}-${generateRandomNumericString(3)}.${generateRandomNumericString(3)}`; }
        function parseCsvRow(row) {
            const match = row.match(/([^,]+),([^,]+),([^,]+),([^,]+),(.*)/);
            if (!match) return null;
            return [ match[1].trim().replace(/^"|"$/g, ''), match[2].trim().replace(/^"|"$/g, ''), match[3].trim().replace(/^"|"$/g, ''), match[4].trim().replace(/^"|"$/g, ''), match[5].trim().replace(/^"|"$/g, '') ];
        }

        const allRows = csvData.split(/\r\n|\n/).slice(1);
        const validRows = allRows.filter(row => row.trim() !== '');
        const warehouseMap = new Map();
        let consumerScript = '';
        let mappingScript = '';

        validRows.forEach(row => {
            const columns = parseCsvRow(row);
            if (!columns || columns.length < 5) return;
            const warehouseName = columns[0];
            if (!warehouseMap.has(warehouseName)) {
                warehouseMap.set(warehouseName, { id: generateUUID(), address: columns[4], picName: columns[3], phoneNumber: columns[2], lat: generateRandomNumericString(4), long: generateRandomNumericString(4), branchName: columns[1] });
            }
        });
        
        warehouseMap.forEach((consumerInfo, warehouseName) => {
             const now = getFormattedTimestamp();
             const foundBranchForWarehouse = branchMapping[warehouseName.toUpperCase()];
             const branchIdToUse = foundBranchForWarehouse ? foundBranchForWarehouse.id : branchIdFallback;
             const branchCodeToUse = foundBranchForWarehouse ? foundBranchForWarehouse.code : branchCodeDefault;
             const consumerNameFormatted = 'WAREHOUSE ' + warehouseName.toUpperCase();
             const picNameFormatted = consumerInfo.picName.toUpperCase();
             consumerScript += `INSERT INTO cash_management_schema.consumer (consumer_id, active_datetime, created_by, created_datetime, inactive_datetime, isactive, updated_by, updated_datetime, "version", address, branch_code, branch_id, branch_name, business_name, consumer_code, consumer_name, consumer_type, email_address, identity_number, notes, npwp, phone_number, pic, status, city, district, postal_code, province, rt_code, rw_code, sub_district, auction_fee_coefficient, auction_fee, auction_coefficient) VALUES(${escapeSqlString(consumerInfo.id)}, ${escapeSqlString(now)}, ${createdBy}, ${escapeSqlString(now)}, NULL, true, ${createdBy}, ${escapeSqlString(now)}, 5, ${escapeSqlString(consumerInfo.address)}, ${escapeSqlString(branchCodeToUse)}, ${branchIdToUse}, ${escapeSqlString(warehouseName)}, '', ${branchIdToUse}, ${escapeSqlString(consumerNameFormatted)}, ${escapeSqlString(consumerType)}, ${escapeSqlString(generateRandomEmail(warehouseName))}, ${escapeSqlString(generateRandomNumericString(16))}, '', ${escapeSqlString(generateRandomNpwp())}, ${escapeSqlString(consumerInfo.phoneNumber)}, ${escapeSqlString(picNameFormatted)}, 'COMPLETED', 'BOGOR', 'KOTA BOGOR SELATAN', '16132', 'JAWA BARAT', '12', '12', 'CIKARET', 0, 0.02, NULL);\n\n`;
        });

        validRows.forEach(row => {
            const columns = parseCsvRow(row);
            if (!columns || columns.length < 5) return;
            const warehouseName = columns[0];
            const branchName = columns[1];
            const consumerInfo = warehouseMap.get(warehouseName);
            if (consumerInfo) {
                const now = getFormattedTimestamp();
                const foundBranch = branchMapping[branchName.toUpperCase()];
                const branchIdToUse = foundBranch ? foundBranch.id : 'NULL';
                const branchCodeToUse = foundBranch ? foundBranch.code : branchCodeDefault;
                const factoryAddressFormatted = 'WAREHOUSE ' + warehouseName.toUpperCase();
                const dataJson = JSON.stringify({ lat: consumerInfo.lat, long: consumerInfo.long, address: consumerInfo.address, factoryId: factoryAddressFormatted, factoryAddress: factoryAddressFormatted, picAuctionHouse: consumerInfo.picName.toUpperCase(), picAuctionHousePhone: consumerInfo.phoneNumber });
                mappingScript += `INSERT INTO cash_management_schema.consumer_auction_house_mapping (consumer_auction_house_mapping_id, created_by, created_datetime, updated_by, updated_datetime, "version", branch_code, branch_id, branch_name, city_code, city_name, minimum_pickup, pickup_rate, consumer_id, "data") VALUES(${escapeSqlString(generateUUID())}, ${createdBy}, ${escapeSqlString(now)}, ${createdBy}, ${escapeSqlString(now)}, 0, ${escapeSqlString(branchCodeToUse)}, ${branchIdToUse}, ${escapeSqlString(branchName)}, NULL, ${escapeSqlString(factoryAddressFormatted)}, 0, 0.0, ${escapeSqlString(consumerInfo.id)}, ${escapeSqlString(dataJson)});\n\n`;
            }
        });

        outputConsumer.value = consumerScript.trim();
        outputMapping.value = mappingScript.trim();
        summaryEl.innerHTML = `Berhasil membuat <b style="color:var(--primary-color);">${warehouseMap.size}</b> skrip consumer dan <b style="color:var(--primary-color);">${validRows.length}</b> skrip mapping.`;
    });
    
    copyConsumerBtn.addEventListener('click', () => {
        const output = page.querySelector('#sqlOutputConsumer');
        if (!output.value) return;
        navigator.clipboard.writeText(output.value).then(() => showToast('Skrip Consumer disalin!'));
    });

    copyMappingBtn.addEventListener('click', () => {
        const output = page.querySelector('#sqlOutputMapping');
        if (!output.value) return;
        navigator.clipboard.writeText(output.value).then(() => showToast('Skrip Mapping disalin!'));
    });
}