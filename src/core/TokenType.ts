/**
 * src/core/TokenType.ts
 * Mendefinisikan semua "kosakata" yang mungkin ada dalam bahasa "psd".
 */

// 1. Enum TokenType
export enum TokenType {
  // --- Token Satu Karakter ---
  LEFT_PAREN,     // (
  RIGHT_PAREN,    // )
  LEFT_BRACKET,   // [
  RIGHT_BRACKET,  // ]
  COLON,          // :
  COMMA,          // ,
  
  // --- Operator Aritmatika & Assignment ---
  PLUS,           // +
  MINUS,          // -
  STAR,           // *
  SLASH,          // /
  EQUAL,          // =
  
  PLUS_EQUAL,     // +=
  MINUS_EQUAL,    // -=
  STAR_EQUAL,     // *=
  SLASH_EQUAL,    // /=

  // --- Operator Perbandingan & Logika ---
  BANG,           // !
  BANG_EQUAL,     // !=
  EQUAL_EQUAL,    // ==
  GREATER,        // >
  GREATER_EQUAL,  // >=
  LESS,           // <
  LESS_EQUAL,     // <=

  // --- Literal (Data Aktual) ---
  IDENTIFIER,     // namaVariabel, namaProgram, dll.
  STRING_LITERAL, // "ini adalah string"
  NUMBER_LITERAL, // 123 (untuk integer) atau 3.14 (untuk real)
  CHAR_LITERAL,   // 'A'

  // --- Kata Kunci (Keywords) - Struktur Utama ---
  PROGRAM,
  KAMUS,
  ALGORITMA,
  ENDPROGRAM,

  // --- Keywords - Deklarasi Tipe & Variabel ---
  CONST,
  INTEGER,
  REAL,
  STRING,
  CHARACTER,
  BOOLEAN,

  // --- Keywords - Kontrol Alur (Control Flow) ---
  IF,
  THEN,
  ELSE,
  ENDIF,
  FOR,
  TO,
  ENDFOR,
  WHILE,
  ENDWHILE,
  REPEAT,
  UNTUK,  // Ini adalah "until" dari `repeat ... until`

  // --- Keywords - Operator Logika & Aritmatika ---
  AND,
  OR,
  DIV,
  MOD,

  // --- Keywords - Fungsi Bawaan (Built-in) ---
  OUTPUT,
  OUTPUTF,
  INPUT,
  INPUTF,
  LENGTH,

  // --- Keywords - Literal Boolean ---
  BENAR,
  SALAH,

  // --- Lain-lain ---
  COMMENT,      // // komentar satu baris atau /* ... */
  EOF           // End of File (Penanda akhir dari kode)
}


// 2. Tipe Data 'Token'
export type Token = {
  type: TokenType;
  lexeme: string;
  literal: any;
  line: number;
  column: number;
};


// 3. Peta Kata Kunci (Keyword Map)
export const keywords: Record<string, TokenType> = {
  "program": TokenType.PROGRAM,
  "kamus": TokenType.KAMUS,
  "algoritma": TokenType.ALGORITMA,
  "endprogram": TokenType.ENDPROGRAM,
  "const": TokenType.CONST,
  "integer": TokenType.INTEGER,
  "real": TokenType.REAL,
  "string": TokenType.STRING,
  "character": TokenType.CHARACTER,
  "boolean": TokenType.BOOLEAN,
  "if": TokenType.IF,
  "then": TokenType.THEN,
  "else": TokenType.ELSE,
  "endif": TokenType.ENDIF,
  "for": TokenType.FOR,
  "to": TokenType.TO,
  "endfor": TokenType.ENDFOR,
  "while": TokenType.WHILE,
  "endwhile": TokenType.ENDWHILE,
  "repeat": TokenType.REPEAT,
  "untuk": TokenType.UNTUK,
  "and": TokenType.AND,
  "or": TokenType.OR,
  "div": TokenType.DIV,
  "mod": TokenType.MOD,
  "output": TokenType.OUTPUT,
  "outputf": TokenType.OUTPUTF,
  "input": TokenType.INPUT,
  "inputf": TokenType.INPUTF,
  "length": TokenType.LENGTH,
  "benar": TokenType.BENAR,
  "salah": TokenType.SALAH,
};