# Preset: Minimarket / Toko Retail

Titik awal untuk mengisi `company.md` dan `operations/daily-routine.md` klien
retail. Ini bukan data — semua angka, nama, dan nomor tetap harus dari owner.

## Istilah

| Generik | Minimarket |
|---|---|
| anggota tim | karyawan / kasir / pramuniaga |
| organisasi | toko |
| jadwal | shift |

## Role umum

- Kasir — buka/tutup kasir, hitung uang laci, layani pelanggan
- Pramuniaga — display, cek expired, kebersihan rak
- Kepala toko — buka/tutup toko, setor uang, order barang

## Yang dipantau di `state/current.md`

- Stok: barang menipis, barang mendekati kedaluwarsa, barang kosong
- Kas: saldo laci awal/akhir, selisih, setoran
- Peralatan: mesin kasir, kulkas/freezer, CCTV, listrik
- Kehadiran: siapa jaga shift mana hari ini

## Pemicu eskalasi khas retail

- Listrik mati atau kulkas/freezer rusak (barang bisa busuk)
- Mesin kasir tidak berfungsi
- Selisih kas
- Barang hilang atau dugaan pencurian
- Kunci toko hilang
- Tidak ada yang jaga shift
- Keluhan pelanggan serius

## Ritme harian khas

- Pagi: cek kebersihan, display, stok menipis, saldo laci awal
- Siang: laporan penjualan sementara, restock rak
- Sore: hitung kas, selisih, setoran, daftar barang yang perlu diorder

## Instruksi harian yang sering muncul

- Cek tanggal kedaluwarsa rak `<X>`
- Foto kondisi rak `<X>` setelah display ulang
- Laporkan barang yang stoknya di bawah `<batas>`
- Hitung dan laporkan saldo laci sebelum tutup
