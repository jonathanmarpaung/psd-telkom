/**
 * tests/interpreter.test.ts
 * * Tes integrasi (End-to-End) untuk Interpreter.
 * Menjalankan pipeline penuh (Lexer -> Parser -> Interpreter)
 * dan memverifikasi output atau error-nya.
 */

import { Lexer } from '../src/core/Lexer';
import { Parser } from '../src/core/Parser';
import { Interpreter } from '../src/core/Interpreter';
import { ErrorHandler } from '../src/utils/ErrorHandler';
import * as readlineSync from 'readline-sync';
import { RuntimeError } from '../src/runtime/Environment'; // <-- PERBAIKAN DI SINI

// 1. Mock ErrorHandler
jest.mock('../src/utils/ErrorHandler', () => ({
  ErrorHandler: {
    report: jest.fn(),
    error: jest.fn(),
    runtimeError: jest.fn(), // <- Kita akan pantau ini
    reset: jest.fn(),
    hadError: false,
    hadRuntimeError: false,
  },
}));

// 2. Mock readline-sync (untuk input())
jest.mock('readline-sync', () => ({
  question: jest.fn(), // <- Kita akan kontrol apa yang dikembalikan ini
}));

// 3. Helper untuk menjalankan pipeline
/**
 * Menjalankan source code 'psd' dan mengembalikan
 * seluruh output konsol sebagai satu string.
 */
const runCode = (code: string): string => {
  // Reset mock sebelum setiap eksekusi
  (ErrorHandler.error as jest.Mock).mockClear();
  (ErrorHandler.report as jest.Mock).mockClear();
  (ErrorHandler.runtimeError as jest.Mock).mockClear();

  let capturedOutput = ""; // Kita akan "tangkap" output di sini
  
  const lexer = new Lexer(code);
  const tokens = lexer.scanTokens();
  if (ErrorHandler.hadError) return "LEXER ERROR"; // Seharusnya tidak terjadi di tes ini

  const parser = new Parser(tokens);
  const program = parser.parse();
  if (ErrorHandler.hadError || !program) return "PARSER ERROR"; // Seharusnya tidak

  // Buat interpreter baru setiap saat agar environment-nya bersih
  const interpreter = new Interpreter(
    // printHandler: Alih-alih mencetak ke konsol, tambahkan ke string
    (message: string) => {
      capturedOutput += message;
    },
    // inputHandler: Gunakan mock readline-sync
    () => {
      return (readlineSync.question as jest.Mock)();
    }
  );

  interpreter.interpret(program);

  // Jika ada error runtime, tandai
  if ((ErrorHandler.runtimeError as jest.Mock).mock.calls.length > 0) {
    return "RUNTIME ERROR";
  }

  return capturedOutput;
};

// ==================================================================
// MULAI TEST SUITE
// ==================================================================

