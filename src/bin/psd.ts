#!/usr/bin/env ts-node
/**
 * src/bin/psd.ts
 * * Titik masuk (entry point) untuk Command Line Interface (CLI).
 * File ini yang akan dieksekusi dari terminal.
 * Ia bertugas mengambil nama file dari argumen dan
 * menyerahkannya ke pipeline Psd.
 */

// Impor 'Psd' dari 'index.ts' yang ada di folder 'src' (../)
import { Psd } from '../index'; 

// Ambil argumen dari command line
// process.argv = [ 'perintah_ts-node', 'nama_file_ini', 'argumen1', 'argumen2', ... ]
// Kita hanya mau 'argumen1' dan seterusnya.
const args = process.argv.slice(2);

// --- Logika Penanganan Argumen ---

if (args.length > 1) {
  // 1. Terlalu banyak argumen (cth: npm run run:psd file1.psd file2.psd)
  console.log("Penggunaan: psd <file>");
  process.exit(64); // Exit code standar: EX_USAGE
} else if (args.length === 1) {
  // 2. Jumlah argumen pas (cth: npm run run:psd hello.psd)
  // Ini adalah skenario sukses kita.
  const filePath = args[0];
  Psd.runFile(filePath);
} else {
  // 3. Tidak ada argumen (cth: npm run run:psd)
  // Kita belum membuat mode interaktif (REPL), jadi kita tampilkan usage.
  console.log("Penggunaan: psd <file>");
  process.exit(64); // Exit code standar: EX_USAGE
}