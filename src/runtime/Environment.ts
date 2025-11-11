/**
 * src/runtime/Environment.ts
 * * Mengelola memori, scope, dan state dari program "psd" saat berjalan.
 * Ini adalah tempat di mana variabel "hidup".
 */

import { Token } from '../core/TokenType';

// ==================================================================
// 1. RUNTIME ERROR
// ==================================================================
/**
 * Error kustom yang dilempar saat terjadi kesalahan
 * *saat program berjalan* (berbeda dari ParseError).
 */
export class RuntimeError extends Error {
  constructor(public readonly token: Token, message: string) {
    super(message);
    this.name = 'RuntimeError';
  }
}

// ==================================================================
// 2. TIPE DATA RUNTIME
// ==================================================================

// Mendefinisikan tipe data dasar yang didukung "psd"
export type PsdBasicType = 'integer' | 'real' | 'string' | 'character' | 'boolean';

// Mendefinisikan semua kemungkinan tipe
export type PsdType = PsdBasicType | 'array';

// Informasi tambahan jika tipenya adalah 'array'
export interface ArrayInfo {
  baseType: PsdBasicType;
  dimensions: number[]; // Cth: [5] untuk list[5], [10, 3] untuk matrix[10][3]
}

/**
 * "Bungkus" untuk setiap variabel yang disimpan di memori.
 * Ini menyimpan nilai, tipe, dan status konstanta.
 */
export interface VariableDescriptor {
  value: any;
  isConstant: boolean;
  type: PsdType;
  arrayInfo?: ArrayInfo;
}


// ==================================================================
// 3. KELAS ENVIRONMENT
// ==================================================================

export class Environment {
  // Menggunakan Map untuk menyimpan pasangan [nama_variabel, descriptor]
  private readonly values: Map<string, VariableDescriptor> = new Map();

  /**
   * @param enclosing Scope induk. null jika ini adalah scope global.
   */
  constructor(private readonly enclosing: Environment | null = null) {}

  /**
   * Mendaftarkan variabel baru ke dalam scope *saat ini*.
   * Dipanggil oleh Interpreter saat mem-visit node Decl di 'kamus'.
   */
  define(
    name: string,
    type: PsdType,
    isConstant: boolean,
    arrayInfo?: ArrayInfo,
    initialValue: any = null
  ): void {
    if (this.values.has(name)) {
      // Ini seharusnya ditangkap oleh static analyzer, tapi sebagai penjaga
      throw new Error(`Variabel '${name}' sudah didefinisikan di scope ini.`);
    }

    let valueToStore = initialValue;
    
    // Jika ini adalah array, kita harus menginisialisasi
    // array bersarang (nested array) dengan nilai null.
    if (type === 'array' && arrayInfo) {
      valueToStore = this.createNestedArray(arrayInfo.dimensions);
    }

    this.values.set(name, {
      value: valueToStore,
      isConstant: isConstant,
      type: type,
      arrayInfo: arrayInfo,
    });
  }

  /**
   * Helper rekursif untuk membuat array n-dimensi.
   * Cth: [2, 3] -> [[null, null, null], [null, null, null]]
   */
  private createNestedArray(dimensions: number[]): any {
    if (dimensions.length === 0) return null; // Basis rekursi

    const size = dimensions[0];
    const remainingDims = dimensions.slice(1);
    
    // Pastikan size adalah integer
    if (!Number.isInteger(size) || size <= 0) {
        throw new Error(`Dimensi array harus integer positif.`);
    }
    
    const arr = new Array(size);
    for (let i = 0; i < size; i++) {
      arr[i] = this.createNestedArray(remainingDims);
    }
    return arr;
  }

  /**
   * Mencari Environment di mana sebuah variabel didefinisikan.
   * Mulai dari scope saat ini, lalu ke induk, dst.
   */
  private findEnvironment(name: string): Environment | undefined {
    if (this.values.has(name)) {
      return this;
    }
    if (this.enclosing !== null) {
      return this.enclosing.findEnvironment(name);
    }
    return undefined;
  }
  
  /**
   * Mendapatkan *descriptor* variabel (info lengkap).
   */
  getDescriptor(nameToken: Token): VariableDescriptor {
     const name = nameToken.lexeme;
     const env = this.findEnvironment(name);
     if (env && env.values.has(name)) {
         return env.values.get(name)!;
     }
     throw new RuntimeError(nameToken, `Variabel '${name}' belum didefinisikan.`);
  }

  /**
   * Mengambil nilai variabel (untuk dibaca).
   * Cth: output(var1)
   */
  get(nameToken: Token): any {
    return this.getDescriptor(nameToken).value;
  }

