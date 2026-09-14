# Deployment: Satu Instalasi Hermes per Klien

**Keputusan final (menggantikan semua model multi-profile di bawah):** tiap
perusahaan klien mendapat instalasi Hermes sendiri — container/server
terpisah, masing-masing menjalankan `hermes gateway run` sendiri sebagai
PID 1, satu nomor WhatsApp sendiri. TIDAK ada multi-profile dalam satu
container, TIDAK ada multiplex.

## Kenapa bukan multi-profile dalam satu container

Dicoba dan dibatalkan setelah dua masalah nyata:

1. **WhatsApp Baileys tidak didukung `gateway.multiplex_profiles`.** Kode
   sengaja skip WhatsApp untuk profile sekunder (`gateway/run_adapters.py`:
   `if multiplex and platform in (Platform.RELAY, Platform.WHATSAPP): continue`).
   Jalan keluarnya waktu itu: proses gateway terpisah per profile klien
   dalam container yang sama (`hermes -p <klien> gateway run --force`).
2. **`hermes gateway restart` mematikan SELURUH container** di setup ini
   (lihat detail di bawah) — dan proses gateway klien yang berjalan sebagai
   background job pernah ikut mati saat itu terjadi, walau semestinya
   independen. Kombinasi dua masalah ini membuat container tunggal untuk
   banyak klien terlalu rapuh untuk dipakai produksi.

Satu instalasi per klien menghindari kedua masalah sekaligus: tidak ada
multiplex yang dibutuhkan, dan restart/crash satu klien tidak menyentuh
klien lain sama sekali karena benar-benar mesin/container terpisah.

## Cara replikasi setup ke klien baru

Gunakan **Hermes Profile Distribution** (fitur bawaan Hermes untuk membagikan
setup agent lengkap lewat git repo) supaya instalasi klien baru tinggal satu
perintah, bukan mengulang semua langkah manual:

```bash
# Sekali saja, dari mesin manapun yang sudah punya setup team-manager matang:
hermes profile create team-manager-template --clone
# Isi distribution.yaml, .gitignore (lihat docs Hermes: profile-distributions)
# Push ke repo git privat

# Di server/container klien baru:
hermes profile install github.com/<kamu>/team-manager-template --alias
```

Yang ikut terbawa: `SOUL.md`, `config.yaml`, skill `team-manager`, template
`company-skeleton`. Yang TIDAK ikut (harus diisi baru per klien): `.env`,
`auth.json`, memori, sesi — sesuai desain distribution, supaya tiap instalasi
otomatis bersih dan terisolasi.

Setelah install: pairing WhatsApp klien dengan nomor barunya sendiri (lihat
prosedur pairing di bawah), lalu isi `company/company.md` dan `members/`
lewat wawancara owner (lihat `references/new-client.md`).

## Prosedur pairing WhatsApp (berlaku di instalasi manapun)

```bash
cd /opt/data/scripts/whatsapp-bridge   # sesuaikan path bridge di instalasi ybs.
WHATSAPP_MODE=bot WHATSAPP_DM_POLICY=pairing node bridge.js --pair-only --pair-json \
  --session /opt/data/whatsapp/session
```

Output JSON `{"event":"qr","qr":"<data>"}` — render ke gambar PNG (mis.
`python3 -c "import qrcode; qrcode.make(DATA).save('qr.png')"`) dan kirim
sebagai gambar. **Jangan kirim QR sebagai teks ASCII** — WhatsApp scanner
tidak bisa memindainya dari tampilan teks. QR berganti tiap ~20 detik, jadi
render segera setelah event `qr` muncul di log. Event `connected` menandakan
sukses; proses pairing berhenti sendiri (exit 0).

Setelah pairing, isi allowlist dan home channel dengan nomor OWNER KLIEN
(bukan nomormu):

```bash
hermes config set platforms.whatsapp.dm_policy allowlist
hermes config set platforms.whatsapp.allow_from '["<nomor_owner_klien>"]'
hermes config set platforms.whatsapp.home_channel.platform whatsapp
hermes config set platforms.whatsapp.home_channel.chat_id "<nomor_owner_klien>@s.whatsapp.net"
```

