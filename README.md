# 📖 Dokumentasi Bahasa Pseudocode (Gaya Telkom University)

## Pendahuluan

Ini adalah bahasa pseudocode yang dapat dieksekusi, dirancang berdasarkan "Gaya Telkom University" untuk mata kuliah Algoritma dan Pemrograman. Bahasa ini bertujuan untuk menjembatani kesenjangan antara pseudocode teoretis di kelas dan kode yang dapat dijalankan secara praktis.

Interpreter ini dirancang untuk menjadi ketat (strict) namun tetap fleksibel, dengan fokus pada kejelasan dan struktur algoritma.

## Struktur Program Dasar

Setiap program harus memiliki tiga bagian utama yang dideklarasikan oleh *keyword*: `program`, `kamus`, dan `algoritma`. Program diakhiri dengan `endprogram`.

```
program NamaProgramAnda

kamus
    // Semua deklarasi variabel, tipe, dan konstanta
    // ada di sini.

algoritma
    // Semua logika, perulangan, dan I/O
    // ada di sini.

endprogram
```

## Komentar

Komentar dapat ditulis dalam dua cara:

1.  **Komentar Satu Baris:** Menggunakan `//`
    ```
    // Ini adalah komentar satu baris
    ```
2.  **Komentar Multi-Baris:** Menggunakan `/* ... */`
    ```
    /*
      Ini adalah
      komentar multi-baris.
    */
    ```

## Bagian `kamus` (Deklarasi)

Bagian `kamus` adalah tempat untuk mendefinisikan semua "kata" yang akan digunakan program, termasuk tipe data, variabel, dan konstanta.

### Tipe Data Primitif

Bahasa ini mendukung tipe-tipe data dasar berikut:

  * `integer`: Bilangan bulat (misal: `10`, `-5`, `0`).
  * `real`: Bilangan pecahan/desimal (misal: `3.14`, `-0.5`).
  * `string`: Kumpulan karakter, diapit **kutip ganda** (`"`).
  * `character`: Satu karakter, diapit **kutip tunggal** (`'`).
  * `boolean`: Nilai logika (`true` atau `false`).

### Tipe Data Lanjutan (Struct)

Anda dapat membuat tipe data terstruktur kustom menggunakan `type ... < ... >`.

```
type Mahasiswa <
    nama : string
    nim : string
    ipk : real
    semester : integer
>
```

### Tipe Alias (Typedef)

Anda dapat memberi nama alias ke tipe data yang sudah ada menggunakan `type`.

```
type BilanganBulat integer
type Teks string
```

### Array

Array dideklarasikan dengan menambahkan tanda kurung siku `[ukuran]` setelah nama tipe. Array bersifat *0-indexed*.

```
kamus
    // Array 1D dengan 10 elemen integer
    nilai : integer[10]
    
    // Array 2D (matrix 5x5) dari real
    matrix : real[5][5]
    
    // Array dari tipe data struct
    kelas : Mahasiswa[40]
```

### Deklarasi Variabel (`var`)

Variabel dideklarasikan di `kamus` tanpa nilai awal. Nilai awal default-nya adalah `0`, `0.0`, `false`, atau `""` (string kosong).

```
kamus
    // Deklarasi satu per satu
    nama : string
    umur : integer
    
    // Deklarasi ganda
    a, b, c : integer
    
    // Deklarasi array dan struct
    dataNilai : integer[10]
    mhs1 : Mahasiswa
```

### Deklarasi Konstanta (`const`)

Konstanta dideklarasikan dan **harus** diinisialisasi di `kamus`. Nilainya tidak dapat diubah di bagian `algoritma`.

```
kamus
    const PI : real = 3.14
    const NAMA_APP : string = "Interpreter"
    const MAKS_USER : integer = 100
    const DEBUG_MODE : boolean = true
```

## Bagian `algoritma` (Logika)

Bagian `algoritma` adalah tempat logika program dieksekusi.

### Titik Koma (`;`)

Titik koma (`;`) bersifat **opsional** jika hanya ada satu statement per baris. Titik koma **wajib** digunakan untuk memisahkan beberapa statement pada baris yang sama.

```
algoritma
    // VALID (Tanpa ;)
    output("Baris 1")
    output("Baris 2")

    // VALID (Dengan ;)
    x = 10;
    y = 20;

    // VALID (Beberapa statement satu baris)
    output("Masukkan nama: "); input(nama); output("Halo,", nama)
```

### Penugasan (Assignment)

Assignment menggunakan operator `=`. Anda dapat melakukan assignment ke variabel, *field* struct, elemen array, dan karakter string.

```
algoritma
    // Assignment dasar
    x = 10
    total = x + 5
    isValid = (x > 5) && (x < 20)
    
    // Assignment ke field Struct
    mhs1.nama = "Budi"
    mhs1.ipk = 3.5
    
    // Assignment ke elemen Array
    dataNilai[0] = 100
    dataNilai[1] = 90
    dataNilai[2] = dataNilai[0] + dataNilai[1]
    
    // Assignment ke Karakter String (String bersifat MUTABLE)
    salam = "Halo"
    salam[0] = 'J'  // -> "Jalo"
    salam[1] = 'a'  // -> "Jalo"
    output(salam)   // Output: Jalo
```

### Input / Output (I/O)

#### `output(...)`

Mencetak satu atau lebih nilai ke konsol. Setiap argumen dipisahkan oleh spasi.

```
algoritma
    x = 10
    output("Hello, World!")
    output("Nilai x adalah:", x, "dan 2x adalah:", x * 2)
```

Output:

```
Hello, World!
Nilai x adalah: 10 dan 2x adalah: 20
```

