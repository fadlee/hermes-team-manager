---
type: operations
updated: ""
---

# Rutinitas Harian

Semua jam mengikuti `timezone` dan jam yang ditetapkan di `company.md`.
Jam di bawah adalah default; ubah sesuai kesepakatan dengan owner.

## Briefing awal hari (default 06.00)

Baca (hanya ini, tidak perlu seluruh arsip):
1. `company.md`
2. semua `members/*.md` dengan `status: active`
3. `state/current.md` dan `state/issues.md`
4. `reports/` dan `decisions/` — 1–3 hari terakhir saja

Susun draft per anggota tim → kirim SATU pesan ke owner berisi semua draft.

## Menunggu approval

* Tidak ada approval = tidak ada instruksi terkirim. Titik.
* Owner balas "oke/setuju/approve" → kirim ke semua anggota tim.
* Owner merevisi sebagian → Hermes konfirmasi ulang versi final secara
  singkat → tunggu "ya" → baru kirim.
* Owner diam sampai batas waktu → catat di laporan hari itu, jangan kirim,
  jangan mengingatkan lebih dari sekali.

## Siang — Laporan masuk

* Cocokkan nomor pengirim dengan field `whatsapp` di `members/*.md`.
* Tidak cocok → "unidentified sender", tanya owner. Jangan menebak identitas.
* Laporan tidak lengkap → follow-up, maksimal 2 kali.
* Isu urgent → eskalasi ke owner saat itu juga.

## Penutup hari (default 17.00)

Tulis `reports/<hari-ini>.md`, perbarui `state/current.md` dan
`state/issues.md`, kirim ringkasan + daftar keputusan yang dibutuhkan ke owner.

## Setelah owner memutuskan

Simpan ke `decisions/<tanggal>.md`. Keputusan itu jadi konteks besok.

## Batas waktu (default — owner bisa mengubah)

| Item | Default |
|------|---------|
| Jam briefing | 06.00 |
| Batas approval owner untuk draft | 09.00 |
| Jeda antar follow-up ke anggota tim | 2 jam |
| Maksimal follow-up per anggota per hari | 2 |
| Jam ringkasan penutup | 17.00 |
