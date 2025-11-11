/**
 * src/ast/nodes.ts
 * * Mendefinisikan semua "blueprint" untuk Abstract Syntax Tree (AST).
 * Setiap kelas di sini merepresentasikan sebuah konstruksi tata bahasa
 * (grammar construct) dalam bahasa "psd".
 */

import { Token, TokenType } from '../core/TokenType';

// ==================================================================
// 1. VISITOR INTERFACES
// Ini adalah definisi dari "Visitor Pattern". 
// Setiap node (Expr, Stmt, Decl) harus bisa "menerima" (accept) visitor.
// Visitor adalah objek eksternal (seperti Interpreter) yang ingin 
// melakukan sesuatu dengan node tersebut.
// ==================================================================

// Visitor untuk Expressions (menghasilkan nilai)
export interface ExprVisitor<R> {
  visitBinaryExpr(expr: BinaryExpr): R;
  visitUnaryExpr(expr: UnaryExpr): R;
  visitLiteralExpr(expr: LiteralExpr): R;
  visitGroupingExpr(expr: GroupingExpr): R;
  visitVariableExpr(expr: VariableExpr): R;
  visitAssignExpr(expr: AssignExpr): R;
  visitCompoundAssignExpr(expr: CompoundAssignExpr): R;
  visitLogicalExpr(expr: LogicalExpr): R;
  visitCallExpr(expr: CallExpr): R;
  visitArrayAccessExpr(expr: ArrayAccessExpr): R;
  visitArraySetExpr(expr: ArraySetExpr): R;
}

// Visitor untuk Statements (melakukan aksi)
export interface StmtVisitor<R> {
  visitBlockStmt(stmt: BlockStmt): R;
  visitExprStmt(stmt: ExprStmt): R;
  visitIfStmt(stmt: IfStmt): R;
  visitWhileStmt(stmt: WhileStmt): R;
  visitForStmt(stmt: ForStmt): R;
  visitRepeatStmt(stmt: RepeatStmt): R;
  visitOutputStmt(stmt: OutputStmt): R;
  visitOutputfStmt(stmt: OutputfStmt): R;
  visitInputStmt(stmt: InputStmt): R;
  visitInputfStmt(stmt: InputfStmt): R;
}

// Visitor untuk Declarations (mendefinisikan di kamus)
export interface DeclVisitor<R> {
  visitVarDecl(decl: VarDecl): R;
  visitConstDecl(decl: ConstDecl): R;
}

// Visitor untuk Tipe Data (bagian dari deklarasi)
export interface TypeVisitor<R> {
  visitBasicType(type: BasicType): R;
  visitArrayType(type: ArrayType): R;
}

// ==================================================================
// 2. ABSTRACT BASE CLASSES (Kontrak)
// Setiap node HARUS mengimplementasikan kelas abstrak ini.
// ==================================================================

export abstract class Expr {
  abstract accept<R>(visitor: ExprVisitor<R>): R;
}

export abstract class Stmt {
  abstract accept<R>(visitor: StmtVisitor<R>): R;
}

export abstract class Decl {
  abstract accept<R>(visitor: DeclVisitor<R>): R;
}

export abstract class TypeNode {
  abstract accept<R>(visitor: TypeVisitor<R>): R;
}

// ==================================================================
// 3. PROGRAM NODE (Root)
// Node paling atas dari seluruh AST
// ==================================================================

export class ProgramNode {
  constructor(
    public readonly name: Token,
    public readonly declarations: Decl[],
    public readonly statements: Stmt[]
  ) {}
  // ProgramNode bukan Stmt atau Expr, jadi tidak perlu Visitor
}

// ==================================================================
// 4. TYPE NODES (Bagian dari Deklarasi)
// ==================================================================

export class BasicType extends TypeNode {
  constructor(public readonly typeToken: Token) {
    super();
  }
  accept<R>(visitor: TypeVisitor<R>): R {
    return visitor.visitBasicType(this);
  }
}

export class ArrayType extends TypeNode {
  constructor(
    public readonly baseType: BasicType,
    // [n] -> [Expr], [row][col] -> [Expr, Expr]
    public readonly dimensions: Expr[] 
  ) {
    super();
  }
  accept<R>(visitor: TypeVisitor<R>): R {
    return visitor.visitArrayType(this);
  }
}


// ==================================================================
// 5. DECLARATION NODES (Untuk di 'kamus')
// ==================================================================

export class VarDecl extends Decl {
  constructor(
    public readonly names: Token[], // var1, var2, var3
    public readonly type: TypeNode  // : integer
  ) {
    super();
  }
  accept<R>(visitor: DeclVisitor<R>): R {
    return visitor.visitVarDecl(this);
  }
}

export class ConstDecl extends Decl {
  constructor(
    public readonly name: Token,     // const PI
    public readonly type: TypeNode,  // : real
    public readonly initializer: Expr // = 3.14
  ) {
    super();
  }
  accept<R>(visitor: DeclVisitor<R>): R {
    return visitor.visitConstDecl(this);
  }
}


// ==================================================================
// 6. STATEMENT NODES (Untuk di 'algoritma')
// ==================================================================

// Blok kode, cth: isi dari 'then', 'while', 'for'
export class BlockStmt extends Stmt {
  constructor(public readonly statements: Stmt[]) {
    super();
  }
  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitBlockStmt(this);
  }
}

// Statement yang hanya berisi satu ekspresi
// Kita akan gunakan ini untuk membungkus 'AssignExpr'
export class ExprStmt extends Stmt {
  constructor(public readonly expression: Expr) {
    super();
  }
  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitExprStmt(this);
  }
}

