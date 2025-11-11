# 🚀 psd-lang: Interpreter Bahasa "psd" (Pseudocode Telkom University)

Selamat datang di `psd-lang`! Ini adalah proyek interpreter sederhana yang dibuat dari nol menggunakan TypeScript dan Node.js. Bahasa "psd" dirancang untuk meniru sintaks *pseudocode* yang umum diajarkan dalam mata kuliah dasar-dasar algoritma dan pemrograman, khususnya di lingkungan Telkom University.

Proyek ini menggunakan *pipeline* interpreter standar: **Lexer** -> **Parser** (yang menghasilkan Abstract Syntax Tree/AST) -> **Interpreter** (yang mengeksekusi AST).

## 📋 Daftar Isi

* [Fitur Bahasa](#-fitur-bahasa)
* [Contoh Kode (Sintaks)](#-contoh-kode-sintaks)
* [Struktur Proyek](#-struktur-proyek)
* [Instalasi](#-instalasi)
* [Cara Penggunaan](#-cara-penggunaan)
    * [Menjalankan Program](#menjalankan-program)
    * [Menjalankan Tes](#menjalankan-tes)
    * [Build Proyek](#build-proyek)

---

## ✨ Fitur Bahasa

`psd-lang` versi 1.0 mendukung fitur-fitur inti berikut:

* **Kata Kunci Bahasa Indonesia:** Menggunakan sintaks yang mudah dibaca seperti `program`, `kamus`, `algoritma`, `endprogram`.
* **Tipe Data Dasar:**
    * `integer`
    * `real` (float/double)
    * `string`
    * `character`
    * `boolean` (`true` dan `false`)
* **Deklarasi Variabel & Konstanta:** Dukungan untuk `VAR` (di `kamus`) dan `CONST` (dengan inisialisasi).
* **Array:** Dukungan untuk array 1D dan 2D dengan ukuran statis (cth: `list : integer[10]`).
* **Operator Aritmatika:** `+`, `-`, `*`, `/` (pembagian real), `div` (pembagian integer), `mod`.
* **Operator Logika:** `and`, `or`, `!` (negasi), `==`, `!=`, `>`, `<`, `>=`, `<=`.
* **Struktur Kontrol Alur:**
    * `if <kondisi> then ... else if ... else ... endif`
    * `for <var> = <awal> to <akhir> then ... endfor`
    * `while <kondisi> then ... endwhile`
    * `repeat ... untuk <kondisi>` (loop *do-while*)
* **Fungsi I/O Bawaan:**
    * `output(...)`: Mencetak ke konsol dengan *newline*.
    * `outputf(format, ...)`: Mencetak ke konsol dengan format (gaya `printf`).
    * `input(...)`: Membaca input *string* atau *integer* dari pengguna.
* **Komentar:** Mendukung komentar satu baris (`//`) dan blok (`/* ... */`).

---

## 👨‍💻 Contoh Kode (Sintaks)

Berikut adalah contoh program `hello.psd` yang menunjukkan sebagian besar fitur:

```psd
program helloWorld
kamus
    nama : string
    umur : integer
algoritma
    // Meminta input dari pengguna
    output("Halo! Siapa nama kamu?")
    input(nama)
    
    output("Berapa umur kamu?")
    input(umur)
    
    // Menggunakan outputf untuk format string
    outputf("Senang bertemu denganmu, %s!\n", nama)
    outputf("Umur kamu %d tahun.\n", umur)
    
    // Logika if-else-endif
    if umur > 17 then
        output("Kamu sudah dewasa.")
    else
        output("Kamu masih remaja.")
    endif
    
endprogram
```