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

4. **Dynamic Allowlist Terpadu**
   - Jembatan WhatsApp secara otomatis mengenali dan mengizinkan nomor WhatsApp yang terdaftar di `company/members/*.md` secara *real-time* tanpa perlu restart gateway atau edit konfigurasi manual.

5. **Sumber Data Tunggal (Markdown-based Workspace)**
   - Tidak memerlukan database eksternal. Seluruh status organisasi, jobdesk tim, SOP, dan catatan keputusan tersimpan dalam file Markdown yang mudah diaudit.

6. **Zona Waktu Default: WIB (Asia/Jakarta, UTC+7)**
   - Seluruh penanggalan, jam briefing, laporan shift, dan eskalasi otomatis diselaraskan dengan waktu lokal operasional Indonesia.

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
