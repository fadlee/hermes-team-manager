# Menambah Klien Baru

Satu klien = satu profile Hermes. Profile memberi isolasi penuh: sesi, memori,
cron, skills, dan workspace `company/` sendiri.

## 1. Buat profile

```bash
hermes profile create <id-klien> --clone \
  --description "AI Ops Manager untuk <Nama Klien> (<jenis usaha>)"
```

`--clone` menyalin config.yaml, .env, SOUL.md, dan skills dari profile aktif —
termasuk `team-manager`. Gunakan id lowercase tanpa spasi (`tokobahagia`).

## 2. Scaffold workspace

```bash
hermes --profile <id-klien> -z "Buat workspace company/ kosong pakai skill team-manager"
```

Atau salin manual dari `templates/company-skeleton/` di skill ini ke
`/opt/data/profiles/<id-klien>/company/`.

## 3. Wawancara owner

Jalankan sesi di profile klien, lalu isi `company.md` dari jawaban owner.
Minimal yang harus terisi sebelum siklus harian pertama:

- Nama organisasi, jenis usaha, alamat, jam operasional
- Nama + nomor WhatsApp owner
- Jam briefing dan jam ringkasan penutup
- Daftar anggota tim: nama, role, jobdesk, nomor WhatsApp
- Pemicu eskalasi khusus organisasi ini

Jangan mulai briefing sebelum minimal satu anggota tim punya jobdesk dan nomor.

## 4. Jadwalkan

Di profile klien, buat dua cronjob: briefing dan ringkasan penutup, pada jam
yang ada di `company.md`.

## Menjalankan sesi klien

```bash
hermes --profile <id-klien>
```

Cek profile mana yang aktif dengan `echo $HERMES_HOME` sebelum menulis data.

## Memperbarui skill di semua klien

Skill di tiap profile adalah salinan. Setelah mengubah `team-manager` di
profile master, salin ulang:

```bash
for p in /opt/data/profiles/*/; do
  cp -r /opt/data/skills/productivity/team-manager "$p/skills/productivity/"
done
```

Workspace `company/` tidak tersentuh — yang disalin hanya skill.
