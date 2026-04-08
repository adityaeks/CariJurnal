# 📊 TODO - Fitur Insight Jurnal (Mini Analytics)

## 🎯 Goal

Menambahkan fitur **Insight Jurnal** untuk memberikan analisis cepat dari hasil pencarian Scopus, seperti:

* Distribusi tahun publikasi
* Rata-rata jumlah author
* Journal/source terpopuler
* Open access vs non
* (Opsional) negara/afiliasi

---

## 🏗️ 1. Backend Preparation

* [ ] Gunakan endpoint search yang sudah ada:

  ```
  GET /search?q=keyword
  ```

* [ ] Pastikan response Scopus mengandung:

  * `prism:coverDate` (tanggal/tahun)
  * `dc:creator` / `author`
  * `prism:publicationName` (nama jurnal)
  * `openaccess` (jika ada)
  * `affiliation` (opsional)

---

## ⚙️ 2. Data Processing (Core Logic)

### 📅 Tahun Publikasi

* [ ] Extract tahun dari:

  ```
  prism:coverDate
  ```
* [ ] Grouping jumlah jurnal per tahun
* [ ] Output:

  ```json
  {
    "2023": 20,
    "2022": 15
  }
  ```

---

### 👥 Author Count

* [ ] Hitung jumlah author tiap jurnal
* [ ] Handle:

  * array author
  * single author
* [ ] Hitung rata-rata:

  ```js
  avgAuthor = totalAuthor / totalJurnal
  ```

---

### 🏫 Journal / Source

* [ ] Ambil:

  ```
  prism:publicationName
  ```
* [ ] Hitung frekuensi tiap journal
* [ ] Ambil top 5 journal

---

### 🔓 Open Access

* [ ] Ambil field:

  ```
  openaccess
  ```
* [ ] Hitung:

  * total open access
  * total non-open

---

### 🌍 Afiliasi (Opsional)

* [ ] Ambil negara dari affiliation
* [ ] Group per negara

---

## 🔄 3. Aggregation Output

* [ ] Format response final:

```json
{
  "total": 50,
  "yearStats": { "2023": 20, "2022": 15 },
  "journalStats": { "IEEE": 10, "Elsevier": 8 },
  "avgAuthor": 3.2,
  "openAccess": {
    "yes": 15,
    "no": 35
  }
}
```

---

## 🌐 4. API Endpoint

* [ ] Buat endpoint baru:

  ```
  GET /insight?q=keyword
  ```

* [ ] Flow:

  * hit Scopus API
  * proses data
  * return insight

---

## 🎨 5. Frontend Development

### 📊 Chart

* [ ] Gunakan:

  * Chart.js / ApexCharts

* [ ] Tampilkan:

  * Bar chart → distribusi tahun
  * Pie chart → journal / open access

---

### 📌 Summary Card

* [ ] Tampilkan:

  ```
  📈 Total jurnal
  📅 Tahun terbanyak
  👥 Rata-rata author
  🏫 Top journal
  ```

---

### 🔄 Integrasi UI

* [ ] Tambahkan tab:

  * “Result”
  * “Insight”

* [ ] Atau tampilkan insight di atas hasil search

---

## ⚠️ 6. Edge Case Handling

* [ ] Data kosong
* [ ] Author tidak tersedia
* [ ] Journal null
* [ ] Tahun tidak valid

---

## ⚡ 7. Optimization

* [ ] Limit data (misal max 50–100)
* [ ] Cache hasil insight
* [ ] Hindari request berulang

---

## 🚀 8. Improvement (Opsional)

* [ ] Trend line (grafik naik/turun)
* [ ] Filter tahun
* [ ] Compare keyword (AI vs ML)
* [ ] Export insight (PDF / image)

---

## 🔐 9. Performance & Security

* [ ] Rate limit endpoint `/insight`
* [ ] Logging request
* [ ] Validasi input `q`

---

## ✅ Definition of Done

* [ ] Endpoint `/insight` berjalan
* [ ] Data berhasil diolah jadi statistik
* [ ] Chart tampil di frontend
* [ ] Tidak error saat data kosong
* [ ] UX jelas & informatif

---

🔥 Status: `PLANNING → READY TO BUILD`
