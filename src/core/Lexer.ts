/**
 * src/core/Lexer.ts
 * * Bertanggung jawab untuk memindai teks kode sumber mentah (string)
 * dan mengubahnya menjadi daftar Token.
 */

import { Token, TokenType, keywords } from './TokenType';
import { ErrorHandler } from '../utils/ErrorHandler';

export class Lexer {
  private readonly source: string;
  private readonly tokens: Token[] = [];

  private start: number = 0;
  private current: number = 0;
  private line: number = 1;
  private column: number = 0;
  
  // TIDAK ADA LAGI 'hadError' atau 'report' DI SINI

  constructor(source: string) {
    this.source = source;
  }

  public scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push({
      type: TokenType.EOF,
      lexeme: "",
      literal: null,
      line: this.line,
      column: this.column
    });
    
    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();
    
    switch (c) {
      // ... (case '(', ')', '[', ']', ':', ',', '+', '-', '*', '!', '=', '<', '>')
      // ... (Tidak ada perubahan di sini)
      
      // 1. Token Satu Karakter
      case '(': this.addToken(TokenType.LEFT_PAREN); break;
      case ')': this.addToken(TokenType.RIGHT_PAREN); break;
      case '[': this.addToken(TokenType.LEFT_BRACKET); break;
      case ']': this.addToken(TokenType.RIGHT_BRACKET); break;
      case ':': this.addToken(TokenType.COLON); break;
      case ',': this.addToken(TokenType.COMMA); break;

      // 2. Token Operator (bisa 1 atau 2 karakter)
      case '+':
        this.addToken(this.match('=') ? TokenType.PLUS_EQUAL : TokenType.PLUS);
        break;
      case '-':
        this.addToken(this.match('=') ? TokenType.MINUS_EQUAL : TokenType.MINUS);
        break;
      case '*':
        this.addToken(this.match('=') ? TokenType.STAR_EQUAL : TokenType.STAR);
        break;
      case '!':
        this.addToken(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG);
        break;
      case '=':
        this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL);
        break;
      case '<':
        this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS);
        break;
      case '>':
        this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
        break;

      // 3. Handle Komentar (/)
      case '/':
        if (this.match('/')) {
          this.commentLine();
        } else if (this.match('*')) {
          this.commentBlock();
        } else {
          this.addToken(this.match('=') ? TokenType.SLASH_EQUAL : TokenType.SLASH);
        }
        break;

      // 4. Abaikan Whitespace
      case ' ':
      case '\r':
      case '\t':
        break;

      // 5. Handle Newline
      case '\n':
        this.line++;
        this.column = 0;
        break;

      // 6. Handle Literal
      case '"': this.stringLiteral(); break;
      case "'": this.charLiteral(); break;

      // 7. Handle Tipe yang lebih kompleks
      default:
        if (this.isDigit(c)) {
          this.numberLiteral();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
          // --- PERUBAHAN DI SINI ---
          // Karakter tidak dikenali
          // Sebelumnya: Lexer.error(...)
          ErrorHandler.report(this.line, this.column, "", `Karakter tidak terduga: '${c}'`);
        }
        break;
    }
  }

  // ... (Metode 'identifier()' dan 'numberLiteral()' tidak berubah) ...
  private identifier(): void {
    while (this.isAlphaNumeric(this.peek())) this.advance();

    const text = this.source.substring(this.start, this.current).toLowerCase();
    
    // Cek apakah identifier ini sebenarnya adalah keyword?
    const type = keywords[text]; 
    
    if (type) {
      this.addToken(type);
    } else {
      this.addToken(TokenType.IDENTIFIER);
    }
  }
  
  private numberLiteral(): void {
    while (this.isDigit(this.peek())) this.advance();

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance();
      while (this.isDigit(this.peek())) this.advance();
    }
    
    const value = parseFloat(this.source.substring(this.start, this.current));
    this.addToken(TokenType.NUMBER_LITERAL, value);
  }

  private stringLiteral(): void {
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        // --- PERUBAHAN DI SINI ---
        ErrorHandler.report(this.line, this.column, "", "String literal tidak boleh multi-baris.");
        break;
      }
      this.advance();
    }

    if (this.isAtEnd()) {
      // --- PERUBAHAN DI SINI ---
      ErrorHandler.report(this.line, this.column, "", "String literal tidak ditutup.");
      return;
    }

    this.advance(); // Lewati "

    const value = this.source.substring(this.start + 1, this.current - 1);
    this.addToken(TokenType.STRING_LITERAL, value);
  }

  private charLiteral(): void {
    if (this.peekNext() === "'" && !this.isAtEnd()) {
        const charValue = this.advance();
        this.advance(); // lewati ' penutup
        this.addToken(TokenType.CHAR_LITERAL, charValue);
    } else {
        // --- PERUBAHAN DI SINI ---
        ErrorHandler.report(this.line, this.column, "", "Character literal tidak valid. Harus 'A'.");
        while(this.peek() !== "'" && !this.isAtEnd()) this.advance();
        this.advance(); // lewati ' penutup
    }
  }

  private commentLine(): void {
    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance();
    }
  }

  private commentBlock(): void {
    while (this.peek() !== '*' && this.peekNext() !== '/' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      this.advance();
    }

    if (this.isAtEnd()) {
      // --- PERUBAHAN DI SINI ---
      ErrorHandler.report(this.line, this.column, "", "Blok komentar tidak ditutup.");
      return;
    }

    this.advance(); // Lewati *
    this.advance(); // Lewati /
  }

  // ... (Helper 'isAtEnd', 'advance', 'addToken', 'match', 'peek', 'peekNext') ...
  // ... (Tidak ada perubahan di sini) ...
  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private advance(): string {
    this.column++;
    return this.source.charAt(this.current++);
  }

  private addToken(type: TokenType, literal: any = null): void {
    const text = this.source.substring(this.start, this.current);
    this.tokens.push({
      type: type,
      lexeme: text,
      literal: literal,
      line: this.line,
      column: this.column - text.length + 1 // Kalkulasi kolom awal yang lebih akurat
    });
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.current) !== expected) return false;

    this.current++;
    this.column++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source.charAt(this.current);
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.current + 1);
  }
  
  // ... (Helper 'isDigit', 'isAlpha', 'isAlphaNumeric') ...
  // ... (Tidak ada perubahan di sini) ...
  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}