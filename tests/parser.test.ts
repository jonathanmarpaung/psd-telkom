/**
 * tests/parser.test.ts
 */

import { Lexer } from '../src/core/Lexer';
import { Parser } from '../src/core/Parser';
import { ErrorHandler } from '../src/utils/ErrorHandler';
import {
  ProgramNode, VarDecl, ConstDecl, ExprStmt, AssignExpr, BinaryExpr, LiteralExpr, GroupingExpr, ArrayType, BasicType, IfStmt
} from '../src/ast/nodes';
import { Token, TokenType } from '../src/core/TokenType'; // Token di-import

// 1. Mock ErrorHandler
jest.mock('../src/utils/ErrorHandler', () => ({
  ErrorHandler: {
    report: jest.fn(),
    error: jest.fn(), // Pastikan 'error' juga di-mock
    reset: jest.fn(),
    hadError: false,
    hadRuntimeError: false,
  },
}));

// 2. Helper untuk menjalankan pipeline
const parseCode = (code: string): ProgramNode | null => {
  (ErrorHandler.error as jest.Mock).mockClear();
  (ErrorHandler.report as jest.Mock).mockClear();
  
  const lexer = new Lexer(code);
  const tokens = lexer.scanTokens();
  const parser = new Parser(tokens);
  return parser.parse();
};

// ==================================================================
// TEST SUITE
// ==================================================================

describe('Parser - Valid Syntax', () => {

  it('should parse a minimal program', () => {
    const code = 'program test kamus algoritma endprogram';
    const ast = parseCode(code);
    
    expect(ast).toBeInstanceOf(ProgramNode);
    expect(ast?.name.lexeme).toBe('test');
    expect(ast?.declarations).toHaveLength(0);
    expect(ast?.statements).toHaveLength(0);
  });

  it('should parse variable declarations', () => {
    const code = `
      program test
      kamus
        a : integer
        b, c : string
      algoritma
      endprogram
    `;
    const ast = parseCode(code);
    expect(ast?.declarations).toHaveLength(2);
    expect(ast?.declarations[0]).toBeInstanceOf(VarDecl);
    
    const varDecl1 = ast?.declarations[0] as VarDecl;
    expect(varDecl1.names[0].lexeme).toBe('a');
    expect((varDecl1.type as BasicType).typeToken.type).toBe(TokenType.INTEGER);

    const varDecl2 = ast?.declarations[1] as VarDecl;
    expect(varDecl2.names.map(t => t.lexeme)).toEqual(['b', 'c']);
    expect((varDecl2.type as BasicType).typeToken.type).toBe(TokenType.STRING);
  });

  it('should parse const declarations', () => {
    const code = `
      program test
      kamus
        const PI : real = 3.14
      algoritma
      endprogram
    `;
    const ast = parseCode(code);
    expect(ast?.declarations).toHaveLength(1);
    expect(ast?.declarations[0]).toBeInstanceOf(ConstDecl);
    
    const constDecl = ast?.declarations[0] as ConstDecl;
    expect(constDecl.name.lexeme).toBe('PI');
    expect(constDecl.initializer).toBeInstanceOf(LiteralExpr);
    expect((constDecl.initializer as LiteralExpr).value).toBe(3.14);
  });

  it('should parse array declarations', () => {
    const code = `
      program test
      kamus
        list : integer[10]
        matrix : real[5][3]
      algoritma
      endprogram
    `;
    const ast = parseCode(code);
    expect(ast?.declarations).toHaveLength(2);

    // Tes array 1D
    const arrDecl1 = ast?.declarations[0] as VarDecl;
    expect(arrDecl1.type).toBeInstanceOf(ArrayType);
    const arrType1 = arrDecl1.type as ArrayType;
    expect(arrType1.baseType.typeToken.type).toBe(TokenType.INTEGER);
    expect(arrType1.dimensions).toHaveLength(1);
    expect((arrType1.dimensions[0] as LiteralExpr).value).toBe(10);
    
    // Tes array 2D
    const arrDecl2 = ast?.declarations[1] as VarDecl;
    expect(arrDecl2.type).toBeInstanceOf(ArrayType);
    const arrType2 = arrDecl2.type as ArrayType;
    expect(arrType2.baseType.typeToken.type).toBe(TokenType.REAL);
    expect(arrType2.dimensions).toHaveLength(2);
    expect((arrType2.dimensions[0] as LiteralExpr).value).toBe(5);
    expect((arrType2.dimensions[1] as LiteralExpr).value).toBe(3);
  });

  it('should parse operator precedence correctly (1 + 2 * 3)', () => {
    const code = 'program test kamus algoritma a = 1 + 2 * 3 endprogram';
    const ast = parseCode(code);
    
    const stmt = ast?.statements[0] as ExprStmt;
    const assign = stmt.expression as AssignExpr;
    const binExpr = assign.value as BinaryExpr; // Ini adalah '+'

    expect(binExpr.operator.type).toBe(TokenType.PLUS);
    expect(binExpr.left).toBeInstanceOf(LiteralExpr); // 1
    expect(binExpr.right).toBeInstanceOf(BinaryExpr);
    const rightExpr = binExpr.right as BinaryExpr;
    expect(rightExpr.operator.type).toBe(TokenType.STAR); // *
    expect((rightExpr.left as LiteralExpr).value).toBe(2);
    expect((rightExpr.right as LiteralExpr).value).toBe(3);
  });

  it('should parse grouping parentheses correctly ((1 + 2) * 3)', () => {
    const code = 'program test kamus algoritma a = (1 + 2) * 3 endprogram';
    const ast = parseCode(code);
    
    const stmt = ast?.statements[0] as ExprStmt;
    const assign = stmt.expression as AssignExpr;
    const binExpr = assign.value as BinaryExpr; // Ini adalah '*'

    expect(binExpr.operator.type).toBe(TokenType.STAR);
    expect(binExpr.right).toBeInstanceOf(LiteralExpr); // 3
    expect(binExpr.left).toBeInstanceOf(GroupingExpr);
    const leftExpr = (binExpr.left as GroupingExpr).expression as BinaryExpr;
    expect(leftExpr.operator.type).toBe(TokenType.PLUS); // +
    expect((leftExpr.left as LiteralExpr).value).toBe(1);
    expect((leftExpr.right as LiteralExpr).value).toBe(2);
  });

  it('should parse a full if-elseif-else statement', () => {
    const code = `
      program test
      kamus x : integer
      algoritma
        if x == 1 then
          output(1)
        else if x == 2 then
          output(2)
        else
          output(3)
        endif
      endprogram
    `;
    const ast = parseCode(code);
    
    // Perbaikan bug: ast tidak akan null lagi
    expect(ast).not.toBeNull();
    expect(ast?.statements).toHaveLength(1);
    expect(ast?.statements[0]).toBeInstanceOf(IfStmt);

    const ifStmt = ast?.statements[0] as IfStmt;
    expect(ifStmt.condition).toBeInstanceOf(BinaryExpr);
    expect(ifStmt.thenBranch.statements).toHaveLength(1);
    expect(ifStmt.elseBranch).not.toBeNull();
    
    expect(ifStmt.elseBranch).toBeInstanceOf(IfStmt);
    const elseIfStmt = ifStmt.elseBranch as IfStmt;
    expect(elseIfStmt.condition).toBeInstanceOf(BinaryExpr);
    expect(elseIfStmt.thenBranch.statements).toHaveLength(1);

    expect(elseIfStmt.elseBranch).not.toBeNull();
    expect((elseIfStmt.elseBranch as any).statements).toHaveLength(1);
  });

});

