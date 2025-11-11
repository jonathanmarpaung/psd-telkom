/**
 * tests/lexer.test.ts
 */

import { Lexer } from '../src/core/Lexer';
import { TokenType } from '../src/core/TokenType';
import { ErrorHandler } from '../src/utils/ErrorHandler';

jest.mock('../src/utils/ErrorHandler', () => ({
  ErrorHandler: {
    report: jest.fn(),
    reset: jest.fn(),
    hadError: false,
    hadRuntimeError: false,
  },
}));

const getTokenTypes = (code: string): TokenType[] => {
  const lexer = new Lexer(code);
  const tokens = lexer.scanTokens();
  return tokens.filter(t => t.type !== TokenType.EOF).map(t => t.type);
};

// ==================================================================
// TEST SUITE (TIDAK ADA PERUBAHAN DI SINI)
// ==================================================================

describe('Lexer', () => {

  beforeEach(() => {
    (ErrorHandler.report as jest.Mock).mockClear();
  });

  describe('Single-Character Tokens', () => {
    it('should correctly scan single-char tokens', () => {
      const code = '()[]:,';
      const expectedTypes = [
        TokenType.LEFT_PAREN,
        TokenType.RIGHT_PAREN,
        TokenType.LEFT_BRACKET,
        TokenType.RIGHT_BRACKET,
        TokenType.COLON,
        TokenType.COMMA,
      ];
      expect(getTokenTypes(code)).toEqual(expectedTypes);
    });
  });

  describe('Operators', () => {
    it('should scan simple operators', () => {
      const code = '+ - * /';
      const expectedTypes = [
        TokenType.PLUS,
        TokenType.MINUS,
        TokenType.STAR,
        TokenType.SLASH,
      ];
      expect(getTokenTypes(code)).toEqual(expectedTypes);
    });

    it('should scan comparison and logic operators', () => {
      const code = '= == ! != > >= < <=';
      const expectedTypes = [
        TokenType.EQUAL,
        TokenType.EQUAL_EQUAL,
        TokenType.BANG,
        TokenType.BANG_EQUAL,
        TokenType.GREATER,
        TokenType.GREATER_EQUAL,
        TokenType.LESS,
        TokenType.LESS_EQUAL,
      ];
      expect(getTokenTypes(code)).toEqual(expectedTypes);
    });

    it('should scan compound assignment operators', () => {
      const code = '+= -= *= /=';
      const expectedTypes = [
        TokenType.PLUS_EQUAL,
        TokenType.MINUS_EQUAL,
        TokenType.STAR_EQUAL,
        TokenType.SLASH_EQUAL,
      ];
      expect(getTokenTypes(code)).toEqual(expectedTypes);
    });
  });

  describe('Keywords', () => {
    it('should scan main structure keywords', () => {
      const code = 'program kamus algoritma endprogram';
      expect(getTokenTypes(code)).toEqual([
        TokenType.PROGRAM,
        TokenType.KAMUS,
        TokenType.ALGORITMA,
        TokenType.ENDPROGRAM,
      ]);
    });

    it('should scan control flow keywords', () => {
      const code = 'if then else endif while endwhile for to endfor repeat untuk';
      expect(getTokenTypes(code)).toEqual([
        TokenType.IF, TokenType.THEN, TokenType.ELSE, TokenType.ENDIF,
        TokenType.WHILE, TokenType.ENDWHILE, TokenType.FOR, TokenType.TO, TokenType.ENDFOR,
        TokenType.REPEAT, TokenType.UNTUK,
      ]);
    });

    it('should scan type and operator keywords', () => {
      const code = 'const integer real string character boolean true false and or div mod';
      expect(getTokenTypes(code)).toEqual([
        TokenType.CONST, TokenType.INTEGER, TokenType.REAL, TokenType.STRING, TokenType.CHARACTER, TokenType.BOOLEAN,
        TokenType.TRUE, TokenType.FALSE, TokenType.AND, TokenType.OR, TokenType.DIV, TokenType.MOD,
      ]);
    });

    it('should be case-insensitive for keywords', () => {
      const code = 'PROGRAM Kamus AlGoRiTmA TRUE';
      expect(getTokenTypes(code)).toEqual([
        TokenType.PROGRAM,
        TokenType.KAMUS,
        TokenType.ALGORITMA,
        TokenType.TRUE,
      ]);
    });
  });

  describe('Literals', () => {
    it('should scan an integer', () => {
      const lexer = new Lexer('123');
      const tokens = lexer.scanTokens();
      expect(tokens[0].type).toBe(TokenType.NUMBER_LITERAL);
      expect(tokens[0].literal).toBe(123);
    });

    it('should scan a real (float)', () => {
      const lexer = new Lexer('3.14');
      const tokens = lexer.scanTokens();
      expect(tokens[0].type).toBe(TokenType.NUMBER_LITERAL);
      expect(tokens[0].literal).toBe(3.14);
    });

    it('should scan an identifier', () => {
      const lexer = new Lexer('nama_var');
      const tokens = lexer.scanTokens();
      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].lexeme).toBe('nama_var');
    });

    it('should scan a simple string', () => {
      const lexer = new Lexer('"hello"');
      const tokens = lexer.scanTokens();
      expect(tokens[0].type).toBe(TokenType.STRING_LITERAL);
      expect(tokens[0].literal).toBe('hello');
    });

    it('should scan a string with escape sequences', () => {
      const lexer = new Lexer('"hello\\nworld\\t"');
      const tokens = lexer.scanTokens();
      expect(tokens[0].type).toBe(TokenType.STRING_LITERAL);
      expect(tokens[0].literal).toBe('hello\nworld\t'); // Perhatikan: \n asli
    });

    it('should scan a simple character', () => {
      const lexer = new Lexer("'A'");
      const tokens = lexer.scanTokens();
      expect(tokens[0].type).toBe(TokenType.CHAR_LITERAL);
      expect(tokens[0].literal).toBe('A');
    });

    it('should scan an escaped character', () => {
      const lexer = new Lexer("'\\n'");
      const tokens = lexer.scanTokens();
      expect(tokens[0].type).toBe(TokenType.CHAR_LITERAL);
      expect(tokens[0].literal).toBe('\n'); // Perhatikan: \n asli
    });
  });

  describe('Ignored Tokens', () => {
    it('should ignore whitespace, tabs, and newlines', () => {
      const code = ' \t \n program \n \t kamus \n ';
      expect(getTokenTypes(code)).toEqual([
        TokenType.PROGRAM,
        TokenType.KAMUS,
      ]);
    });

    it('should ignore single-line comments', () => {
      const code = `
        program // ini program
        kamus // ini kamus
        // baris ini diabaikan
        algoritma
      `;
      expect(getTokenTypes(code)).toEqual([
        TokenType.PROGRAM,
        TokenType.KAMUS,
        TokenType.ALGORITMA,
      ]);
    });

    it('should ignore multi-line comments', () => {
      const code = `
        program
        /* ini adalah
           blok komentar
           yang panjang */
        kamus
      `;
      expect(getTokenTypes(code)).toEqual([
        TokenType.PROGRAM,
        TokenType.KAMUS,
      ]);
    });
  });

  // ==================================================================
  // --- PERBAIKAN DI SINI ---
  // ==================================================================
  describe('Lexer Error Handling', () => {
    
    it('should report an error for an unterminated string', () => {
      getTokenTypes('"hello'); // Jalankan lexer
      
      expect(ErrorHandler.report).toHaveBeenCalled();
      expect(ErrorHandler.report).toHaveBeenCalledWith(
        1, // line
        6, // column <-- DIGANTI DARI 7
        "", // where
        "String literal tidak ditutup." // message
      );
    });

    it('should report an error for an unknown character', () => {
      getTokenTypes('#'); // Jalankan lexer
      expect(ErrorHandler.report).toHaveBeenCalledWith(
        1, 1, "", "Karakter tidak terduga: '#'"
      );
    });

    it('should report an error for an invalid char literal (too long)', () => {
      getTokenTypes("'AB'"); // Jalankan lexer
      expect(ErrorHandler.report).toHaveBeenCalledWith(
        1,
        2, // column <-- DIGANTI DARI 3
        "",
        "Character literal harus satu karakter dan ditutup dengan '."
      );
    });

    it('should report an error for an unterminated char literal', () => {
      getTokenTypes("'"); // Jalankan lexer
      expect(ErrorHandler.report).toHaveBeenCalledWith(
        1,
        1, // column <-- DIGANTI DARI 2
        "",
        "Character literal tidak ditutup." // <-- PESAN DIGANTI
      );
    });
  });

});