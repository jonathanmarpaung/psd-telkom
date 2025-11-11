/**
 * src/utils/ErrorHandler.ts
 * * Satu tempat untuk melaporkan semua error (Lexer, Parser, Runtime)
 * dan melacak status error secara global.
 */

import { Token, TokenType } from '../core/TokenType';
import { RuntimeError } from '../runtime/Environment';

export class ErrorHandler {
  // Flag ini akan dibaca oleh 'index.ts' nanti
  public static hadError: boolean = false;
  public static hadRuntimeError: boolean = false;

  /**
   * Melaporkan error dasar (digunakan oleh Lexer)
   */
  public static report(line: number, col: number, where: string, message: string): void {
    console.error(`[Baris ${line}, Kol ${col}] Error ${where}: ${message}`);
    this.hadError = true;
  }

  /**
   * Melaporkan error terkait token (digunakan oleh Parser)
   */
  public static error(token: Token, message: string): void {
    if (token.type === TokenType.EOF) {
      this.report(token.line, token.column, "di akhir", message);
    } else {
      this.report(token.line, token.column, `di '${token.lexeme}'`, message);
    }
  }

  /**
   * Melaporkan error saat program berjalan (digunakan oleh Interpreter)
   */
  public static runtimeError(error: RuntimeError): void {
    console.error(`\n[RuntimeError di baris ${error.token.line}, col ${error.token.column}]`);
    console.error(`> ${error.message}`);
    this.hadRuntimeError = true;
  }

  /**
   * Mereset status error (dipanggil setiap kali 'run' dimulai)
   */
  public static reset(): void {
    this.hadError = false;
    this.hadRuntimeError = false;
  }
}