## `hermes gateway restart` MEMATIKAN SELURUH CONTAINER (berlaku juga di model satu-klien!)

Temuan ini BUKAN spesifik multi-profile — berlaku untuk instalasi manapun di
image/container dengan karakteristik yang sama (s6-overlay, gateway sebagai
CMD/PID 1). Karena tiap klien sekarang dapat instalasi sendiri, temuan ini
tetap relevan untuk SETIAP instalasi klien, bukan cuma yang lama.

**Jangan pernah jalankan `hermes gateway restart`** kalau `detect_service_manager()`
mengembalikan `"none"` (cek di bawah). Dibuktikan langsung dua kali: perintah
ini membuat container mati total 5–7 menit sampai restart policy hosting
(Docker/EasyPanel) menghidupkannya lagi — bukan sekadar restart proses
gateway seperti namanya.

**Kenapa:** PID 1 container adalah `/bin/sh -c hermes gateway run`. Saat
`gateway restart` dipanggil:
1. `detect_service_manager()` mengembalikan `"none"` di container ini walau
   image berbasis s6-overlay — s6 tidak mendaftarkan gateway sebagai service
   resmi (slot `main-hermes` sengaja no-op: `exec sleep infinity`). Karena
   itu kode tidak lewat jalur s6-dispatch dan jatuh ke fallback biasa.
2. Fallback biasa: `stop_profile_gateway()` mengirim SIGTERM ke proses
   `hermes`, proses itu keluar dengan rapi ("exiting cleanly").
3. Kode lalu mencoba `run_gateway()` untuk start ulang DI PROSES YANG SAMA —
   tapi begitu proses `hermes` keluar, shell `/bin/sh -c` (PID 1) sudah
   menganggap command-nya selesai dan ikut exit.
4. PID 1 mati → Docker mematikan seluruh container (kontrak PID 1 Docker).
5. Restart policy container yang akhirnya menghidupkan ulang — itulah jeda
   beberapa menit yang terasa seperti macet/hang.

Verifikasi status ini di instalasi manapun sebelum mengandalkan restart:

```bash
python3 -c "from hermes_cli.service_manager import detect_service_manager; print(detect_service_manager())"
# "none" di sini = gateway restart AKAN mematikan container. JANGAN jalankan.
```

### Yang aman dipakai sebagai gantinya

- **Ganti data operasional (`company/`) tanpa downtime:** tidak perlu restart
  sama sekali — dibaca ulang tiap giliran kerja.
- **Ganti `config.yaml`:** butuh reload gateway, dan itu berarti mematikan
  container. Lakukan di luar jam sibuk, dan siapkan mental perlu beberapa
  menit sebelum online lagi.
- **Untuk restart sengaja:** lewat panel hosting (EasyPanel) atau
  `docker restart <container>` dari host — sama-sama mematikan container,
  tapi predictable, bukan menyamar sebagai "restart cepat" dari dalam CLI.
- **Jangan** andalkan `hermes gateway restart` untuk perubahan kecil yang
  "harusnya cepat" — di image ini semua restart gateway = restart container
  penuh.

Perbaikan permanen (registrasi gateway sebagai s6 service asli, bukan CMD
mentah) ada di level image/deployment, bukan sesuatu yang bisa diperbaiki
lewat `hermes config` dari dalam profile.

## Pitfalls

- `--clone` menyalin `.env` profile sumber apa adanya, termasuk
  `WHATSAPP_HOME_CHANNEL`/`WHATSAPP_ALLOWED_USERS` milik pemilik lama.
  Bersihkan dan isi ulang dengan data klien baru sebelum pairing:
  ```bash
  sed -i '/^WHATSAPP_ALLOWED_USERS=/d; /^WHATSAPP_HOME_CHANNEL=/d' /path/ke/.env
  ```
- QR pairing WhatsApp berganti tiap ~20 detik — render ke gambar SEGERA
  setelah event `qr` muncul, jangan tunda.
- Jangan kirim QR sebagai teks ASCII ke user — tidak bisa dipindai kamera.
  Selalu render ke PNG dulu.

## Logs

```bash
tail -f /opt/data/logs/gateway.log
```
