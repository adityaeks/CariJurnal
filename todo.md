# 📚 TODO - Web Pencarian Scopus

## 🎯 Goal

Membuat website pencarian jurnal berbasis Scopus API:

* Search jurnal
* Tampilkan hasil
* Klik → buka ke halaman Scopus (bukan XML)

---

## 🏗️ 1. Setup Project

* [x] Inisialisasi project Node.js
* [x] Install dependencies:

  * [x] express
  * [x] axios
  * [x] cors
  * [x] dotenv
* [x] Setup struktur folder:

  ```
  /project
    /backend
    /frontend (Vanilla JS + Tailwind CSS)
    .env
    server.js
  ```

---

## 🔑 2. Setup API Scopus

* [ ] Daftar API key Elsevier
* [x] Simpan API key di `.env`

  ```
  SCOPUS_API_KEY=your_api_key
  ```
* [ ] Test endpoint:

  * `/content/search/scopus`

---

## ⚙️ 3. Backend Development

### 🔍 Endpoint Search

* [x] Buat endpoint:

  ```
  GET /search?q=keyword&sort=relevancy
  ```
* [x] Integrasi ke Scopus API
* [x] Handle response JSON
* [x] Mapping/Beresihkan format JSON Scopus API agar lebih sederhana & rapi untuk Frontend
* [x] Batasi hasil (misal 25 data)

---

### 🔗 Convert Link (PENTING)

* [x] Ambil `eid` → extract Scopus ID
* [x] Convert ke link:

  ```
  https://www.scopus.com/record/display.uri?eid=2-s2.0-{id}
  ```
* [x] Pastikan tidak lagi pakai API URL (XML)

---

### ⚡ Optimization

* [x] Tambahkan pagination (`startD` di Backend)
* [ ] Tambahkan delay (anti limit)
* [ ] Implement cache sederhana

---

## 🎨 4. Frontend Development

### UI Basic

* [x] Input search
* [x] Dropdown Sort View (Relevansi, Tahun Terbaru, Sitasi Terbanyak)
* [x] Button search
* [x] Container hasil

---

### 📊 Tampilkan Data

* [x] Judul jurnal
* [x] Nama author
* [x] Tahun
* [x] Source title (nama jurnal)

---

### 🔘 Action Button

* [x] Tombol:

  * [x] “Open in Scopus”

---

## 🔍 5. Testing

* [ ] Test search keyword umum
* [ ] Test keyword panjang
* [ ] Test tanpa hasil
* [ ] Pastikan tidak muncul XML lagi

---

## 🚀 6. Improvement (Opsional)

* [ ] Filter:

  * [ ] Tahun
  * [ ] Author
* [x] Loading spinner
* [x] Error handling UI (Tangkap error HTTP 429 Too Many Requests jika limit API habis)

---

## 📦 7. Deployment

* [ ] Upload ke VPS
* [ ] Setup domain
* [ ] Setup HTTPS (SSL)
* [ ] Gunakan PM2 untuk Node.js

---

## 🔐 8. Security & Limit

* [ ] Protect API key (.env)
* [ ] Tambahkan rate limiter
* [ ] Logging request

---

## 💡 Future Plan

* [ ] Tambah Google Scholar
* [ ] Export ke Excel
* [ ] Dashboard analytics (jumlah hasil, dll)
* [ ] Bookmark jurnal

---

## ✅ Definition of Done

* [ ] Bisa search jurnal dari Scopus
* [ ] Hasil tampil rapi
* [ ] Klik jurnal → buka halaman Scopus (bukan XML)
* [ ] Tidak kena limit API

---

🔥 Status: `STARTING...`
