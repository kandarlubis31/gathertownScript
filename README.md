# Gather Auto Online Bot

Bot otomatis untuk menjaga status online di Gather.town selama jam kerja. Bot ini akan menggerakkan karakter secara periodik untuk mencegah status idle/away.

## Fitur

- **Auto Login**: Otomatis masuk ke Gather space
- **Jadwal Kerja**: Hanya aktif pada jam kerja yang ditentukan
- **Gerakan Natural**: Simulasi gerakan karakter secara acak (W/A/S/D)
- **Auto Mute**: Otomatis menonaktifkan mic dan kamera
- **Minimize Window**: Minimize browser untuk hemat resource
- **Logging Detail**: Log semua aktivitas ke file
- **Auto Retry**: Otomatis restart jika terjadi error
- **Session Persistent**: Menyimpan session login Chrome

## Prerequisites

- Node.js (v14 atau lebih tinggi)
- npm atau yarn
- Chrome/Chromium browser

## Instalasi

1. Clone repository ini:
```bash
git clone <repository-url>
cd gathertownScript
```

2. Install dependencies:
```bash
npm install
```

3. Konfigurasi bot di file `gather-bot.js`:
```javascript
const CONFIG = {
  gatherUrl: 'https://app.gather.town/app/YOUR_SPACE_ID/YOUR_ROOM',
  startTime: '09:00',      // Jam mulai kerja
  endTime: '15:00',        // Jam selesai kerja
  moveInterval: 5,         // Interval gerakan (menit)
  checkInterval: 2,        // Interval status check (menit)
  playerName: 'Your Name', // Nama Anda di Gather
  // ... konfigurasi lainnya
};
```

## Cara Penggunaan

### Jalankan Bot:
```bash
node gather-bot.js
```

### Hentikan Bot:
Tekan `Ctrl + C` di terminal

## Konfigurasi

| Parameter | Deskripsi | Default |
|-----------|-----------|---------|
| `gatherUrl` | URL Gather space | - |
| `startTime` | Jam mulai kerja (HH:MM) | '09:00' |
| `endTime` | Jam selesai kerja (HH:MM) | '15:00' |
| `moveInterval` | Interval gerakan (menit) | 5 |
| `checkInterval` | Interval status check (menit) | 2 |
| `userDataDir` | Folder data Chrome | './gather-chrome-data' |
| `logFile` | File log | 'gather-bot.log' |
| `playerName` | Nama pemain | - |
| `maxRetries` | Maksimal retry jika error | 3 |
| `timeout` | Timeout operasi (ms) | 120000 |

## Struktur File

```
gathertownScript/
├── gather-bot.js           # Script utama bot
├── gather-chrome-data/     # Data session Chrome (ignored)
├── gather-bot.log          # File log aktivitas
├── package.json            # Dependencies
├── .gitignore             # Git ignore rules
└── README.md              # Dokumentasi ini
```

## Log File

Bot akan membuat file log `gather-bot.log` yang berisi:
- Timestamp setiap aktivitas
- Status gerakan karakter
- Error yang terjadi
- Status koneksi

Log akan otomatis di-rotate jika ukuran mencapai 2MB.

## Troubleshooting

### Bot tidak bisa login
- Pastikan URL Gather space sudah benar
- Hapus folder `gather-chrome-data` dan login ulang secara manual

### Canvas tidak ditemukan
- Bot akan otomatis reload halaman
- Periksa koneksi internet Anda

### Browser tidak minimize
- Fitur minimize hanya bekerja di Windows
- Di Linux/Mac, minimize secara manual

### Mic/Kamera masih aktif
- Bot akan otomatis menonaktifkan setelah join
- Pastikan permission sudah diizinkan di Chrome

## Disclaimer

Bot ini dibuat untuk tujuan **edukasi dan automasi personal**. Pengguna bertanggung jawab penuh atas penggunaan bot ini. Pastikan penggunaan bot sesuai dengan kebijakan perusahaan/organisasi Anda.

## Kontribusi

Kontribusi selalu diterima! Silakan buat Pull Request atau laporkan issue.

---

## English

**Gather Auto Online Bot** keeps a Gather.town character online during working hours by moving it periodically, so the status never drops to idle or away.

It logs in automatically, moves with natural random input, mutes the microphone and camera, keeps the Chrome session for the next run, and writes a detailed activity log.

---

## Lisensi

MIT License - Silakan gunakan dan modifikasi sesuai kebutuhan.

## Author

Dibuat dengan untuk kemudahan kerja remote

---

**Jika project ini bermanfaat, jangan lupa beri star!**