#### `input(...)`

Membaca input dari pengguna. Interpreter ini menggunakan *token-based input* (mirip `cin` pada C++). Ia akan membaca "kata" (dipisah spasi atau baris baru) satu per satu.

```
algoritma
    // Meminta 3 nilai
    output("Masukkan 3 angka (bisa dipisah spasi atau enter):")
    input(a, b, c) 
    
    output("Masukkan nama:")
    input(nama)
```

### Operator

#### Aritmatika

| Operator | Deskripsi | Contoh |
| :--- | :--- | :--- |
| `+` | Penjumlahan (Angka) / Konkatenasi (String) | `5 + 2` (7), `"a" + "b"` ("ab") |
| `-` | Pengurangan | `5 - 2` (3) |
| `*` | Perkalian | `5 * 2` (10) |
| `/` | Pembagian (menghasilkan `real`) | `5 / 2` (2.5) |
| `div` | Pembagian (menghasilkan `integer`) | `5 div 2` (2) |
| `mod` | Modulo (Sisa bagi) | `5 mod 2` (1) |

#### Logika dan Perbandingan

| Operator | Deskripsi | Contoh |
| :--- | :--- | :--- |
| `&&` | Logika AND | `(a > 5) && (b == 10)` |
| `||` | Logika OR | `(a < 0) || (b == 0)` |
| `!` | Logika NOT | `!isValid` |
| `==` | Sama dengan | `a == 10` |
| `!=` | Tidak sama dengan | `nama != "admin"` |
| `>` | Lebih besar dari | `a > 10` |
| `<` | Lebih kecil dari | `a < 10` |
| `>=` | Lebih besar atau sama dengan | `a >= 10` |
| `<=` | Lebih kecil atau sama dengan | `a <= 10` |

### Struktur Kontrol (Percabangan)

Menggunakan sintaks `if ... then ... else if ... then ... else ... endif`.

```
algoritma
    if nilai > 90 then
        output("Grade A")
    else if nilai > 80 then
        output("Grade B")
    else
        output("Grade C")
    endif
```

### Struktur Kontrol (Perulangan)

#### `for`

Perulangan `for` bersifat inklusif (dari `1` **sampai** `N`). Variabel *loop* (`i`) harus sudah dideklarasikan di `kamus`.

```
algoritma
    // Akan mencetak 1 2 3 4 5
    for i = 1 to 5 do
        output(i)
    endfor
```

#### `while`

Perulangan `while` mengecek kondisi di awal. Loop hanya berjalan jika kondisi `true`.

```
algoritma
    n = 3
    while n > 0 do
        output(n)
        n = n - 1
    endwhile
```

Output:

```
3
2
1
```

#### `repeat ... untuk`

Perulangan `repeat` (do-while) mengecek kondisi di akhir. Loop akan berjalan **minimal satu kali**. Perulangan akan terus diulang **selama** (while) kondisi bernilai `true`.

```
algoritma
    n = 5
    repeat
        output(n)
        n = n - 1
    untuk (n > 0)
```

Output:

```
5
4
3
2
1
```

## Fungsi Bawaan

Fungsi-fungsi ini dapat digunakan di dalam bagian `algoritma`.

### `size(variabel)`

Mengembalikan ukuran dari `string` (panjang karakter) atau `array` (jumlah elemen).

```
kamus
    nama : string
    nilai : integer[10]
algoritma
    nama = "Budi"
    output(size(nama))  // Output: 4
    output(size(nilai)) // Output: 10
```

### Konversi Tipe (Casting)

| Fungsi | Deskripsi | Contoh |
| :--- | :--- | :--- |
| `integer(var)` | Konversi ke `integer` | `integer("123")` (123) |
| `real(var)` | Konversi ke `real` | `real("3.14")` (3.14) |
| `string(var)` | Konversi ke `string` | `string(123)` ("123") |
| `boolean(var)` | Konversi ke `boolean` | `boolean("true")` (true) |
| `character(var)` | Konversi ke `character` | `character("abc")` ('a') |

## Contoh Program Lengkap

```
program DemoLengkap

kamus
    // --- Tipe Data Kustom ---
    type Mahasiswa <
        nama : string
        semester : integer
    >
    
    // --- Konstanta ---
    const TAHUN : integer = 2025
    
    // --- Variabel ---
    mhs1 : Mahasiswa
    data : integer[3]
    i, n : integer
    namaUser : string

algoritma
    // --- Struct dan Array Assignment ---
    mhs1.nama = "Jonathan"
    mhs1.semester = 3
    
    data[0] = 10
    data[1] = 20
    data[2] = 30
    
    output("--- Data Mahasiswa ---")
    output("Nama:", mhs1.nama)
    output("Semester:", mhs1.semester)
    output("Tahun:", TAHUN)
    
    // --- String Mutable dan size() ---
    namaUser = mhs1.nama // "Jonathan"
    namaUser[0] = 'j'
    output("Nama diubah:", namaUser) // "jonathan"
    output("Panjang nama:", size(namaUser)) // 8
    
    // --- Perulangan For ---
    output("--- Loop For ---")
    for i = 0 to (size(data) - 1) do
        output("Data[", i, "] =", data[i])
    endfor
    
    // --- Perulangan While dan Input ---
    output("--- Loop While (Validasi Input) ---")
    n = 0
    while n <= 0 do
        output("Masukkan angka positif:")
        input(n)
    endwhile
    
    output("Angka Anda:", n)
    
    // --- Konversi Tipe dan != ---
    if string(n) != "10" then
        output("Angka Anda bukan 10")
    else
        output("Angka Anda adalah 10")
    endif

endprogram
```
