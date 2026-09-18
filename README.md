# Hermes Team Manager 🤖👔

**Hermes Team Manager** adalah distribusi profil resmi untuk [Hermes Agent](https://hermes-agent.nousresearch.com/) yang berfungsi sebagai **AI Operations Manager (Manajer Operasional AI)** untuk satu organisasi atau bisnis klien, beroperasi sepenuhnya melalui kanal **WhatsApp**.

---

## 🌟 Fitur Utama & Prinsip Desain

1. **Satu Bisnis = Satu Profil Hermes (Isolasi Mutlak)**
   - Setiap entitas bisnis atau klien memiliki profil terpisah (`hermes --profile <nama_bisnis>`).
   - Workspace data, memori, catatan sesi, dan cron job terisolasi total tanpa risiko pencampuran data antar-klien.

2. **Pembedaan Peran Tegas (Owner vs Anggota Tim)**
   - **Kepada Owner / Pemilik Bisnis:** AI bertindak sebagai *Asisten Manajer Eksekutif*. Membantu menyusun draft instruksi harian, meminta persetujuan (*approval gate*), menyampaikan eskalasi darurat secara instan, dan memberikan ringkasan penutup harian.
   - **Kepada Anggota Tim / Karyawan:** AI bertindak sebagai *Atasan / Manajer Operasional*. Menyampaikan instruksi kerja yang telah disetujui, menerima laporan pergantian shift/tugas, dan menjawab kendala operasional secara ringkas dan profesional.
   - **Keamanan Peran:** Anggota tim **tidak memiliki akses** ke perintah sistem (`/new`, `/reset`, `/model`, `/yolo`, `/status`) dan **tidak melihat** proses pemanggilan tools internal AI.

3. **Approval Gate (Tanpa Persetujuan = Tidak Ada Pesan Keluar)**
   - Draft instruksi harian wajib disetujui secara eksplisit oleh Owner (`"oke"`, `"setuju"`, `"gas"`, atau revisi terkonfirmasi) sebelum dikirimkan ke anggota tim.

4. **Dynamic Allowlist di Lapisan Bridge**
   - Jembatan WhatsApp (Baileys) secara otomatis mengenali nomor yang terdaftar di `company/members/*.md` secara *real-time* tanpa restart. **Tapi** ini baru satu dari dua lapis allowlist — lihat bagian [Arsitektur Nomor WhatsApp](#-arsitektur-nomor-whatsapp) untuk lapisan kedua yang wajib diisi manual.

5. **Sumber Data Tunggal (Markdown-based Workspace)**
   - Tidak memerlukan database eksternal. Seluruh status organisasi, jobdesk tim, SOP, dan catatan keputusan tersimpan dalam file Markdown yang mudah diaudit.

6. **Zona Waktu Default: WIB (Asia/Jakarta, UTC+7)**
   - Seluruh penanggalan, jam briefing, laporan shift, dan eskalasi otomatis diselaraskan dengan waktu lokal operasional Indonesia.

---

## 🔢 Arsitektur Nomor WhatsApp

Satu instalasi klien memakai **tiga peran nomor WhatsApp berbeda** — jangan
disamakan, karena masing-masing terdaftar di tempat berbeda dan salah kirim
berarti pesan tidak sampai:

```
┌─────────────────┐        ┌───────────────────────┐        ┌─────────────────┐
│   NOMOR OWNER    │        │      NOMOR BOT        │        │  NOMOR STAF/TIM │
│ (pemilik bisnis) │◄──────►│(akun WA yang di-pair) │◄──────►│(Budi, Siti, dst)│
└─────────────────┘   WA   └───────────────────────┘   WA   └─────────────────┘
                                       │
                                       ▼
                          company/company.md (owner_whatsapp)
                          company/members/*.md (whatsapp: per staf)
                          config.yaml → platforms.whatsapp.allow_from
```

- **Nomor Bot** — akun WhatsApp yang di-*pair* lewat QR code (langkah 3 di
  bawah). Inilah "device" yang login sebagai AI Manager; owner dan staf
  sama-sama chat KE nomor ini, bukan ke nomor pribadi Hermes/server.
- **Nomor Owner** — nomor pribadi pemilik bisnis. Harus didaftarkan persis di
  DUA tempat: `owner_whatsapp` di `company.md` (dipakai bridge untuk mengenali
  "ini owner, boleh approve/lihat semua data") **dan**
  `platforms.whatsapp.home_channel.chat_id` + `platforms.whatsapp.allow_from`
  di `config.yaml` (dipakai gateway untuk lolos ke intake). Kalau hanya salah
  satu yang diisi, owner akan diperlakukan sebagai pengirim tak dikenal.
- **Nomor Staf/Tim** — didaftarkan di `company/members/<id>.md` field
  `whatsapp:`. Bot mengenali nama & jobdesk otomatis dari file itu saat
  membalas atau mencatat laporan.

### ⚠️ Allowlist punya dua lapis, keduanya harus diisi

Fitur "Dynamic Allowlist" di atas benar untuk **lapisan bridge** (koneksi
WhatsApp Baileys): menambahkan nomor ke `members/*.md` langsung membuat pesan
dari nomor itu diterima di level transport, real-time, tanpa restart.

Tapi ada **lapisan kedua** di gateway Hermes sendiri (`_is_dm_intake_allowed`)
yang HANYA membaca `platforms.whatsapp.allow_from` di `config.yaml` — ia tidak
tahu apa-apa soal `company/members/*.md`. Nomor yang lolos di bridge tapi
tidak ada di `allow_from` akan **didrop diam-diam di gateway**, tanpa error
yang terlihat di WhatsApp maupun log biasa.

**Jadi setelah menambah anggota tim baru, dua langkah wajib:**

```bash
# 1. Tulis nomornya di company/members/<id>.md (field whatsapp:) — untuk bridge
# 2. Tambahkan ke allow_from — untuk gateway
hermes -p <klien> config set platforms.whatsapp.allow_from '["<nomor1>", "<nomor2>", ...]'
hermes -p <klien> gateway restart
```

Skrip bantu `skills/productivity/team-manager/scripts/sync_allowlist.py` bisa
menghitung daftar gabungan yang perlu di-apply.

---

## 📁 Struktur Workspace `company/`

Di dalam setiap profil klien, data operasional tersimpan dalam struktur direktori berikut:

```text
$HERMES_HOME/company/
├── company.md              # Profil bisnis, kontak owner, aturan dasar, jam operasional
├── members/                # Satu file per anggota tim (Jobdesk & nomor WhatsApp)
│   ├── _TEMPLATE.md
│   └── budi.md
├── operations/             # SOP & Rutinitas harian
│   └── daily-routine.md
├── state/                  # Kondisi dinamis & isu terbuka
│   ├── current.md          # Status operasional terkini [temporary/confirmed/permanent]
│   └── issues.md           # Daftar masalah terbuka yang dipantau
├── reports/                # Arsip laporan harian harian (YYYY-MM-DD.md)
│   └── _TEMPLATE.md
└── decisions/              # Arsip keputusan owner (YYYY-MM-DD.md)
    └── _TEMPLATE.md
```

---

## 🚀 Panduan Instalasi & Setup

### Cara 1: Instalasi Melalui Chat Hermes (Rekomendasi)
Cukup minta ke agen utama Hermes Anda:
> *"Tolong buatkan profil klien baru bernama `toko-berkah` dari template `github.com/fadlee/hermes-team-manager`"*

Agen akan secara otomatis menjalankan:
```bash
hermes profile install github.com/fadlee/hermes-team-manager --name toko-berkah --alias -y
```

---

### Cara 2: Instalasi Manual via CLI

#### 1. Pasang Distribusi Profil
```bash
hermes profile install github.com/fadlee/hermes-team-manager --name <nama_klien> --alias -y
```

#### 2. Konfigurasi API Keys & Model
Salin `.env.EXAMPLE` dan isi konfigurasi kredensial LLM:
```bash
cp /opt/data/profiles/<nama_klien>/.env.EXAMPLE /opt/data/profiles/<nama_klien>/.env
# Isi API Key LLM yang digunakan (misal: Zaduna, OpenAI, OpenRouter, dll.)
```

#### 3. Tautkan Akun WhatsApp Bot Klien (Pairing)
Jalankan proses pairing sekali untuk nomor bot khusus klien tersebut:
```bash
cd /opt/data/scripts/whatsapp-bridge
HERMES_HOME=/opt/data/profiles/<nama_klien> WHATSAPP_MODE=bot WHATSAPP_DM_POLICY=pairing \
  node bridge.js --pair-only --pair-json --session /opt/data/profiles/<nama_klien>/whatsapp/session
```
*Pindai QR code yang dihasilkan menggunakan aplikasi WhatsApp di HP nomor bot (Perangkat Tertaut).*

#### 4. Daftarkan Nomor Owner & Port Gateway
```bash
# Daftarkan nomor WhatsApp Owner (format internasional tanpa tanda +, contoh: 628123456789)
hermes -p <nama_klien> config set platforms.whatsapp.allow_from '["<NOMOR_OWNER>"]'
hermes -p <nama_klien> config set platforms.whatsapp.home_channel.chat_id "<NOMOR_OWNER>@s.whatsapp.net"
hermes -p <nama_klien> config set platforms.whatsapp.extra.bridge_port <PORT_UNIK> # contoh: 3001, 3002
```

#### 5. Jalankan Gateway
```bash
hermes -p <nama_klien> gateway start
```

---

## 🔄 Alur Operasional Harian (Daily Routine)

```
06.00 WIB                   06.00 - 09.00 WIB                09.00 - 17.00 WIB                 17.00 WIB
┌─────────────┐             ┌────────────────┐              ┌──────────────────┐             ┌───────────────┐
│ Cron Pagi   │ ──────────► │ Owner Approval │ ───────────► │ Laporan Tim      │ ──────────► │ Ringkasan     │
│ Susun Draft │             │ di WhatsApp    │              │ & Eskalasi Isu   │             │ Penutup Sore  │
└─────────────┘             └────────────────┘              └──────────────────┘             └───────────────┘
                                   │                                  │
                                   ▼                                  ▼
                            Instruksi Terkirim                 Dicatat ke Laporan
                            Rapi ke Anggota Tim                Harian (WIB)
```

1. **Briefing Pagi (06.00 WIB):** Cron job membaca `company.md`, `members/`, dan status kemarin, lalu mengirimkan draft instruksi ke WhatsApp Owner.
2. **Persetujuan Owner:** Owner membalas *"gas"*, *"oke"*, atau memberikan revisi sebagian. Setelah disetujui, AI mengirimkan instruksi terformat rapi ke masing-masing anggota tim.
3. **Penerimaan Laporan & Eskalasi:** Anggota tim melaporkan aktivitasnya via WhatsApp. AI merespon ringkas dan mencatatnya ke `reports/YYYY-MM-DD.md`. Jika ada laporan mendesak (*urgent*), AI langsung meneruskannya ke Owner saat itu juga.
4. **Ringkasan Penutup (17.00 WIB):** AI merekap apa yang tuntas, apa yang tertunda, dan keputusan yang dibutuhkan Owner untuk esok hari.

---

## 🧪 Pengujian & Verifikasi Mandiri

Seluruh logika inti, isolasi profil, *approval gate*, dan *dynamic allowlist* telah dilengkapi dengan automated tests (Node.js native test runner):

```bash
cd skills/productivity/team-manager/scripts
node --test *.test.mjs
```

---

## 📄 Lisensi

Distribusi ini dirilis di bawah lisensi [MIT](LICENSE).
Dikembangkan untuk integrasi operasional bisnis cerdas berbasis [Hermes Agent](https://github.com/NousResearch/hermes-agent).
