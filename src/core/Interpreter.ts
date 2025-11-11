/**
 * src/core/Interpreter.ts
 * * Mengeksekusi AST (Abstract Syntax Tree) yang diberikan oleh Parser.
 */

import {
  ProgramNode, Decl, Stmt, Expr, TypeNode,
  VarDecl, ConstDecl, BasicType, ArrayType,
  IfStmt, WhileStmt, ForStmt, RepeatStmt, BlockStmt,
  OutputStmt, OutputfStmt, InputStmt, InputfStmt, ExprStmt,
  BinaryExpr, LogicalExpr, UnaryExpr, LiteralExpr, GroupingExpr,
  VariableExpr, AssignExpr, CompoundAssignExpr, CallExpr,
  ArrayAccessExpr, ArraySetExpr,
  DeclVisitor, StmtVisitor, ExprVisitor, TypeVisitor
} from '../ast/nodes';
import { Token, TokenType } from './TokenType';
import { Environment, PsdBasicType, PsdType, RuntimeError } from '../runtime/Environment';
import { format } from 'util';
import { ErrorHandler } from '../utils/ErrorHandler';

// Mendefinisikan Tipe Kembalian Visitor secara terpusat
type TypeVisitReturn = {
  type: PsdType;
  baseType?: PsdBasicType;
  dimensions?: number[];
};

export class Interpreter implements DeclVisitor<void>, StmtVisitor<void>, ExprVisitor<any>, TypeVisitor<TypeVisitReturn> {
  // ... (properti global, current, printHandler, inputHandler, constructor) ...
  public global: Environment = new Environment();
  private current: Environment;
  private readonly printHandler: (message: string) => void;
  private readonly inputHandler: () => string;

  constructor(
    printHandler: (message: string) => void,
    inputHandler: () => string
  ) {
    this.current = this.global;
    this.printHandler = printHandler;
    this.inputHandler = inputHandler;
  }
  
  // ... (interpret(), execute(), evaluate(), executeBlock() tidak berubah) ...
  public interpret(program: ProgramNode): void {
    try {
      for (const declaration of program.declarations) {
        this.execute(declaration);
      }
      for (const statement of program.statements) {
        this.execute(statement);
      }
    } catch (error) {
      if (error instanceof RuntimeError) {
        ErrorHandler.runtimeError(error);
      } else {
        console.error("Internal Interpreter Error:", error);
      }
    }
  }

  private execute(node: Decl | Stmt): void {
    node.accept(this);
  }

  private evaluate(node: Expr): any {
    return node.accept(this);
  }

  public executeBlock(statements: Stmt[], environment: Environment): void {
    const previousEnv = this.current;
    try {
      this.current = environment;
      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.current = previousEnv;
    }
  }

  // ==================================================================
  // VISITOR: DEKLARASI (KAMUS)
  // ==================================================================

  visitVarDecl(decl: VarDecl): void {
    const typeInfo = decl.type.accept(this);
    
    for (const nameToken of decl.names) {
      if (typeInfo.type === 'array') {
        this.current.define(nameToken.lexeme, 'array', false, {
          baseType: typeInfo.baseType!,
          dimensions: typeInfo.dimensions!
        });
      } else {
        // 'typeInfo.type' di sini adalah PsdBasicType
        this.current.define(nameToken.lexeme, typeInfo.type as PsdBasicType, false);
      }
    }
  }

  visitConstDecl(decl: ConstDecl): void {
    const typeInfo = decl.type.accept(this);
    const value = this.evaluate(decl.initializer);
    
    // TODO: Type checking
    
    if (typeInfo.type === 'array') {
      throw new Error("Deklarasi const array tidak didukung saat ini.");
    } else {
      this.current.define(decl.name.lexeme, typeInfo.type as PsdBasicType, true, undefined, value);
    }
  }

  // ==================================================================
  // VISITOR: TIPE DATA (Bagian dari Deklarasi)
  // ==================================================================

  // --- FIX [1] ---
  // Mengubah return type di sini agar konsisten dengan `visitArrayType`
  // Keduanya harus mengembalikan tipe `TypeVisitReturn` yang kita definisikan di atas.
  visitBasicType(type: BasicType): TypeVisitReturn {
    return {
      type: type.typeToken.lexeme as PsdBasicType,
      // baseType dan dimensions opsional (undefined)
    };
  }