describe('Interpreter', () => {

  describe('Literals and Basic Output', () => {
    it('should output numbers', () => {
      expect(runCode('program t kamus algoritma output(123) endprogram')).toBe("123\n");
    });
    it('should output real numbers', () => {
      expect(runCode('program t kamus algoritma output(3.14) endprogram')).toBe("3.14\n");
    });
    it('should output strings', () => {
      expect(runCode('program t kamus algoritma output("hello") endprogram')).toBe("hello\n");
    });
    it('should output booleans as true/false', () => {
      expect(runCode('program t kamus algoritma output(true) endprogram')).toBe("true\n");
      expect(runCode('program t kamus algoritma output(false) endprogram')).toBe("false\n");
    });
    it('should handle outputf without newline', () => {
      expect(runCode('program t kamus algoritma outputf("hi") endprogram')).toBe("hi");
    });
    it('should handle outputf with formatting', () => {
      const code = 'program t kamus algoritma outputf("angka: %d, str: %s", 10, "tes") endprogram';
      expect(runCode(code)).toBe("angka: 10, str: tes");
    });
  });

  describe('Arithmetic Operations', () => {
    it('should handle +', () => {
      expect(runCode('program t kamus algoritma output(1 + 2) endprogram')).toBe("3\n");
    });
    it('should handle -', () => {
      expect(runCode('program t kamus algoritma output(10 - 3) endprogram')).toBe("7\n");
    });
    it('should handle *', () => {
      expect(runCode('program t kamus algoritma output(4 * 3) endprogram')).toBe("12\n");
    });
    it('should handle / (real division)', () => {
      expect(runCode('program t kamus algoritma output(10 / 4) endprogram')).toBe("2.5\n");
    });
    it('should handle div (integer division)', () => {
      expect(runCode('program t kamus algoritma output(10 div 4) endprogram')).toBe("2\n");
    });
    it('should handle mod', () => {
      expect(runCode('program t kamus algoritma output(10 mod 3) endprogram')).toBe("1\n");
    });
    it('should handle string concatenation', () => {
      expect(runCode('program t kamus algoritma output("a" + "b") endprogram')).toBe("ab\n");
    });
    it('should handle string/number concatenation', () => {
      expect(runCode('program t kamus algoritma output("a" + 1) endprogram')).toBe("a1\n");
    });
  });

  describe('Variables and Assignment', () => {
    it('should store and retrieve a variable', () => {
      const code = `
        program test
        kamus
          a : integer
        algoritma
          a = 10
          output(a)
        endprogram
      `;
      expect(runCode(code)).toBe("10\n");
    });
    
    it('should handle compound assignment (+=)', () => {
      const code = `
        program test
        kamus
          a : integer
        algoritma
          a = 10
          a += 5
          output(a)
        endprogram
      `;
      expect(runCode(code)).toBe("15\n");
    });
  });

  describe('Logical Operations', () => {
    it('should handle (true and false)', () => {
      expect(runCode('program t kamus algoritma output(true and false) endprogram')).toBe("false\n");
    });
    it('should handle (true or false)', () => {
      expect(runCode('program t kamus algoritma output(true or false) endprogram')).toBe("true\n");
    });
    it('should handle ! (not)', () => {
      expect(runCode('program t kamus algoritma output(!true) endprogram')).toBe("false\n");
    });
    it('should handle comparisons', () => {
      expect(runCode('program t kamus algoritma output(10 > 5) endprogram')).toBe("true\n");
      expect(runCode('program t kamus algoritma output(10 < 5) endprogram')).toBe("false\n");
      expect(runCode('program t kamus algoritma output(5 == 5) endprogram')).toBe("true\n");
      expect(runCode('program t kamus algoritma output(5 != 5) endprogram')).toBe("false\n");
    });
  });

  describe('Control Flow', () => {
    it('should handle if-then', () => {
      const code = 'program t kamus algoritma if true then output("ya") endif endprogram';
      expect(runCode(code)).toBe("ya\n");
    });

    it('should handle if-then-else', () => {
      const code = 'program t kamus algoritma if false then output("ya") else output("tidak") endif endprogram';
      expect(runCode(code)).toBe("tidak\n");
    });

    it('should handle for loop', () => {
      const code = `
        program test
        kamus
          i : integer
        algoritma
          for i = 1 to 3 then
            outputf("%d", i) // 123
          endfor
        endprogram
      `;
      expect(runCode(code)).toBe("123");
    });

    it('should handle while loop', () => {
      const code = `
        program test
        kamus
          i : integer
        algoritma
          i = 1
          while (i <= 3) then
            outputf("%d", i) // 123
            i = i + 1
          endwhile
        endprogram
      `;
      expect(runCode(code)).toBe("123");
    });

    it('should handle repeat-untuk (do-while) loop', () => {
      const code = `
        program test
        kamus
          i : integer
        algoritma
          i = 1
          repeat
            outputf("%d", i) // 123
            i = i + 1
          untuk (i <= 3)
        endprogram
      `;
      expect(runCode(code)).toBe("123");
    });
  });

  describe('Arrays', () => {
    it('should handle 1D array assignment and access', () => {
      const code = `
        program test
        kamus
          list : integer[5]
        algoritma
          list[2] = 100
          output(list[2])
        endprogram
      `;
      expect(runCode(code)).toBe("100\n");
    });

    it('should handle 2D array assignment and access', () => {
      const code = `
        program test
        kamus
          matrix : real[2][2]
        algoritma
          matrix[1][0] = 3.14
          output(matrix[1][0])
        endprogram
      `;
      expect(runCode(code)).toBe("3.14\n");
    });
  });

  describe('Built-in Functions', () => {
    it('should return length of a string', () => {
      const code = 'program t kamus s:string algoritma s = "test" output(length(s)) endprogram';
      expect(runCode(code)).toBe("4\n");
    });

    it('should return length of an array', () => {
      const code = 'program t kamus l:integer[7] algoritma output(length(l)) endprogram';
      expect(runCode(code)).toBe("7\n");
    });
  });

  describe('Input Function', () => {
    it('should handle input() and assign to variables', () => {
      const code = `
        program test
        kamus
          nama : string
          umur : integer
        algoritma
          input(nama)
          input(umur)
          outputf("Nama: %s, Umur: %d", nama, umur)
        endprogram
      `;
      
      // Simulasikan user mengetik "Alex" lalu Enter,
      // kemudian "18" lalu Enter
      (readlineSync.question as jest.Mock)
        .mockReturnValueOnce("Alex")
        .mockReturnValueOnce("18");

      expect(runCode(code)).toBe("Nama: Alex, Umur: 18");
    });
  });

  describe('Runtime Error Handling', () => {
    
    it('should error on division by zero', () => {
      const code = 'program t kamus algoritma output(10 / 0) endprogram';
      expect(runCode(code)).toBe("RUNTIME ERROR");
      expect(ErrorHandler.runtimeError).toHaveBeenCalledWith(
        expect.any(RuntimeError) // <-- 'RuntimeError' sekarang dikenal
      );
    });

    it('should error on array index out of bounds', () => {
      const code = 'program t kamus l:integer[5] algoritma output(l[10]) endprogram';
      expect(runCode(code)).toBe("RUNTIME ERROR");
      expect(ErrorHandler.runtimeError).toHaveBeenCalledWith(
        expect.any(RuntimeError) // <-- 'RuntimeError' sekarang dikenal
      );
    });

    it('should error on undefined variable', () => {
      const code = 'program t kamus algoritma output(variabel_x) endprogram';
      expect(runCode(code)).toBe("RUNTIME ERROR");
      expect(ErrorHandler.runtimeError).toHaveBeenCalledWith(
        expect.any(RuntimeError) // <-- 'RuntimeError' sekarang dikenal
      );
    });

    it('should error on type mismatch assignment', () => {
      const code = 'program t kamus v:integer algoritma v = "hello" endprogram';
      expect(runCode(code)).toBe("RUNTIME ERROR");
      expect(ErrorHandler.runtimeError).toHaveBeenCalledWith(
        expect.any(RuntimeError) // <-- 'RuntimeError' sekarang dikenal
      );
    });
  });
});