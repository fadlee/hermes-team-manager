---
type: daily-report
date: YYYY-MM-DD
morning_draft_sent: ""
owner_approved_at: ""
instructions_sent_at: ""
evening_summary_sent_at: ""
---

# Laporan Harian YYYY-MM-DD

## 1. Draft Instruksi Pagi

### `<id-anggota>`
1. `<instruksi>`
2. `<instruksi>`

## 2. Approval Owner

* Status: menunggu | disetujui penuh | disetujui dengan revisi | ditolak
* Waktu balasan owner: `<jam>`
* Revisi owner: `<kutip balasan owner apa adanya>`
* Konfirmasi ulang Hermes ke owner: `<isi konfirmasi>` → `<jawaban owner>`
* Instruksi final terkirim: ya | tidak (alasan)

Jika owner tidak membalas: instruksi TIDAK dikirim. Catat di sini.

## 3. Laporan Anggota Tim

### `<id-anggota>`
* Diterima: `<jam>` | belum ada laporan
* Isi: `<kutipan/ringkasan laporan>`
* Follow-up: ke-1 `<jam>`, ke-2 `<jam>` (maks 2)
* Hasil: lengkap | tidak lengkap | tidak ada respon

Anggota tim tanpa respon setelah 2 follow-up ditulis:
"belum ada laporan" — bukan status pekerjaan hasil tebakan.

### Pengirim tak dikenal
* `<nomor>` — `<isi pesan>` — sudah diklarifikasi ke owner: ya/tidak

## 4. Kondisi Organisasi Hari Ini

* `<poin>` `[temporary|confirmed|permanent]`

## 5. Selesai Hari Ini

* `<pekerjaan/isu yang tuntas>`

## 6. Belum Selesai / Dibawa ke Besok

* `<pekerjaan>`

## 7. Butuh Keputusan Owner

* `<keputusan yang diminta>` — opsi: `<A / B>` — dampak: `<...>`

## 8. Ringkasan Sore ke Owner

`<teks yang dikirim ke owner>`
