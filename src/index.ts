/**
 * src/index.ts
 * * File "lem" yang menyatukan semua bagian dari interpreter.
 * Berisi kelas 'Psd' statis yang mengelola pipeline eksekusi.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readlineSync from 'readline-sync'; // Untuk input()
import { Lexer } from './core/Lexer';
import { Parser } from './core/Parser';
import { Interpreter } from './core/Interpreter';
import { ErrorHandler } from './utils/ErrorHandler'; // Error handler terpusat
import { ProgramNode } from './ast/nodes';
import { Token } from './core/TokenType'; // Diperlukan untuk error

/**
 * Kelas 'Psd' adalah orchestrator statis utama.
 * Ia mengelola seluruh pipeline.
 */
export class Psd {
  // Kita buat satu instance Interpreter untuk dipakai selamanya
  private static readonly interpreter = new Interpreter(
    // 1. printHandler: Kirim output ke console
    (message: string) => {
      // Menggunakan process.stdout.write agar 'outputf' (tanpa newline) 
      // bisa berfungsi dengan benar
      process.stdout.write(message);
    },
    // 2. inputHandler: Ambil input dari console (secara sinkron)
    () => {
      // readlineSync.question() akan menjeda eksekusi
      // dan menunggu user menekan Enter.
      return readlineSync.question();
    }
  );

  /**
   * Menjalankan sebuah file .psd dari path.
   */
  public static runFile(filePath: string): void {
    const fullPath = path.resolve(filePath);
    let source: string;

    try {
      source = fs.readFileSync(fullPath, 'utf-8');
    } catch (err: any) {
      // Error jika file tidak ada atau tidak bisa dibaca
      console.error(`Gagal membaca file di ${fullPath}: ${err.message}`);
      process.exit(66); // Exit code standar: EX_NOINPUT
    }

    this.run(source);

    // Periksa flag error SETELAH eksekusi selesai
    // Jika ada error, hentikan proses dengan kode error
    if (ErrorHandler.hadError) process.exit(65); // Exit code: EX_DATAERR (Error sintaks)
    if (ErrorHandler.hadRuntimeError) process.exit(70); // Exit code: EX_SOFTWARE (Error runtime)
  }

  /**
   * Pipeline inti untuk menjalankan source code.
   */
  private static run(source: string): void {
    // 1. Reset status error setiap kali menjalankan kode baru
    ErrorHandler.reset();

    // --- 2. LEXER ---
    // Mengubah teks mentah menjadi daftar Token
    const lexer = new Lexer(source);
    const tokens: Token[] = lexer.scanTokens();

    // Jika Lexer menemukan error (cth: string tidak ditutup),
    // kita berhenti di sini. ErrorHandler sudah mencatatnya.
    if (ErrorHandler.hadError) return;
    
    // --- 3. PARSER ---
    // Mengubah daftar Token menjadi Pohon (AST)
    const parser = new Parser(tokens);
    const program: ProgramNode | null = parser.parse();

    // Jika Parser menemukan error (cth: 'if' tanpa 'then'),
    // atau 'program' tidak valid, kita berhenti.
    if (ErrorHandler.hadError || program === null) return;
    
    // --- 4. INTERPRETER ---
    // Menjalankan (mengevaluasi) pohon AST
    this.interpreter.interpret(program);
    // Jika terjadi error saat run, Interpreter akan menangkapnya
    // dan melaporkannya ke ErrorHandler.
  }
}