  // --- FIX [1] ---
  // Mengubah return type di sini agar konsisten dengan `visitBasicType`
  visitArrayType(type: ArrayType): TypeVisitReturn {
    const baseType = type.baseType.typeToken.lexeme as PsdBasicType;
    
    const dimensions: number[] = [];
    for (const dimExpr of type.dimensions) {
      const dim = this.evaluate(dimExpr);
      if (typeof dim !== 'number' || !Number.isInteger(dim) || dim <= 0) {
        throw new RuntimeError(type.baseType.typeToken, "Dimensi array harus berupa integer positif.");
      }
      dimensions.push(dim);
    }
    
    return { type: 'array', baseType, dimensions };
  }

  // ==================================================================
  // VISITOR: STATEMENT (ALGORITMA)
  // ==================================================================

  // ... (visitBlockStmt, visitExprStmt, visitIfStmt, visitWhileStmt, 
  //      visitForStmt, visitRepeatStmt, visitOutputStmt ... tidak berubah)
  visitBlockStmt(stmt: BlockStmt): void {
    this.executeBlock(stmt.statements, new Environment(this.current));
  }
  
  visitExprStmt(stmt: ExprStmt): void {
    this.evaluate(stmt.expression);
  }

  visitIfStmt(stmt: IfStmt): void {
    const condition = this.evaluate(stmt.condition);
    if (this.isTruthy(condition)) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch);
    }
  }

  visitWhileStmt(stmt: WhileStmt): void {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
  }

  visitForStmt(stmt: ForStmt): void {
    const startVal = this.evaluate(stmt.start);
    const endVal = this.evaluate(stmt.end);

    if (typeof startVal !== 'number' || typeof endVal !== 'number') {
      throw new RuntimeError(stmt.loopVariable, "Batas loop FOR harus berupa angka.");
    }
    
    const loopEnv = new Environment(this.current);
    loopEnv.define(stmt.loopVariable.lexeme, 'integer', false, undefined, startVal);
    
    const previousEnv = this.current;
    this.current = loopEnv;
    
    try {
      for (let i = startVal; i <= endVal; i++) {
        this.current.assign(stmt.loopVariable, i);
        this.execute(stmt.body);
      }
    } finally {
      this.current = previousEnv;
    }
  }

  visitRepeatStmt(stmt: RepeatStmt): void {
    do {
      this.execute(stmt.body);
    } while (!this.isTruthy(this.evaluate(stmt.condition)));
  }

  visitOutputStmt(stmt: OutputStmt): void {
    const values = stmt.args.map(arg => this.evaluate(arg));
    const message = values.map(v => this.stringify(v)).join(' ');
    this.printHandler(message + '\n');
  }

  visitOutputfStmt(stmt: OutputfStmt): void {
    const formatStr = this.evaluate(stmt.format);
    if (typeof formatStr !== 'string') {
      // --- FIX [2] ---
      // Mengganti `new Token(...)` dengan object literal
      const dummyToken: Token = { type: TokenType.OUTPUTF, lexeme: 'outputf', literal: null, line: 0, column: 0 };
      throw new RuntimeError(dummyToken, "Argumen pertama outputf harus string format.");
    }
    const values = stmt.args.map(arg => this.evaluate(arg));
    
    const message = format(formatStr, ...values);
    this.printHandler(message);
  }
  
  visitInputStmt(stmt: InputStmt): void {
    const input = this.inputHandler();
    const inputs = input.split(/\s+/).filter(s => s.length > 0);

    for (const target of stmt.targets) {
      const valStr = inputs.shift();
      if (valStr === undefined) {
          // --- FIX [2] ---
          const dummyToken: Token = { type: TokenType.INPUT, lexeme: 'input', literal: null, line: 0, column: 0 };
          throw new RuntimeError(dummyToken, "Input tidak cukup untuk semua variabel.");
      }
      
      this.assignInputValue(target, valStr);
    }
  }
  
  visitInputfStmt(stmt: InputfStmt): void {
    this.printHandler(`[Interpreter Warn: inputf() format string diabaikan]\n`);
    const input = this.inputHandler();
    const inputs = input.split(/\s+/).filter(s => s.length > 0);

    for (const target of stmt.targets) {
      const valStr = inputs.shift();
      if (valStr === undefined) {
          // --- FIX [2] ---
          const dummyToken: Token = { type: TokenType.INPUTF, lexeme: 'inputf', literal: null, line: 0, column: 0 };
          throw new RuntimeError(dummyToken, "Input tidak cukup untuk semua variabel.");
      }
      this.assignInputValue(target, valStr);
    }
  }
  
  private assignInputValue(target: Expr, valStr: string): void {
    let expectedType: PsdBasicType;
    
    if (target instanceof VariableExpr) {
        expectedType = this.current.getDescriptor(target.name).type as PsdBasicType;
    } else if (target instanceof ArrayAccessExpr) {
        expectedType = this.current.getDescriptor(target.name).arrayInfo!.baseType;
    } else {
        // --- FIX [2] ---
        const dummyToken: Token = { type: TokenType.INPUT, lexeme: 'input', literal: null, line: 0, column: 0 };
        throw new RuntimeError(dummyToken, "Target input() harus berupa variabel atau elemen array.");
    }

    let value: any;
    // --- FIX [2] --- (Membuat satu dummy token untuk semua error di bawah)
    const dummyInputToken: Token = { type: TokenType.INPUT, lexeme: 'input', literal: null, line: 0, column: 0 };
    switch (expectedType) {
      case 'integer':
        value = parseInt(valStr, 10);
        if (isNaN(value)) throw new RuntimeError(dummyInputToken, `Input '${valStr}' bukan integer.`);
        break;
      case 'real':
        value = parseFloat(valStr);
        if (isNaN(value)) throw new RuntimeError(dummyInputToken, `Input '${valStr}' bukan real.`);
        break;
      case 'string':
        value = valStr;
        break;
      case 'character':
        value = valStr.charAt(0);
        break;
      case 'boolean':
        value = valStr.toLowerCase() === 'benar' || valStr === 'true';
        break;
      default:
        throw new RuntimeError(dummyInputToken, "Tipe target input tidak diketahui.");
    }

    if (target instanceof VariableExpr) {
        this.current.assign(target.name, value);
    } else if (target instanceof ArrayAccessExpr) {
        const indices = this.evaluateIndices(target);
        this.current.assignArrayElement(target.name, indices, value);
    }
  }

  // ==================================================================
  // VISITOR: EKSPRESI (ALGORITMA)
  // ==================================================================

  // ... (visitLiteralExpr, visitGroupingExpr, visitVariableExpr, 
  //      visitArrayAccessExpr, evaluateIndices ... tidak berubah)
  visitLiteralExpr(expr: LiteralExpr): any {
    return expr.value;
  }
  
  visitGroupingExpr(expr: GroupingExpr): any {
    return this.evaluate(expr.expression);
  }

  visitVariableExpr(expr: VariableExpr): any {
    return this.current.get(expr.name);
  }
  
  visitArrayAccessExpr(expr: ArrayAccessExpr): any {
    const indices = this.evaluateIndices(expr);
    return this.current.getArrayElement(expr.name, indices);
  }
  
  private evaluateIndices(expr: ArrayAccessExpr): number[] {
    const indices: number[] = [];
    for (const idxExpr of expr.indices) {
        const index = this.evaluate(idxExpr);
        if (typeof index !== 'number' || !Number.isInteger(index)) {
            throw new RuntimeError(expr.name, "Indeks array harus integer.");
        }
        indices.push(index);
    }
    return indices;
  }

  visitAssignExpr(expr: AssignExpr): any {
    const value = this.evaluate(expr.value);
    
    if (expr.target instanceof VariableExpr) {
      this.current.assign(expr.target.name, value);
    } else {
      // --- FIX [2] ---
      const dummyToken: Token = { type: TokenType.EQUAL, lexeme: '=', literal: null, line: 0, column: 0 };
      throw new RuntimeError(dummyToken, "Target assignment tidak valid.");
    }
    
    return value;
  }
  
  // ... (visitArraySetExpr, visitCompoundAssignExpr, visitUnaryExpr, 
  //      visitLogicalExpr, visitBinaryExpr ... tidak berubah)
  visitArraySetExpr(expr: ArraySetExpr): any {
    const value = this.evaluate(expr.value);
    const indices = this.evaluateIndices(expr.target);
    this.current.assignArrayElement(expr.target.name, indices, value);
    return value;
  }
  
  visitCompoundAssignExpr(expr: CompoundAssignExpr): any {
    const value = this.evaluate(expr.value);
    
    let currentVal: any;
    if (expr.target instanceof VariableExpr) {
        currentVal = this.current.get(expr.target.name);
    } else if (expr.target instanceof ArrayAccessExpr) {
        const indices = this.evaluateIndices(expr.target);
        currentVal = this.current.getArrayElement(expr.target.name, indices);
    } else {
        throw new RuntimeError(expr.operator, "Target assignment tidak valid.");
    }
    
    this.checkNumberOperands(expr.operator, currentVal, value);

    let newValue: number;
    switch (expr.operator.type) {
        case TokenType.PLUS_EQUAL: newValue = currentVal + value; break;
        case TokenType.MINUS_EQUAL: newValue = currentVal - value; break;
        case TokenType.STAR_EQUAL: newValue = currentVal * value; break;
        case TokenType.SLASH_EQUAL: newValue = currentVal / value; break;
        default: throw new RuntimeError(expr.operator, "Operator compound tidak dikenal.");
    }

    if (expr.target instanceof VariableExpr) {
        this.current.assign(expr.target.name, newValue);
    } else if (expr.target instanceof ArrayAccessExpr) {
        const indices = this.evaluateIndices(expr.target);
        this.current.assignArrayElement(expr.target.name, indices, newValue);
    }
    
    return newValue;
  }
  
  visitUnaryExpr(expr: UnaryExpr): any {
    const right = this.evaluate(expr.right);
    
    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.isTruthy(right);
      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right);
        return -Number(right);
    }
    
    return null;
  }

  visitLogicalExpr(expr: LogicalExpr): any {
    const left = this.evaluate(expr.left);

    if (expr.operator.type === TokenType.OR) {
      if (this.isTruthy(left)) return left;
    } else { // AND
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  visitBinaryExpr(expr: BinaryExpr): any {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);
    
    switch (expr.operator.type) {
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) > Number(right);
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) >= Number(right);
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) < Number(right);
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) <= Number(right);
      
      case TokenType.BANG_EQUAL: return left !== right;
      case TokenType.EQUAL_EQUAL: return left === right;
      
      case TokenType.MINUS:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) - Number(right);
      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) * Number(right);
      case TokenType.SLASH:
        this.checkNumberOperands(expr.operator, left, right);
        if (Number(right) === 0) throw new RuntimeError(expr.operator, "Pembagian dengan nol.");
        return Number(left) / Number(right);
      case TokenType.DIV:
        this.checkNumberOperands(expr.operator, left, right);
        if (Number(right) === 0) throw new RuntimeError(expr.operator, "Pembagian dengan nol.");
        return Math.floor(Number(left) / Number(right));
      case TokenType.MOD:
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) % Number(right);
      
      case TokenType.PLUS:
        if (typeof left === 'number' && typeof right === 'number') {
          return left + right;
        }
        if (typeof left === 'string' || typeof right === 'string') {
          return this.stringify(left) + this.stringify(right);
        }
        throw new RuntimeError(expr.operator, "Operator '+' hanya bisa untuk angka atau string.");
    }
    
    return null;
  }

  visitCallExpr(expr: CallExpr): any {
    if (!(expr.callee instanceof VariableExpr)) {
      // --- FIX [2] ---
      const dummyToken: Token = { type: TokenType.IDENTIFIER, lexeme: 'callee', literal: null, line: 0, column: 0 };
      throw new RuntimeError(dummyToken, "Ekspresi pemanggilan tidak valid.");
    }
    
    const funcName = expr.callee.name.lexeme;
    const args = expr.args.map(arg => this.evaluate(arg));
    
    switch (funcName.toLowerCase()) {
      case 'length':
        if (args.length !== 1) {
          throw new RuntimeError(expr.callee.name, "Fungsi length() mengharapkan 1 argumen.");
        }
        const target = args[0];
        if (typeof target === 'string') {
          return target.length;
        }
        if (Array.isArray(target)) {
          return target.length;
        }
        throw new RuntimeError(expr.callee.name, "Fungsi length() hanya menerima string atau array.");
        
      default:
        throw new RuntimeError(expr.callee.name, `Fungsi '${funcName}' tidak didefinisikan.`);
    }
  }

  // ... (isTruthy, stringify, checkNumberOperand, checkNumberOperands ... tidak berubah)
  private isTruthy(object: any): boolean {
    if (object === null) return false;
    if (object === false) return false;
    return true;
  }
  
  private stringify(object: any): string {
    if (object === null) return "null";
    if (object === true) return "benar";
    if (object === false) return "salah";
    if (Array.isArray(object)) {
      return `[Array(${object.length})]`;
    }
    return String(object);
  }
  
  private checkNumberOperand(operator: Token, operand: any): void {
    if (typeof operand === 'number') return;
    throw new RuntimeError(operator, "Operand harus berupa angka.");
  }

  private checkNumberOperands(operator: Token, left: any, right: any): void {
    if (typeof left === 'number' && typeof right === 'number') return;
    throw new RuntimeError(operator, "Kedua operand harus berupa angka.");
  }
}