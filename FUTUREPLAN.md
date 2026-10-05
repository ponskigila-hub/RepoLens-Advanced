## 🔮 Rencana Pengembangan (Future Improvements)

Kami terus berupaya membuat RepoLens AI menjadi lebih cepat, cerdas, dan interaktif. Berikut adalah peta jalan (*roadmap*) pengembangan kami ke depan:

### 🧠 Peningkatan AI & Machine Learning
*   **Kolaborasi Integrasi Gemini:** Mengadopsi pendekatan AI hibrida dengan mengintegrasikan model Google Gemini bersama IBM Bob. Hal ini akan memungkinkan pemahaman kode semantik yang lebih dalam, fitur tanya-jawab (*Q&A*) interaktif tentang repositori, dan panduan *onboarding* yang lebih percakapan.
*   **Metrik Kode Berbasis AST:** Meningkatkan mesin ekstraksi fitur untuk menganalisis *Abstract Syntax Trees* (AST). Kami akan beralih dari sekadar metrik permukaan (jumlah file/bintang) ke analisis kompleksitas kognitif dan keterkaitan antar kode (*coupling*) untuk memperkuat akurasi skor pada model XGBoost/Random Forest.
*   **Peninjau Pull Request (PR) Otomatis:** Mengimplementasikan GitHub Webhooks agar RepoLens dapat secara otomatis menganalisis setiap PR yang masuk, menghitung ulang skor kualitas, dan memberikan komentar tinjauan otomatis langsung di laman GitHub.

### ⚡ Pembaruan Performa & Arsitektur
*   **Antrean Tugas Asinkron (Celery + Redis):** Memindahkan proses kloning Git dan ekstraksi fitur ke sistem *background worker*. Ini akan menghilangkan masalah *timeout* pada HTTP dan mengganti layar tunggu statis dengan *progress bar* real-time melalui WebSockets.
*   **Optimasi Shallow Cloning:** Menggunakan teknik `--depth 1` pada GitPython untuk memangkas waktu unduh repositori secara drastis, mengurangi waktu tunggu dari hitungan menit menjadi hitungan detik.
*   **Caching Analisis Cerdas:** Menyediakan lapisan penyimpanan (*caching*) menggunakan Redis atau PostgreSQL untuk menyajikan data dashboard secara instan bagi repositori yang sudah pernah dianalisis sebelumnya (selama tidak ada commit baru).

### 🎨 Pembaruan UI/UX & Visualisasi
*   **Modernisasi Dashboard:** Perombakan total pada antarmuka pengguna (UI```

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-8E75C2?style=flat-square&logo=googlegemini&logoColor=white)

---
*📅 Terakhir diperbarui: 19 Mei 2026*