// ==================================================================
// --- PERBAIKAN DI SINI ---
// ==================================================================

describe('Parser - Invalid Syntax (Error Handling)', () => {
  
  it('should error on code after endprogram', () => {
    const code = 'program test kamus algoritma endprogram output(1)';
    parseCode(code);
    
    expect(ErrorHandler.error).toHaveBeenCalledWith(
      expect.anything(), // <-- DIGANTI
      "Diharapkan akhir file setelah 'endprogram'."
    );
  });

  it('should error on missing parenthesis', () => {
    const code = 'program test kamus algoritma output(1';
    parseCode(code);
    
    expect(ErrorHandler.error).toHaveBeenCalledWith(
      expect.anything(), // <-- DIGANTI
      "Diharapkan ')' setelah argumen."
    );
  });

  it('should error on assignment in kamus', () => {
    const code = 'program test kamus a = 10 algoritma endprogram';
    parseCode(code);
    
    expect(ErrorHandler.error).toHaveBeenCalledWith(
      expect.anything(), // <-- DIGANTI
      "Diharapkan ':' setelah nama variabel." // <-- PESAN DIPERBAIKI
    );
  });

  it('should error on declaration in algoritma', () => {
    const code = 'program test kamus algoritma a : integer endprogram';
    parseCode(code);
    
    expect(ErrorHandler.error).toHaveBeenCalledWith(
      expect.anything(), // <-- DIGANTI
      "Ekspresi tidak valid."
    );
  });

  it('should error on missing endif', () => {
    const code = 'program test kamus algoritma if true then output(1) endprogram';
    parseCode(code);
    
    // Dengan synchronize() yang baru, kita HANYA mengharapkan SATU error
    expect(ErrorHandler.error).toHaveBeenCalledTimes(1);
    expect(ErrorHandler.error).toHaveBeenCalledWith(
      expect.anything(), // <-- DIGANTI
      "Diharapkan 'endif' untuk menutup blok if." // <-- PESAN DIPERBAIKI
    );
  });
});