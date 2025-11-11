# ✨ psd-lang (Pseudocode Telkom University)

Selamat datang di `psd-lang`! Ini adalah proyek interpreter untuk bahasa pseudocode kustom yang terinspirasi dari materi perkuliahan dasar algoritma dan pemrograman. Bahasa ini dirancang agar mudah dibaca (menggunakan Bahasa Indonesia) namun tetap memiliki struktur yang logis.

Proyek ini adalah *tree-walk interpreter* yang dibangun dari nol menggunakan **TypeScript** dan **Node.js**, serta dilengkapi dengan *test suite* lengkap menggunakan **Jest**.

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Instalasi & Setup](#instalasi--setup)
- [Cara Penggunaan](#cara-penggunaan)
- [Menjalankan Tes](#menjalankan-tes)
- [Dokumentasi Sintaks Bahasa](#dokumentasi-sintaks-bahasa)
  - [Struktur Dasar Program](#1-struktur-dasar-program)
  - [Komentar](#2-komentar)
  - [Bagian `kamus` (Deklarasi)](#3-bagian-kamus-deklarasi)
    - [Tipe Data](#tipe-data)
    - [Deklarasi Variabel](#deklarasi-variabel)
    - [Deklarasi Konstanta](#deklarasi-konstanta)
    - [Deklarasi Array](#deklarasi-array)
  - [Bagian `algoritma` (Logika)](#4-bagian-algoritma-logika)
    - [Assignment (Pemberian Nilai)](#assignment-pemberian-nilai)
    - [Operator Aritmatika](#operator-aritmatika)
    - [Operator Logika & Perbandingan](#operator-logika--perbandingan)
    - [Fungsi I/O Bawaan](#fungsi-io-bawaan)
    - [Fungsi Bawaan Lainnya](#fungsi-bawaan-lainnya)
    - [Struktur Kontrol: If-Else](#struktur-kontrol-if-else)
    - [Struktur Kontrol: For Loop](#struktur-kontrol-for-loop)
    - [Struktur Kontrol: While Loop](#struktur-kontrol-while-loop)
    - [Struktur Kontrol: Repeat-Untuk](#struktur-kontrol-repeat-untuk)
    - [Pemisah Statement (;)](#5-pemisah-statement-)
- [Struktur Arsitektur Proyek](#struktur-arsitektur-proyek)

---

## Fitur Utama

* **Sintaks Bahasa Indonesia:** Menggunakan kata kunci seperti `program`, `kamus`, `algoritma`, `if`, `then`, `else`, `endif`, dll.
* **Pengetikan Statis (pada Deklarasi):** Variabel harus dideklarasikan dengan tipe data yang spesifik di dalam blok `kamus`.
* **Tipe Data Primitif:** `integer`, `real`, `string`, `character`, dan `boolean` (`true` / `false`).
* **Struktur Data:** Mendukung *Array* 1D dan 2D dengan ukuran yang ditentukan saat deklarasi.
* **Struktur Kontrol Lengkap:** `if-then-else-endif`, `for-to-endfor`, `while-then-endwhile`, dan `repeat-untuk`.
* **Fungsi I/O:** Termasuk `output`, `outputf` (format), `input`, dan `inputf` (format, *meskipun saat ini diabaikan*).
* **Fungsi Bawaan:** `length()` untuk string dan array.
* **Komentar:** Mendukung komentar satu baris (`//`) dan multi-baris (`/* ... */`).
* **Pemisah Statement:** Mendukung `;` untuk menjalankan beberapa *statement* dalam satu baris.

## Instalasi & Setup

Proyek ini dibangun dengan Node.js dan TypeScript.

1.  **Clone repositori:**
    ```bash
    git clone https://github.com/jonathanmarpaung/psd-telkom
    cd psd-lang
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Install `readline-sync` (Wajib untuk `input()`):**
    ```bash
    npm install readline-sync
    npm install @types/readline-sync --save-dev
    ```

4.  **Install Jest (Wajib untuk testing):**
    ```bash
    npm install jest ts-jest @types/jest --save-dev
    ```
    (Dan pastikan Anda memiliki `jest.config.js`)

5.  **Compile TypeScript:**
    (Wajib jika Anda ingin menjalankan build produksi)
    ```bash
    npm run build
    ```

## Cara Penggunaan

Anda dapat menjalankan file `.psd` apapun menggunakan skrip `run:psd` yang ada di `package.json`. Skrip ini menggunakan `ts-node` untuk mengeksekusi interpreter secara langsung.

```bash
npm run run:psd <path/to/file.psd>
````

**Contoh:**

```bash
npm run run:psd examples/hello.psd
```

## Menjalankan Tes

Proyek ini dilengkapi dengan *test suite* lengkap menggunakan Jest untuk memvalidasi `Lexer`, `Parser`, dan `Interpreter`.

Untuk menjalankan semua tes:

```bash
npm test
```

-----

## Dokumentasi Sintaks Bahasa

### 1\. Struktur Dasar Program

Setiap file `.psd` harus mengikuti struktur 3 bagian utama: `program`, `kamus`, dan `algoritma`, yang ditutup oleh `endprogram`.

```psd
program <nama_program>
kamus
    // Semua deklarasi variabel, konstanta, dan array
    // ...
algoritma
    // Semua logika, assignment, dan kontrol alur
    // ...
endprogram
```

### 2\. Komentar

Bahasa ini mendukung dua jenis komentar:

```psd
// Ini adalah komentar satu baris

/*
  Ini adalah
  blok komentar multi-baris.
*/
```

### 3\. Bagian `kamus` (Deklarasi)

Blok `kamus` adalah satu-satunya tempat di mana Anda dapat mendeklarasikan variabel dan konstanta. **Assignment (pemberian nilai)** tidak diizinkan di sini, kecuali untuk `const`.

#### Tipe Data

  * `integer`: Angka bulat (misal: `10`, `-5`).
  * `real`: Angka desimal (misal: `3.14`, `-0.5`).
  * `string`: Kumpulan teks (misal: `"Halo"`, `"psd-lang"`).
  * `character`: Satu karakter (misal: `'A'`, `'\n'`).
  * `boolean`: Nilai logika `true` atau `false`.

#### Deklarasi Variabel

Anda dapat mendeklarasikan satu atau banyak variabel sekaligus untuk tipe yang sama.

```psd
kamus
    nama : string
    umur, nilai : integer
    rataRata : real
    isLulus : boolean
```

#### Deklarasi Konstanta

Konstanta dideklarasikan dengan `const` dan **harus** diberi nilai saat deklarasi.

```psd
kamus
    const PI : real = 3.14
    const MAX_USER : integer = 100
```

#### Deklarasi Array

Array dideklarasikan dengan ukuran tetap menggunakan `[ukuran]`.

```psd
kamus
    // Array 1D dengan 10 elemen
    listNilai : integer[10]
    
    // Array 2D (matrix) dengan 5 baris dan 3 kolom
    papan : character[5][3]
```

### 4\. Bagian `algoritma` (Logika)

Blok `algoritma` adalah tempat semua logika program dieksekusi.

#### Assignment (Pemberian Nilai)

Assignment ke variabel yang sudah dideklarasi di `kamus`.

```psd
algoritma
    nama = "Alex"
    umur = 18
    listNilai[0] = 100
    papan[1][1] = 'X'
```

Mendukung *compound assignment* untuk tipe numerik:

  * `+=` (Contoh: `umur += 1` sama dengan `umur = umur + 1`)
  * `-=`
  * `*=`
  * `/=`

#### Operator Aritmatika

  * `+`: Penjumlahan (angka) atau Konkatenasi (string).
  * `-`: Pengurangan.
  * `*`: Perkalian.
  * `/`: Pembagian (selalu menghasilkan `real`).
  * `div`: Pembagian `integer` (dibulatkan ke bawah).
  * `mod`: Sisa bagi (modulo).

#### Operator Logika & Perbandingan

  * `and`: Logika AND (misal: `a > 5 and a < 10`).
  * `or`: Logika OR.
  * `!`: Logika NOT (negasi).
  * `==`: Sama dengan.
  * `!=`: Tidak sama dengan.
  * `>`: Lebih besar dari.
  * `<`: Lebih kecil dari.
  * `>=`: Lebih besar atau sama dengan.
  * `<=`: Lebih kecil atau sama dengan.

#### Fungsi I/O Bawaan

```psd
// Mencetak setiap argumen dipisah spasi, diakhiri newline
output("Nilai:", umur)

// Mencetak dengan format (mirip printf), tanpa newline
outputf("Nama: %s, Umur: %d", nama, umur)

// Membaca input dari user dan menyimpannya ke variabel
input(nama)
input(umur) // Otomatis mengkonversi input ke tipe 'integer'

// Membaca input dengan format (saat ini diabaikan, berfungsi seperti input())
inputf("%s %d", nama, umur)
```

#### Fungsi Bawaan Lainnya

```psd
// Mengembalikan panjang string
output(length("halo")) // Akan mencetak 4

// Mengembalikan panjang array (dimensi pertama)
kamus list: integer[7]
algoritma output(length(list)) // Akan mencetak 7
```

#### Struktur Kontrol: If-Else

Struktur `if` harus selalu ditutup dengan `endif`.

```psd
if umur > 17 then
    output("Dewasa")
else if umur == 17 then
    output("Transisi")
else
    output("Remaja")
endif
```

#### Struktur Kontrol: For Loop

Loop `for` selalu *increment* +1.

```psd
kamus
    i : integer
algoritma
    for i = 1 to 5 then
        output(i)
    endfor
    // Akan mencetak:
    // 1
    // 2
    // 3
    // 4
    // 5
```

#### Struktur Kontrol: While Loop

Mengecek kondisi di awal. Blok dieksekusi selama kondisi `true`.

```psd
algoritma
    i = 1
    while i <= 3 then
        output(i)
        i = i + 1
    endwhile
```

#### Struktur Kontrol: Repeat-Untuk

Mengecek kondisi di akhir (mirip `do-while`). Blok dieksekusi minimal satu kali, dan akan terus berulang *selama* kondisi `true`.

```psd
algoritma
    i = 1
    repeat
        output(i)
        i = i + 1
    untuk (i <= 3)
```

### 5\. Pemisah Statement (;)

Anda dapat menulis beberapa *statement* dalam satu baris dengan memisahkannya menggunakan titik-koma (`;`).

```psd
algoritma
    // Dua statement ini akan dieksekusi berurutan
    outputf("Masukkan nama: "); input(nama)
    
    output(1); output(2); output(3)
```

-----

## Struktur Arsitektur Proyek

Kode sumber interpreter dibagi menjadi beberapa modul inti di dalam folder `src/`:

```
src/
├── core/
│   ├── Lexer.ts       # (Scanner) Mengubah teks -> Token
│   ├── Parser.ts      # (Parser) Mengubah Token -> AST
│   ├── Interpreter.ts # (Executor) Menjalankan AST
│   └── TokenType.ts   # Definisi semua tipe token (kosakata)
│
├── ast/
│   └── nodes.ts       # Definisi semua kelas untuk AST (Pola Visitor)
│
├── runtime/
│   └── Environment.ts # Mengelola memori, scope, dan variabel
│
├── utils/
│   └── ErrorHandler.ts # Modul terpusat untuk pelaporan error
│
├── bin/
│   └── psd.ts         # Titik masuk CLI
│
└── index.ts             # Pipeline utama yang menyatukan semua modul
```