// if <cond> then <thenBranch> else if ... else ... endif
export class IfStmt extends Stmt {
  constructor(
    public readonly condition: Expr,
    public readonly thenBranch: BlockStmt,
    // 'else if' adalah 'IfStmt' lain yang disarangkan di 'elseBranch'
    public readonly elseBranch: Stmt | null // Bisa BlockStmt atau IfStmt lain
  ) {
    super();
  }
  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitIfStmt(this);
  }
}

// while <cond> then <body> endwhile
export class WhileStmt extends Stmt {
  constructor(
    public readonly condition: Expr,
    public readonly body: BlockStmt
  ) {
    super();
  }
  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitWhileStmt(this);
  }
}

// for i = <start> to <end> then <body> endfor
export class ForStmt extends Stmt {
  constructor(
    public readonly loopVariable: Token, // 'i'
    public readonly start: Expr,       // 'x'
    public readonly end: Expr,         // 'y'
    public readonly body: BlockStmt
  ) {
    super();
  }
  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitForStmt(this);
  }
}

// repeat <body> untuk <cond>
export class RepeatStmt extends Stmt {
  constructor(
    public readonly body: BlockStmt,
    public readonly condition: Expr // 'until' condition
  ) {
    super();
  }
  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitRepeatStmt(this);
  }
}

// output(arg1, arg2, ...)
export class OutputStmt extends Stmt {
  constructor(public readonly args: Expr[]) {
    super();
  }
  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitOutputStmt(this);
  }
}

// outputf(format, arg1, ...)
export class OutputfStmt extends Stmt {
  constructor(
    public readonly format: Expr,
    public readonly args: Expr[]
  ) {
    super();
  }
  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitOutputfStmt(this);
  }
}

// input(var1, var2, ...)
export class InputStmt extends Stmt {
  // Target harus berupa L-Value (sesuatu yg bisa di-assign)
  // cth: VariableExpr atau ArrayAccessExpr
  constructor(public readonly targets: Expr[]) {
    super();
  }
  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitInputStmt(this);
  }
}

// inputf(format, var1, ...)
export class InputfStmt extends Stmt {
  constructor(
    public readonly format: Expr,
    public readonly targets: Expr[]
  ) {
    super();
  }
  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitInputfStmt(this);
  }
}


// ==================================================================
// 7. EXPRESSION NODES (Bagian dari Statement)
// ==================================================================

// Ekspresi biner: left <operator> right
// Cth: 1 + 2, a > b, c == "hai"
export class BinaryExpr extends Expr {
  constructor(
    public readonly left: Expr,
    public readonly operator: Token,
    public readonly right: Expr
  ) {
    super();
  }
  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitBinaryExpr(this);
  }
}

// Ekspresi logika: left <and|or> right
// Dipisah dari BinaryExpr untuk short-circuiting
export class LogicalExpr extends Expr {
  constructor(
    public readonly left: Expr,
    public readonly operator: Token, // Hanya AND atau OR
    public readonly right: Expr
  ) {
    super();
  }
  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitLogicalExpr(this);
  }
}

// Ekspresi Unary: <operator> right
// Cth: !isValid, -10
export class UnaryExpr extends Expr {
  constructor(
    public readonly operator: Token, // BANG (!)
    public readonly right: Expr
  ) {
    super();
  }
  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitUnaryExpr(this);
  }
}

// Ekspresi literal
// Cth: 123, 3.14, "Hello", 'A', benar, salah
export class LiteralExpr extends Expr {
  constructor(public readonly value: any) {
    super();
  }
  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitLiteralExpr(this);
  }
}

// Ekspresi grouping: ( ... )
// Cth: (1 + 2) * 3
export class GroupingExpr extends Expr {
  constructor(public readonly expression: Expr) {
    super();
  }
  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitGroupingExpr(this);
  }
}

// Ekspresi variabel (membaca nilai)
// Cth: var1
export class VariableExpr extends Expr {
  constructor(public readonly name: Token) {
    super();
  }
  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitVariableExpr(this);
  }
}

// Ekspresi assignment (menulis nilai)
// Cth: var1 = 10
// Ini adalah Ekspresi, bukan Stmt, agar kita bisa
// melakukan `a = b = 10` (meski psd mungkin tidak)
export class AssignExpr extends Expr {
  constructor(
    public readonly target: Expr, // Bisa VariableExpr atau ArrayAccessExpr
    public readonly value: Expr
  ) {
    super();
  }
  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitAssignExpr(this);
  }
}

// Cth: var1 += 10
export class CompoundAssignExpr extends Expr {
    constructor(
        public readonly target: Expr,
        public readonly operator: Token, // PLUS_EQUAL, MINUS_EQUAL, dll.
        public readonly value: Expr
    ) {
        super();
    }
    accept<R>(visitor: ExprVisitor<R>): R {
        return visitor.visitCompoundAssignExpr(this);
    }
}

// Ekspresi pemanggilan fungsi
// Cth: length(nama)
export class CallExpr extends Expr {
  constructor(
    public readonly callee: Expr, // Seharusnya VariableExpr ('length')
    public readonly args: Expr[]
  ) {
    super();
  }
  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitCallExpr(this);
  }
}

// Ekspresi mengakses array
// Cth: list[0], matrix[i][j]
export class ArrayAccessExpr extends Expr {
  constructor(
    public readonly name: Token,
    public readonly indices: Expr[]
  ) {
    super();
  }
  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitArrayAccessExpr(this);
  }
}

// Ekspresi *menulis* ke array (dipisah dari AssignExpr agar lebih jelas)
// Cth: list[0] = 10
export class ArraySetExpr extends Expr {
  constructor(
    public readonly target: ArrayAccessExpr,
    public readonly value: Expr
  ) {
    super();
  }
  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitArraySetExpr(this);
  }
}