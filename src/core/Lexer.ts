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
      case '(': this.addToken(TokenType.LEFT_PAREN); break;
      case ')': this.addToken(TokenType.RIGHT_PAREN); break;
      case '[': this.addToken(TokenType.LEFT_BRACKET); break;
      case ']': this.addToken(TokenType.RIGHT_BRACKET); break;
      case ':': this.addToken(TokenType.COLON); break;
      case ',': this.addToken(TokenType.COMMA); break;

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

      case '/':
        if (this.match('/')) {
          this.commentLine();
        } else if (this.match('*')) {
          this.commentBlock();
        } else {
          this.addToken(this.match('=') ? TokenType.SLASH_EQUAL : TokenType.SLASH);
        }
        break;

      case ' ':
      case '\r':
      case '\t':
        break;

      case '\n':
        this.line++;
        this.column = 0;
        break;

      // --- PERUBAHAN DIMULAI DI SINI ---
      case '"': this.stringLiteral(); break;
      case "'": this.charLiteral(); break;
      // --- PERUBAHAN SELESAI DI SINI ---

      default:
        if (this.isDigit(c)) {
          this.numberLiteral();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
          ErrorHandler.report(this.line, this.column, "", `Karakter tidak terduga: '${c}'`);
        }
        break;
    }
  }

  private identifier(): void {
    while (this.isAlphaNumeric(this.peek())) this.advance();

    const text = this.source.substring(this.start, this.current).toLowerCase();
    
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

  // ==================================================================
  // --- INI ADALAH METODE stringLiteral() YANG SUDAH DIPERBAIKI ---
  // ==================================================================
  private stringLiteral(): void {
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        // String multi-baris tetap error
        ErrorHandler.report(this.line, this.column, "", "String literal tidak boleh multi-baris.");
      }
      this.advance();
    }

    if (this.isAtEnd()) {
      ErrorHandler.report(this.line, this.column, "", "String literal tidak ditutup.");
      return;
    }

    // Lewati tanda kutip penutup (")
    this.advance();

    // 1. Ambil substring mentah (cth: "Halo\\n")
    const rawString = this.source.substring(this.start + 1, this.current - 1);
    
    // 2. Lakukan "Unescaping"
    //    Kita ganti dua karakter '\\n' menjadi satu karakter '\n' (newline)
    //    dan seterusnya untuk escape sequence lainnya.
    const value = rawString
      .replace(/\\n/g, '\n')  // Ganti literal \n dengan newline
      .replace(/\\t/g, '\t')  // Ganti literal \t dengan tab
      .replace(/\\"/g, '"')   // Ganti literal \" dengan "
      .replace(/\\'/g, "'")   // Ganti literal \' dengan '
      .replace(/\\\\/g, '\\'); // Ganti literal \\ dengan \

    this.addToken(TokenType.STRING_LITERAL, value);
  }

  // ==================================================================
  // --- INI ADALAH METODE charLiteral() YANG SUDAH DIPERBAIKI ---
  // ==================================================================
  private charLiteral(): void {
    let charValue = '';

    if (this.isAtEnd()) {
        ErrorHandler.report(this.line, this.column, "", "Character literal tidak ditutup.");
        return;
    }

    // Cek apakah ini escape sequence
    if (this.peek() === '\\') {
      this.advance(); // Lewati '\'
      if (this.isAtEnd()) {
          ErrorHandler.report(this.line, this.column, "", "Character literal tidak lengkap.");
          return;
      }
      
      const escapedChar = this.advance(); // Ambil karakter setelah '\'
      switch (escapedChar) {
        case 'n': charValue = '\n'; break;
        case 't': charValue = '\t'; break;
        case '\\': charValue = '\\'; break;
        case "'": charValue = "'"; break;
        case '"': charValue = '"'; break;
        default:
          ErrorHandler.report(this.line, this.column, "", `Karakter escape tidak dikenal: '\\${escapedChar}'.`);
          charValue = escapedChar; // Simpan apa adanya
          break;
      }
    } else {
      // Karakter biasa
      charValue = this.advance();
    }

    // Pastikan ditutup dengan '
    if (this.peek() !== "'") {
      ErrorHandler.report(this.line, this.column, "", "Character literal harus satu karakter dan ditutup dengan '.");
      // Maju sampai kita temukan penutupnya agar parser tidak bingung
      while (!this.isAtEnd() && this.peek() !== "'") {
          this.advance();
      }
    }
    
    if(!this.isAtEnd()) {
        this.advance(); // Lewati ' penutup
    }

    this.addToken(TokenType.CHAR_LITERAL, charValue);
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
      ErrorHandler.report(this.line, this.column, "", "Blok komentar tidak ditutup.");
      return;
    }

    this.advance(); // Lewati *
    this.advance(); // Lewati /
  }

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
      column: this.column - text.length + 1
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