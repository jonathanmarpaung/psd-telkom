/**
 * src/core/Parser.ts
 * * Bertanggung jawab untuk mengambil daftar token dari Lexer
 * dan membangun Abstract Syntax Tree (AST) berdasarkan 
 * tata bahasa "psd".
 */

import { Token, TokenType } from './TokenType';
import {
  ProgramNode, Decl, Stmt, Expr,
  VarDecl, ConstDecl, BasicType, ArrayType, TypeNode,
  IfStmt, WhileStmt, ForStmt, RepeatStmt, BlockStmt,
  OutputStmt, OutputfStmt, InputStmt, InputfStmt, ExprStmt,
  BinaryExpr, LogicalExpr, UnaryExpr, LiteralExpr, GroupingExpr,
  VariableExpr, AssignExpr, CompoundAssignExpr, CallExpr,
  ArrayAccessExpr, ArraySetExpr,
} from '../ast/nodes';
import { ErrorHandler } from '../utils/ErrorHandler';

// Error kustom untuk masalah parsing
class ParseError extends Error {}

export class Parser {
  private readonly tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    // Kita filter token COMMENT di sini agar Parser tidak perlu pusing
    this.tokens = tokens.filter(token => token.type !== TokenType.COMMENT);
  }

  /**
   * Metode utama: Mem-parse seluruh program.
   */
  public parse(): ProgramNode | null {
    try {
      this.consume(TokenType.PROGRAM, "Diharapkan 'program' di awal file.");
      const name = this.consume(TokenType.IDENTIFIER, "Diharapkan nama program.");

      this.consume(TokenType.KAMUS, "Diharapkan 'kamus' setelah nama program.");
      const declarations = this.declarationList();

      this.consume(TokenType.ALGORITMA, "Diharapkan 'algoritma' setelah 'kamus'.");
      const statements = this.statementList();
      
      this.consume(TokenType.ENDPROGRAM, "Diharapkan 'endprogram' di akhir 'algoritma'.");
      this.consume(TokenType.EOF, "Diharapkan akhir file setelah 'endprogram'.");

      return new ProgramNode(name, declarations, statements);
    } catch (error) {
      // Jika terjadi error, kita sudah melaporkannya via 'this.error()'.
      // Cukup kembalikan null untuk menandakan parsing gagal.
      return null;
    }
  }

  // ==================================================================
  // ATURAN GRAMMAR (RECURSIVE DESCENT)
  // ==================================================================
  
  private declarationList(): Decl[] {
    const declarations: Decl[] = [];
    while (!this.check(TokenType.ALGORITMA) && !this.isAtEnd()) {
      try {
        declarations.push(this.declaration());
      } catch (error) {
        this.synchronize(); // Coba pulih dari error
      }
    }
    return declarations;
  }

  private declaration(): Decl {
    if (this.match(TokenType.CONST)) {
      return this.constDeclaration();
    }
    return this.varDeclaration();
  }

  private constDeclaration(): ConstDecl {
    const name = this.consume(TokenType.IDENTIFIER, "Diharapkan nama konstanta.");
    this.consume(TokenType.COLON, "Diharapkan ':' setelah nama konstanta.");
    const type = this.typeNode();
    this.consume(TokenType.EQUAL, "Diharapkan '=' untuk inisialisasi konstanta.");
    const initializer = this.expression();
    return new ConstDecl(name, type, initializer);
  }

  private varDeclaration(): VarDecl {
    const names: Token[] = [this.consume(TokenType.IDENTIFIER, "Diharapkan nama variabel.")];
    
    while (this.match(TokenType.COMMA)) {
      names.push(this.consume(TokenType.IDENTIFIER, "Diharapkan nama variabel setelah ','."));
    }

    this.consume(TokenType.COLON, "Diharapkan ':' setelah nama variabel.");
    const type = this.typeNode();
    return new VarDecl(names, type);
  }

  private typeNode(): TypeNode {
    const typeToken = this.advance();
    if (![TokenType.INTEGER, TokenType.REAL, TokenType.STRING, TokenType.CHARACTER, TokenType.BOOLEAN].includes(typeToken.type)) {
      throw this.error(typeToken, "Diharapkan tipe data (integer, real, string, dll).");
    }
    
    const baseType = new BasicType(typeToken);

    if (!this.match(TokenType.LEFT_BRACKET)) {
      return baseType; // Tipe dasar, bukan array
    }

    const dimensions: Expr[] = [];
    do {
      dimensions.push(this.expression());
      this.consume(TokenType.RIGHT_BRACKET, "Diharapkan ']' setelah dimensi array.");
    } while (this.match(TokenType.LEFT_BRACKET));

    return new ArrayType(baseType, dimensions);
  }

  private statementList(): Stmt[] {
    const statements: Stmt[] = [];
    while (!this.check(TokenType.ENDPROGRAM) && !this.isAtEnd()) {
      try {
        statements.push(this.statement());
      } catch (error) {
        this.synchronize();
      }
    }
    return statements;
  }
  
  private block(stopTokens: TokenType[]): BlockStmt {
    const statements: Stmt[] = [];
    while (!stopTokens.some(token => this.check(token)) && !this.isAtEnd()) {
      statements.push(this.statement());
    }
    return new BlockStmt(statements);
  }

  private statement(): Stmt {
    if (this.match(TokenType.IF)) return this.ifStatement();
    if (this.match(TokenType.WHILE)) return this.whileStatement();
    if (this.match(TokenType.FOR)) return this.forStatement();
    if (this.match(TokenType.REPEAT)) return this.repeatStatement();
    if (this.match(TokenType.OUTPUT)) return this.outputStatement();
    if (this.match(TokenType.OUTPUTF)) return this.outputfStatement();
    if (this.match(TokenType.INPUT)) return this.inputStatement();
    if (this.match(TokenType.INPUTF)) return this.inputfStatement();

    return this.expressionStatement();
  }

  private ifStatement(): Stmt {
    const condition = this.expression();
    this.consume(TokenType.THEN, "Diharapkan 'then' setelah kondisi if.");
    const thenBranch = this.block([TokenType.ELSE, TokenType.ENDIF]);

    let elseBranch: Stmt | null = null;
    
    if (this.match(TokenType.ELSE)) {
      if (this.match(TokenType.IF)) {
        // Ini 'else if', panggil rekursif
        elseBranch = this.ifStatement();
      } else {
        // Ini 'else' biasa
        elseBranch = this.block([TokenType.ENDIF]);
      }
    }
    
    // Hanya 'if' terluar atau 'else' terakhir yang akan
    // bertanggung jawab memakan 'endif'
    if (!this.check(TokenType.ELSE)) {
        this.consume(TokenType.ENDIF, "Diharapkan 'endif' untuk menutup blok if.");
    }
    
    return new IfStmt(condition, thenBranch, elseBranch);
  }

  private whileStatement(): Stmt {
    const condition = this.expression();
    this.consume(TokenType.THEN, "Diharapkan 'then' setelah kondisi while.");
    const body = this.block([TokenType.ENDWHILE]);
    this.consume(TokenType.ENDWHILE, "Diharapkan 'endwhile' untuk menutup blok while.");
    return new WhileStmt(condition, body);
  }

  private forStatement(): Stmt {
    const loopVar = this.consume(TokenType.IDENTIFIER, "Diharapkan nama variabel loop.");
    this.consume(TokenType.EQUAL, "Diharapkan '=' setelah variabel loop.");
    const start = this.expression();
    this.consume(TokenType.TO, "Diharapkan 'to' di antara nilai awal dan akhir.");
    const end = this.expression();
    this.consume(TokenType.THEN, "Diharapkan 'then' setelah kondisi for.");
    const body = this.block([TokenType.ENDFOR]);
    this.consume(TokenType.ENDFOR, "Diharapkan 'endfor' untuk menutup blok for.");
    return new ForStmt(loopVar, start, end, body);
  }

  private repeatStatement(): Stmt {
    const body = this.block([TokenType.UNTUK]);
    this.consume(TokenType.UNTUK, "Diharapkan 'untuk' setelah blok repeat.");
    const condition = this.expression();
    return new RepeatStmt(body, condition);
  }

  // Helper untuk argumen fungsi
  private functionArguments(): Expr[] {
    const args: Expr[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RIGHT_PAREN, "Diharapkan ')' setelah argumen.");
    return args;
  }
  
  private outputStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Diharapkan '(' setelah 'output'.");
    const args = this.functionArguments();
    return new OutputStmt(args);
  }

  private outputfStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Diharapkan '(' setelah 'outputf'.");
    const format = this.expression();
    let args: Expr[] = [];
    if (this.match(TokenType.COMMA)) {
        args = this.functionArguments();
    } else {
        this.consume(TokenType.RIGHT_PAREN, "Diharapkan ')' setelah argumen.");
    }
    return new OutputfStmt(format, args);
  }

  private inputStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Diharapkan '(' setelah 'input'.");
    const targets = this.functionArguments();
    return new InputStmt(targets);
  }

  private inputfStatement(): Stmt {
    this.consume(TokenType.LEFT_PAREN, "Diharapkan '(' setelah 'inputf'.");
    const format = this.expression();
    let targets: Expr[] = [];
    if (this.match(TokenType.COMMA)) {
        targets = this.functionArguments();
    } else {
        this.consume(TokenType.RIGHT_PAREN, "Diharapkan ')' setelah argumen.");
    }
    return new InputfStmt(format, targets);
  }

  private expressionStatement(): Stmt {
    const expr = this.expression();
    return new ExprStmt(expr);
  }

  // ==================================================================
  // PARSING EKSPRESI (OPERATOR PRECEDENCE)
  // ==================================================================

  private expression(): Expr {
    return this.assignment();
  }

  private assignment(): Expr {
    const expr = this.logicalOr(); // Parse sisi kiri (L-Value)

    if (this.match(TokenType.EQUAL)) {
      const value = this.assignment(); // Rekursif (kanan-asosiatif)
      if (expr instanceof VariableExpr) {
        return new AssignExpr(expr, value);
      } else if (expr instanceof ArrayAccessExpr) {
        return new ArraySetExpr(expr, value);
      }
      throw this.error(this.previous(), "Target assignment tidak valid.");
    } 
    else if (this.match(TokenType.PLUS_EQUAL, TokenType.MINUS_EQUAL, TokenType.STAR_EQUAL, TokenType.SLASH_EQUAL)) {
      const operator = this.previous();
      const value = this.assignment();
      if (expr instanceof VariableExpr || expr instanceof ArrayAccessExpr) {
          return new CompoundAssignExpr(expr, operator, value);
      }
      throw this.error(this.previous(), "Target assignment tidak valid.");
    }

    return expr;
  }

  private logicalOr(): Expr {
    let expr = this.logicalAnd();
    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.logicalAnd();
      expr = new LogicalExpr(expr, operator, right);
    }
    return expr;
  }

  private logicalAnd(): Expr {
    let expr = this.equality();
    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new LogicalExpr(expr, operator, right);
    }
    return expr;
  }

  private equality(): Expr {
    let expr = this.comparison();
    while (this.match(TokenType.EQUAL_EQUAL, TokenType.BANG_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new BinaryExpr(expr, operator, right);
    }
    return expr;
  }

  private comparison(): Expr {
    let expr = this.term();
    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
      const operator = this.previous();
      const right = this.term();
      expr = new BinaryExpr(expr, operator, right);
    }
    return expr;
  }

  private term(): Expr {
    let expr = this.factor();
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = new BinaryExpr(expr, operator, right);
    }
    return expr;
  }

  private factor(): Expr {
    let expr = this.unary();
    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.DIV, TokenType.MOD)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new BinaryExpr(expr, operator, right);
    }
    return expr;
  }

  private unary(): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new UnaryExpr(operator, right);
    }
    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        // Panggilan fungsi, cth: length(nama)
        const args = this.functionArguments();
        expr = new CallExpr(expr, args);
      } else if (this.match(TokenType.LEFT_BRACKET)) {
        // Akses array, cth: list[0]
        if (!(expr instanceof VariableExpr)) {
            throw this.error(this.previous(), "Hanya variabel yang bisa di-indeks.");
        }
        const indices: Expr[] = [];
        do {
            indices.push(this.expression());
            this.consume(TokenType.RIGHT_BRACKET, "Diharapkan ']' setelah dimensi array.");
        } while (this.match(TokenType.LEFT_BRACKET));
        
        expr = new ArrayAccessExpr(expr.name, indices);
      } else {
        break;
      }
    }
    return expr;
  }

  private primary(): Expr {
    if (this.match(TokenType.BENAR)) return new LiteralExpr(true);
    if (this.match(TokenType.SALAH)) return new LiteralExpr(false);

    if (this.match(TokenType.NUMBER_LITERAL, TokenType.STRING_LITERAL, TokenType.CHAR_LITERAL)) {
      return new LiteralExpr(this.previous().literal);
    }

    // Perbaikan typo 'this_match' -> 'this.match' ada di sini
    if (this.match(TokenType.IDENTIFIER)) {
      return new VariableExpr(this.previous());
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Diharapkan ')' setelah ekspresi.");
      return new GroupingExpr(expr);
    }

    throw this.error(this.peek(), "Ekspresi tidak valid.");
  }


  // ==================================================================
  // HELPER DAN ERROR HANDLING
  // ==================================================================

  // Cek apakah token saat ini cocok dengan salah satu tipe
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  // Memaksa token saat ini harus tipe tertentu, lalu maju
  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  // Cek token saat ini tanpa memajukan
  private check(type: TokenType): boolean {
    // Perbaikan bug sebelumnya (memeriksa EOF) sudah ada di sini
    return this.peek().type === type;
  }

  // Maju ke token berikutnya
  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  // Cek apakah sudah di akhir
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  // Mengintip token saat ini
  private peek(): Token {
    return this.tokens[this.current];
  }

  // Mendapatkan token sebelumnya
  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  // Melaporkan dan melempar error
  private error(token: Token, message: string): ParseError {
    ErrorHandler.error(token, message); // Panggil ErrorHandler terpusat
    return new ParseError(message);
  }

  /**
   * Mode panik: Sinkronisasi setelah error.
   * Terus maju sampai menemukan "batas" statement berikutnya.
   */
  private synchronize(): void {
    this.advance();
    while (!this.isAtEnd()) {
      switch (this.peek().type) {
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.FOR:
        case TokenType.REPEAT:
        case TokenType.OUTPUT:
        case TokenType.OUTPUTF:
        // --- PERBAIKAN ADA DI SINI ---
        // 'Monitor' yang nyasar sudah dihapus dari daftar ini
        case TokenType.INPUT:
        case TokenType.INPUTF:
        case TokenType.ALGORITMA:
        case TokenType.ENDPROGRAM:
          return;
      }
      this.advance();
    }
  }
}