  /**
   * Mengubah nilai variabel (untuk ditulis).
   * Cth: var1 = 10
   */
  assign(nameToken: Token, value: any): void {
    const name = nameToken.lexeme;
    const env = this.findEnvironment(name);

    if (!env) {
      throw new RuntimeError(nameToken, `Variabel '${name}' belum didefinisikan.`);
    }

    const desc = env.values.get(name)!;

    if (desc.isConstant) {
      throw new RuntimeError(nameToken, `Tidak dapat mengubah nilai konstanta '${name}'.`);
    }
    
    if (desc.type === 'array') {
        throw new RuntimeError(nameToken, `Tidak dapat meng-assign nilai ke seluruh array '${name}'. Gunakan indeks.`);
    }

    // Lakukan Type Checking
    if (!this.isValidType(desc.type, value)) {
      const jsType = typeof value;
      throw new RuntimeError(
        nameToken,
        `Tipe data tidak cocok. Variabel '${name}' adalah '${desc.type}' tapi diberi nilai tipe '${jsType}'.`
      );
    }

    // Update nilai di environment yang benar
    desc.value = value;
    env.values.set(name, desc);
  }

  /**
   * Mengambil nilai dari *elemen* array.
   * Cth: output(list[i])
   */
  getArrayElement(nameToken: Token, indices: number[]): any {
    const name = nameToken.lexeme;
    const desc = this.getDescriptor(nameToken);

    if (desc.type !== 'array' || !desc.arrayInfo) {
      throw new RuntimeError(nameToken, `'${name}' bukan array.`);
    }
    
    if (indices.length !== desc.arrayInfo.dimensions.length) {
        throw new RuntimeError(nameToken, `Jumlah indeks (${indices.length}) tidak cocok dengan dimensi array (${desc.arrayInfo.dimensions.length}).`);
    }

    let currentLevel: any = desc.value;
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      if (!currentLevel || index < 0 || index >= currentLevel.length) {
        throw new RuntimeError(nameToken, `Indeks array [${index}] di luar batas untuk '${name}'.`);
      }
      currentLevel = currentLevel[index];
    }
    
    return currentLevel;
  }
  
  /**
   * Mengubah nilai *elemen* array.
   * Cth: list[i] = 10
   */
  assignArrayElement(nameToken: Token, indices: number[], value: any): void {
    const name = nameToken.lexeme;
    const env = this.findEnvironment(name); // Cek env dulu untuk assignment

    if (!env) {
      throw new RuntimeError(nameToken, `Variabel array '${name}' belum didefinisikan.`);
    }
    
    const desc = env.values.get(name)!;

    if (desc.type !== 'array' || !desc.arrayInfo) {
      throw new RuntimeError(nameToken, `'${name}' bukan array.`);
    }
    
    if (desc.isConstant) {
        throw new RuntimeError(nameToken, `Tidak dapat mengubah nilai konstanta array '${name}'.`);
    }

    if (indices.length !== desc.arrayInfo.dimensions.length) {
        throw new RuntimeError(nameToken, `Jumlah indeks (${indices.length}) tidak cocok dengan dimensi array (${desc.arrayInfo.dimensions.length}).`);
    }
    
    // Type check untuk nilai yang di-assign
    if (!this.isValidType(desc.arrayInfo.baseType, value)) {
      const jsType = typeof value;
      throw new RuntimeError(nameToken, `Tipe data tidak cocok. Array '${name}' adalah '${desc.arrayInfo.baseType}' tapi diberi nilai '${jsType}'.`);
    }

    // Navigasi ke elemen dan set nilainya
    let currentLevel: any = desc.value;
    for (let i = 0; i < indices.length - 1; i++) {
      const index = indices[i];
      if (index < 0 || index >= currentLevel.length) {
        throw new RuntimeError(nameToken, `Indeks array [${index}] di luar batas untuk '${name}'.`);
      }
      currentLevel = currentLevel[index];
    }
    
    const finalIndex = indices[indices.length - 1];
    if (finalIndex < 0 || finalIndex >= currentLevel.length) {
         throw new RuntimeError(nameToken, `Indeks array [${finalIndex}] di luar batas untuk '${name}'.`);
    }
    
    currentLevel[finalIndex] = value;
  }
  
  /**
   * Helper untuk type-checking saat runtime.
   */
  private isValidType(expectedType: PsdBasicType, value: any): boolean {
    const jsType = typeof value;
    switch (expectedType) {
      case 'integer':
        return jsType === 'number' && Number.isInteger(value);
      case 'real':
        return jsType === 'number';
      case 'string':
        return jsType === 'string';
      case 'character':
        return jsType === 'string' && value.length === 1;
      case 'boolean':
        return jsType === 'boolean';
      default:
        return false;
    }
  }
}