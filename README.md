# 📖 Interpreter Pseudocode (Gaya Telkom University)
Ini adalah proyek interpreter untuk bahasa pseudocode yang didesain berdasarkan silabus Algoritma & Pemrograman (sering disebut "Gaya Telkom University").
Proyek ini menyediakan dua runtime (cara menjalankan) yang terpisah namun fungsionalitasnya identik:
 * psd.cpp (C++): Versi kompilasi native yang sangat cepat dan efisien.
 * psd.js (Node.js): Versi skrip yang portabel dan mudah dijalankan di mana saja.
🚀 Fitur Bahasa
Interpreter ini mendukung fungsionalitas algoritma yang komprehensif:
 * Struktur Dasar: program, kamus, algoritma, endprogram.
 * Tipe Primitif: integer, real, string, character, boolean.
 * Tipe Kustom: type ... < ... > (Struct) dan type ... ... (Alias/Typedef).
 * Deklarasi: const (dengan inisialisasi) dan var (tanpa inisialisasi).
 * Struktur Data: Array multi-dimensi (integer[10][5]).
 * String Mutable: String dapat diubah karakternya (nama[0] = 'J').
 * Operator Lengkap:
   * Aritmatika: +, -, *, / (real), div (integer), mod.
   * Logika: &&, ||, !, ==, !=, >, <, >=, <=.
 * Struktur Kontrol:
   * if ... then ... else if ... then ... else ... endif
   * for ... = ... to ... do ... endfor
   * while ... do ... endwhile
   * repeat ... untuk ...
 * I/O: output(...) dan input(...) (berbasis token, mirip cin C++).
 * Fungsi Bawaan: size(), integer(), string(), real(), boolean(), character().
 * Komentar: // ... (satu baris) dan /* ... */ (multi-baris).
 * Sintaks Fleksibel: Titik koma (;) bersifat opsional sebagai pemisah baris, namun wajib untuk memisahkan beberapa statement pada baris yang sama.
🛠️ Instalasi dan Penggunaan
Anda hanya perlu memilih salah satu dari dua opsi berikut untuk menjalankan program.
Opsi A: Versi C++ (Direkomendasikan untuk Performa)
Versi ini perlu dikompilasi (compile) terlebih dahulu menjadi file executable (program jadi).
1. Prasyarat
Anda memerlukan compiler C++ yang mendukung C++17:
 * Linux: g++ (biasanya bagian dari build-essential).
 * macOS: clang++ (dari Xcode Command Line Tools).
 * Windows: MSVC (dari "Desktop development with C++" di Visual Studio Installer).
2. Kompilasi
Buka terminal Anda di folder proyek (tempat psd.cpp berada) dan jalankan perintah yang sesuai untuk OS Anda:
 * Linux (g++)
   g++ -std=c++17 -O2 -o psd psd.cpp

 * macOS (clang++)
   clang++ -std=c++17 -O2 -o psd psd.cpp

 * Windows (MSVC)
   Buka x64 Native Tools Command Prompt (dari menu Start) dan navigasi ke folder Anda.
   cl /std:c++17 /EHsc /O2 psd.cpp /Fepsd.exe

   * /Fe memberi nama file output psd.exe.
3. Menjalankan
Setelah kompilasi berhasil, Anda akan mendapatkan file psd (atau psd.exe).
# Di Linux/macOS
./psd nama_file_anda.psd

# Di Windows
.\psd.exe nama_file_anda.psd

Opsi B: Versi Node.js (Direkomendasikan untuk Portabilitas)
Versi ini tidak perlu dikompilasi, tetapi memerlukan Node.js dan beberapa dependensi.
1. Prasyarat
Pastikan Anda telah menginstal Node.js (v14 atau lebih baru).
2. Instalasi Dependensi
Buka terminal Anda di folder proyek (tempat psd.js berada) dan jalankan perintah ini satu kali:
npm install readline-sync expr-eval

 * readline-sync: Digunakan untuk menangani input() secara sinkron.
 * expr-eval: Digunakan untuk mengevaluasi ekspresi matematika dan logika.
3. Menjalankan
node psd.js nama_file_anda.psd

📜 Panduan Bahasa (Sintaks)
Berikut adalah panduan lengkap sintaks bahasa pseudocode ini.
Struktur Program Dasar
program NamaProgramAnda

kamus
    // Deklarasi Tipe, Konstanta, dan Variabel
algoritma
    // Logika Program
endprogram

Bagian kamus
Tipe Data
 * integer: 10, -5
 * real: 3.14, 0.5
 * boolean: true, false
 * string: "Hello" (kutip ganda)
 * character: 'A' (kutip tunggal)
Tipe Kustom (Struct)
type Mahasiswa <
    nama : string
    nim : string
    ipk : real
>

Tipe Alias (Typedef)
type Bilangan integer
type Teks string

Array (0-indexed)
nilai : integer[10]     // Array 1D
matrix : real[5][5]     // Array 2D
kelas : Mahasiswa[40]   // Array dari Struct

Variabel (var)
nama : string
a, b, c : integer
mhs1 : Mahasiswa

Konstanta (const)
const PI : real = 3.14
const NAMA_APP : string = "Interpreter"

Bagian algoritma
Assignment (=)
x = 10
isValid = true
mhs1.nama = "Budi"
nilai[0] = 100
salam = "Halo"
salam[0] = 'J'  // String bersifat mutable

I/O
output("Hello, World!")
output("Nilai:", x, "dan", y)

input(nama)
input(a, b, c) // Input berbasis token
input(mhs1.nama, nilai[1])

Operator
| Kategori | Operator |
|---|---|
| Aritmatika | +, -, *, / (real), div (int), mod |
| Perbandingan | ==, !=, >, <, >=, <= |
| Logika | && (AND), ` |
Percabangan
if nilai > 90 then
    output("Grade A")
else if nilai > 80 then
    output("Grade B")
else
    output("Grade C")
endif

Perulangan
// For (inklusif)
for i = 1 to 5 do
    output(i)
endfor

// While (Cek di awal)
n = 3
while n > 0 do
    output(n)
    n = n - 1
endwhile

// Repeat (Cek di akhir, ulangi SELAMA kondisi true)
n = 5
repeat
    output(n)
    n = n - 1
untuk (n > 0)

Fungsi Bawaan
n = size("hello")   // n = 5
n = size(nilai)     // n = 10 (dari deklarasi array)

x = integer("123")  // x = 123
s = string(3.14)    // s = "3.14"

💡 Contoh Program (example.psd)
Berikut adalah file contoh (example.psd) yang dapat Anda gunakan untuk menguji interpreter.
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
    salam : string
    stop : boolean

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
    salam = "Halo"
    salam[0] = 'J' // Mengganti H -> J
    output("String diubah:", salam) // "Jalo"
    output("Panjang nama:", size(salam)) // 4
    
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
    
    output("Tes Selesai.")

endprogram

 
