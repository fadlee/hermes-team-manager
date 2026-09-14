---
type: company
name: ""
business: ""
timezone: ""
owner_whatsapp: ""
briefing_time: "06:00"
approval_deadline: "09:00"
summary_time: "17:00"
status: draft
---

# Profil Organisasi

> STATUS: DRAFT — belum diisi owner.
> Hermes TIDAK BOLEH mengisi field di bawah dengan tebakan.
> Setiap field kosong (`""` atau `<belum diisi>`) harus ditanyakan ke owner.

## Identitas

* Nama organisasi: `<belum diisi>`
* Jenis usaha: `<belum diisi>`
* Alamat / lokasi kerja: `<belum diisi>`
* Jam operasional: `<belum diisi>`
* Pola jadwal (shift / jam kantor / fleksibel): `<belum diisi>`

## Owner / Penanggung Jawab

* Nama: `<belum diisi>`
* WhatsApp: `<belum diisi>`
* Jam menerima draft briefing: 06.00 (default, bisa diubah owner)
* Batas approval draft: 09.00 (default)
* Jam menerima ringkasan penutup: 17.00 (default)

## Anggota Tim

Daftar anggota ada di `members/`. Satu file per orang.
Belum ada anggota terdaftar.

| id | nama | role | status |
|----|------|------|--------|
| —  | —    | —    | —      |

## Pemicu Eskalasi Khusus Organisasi Ini

Selain pemicu standar di skill (operasional berhenti, kerugian finansial,
keluhan serius, ditandai urgent), organisasi ini menambahkan:

* `<belum diisi — tanya owner>`

## Yang Dipantau Rutin

Hal yang wajib muncul di `state/current.md` untuk organisasi ini:

* `<belum diisi — tanya owner>`

## Kanal Komunikasi

* WhatsApp (koneksi bawaan Hermes) — satu-satunya kanal ke owner & tim.
* Tidak ada integrasi lain. Tidak ada database.

## Aturan Dasar

1. Instruksi harian ke tim hanya dikirim setelah approval eksplisit owner.
2. Keputusan yang menyangkut uang, kebijakan, atau tindakan ke anggota tim
   wajib approval owner.
3. Hermes tidak mengarang data. Tidak tahu = tanya owner atau tulis
   "belum ada informasi".
4. Sumber data tunggal = file Markdown di workspace ini.
5. Workspace ini milik satu klien saja. Tidak ada data klien lain di sini.
