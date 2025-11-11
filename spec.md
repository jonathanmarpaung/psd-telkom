# Pendahuluan
Bahasa ini mirip dengan pascal dan menerapkan interpreter seperti python.
Dan banyak menyerap logic pemograman di golang.

# Basic
Kode pertama yang akan dibuat adalah:
```psd
program <nama_program>
kamus

algoritma

endprogram
```

dimana:
```program <nama_program>``` untuk memberitahu nama program
```kamus``` untuk memberi tahu bagian untuk mendeklarasi variable tetapi tidak boleh di assign di kamus
```algoritma``` bagian untuk memasukkan logic

# Kamus
Bagian ini digunakan saat ingin assign variable:
contoh nya adalah
```psd
...
kamus
    var1, var2, ..., varN : <tipe_data>
    varA : <tipe_data>
...
```

## Tipe Data
Terdapat berbagai tipe data yaitu:
- integer
- real (dibahasa pemograman lain ini adalah float)
- string
- character
- boolean

## Konstanta
Untuk menggunakan konstan, perlu menambahkan ```const``` pada awalan deklrasai.
Ada hal unik untuk konstanta. Biasanya variable hanya bisa di deklarasikan tanpa di assign.
Tetapi untuk konstan boleh di asign di kamus.
```psd
...
kamus
    const var1 : <tipe_data> = <value> 
...
```

## Array
Sama seperti menggunakan bahasa pemograman lain. Cara untuk mendeklrasikan array adalah:
```psd
...
kamus
    varA : <tipe_data>[n]
    matrix : <tipe_data>[row][cols]
...
```

# Algoritma
Bagian ini adalah bagian paling penting dimana. Ini adalah tempat logikanya.

## Assign value
Karena di `kamus` tidak boleh assign maka assign value dilakukan di algoritma.
```psd
...
    var1 = <data>
...
```

## Komentar
Pada bahasa ini komentar menggunakan tanda ```//``` atau ```/* */```.
Contoh:
```psd
// Ini adalah komentar
/**
 * Ini adalah komentar
 * dengan banyak baris
 */
```

## Fungsi
Tedapat berbagai fungsi, sebagai berikut:
### output
Fungsi ini digunakan untuk mengeluarkan data. Outputnya akan membuat gap tiap data dan langsung membuat new line:
```output(out1, out2, ..., outN)```.
Contoh:
```psd
...
output("Hasil kalkulasi adalah: ", hasil)
...
```

### outputf
Sama seperti ```output``` tapi ini menggunakan format. ```outputf(format, data1, data2, ..., dataN)```. Format menggunakan format pada umumnya seperi pada C (```printf```), Golang (```fmt.Printf```), atau lainnya. Ini tidak membuat newline pada output maka programmer harus meletakkan `\n` sendiri pada program.

Contoh:
```psd
...
outputf("Hasil kalkulasi: %d", hasil)
...
```

### input
Fungsi ini digunakan untuk meminta data dari user. ```input(var1, var2, ..., varN)```.
Contoh:
```psd
...
kamus
    var1 : <tipe_data>
    ...
algoritma
    input(var1)
...
```

### inputf
Sama seperti ```input```. Tetapi dengan format, ```input(format, var1, var2, ..., varN)```. Seperti C (```scanf```), Golang (```fmt.Scanf```).
Contoh:
```psd
...
kamus
    var1 : integer
    ...
algoritma
    inputf("%d", var1)
    ...
...
```

### length
Fungsi ini digunakan untuk mencari tahu panjang sesuatu data seperti array atau string.
Contoh:
```psd
...
kamus
    name : string
    list : <tipe_data>[n]
    matrix : <tipe_data>[rows][cols]
    ...
algoritma
    ...
    output(length(name))
    output(length(list)) // n
    output(length(matrix)) // rows
    output(length(matrix[0])) // cols
    ...
...
```

## Mengakses dan memanipulasi array
Sama pada bahasa pemograman pada umunya, untuk mengakses array adalah sebagai berikut:
```psd
...
kamus
    list : <tipe_data>[n]
    matrix : <tipe_data>[rows][cols]
algoritma
    ...
    list[0] = <data>
    matrix[2][2] = <data>
    output(list[0], matrix[2][2])
...
```

## Logic operator
Sama seperti bahasa pemograman lainnya. Setiap hasil logic operator menghasil ```boolean```.
- ```==```
- ```!=```
- ```>```
- ```>=```
- ```<```
- ```<=```
- ```and```
- ```or```

Contoh 1:
```psd
...
    is_valid = password == "1234"
...
```

## Negasi
Seperti umunya jika ada suatu kondisi di negasikan ```!``` maka akan menjadi kebalikannya:
- `false` jadi `true`
-  `true` jadi `false`

Contoh 1:
```psd
...
    is_not_uppercase = !((c >= 'A') && (c <= 'Z'))
...
```

## Arithmatic Operation
Operasi aritmatika dapat dilakukan seperti bahasa pemograman umum:
- `+`
- `-`
- `/` (hasil bisa jadi `real`)
- `div` (hasil harus menjadi `integer` di bulatkan ke bawah)
- `mod`
- `+=` (shortcut `a = a + x`)
- `-=` (shortcut `a = a - x`)
- `*=` (shortcut `a = a * x`)
- `/=` (shortcut `a = a / x`)

# Seperate ";"
Ini bagaimana cara mengeksekusi dua kode dalam satu baris:

contoh:
```psd
...
algoritma
    outputf("Masukan nama: "); input(name)
    ...
...
```

## If-Else-Then
Ini adalah Jika maka sama seperti di bahasa pemograman umumnya
```psd
if <kondisi1> then
    ...
else if <kondisi2> then
    ...
.
.
else if <kondisiN> then
    ...
else
    ...
endif
```

Contoh 1:
```psd
...
    if var1 > var 2 then
        output("var1 greater than var2")
    endif

    if length(str) == 0 then
        output("empty")
    else
        output("not empty")
    endif
...
```

## String
Seperti pada umumnya string adalah array yang berisikan character. Dan dapat melakukan operasi pengabungan dengan ```+```.

Contoh 1:
```psd
...
    str = str1 + str2
...
```

## Character
Karakter sama seperti integer ia hanyalah nilai yang akan ditampilkan sebagai karakter di layar. Maka `character` dapat melakukan operasi logika atau aritmatika.

## For-loop
Cara for-loop sangat gampang dimana:
```psd
...
kamus
    i, x, y : integer
    ...
algoritma
    ...
    for i = x to y then
        <aksi>
    endfor
    ...
...
```

Sengaja kekurangannya increment selalu 1. Dan tidak bisa di ubah.

# While-loop
Sama seperti bahasa pemograman umum:
```psd
...
while <kondisi> then
    <aksi>
endwhile
...
```

# Repeat-Untuk
Ini mirip seperti while-do.
```psd
repeat
    <aksi>
untuk <kondisi>
```

# Endprogram
Ini adalah penanda bahwa program telah berakhir.