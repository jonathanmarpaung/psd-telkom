const fs = require('fs');
const path = require('path');
const readlineSync = require('readline-sync');
const { Parser } = require('expr-eval');

// --- 1. Global State ---

let environment = new Map();
let typeDefinitions = new Map();
let outputBuffer = [];
let inputTokenBuffer = [];
let programName = "Untitled";

const parser = new Parser();

// --- 2. Tipe Data & Helper Inti ---

/**
 * Helper BARU: Membuat string baru dengan karakter yang diubah.
 */
function setStringAtIndex(str, index, char) {
    if (index > str.length - 1 || index < 0) {
        throw new Error(`Indeks string ${index} di luar jangkauan.`);
    }
    const singleChar = (char.length > 0) ? char[0] : '';
    return str.substring(0, index) + singleChar + str.substring(index + 1);
}

function parseType(typeName) {
    const match = typeName.match(/^([\w]+)((?:\[\d+\])*)$/);
    if (!match) {
        return { baseType: typeName, dimensions: [] };
    }
    const baseType = match[1];
    const dimString = match[2];
    const dimRegex = /\[(\d+)\]/g;
    const dimensions = [];
    let dimMatch;
    while ((dimMatch = dimRegex.exec(dimString)) !== null) {
        dimensions.push(parseInt(dimMatch[1], 10));
    }
    return { baseType, dimensions };
}

function initializeTypeSystem() {
    typeDefinitions.clear();
    const primitives = ['integer', 'real', 'character', 'string', 'boolean'];
    primitives.forEach(p => typeDefinitions.set(p, { type: 'primitive' }));
}

function resolveType(typeName) {
    const { baseType, dimensions } = parseType(typeName);
    const seen = new Set();
    let current = baseType;
    while (typeDefinitions.has(current) && typeDefinitions.get(current).type === 'alias') {
        if (seen.has(current)) {
            throw new Error(`Deteksi definisi tipe sirkular: ${current}`);
        }
        seen.add(current);
        current = typeDefinitions.get(current).aliasedTo;
    }
    if (dimensions.length > 0) {
        return `${current}[${dimensions.join('][')}]`;
    }
    return current;
}

function createArrayRecursive(dimensions, baseTypeDefault) {
    const size = dimensions[0];
    const remainingDims = dimensions.slice(1);
    const arr = new Array(size);
    for (let i = 0; i < size; i++) {
        if (remainingDims.length > 0) {
            arr[i] = createArrayRecursive(remainingDims, baseTypeDefault);
        } else {
            arr[i] = baseTypeDefault;
        }
    }
    return arr;
}

function createDefaultValue(typeName) {
    const resolvedFullType = resolveType(typeName);
    const { baseType, dimensions } = parseType(resolvedFullType);
    if (!typeDefinitions.has(baseType)) {
        throw new Error(`Tipe data tidak dikenal: '${baseType}'`);
    }

    const typeDef = typeDefinitions.get(baseType);
    let baseTypeDefault;

    if (typeDef.type === 'primitive') {
        if (baseType === 'integer') baseTypeDefault = 0;
        else if (baseType === 'real') baseTypeDefault = 0.0;
        else if (baseType === 'boolean') baseTypeDefault = false;
        else if (baseType === 'string' || baseType === 'character') baseTypeDefault = '';
        else baseTypeDefault = null;
    } else if (typeDef.type === 'struct') {
        baseTypeDefault = {};
        for (const [fieldName, fieldType] of typeDef.fields.entries()) {
            baseTypeDefault[fieldName] = createDefaultValue(fieldType);
        }
    } else {
        baseTypeDefault = null;
    }
    
    if (dimensions.length > 0) {
        const baseDefaultGenerator = () => createDefaultValue(baseType);
        const size = dimensions[0];
        const remainingDims = dimensions.slice(1);
        const arr = new Array(size);
        for (let i = 0; i < size; i++) {
            if (remainingDims.length > 0) {
                arr[i] = createArrayRecursive(remainingDims, baseDefaultGenerator());
            } else {
                arr[i] = baseDefaultGenerator();
            }
        }
        return arr;
    }
    
    return baseTypeDefault;
}

function castValue(value, targetBaseType) {
    const resolvedType = resolveType(targetBaseType);
    const { baseType } = parseType(resolvedType); 

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value;
    if (Array.isArray(value)) return value;

    const strValue = String(value);

    if (baseType === 'integer') {
        const val = parseInt(strValue, 10);
        if (isNaN(val)) throw new Error(`Input '${strValue}' tidak valid untuk integer.`);
        return val;
    }
    if (baseType === 'real') {
        const val = parseFloat(strValue);
        if (isNaN(val)) throw new Error(`Input '${strValue}' tidak valid untuk real.`);
        return val;
    }
    if (baseType === 'boolean') {
        if (typeof value === 'boolean') return value;
        return strValue.toLowerCase() === 'true';
    }
    if (baseType === 'string') {
        return strValue;
    }
    if (baseType === 'character') {
        if (typeof value === 'string') return value.length > 0 ? value[0] : '';
        return strValue.length > 0 ? strValue[0] : '';
    }
    return value;
}

// --- 3. Parser Fungsi & Ekspresi ---

parser.functions.size = (arg) => {
    if (Array.isArray(arg) || typeof arg === 'string') {
        return arg.length;
    }
    return 0;
};
parser.functions.integer = (arg) => castValue(arg, 'integer');
parser.functions.real = (arg) => castValue(arg, 'real');
parser.functions.string = (arg) => castValue(arg, 'string');
parser.functions.boolean = (arg) => castValue(arg, 'boolean');
parser.functions.character = (arg) => castValue(arg, 'character');
parser.functions.div = (a, b) => {
    if (b === 0) throw new Error("Pembagian dengan nol (div).");
    return Math.floor(a / b);
};
parser.functions.mod = (a, b) => {
    if (b === 0) throw new Error("Modulo dengan nol (mod).");
    return a % b;
};

function evaluateExpression(expr, env) {
    const context = {};
    for (const [key, { value }] of env.entries()) {
        context[key] = value;
    }
    
    let safeExpr = expr
        .replace(/\bdiv\b/g, 'div')
        .replace(/\bmod\b/g, 'mod')
        .replace(/&&/g, 'and')
        .replace(/\|\|/g, 'or')
        .replace(/!(?!=)/g, 'not'); 

    safeExpr = safeExpr.replace(/(\S+)\s+div\s+(\S+)/g, 'div($1, $2)');
    safeExpr = safeExpr.replace(/(\S+)\s+mod\s+(\S+)/g, 'mod($1, $2)');

    try {
        const expression = parser.parse(safeExpr);
        return expression.evaluate(context);
    } catch (e) {
        console.error(`\n[Runtime Error] Gagal mengevaluasi ekspresi: "${expr}"`);
        console.error(e.message);
        process.exit(1); 
    }
}

// ===== FUNGSI ASSIGNVALUE YANG DIPERBARUI =====
function assignValue(leftHandExpr, rightValue, env) {
    const accessorRegex = /(\.[\w]+)|(\[.*?\])/g;
    const baseMatch = leftHandExpr.match(/^([\w]+)(.*)$/);
    if (!baseMatch) throw new Error(`Sintaks assignment tidak valid: ${leftHandExpr}`);
    
    const varName = baseMatch[1];
    const accessorString = baseMatch[2];
    const accessors = [...(accessorString || '').matchAll(accessorRegex)].map(m => m[0]);
    
    const varData = env.get(varName);
    if (!varData) throw new Error(`Variabel '${varName}' belum dideklarasikan.`);
    if (varData.isConst) throw new Error(`Tidak bisa mengubah nilai '${varName}' (konstan).`);

    // --- Kasus 1: Assignment Sederhana (x = 10) ---
    if (accessors.length === 0) {
        varData.value = castValue(rightValue, varData.type);
        return;
    }
    
    // --- Kasus 2: Assignment Kompleks (struct, array, string) ---
    let currentTarget = varData.value;
    let currentType = varData.type;
    let parent = varData;
    let lastKey = 'value';

    for (let i = 0; i < accessors.length; i++) {
        const part = accessors[i];
        const isLastAccessor = (i === accessors.length - 1);
        
        const { baseType: resolvedBaseType, dimensions } = parseType(resolveType(currentType));

        if (part.startsWith('.')) { // --- Struct Member (.nama) ---
            const memberName = part.substring(1);
            const typeDef = typeDefinitions.get(resolvedBaseType);
            if (!typeDef || typeDef.type !== 'struct') {
                throw new Error(`Tipe '${resolvedBaseType}' bukan struct.`);
            }
            if (!typeDef.fields.has(memberName)) {
                throw new Error(`Struct '${resolvedBaseType}' tidak punya member '${memberName}'.`);
            }

            if (isLastAccessor) {
                const finalValue = castValue(rightValue, typeDef.fields.get(memberName));
                currentTarget[memberName] = finalValue;
                return;
            } else {
                parent = currentTarget;
                lastKey = memberName;
                currentTarget = currentTarget[memberName];
                currentType = typeDef.fields.get(memberName);
            }
        } else { // --- Array Index ([0]) atau String Index ([0]) ---
            const indexExpr = part.substring(1, part.length - 1);
            if (!indexExpr) throw new Error("Index array tidak boleh kosong.");
            const index = evaluateExpression(indexExpr, env);

            if (dimensions.length === 0) { // Bukan array
                if (resolvedBaseType === 'string') {
                    // Ini adalah str[i] = 'a'
                    if (isLastAccessor) {
                        const newChar = castValue(rightValue, 'character');
                        const oldString = currentTarget;
                        const newString = setStringAtIndex(oldString, index, newChar);
                        
                        // Set string baru kembali ke parent-nya
                        parent[lastKey] = newString;
                        return;
                    } else {
                        throw new Error("Tidak bisa mengakses member/index dari sebuah karakter string.");
                    }
                }
                throw new Error(`Tidak bisa mengakses index '${part}' pada tipe non-array '${currentType}'.`);
            
            } else { // Ini adalah array[i]
                if (isLastAccessor) {
                    const elementType = (dimensions.length > 1) 
                        ? `${resolvedBaseType}[${dimensions.slice(1).join('][')}]`
                        : resolvedBaseType;
                    const finalValue = castValue(rightValue, elementType);
                    currentTarget[index] = finalValue;
                    return;
                } else {
                    parent = currentTarget;
                    lastKey = index;
                    currentTarget = currentTarget[index];
                    currentType = dimensions.length > 1 
                        ? `${resolvedBaseType}[${dimensions.slice(1).join('][')}]` 
                        : resolvedBaseType;
                }
            }
        }
    }
}
// ===========================================


// --- 4. Parser Kamus ---

function parseKamus(lines) {
    initializeTypeSystem();

    const typeAliasRegex = /^\s*type\s+([\w]+)\s+([\w]+)\s*$/i;
    const typeStructStartRegex = /^\s*type\s+([\w]+)\s*<\s*$/i;
    const constRegex = /^\s*const\s+([\w]+)\s*:\s*(.+?)\s*=\s*(.+)$/i; 
    const varRegex = /^\s*([\w\s,]+)\s*:\s*(.+)\s*$/i;
    const structMemberRegex = /^\s*([\w\s,]+)\s*:\s*(.+)\s*$/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].split('//')[0].trim();
        if (!line) continue;
        let match;
        match = line.match(typeAliasRegex);
        if (match) {
            const [, newName, existingName] = match;
            if (typeDefinitions.has(newName)) {
                console.warn(`[Peringatan] Tipe '${newName}' dideklarasikan ulang.`);
            }
            typeDefinitions.set(newName, { type: 'alias', aliasedTo: existingName });
            continue;
        }
        match = line.match(typeStructStartRegex);
        if (match) {
            const [, structName] = match;
            if (typeDefinitions.has(structName)) {
                console.warn(`[Peringatan] Tipe '${structName}' dideklarasikan ulang.`);
            }
            const fields = new Map();
            let j = i + 1;
            while (j < lines.length) {
                const memberLine = lines[j].split('//')[0].trim();
                if (memberLine === '>') break; 
                if (!memberLine) { j++; continue; } 
                const memberMatch = memberLine.match(structMemberRegex);
                if (memberMatch) {
                    const [, varList, typeName] = memberMatch; 
                    const vars = varList.split(',').map(v => v.trim());
                    vars.forEach(v => fields.set(v, typeName.trim()));
                } else {
                    console.warn(`[Peringatan] Sintaks tidak dikenal di struct ${structName}: "${memberLine}"`);
                }
                j++;
            }
            typeDefinitions.set(structName, { type: 'struct', fields: fields });
            i = j; 
            continue;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].split('//')[0].trim();
        if (!line || line.startsWith('type ')) {
            if (line.includes('<')) {
                while (i < lines.length && !lines[i].includes('>')) i++;
            }
            continue;
        }
        let match;
        match = line.match(constRegex);
        if (match) {
            const [, varName, typeName, valueStrRaw] = match;
            const valueStr = valueStrRaw.trim();
            const resolvedType = resolveType(typeName.trim());
            const { baseType } = parseType(resolvedType);

            // Validasi Kutipan Saat Parsing Const
            if (baseType === 'string' && !valueStr.match(/^".*"$/)) {
                throw new Error(`Nilai konstan string untuk '${varName}' harus menggunakan kutip ganda (").`);
            }
            if (baseType === 'character' && !valueStr.match(/^'.*'$/)) {
                throw new Error(`Nilai konstan character untuk '${varName}' harus menggunakan kutip tunggal (').`);
            }

            const value = castValue(valueStr, resolvedType);
            if (environment.has(varName)) {
                console.warn(`[Peringatan] Variabel '${varName}' dideklarasikan ulang.`);
            }
            environment.set(varName, { value: value, type: resolvedType, isConst: true });
            continue;
        }
        match = line.match(varRegex);
        if (match) {
            const [, varList, typeName] = match;
            const resolvedType = resolveType(typeName.trim());
            const vars = varList.split(',').map(v => v.trim());
            for (const v of vars) {
                if (environment.has(v)) {
                    console.warn(`[Peringatan] Variabel '${v}' dideklarasikan ulang.`);
                }
                const defaultValue = createDefaultValue(resolvedType);
                environment.set(v, { value: defaultValue, type: resolvedType, isConst: false });
            }
            continue;
        }
    }
}


// --- 5. Executor Algoritma ---

function executeAlgoritma(lines) {
    let pc = 0; 
    while (pc < lines.length) {
        const fullLine = lines[pc].split('//')[0].trim();
        if (!fullLine) { pc++; continue; }
        const statements = fullLine.split(';').map(s => s.trim()).filter(s => s);
        let incrementPC = true;
        let didJump = false; 
        for (const line of statements) {
            try {
                if (line.startsWith('output(')) {
                    const content = line.substring(7, line.length - 1);
                    const parts = parseOutputArgs(content);
                    let outputs = [];
                    for (const part of parts) {
                        let value;
                        // Cek literal kutip secara ketat
                        if (part.startsWith('"') && part.endsWith('"')) {
                            value = part.substring(1, part.length - 1); // String
                        } else if (part.startsWith("'") && part.endsWith("'")) {
                            value = part.substring(1, part.length - 1); // Karakter
                        } else {
                            value = evaluateExpression(part, environment);
                        }
                        
                        if (typeof value === 'boolean') outputs.push(value ? 'true' : 'false');
                        else if (typeof value === 'object') outputs.push(JSON.stringify(value));
                        else outputs.push(value);
                    }
                    outputBuffer.push(outputs.join(' '));
                }
                else if (line.startsWith('input(')) {
                    const content = line.substring(6, line.length - 1);
                    const vars = parseOutputArgs(content); 
                    for (const v of vars) { 
                        let token = null;
                        while (token === null) {
                            if (inputTokenBuffer.length > 0) {
                                token = inputTokenBuffer.shift();
                            } else {
                                const lineInput = readlineSync.question();
                                const newTokens = lineInput.trim().split(/\s+/).filter(t => t);
                                if (newTokens.length === 0) continue; 
                                inputTokenBuffer = newTokens;
                                token = inputTokenBuffer.shift();
                            }
                        }
                        assignValue(v, token, environment);
                    }
                }
                // Regex assignment diperketat untuk menangani kutip di index
                else if (line.match(/^\s*([\w\.\[\]'""]+)\s*=\s*(.+)$/)) { 
                    const match = line.match(/^\s*([\w\.\[\]'""]+)\s*=\s*(.+)$/);
                    const [, leftHandExpr, expr] = match;
                    
                    // Evaluasi nilai kanan terlebih dahulu
                    const value = evaluateExpression(expr, environment);

                    // Validasi Tipe Kutipan Saat Assignment str[i] = ...
                    if (leftHandExpr.includes('[')) {
                        const baseVarName = leftHandExpr.split(/[\.\[]/)[0];
                        const baseVar = environment.get(baseVarName);
                        if (baseVar && baseVar.type === 'string' && leftHandExpr !== baseVarName) {
                            // Ini adalah assignment str[i]
                            if (typeof value !== 'string' || value.length > 1) {
                                // Cek jika 'value' BUKAN karakter tunggal
                                // (Kita periksa literal di sisi kanan)
                                if (expr.trim().startsWith('"')) {
                                     throw new Error(`Tidak bisa menugaskan string (kutip ganda) ke karakter (str[i]). Gunakan kutip tunggal.`);
                                }
                            }
                        }
                    }

                    assignValue(leftHandExpr, value, environment);
                }
                else if (line.startsWith('if ')) {
                    const match = line.match(/^if\s+(.+)\s+then$/);
                    if (!match) throw new Error(`Sintaks 'if' salah: ${line}`);
                    const result = evaluateExpression(match[1], environment);
                    if (!result) { 
                        const jump = findJumpTarget(lines, pc, ['else if', 'else', 'endif']);
                        pc = jump.pc; incrementPC = false; didJump = true; break; 
                    }
                }
                else if (line.startsWith('else if')) {
                    const match = line.match(/^else if\s+(.+)\s+then$/);
                    if (!match) throw new Error(`Sintaks 'else if' salah: ${line}`);
                    const result = evaluateExpression(match[1], environment);
                    if (!result) {
                        const jump = findJumpTarget(lines, pc, ['else if', 'else', 'endif']);
                        pc = jump.pc; incrementPC = false; didJump = true; break; 
                    }
                }
                else if (line === 'else') {
                    const jump = findJumpTarget(lines, pc, ['endif']);
                    pc = jump.pc; incrementPC = false; didJump = true; break; 
                }
                else if (line === 'endif') { /* No-op */ }
                else if (line.startsWith('for ')) {
                    const match = line.match(/^for\s+(\w+)\s*=\s*(.+)\s+to\s+(.+)\s+do$/);
                    if (!match) throw new Error(`Sintaks 'for' salah: ${line}`);
                    const [, loopVar, startExpr, endExpr] = match;
                    const varData = environment.get(loopVar);
                    if (!varData) throw new Error(`Variabel loop '${loopVar}' belum dideklarasikan.`);
                    if (varData.isConst) throw new Error(`Variabel loop '${loopVar}' tidak boleh konstan.`);
                    const startVal = evaluateExpression(startExpr, environment);
                    const endVal = evaluateExpression(endExpr, environment);
                    environment.set(`__FOR_${loopVar}_END__`, { value: endVal, type: 'real' });
                    assignValue(loopVar, startVal, environment);
                    if (startVal > endVal) {
                        const jump = findJumpTarget(lines, pc, ['endfor']);
                        pc = jump.pc; incrementPC = false; didJump = true; break; 
                    }
                }
                else if (line === 'endfor') {
                    const forLinePC = findMatchingBlock(lines, pc, 'for');
                    if (forLinePC === -1) throw new Error("'endfor' tanpa 'for' yang cocok.");
                    const forLine = lines[forLinePC].split('//')[0].trim();
                    const match = forLine.match(/^for\s+(\w+)\s*=\s*(.+)\s+to\s+(.+)\s+do$/);
                    const [, loopVar] = match;
                    const endVal = environment.get(`__FOR_${loopVar}_END__`).value;
                    const currentVal = environment.get(loopVar).value + 1;
                    assignValue(loopVar, currentVal, environment);
                    if (currentVal <= endVal) {
                        pc = forLinePC + 1; incrementPC = false; didJump = true; break; 
                    } else {
                        environment.delete(`__FOR_${loopVar}_END__`);
                    }
                }
                else if (line.startsWith('while ')) {
                    const match = line.match(/^while\s+(.+)\s+do$/);
                    if (!match) throw new Error(`Sintaks 'while' salah: ${line}`);
                    const result = evaluateExpression(match[1], environment);
                    if (!result) { 
                        const jump = findJumpTarget(lines, pc, ['endwhile']);
                        pc = jump.pc + 1; // Lompat MELEWATI 'endwhile'
                        incrementPC = false; didJump = true; break;
                    }
                }
                else if (line === 'endwhile') {
                    const whileLinePC = findMatchingBlock(lines, pc, 'while');
                    if (whileLinePC === -1) throw new Error("'endwhile' tanpa 'while' yang cocok.");
                    pc = whileLinePC; // Lompat KEMBALI KE 'while'
                    incrementPC = false; didJump = true; break;
                }
                else if (line === 'repeat') { /* No-op */ }
                else if (line.startsWith('untuk ')) {
                    const match = line.match(/^untuk\s+(.+)$/);
                    if (!match) throw new Error(`Sintaks 'untuk' salah: ${line}`);
                    const result = evaluateExpression(match[1], environment);
                    const repeatLinePC = findMatchingBlock(lines, pc, 'repeat');
                    if (repeatLinePC === -1) throw new Error("'untuk' tanpa 'repeat' yang cocok.");
                    if (result) {
                        pc = repeatLinePC + 1; incrementPC = false; didJump = true; break;
                    }
                }
                else {
                    throw new Error(`Sintaks tidak dikenal di algoritma: "${line}"`);
                }
            } catch (error) {
                console.error(`\n[Runtime Error] Terjadi kesalahan pada baris ${pc + 1}:`);
                console.error(`>>> ${line}`);
                console.error(error.message);
                process.exit(1); 
            }
        } 
        if (incrementPC && !didJump) {
            pc++;
        }
    }
}

// --- 6. Helper Blok Kontrol ---

function findJumpTarget(lines, startPC, targets) {
    let nestingLevel = 0;
    const startLine = lines[startPC].split('//')[0].trim();
    const startKeyword = startLine.split(';').map(s => s.trim()).filter(s => s)[0].split(' ')[0]; 
    let matchingEnd;
    if (['if', 'else if', 'else'].includes(startKeyword)) matchingEnd = 'endif';
    if (startKeyword === 'for') matchingEnd = 'endfor';
    if (startKeyword === 'while') matchingEnd = 'endwhile';
    if (startKeyword === 'repeat') matchingEnd = 'untuk';

    for (let i = startPC + 1; i < lines.length; i++) {
        const line = lines[i].split('//')[0].trim();
        const firstStatement = line.split(';').map(s => s.trim()).filter(s => s)[0];
        if (!firstStatement) continue; 
        const keyword = firstStatement.split(' ')[0];

        if (keyword === startKeyword) nestingLevel++;
        else if (firstStatement.startsWith(matchingEnd) || keyword === matchingEnd) {
            if (nestingLevel === 0) {
                if (targets.includes(keyword) || targets.includes(firstStatement)) {
                    return { pc: i, match: firstStatement };
                }
            } else nestingLevel--;
        } 
        else if (nestingLevel === 0 && targets.some(t => firstStatement.startsWith(t))) {
            return { pc: i, match: keyword };
        }
    }
    return { pc: lines.length - 1, match: 'endprogram' };
}

function findMatchingBlock(lines, endPC, startKeyword) {
    let nestingLevel = 0;
    let endKeyword;
    if (startKeyword === 'for') endKeyword = 'endfor';
    if (startKeyword === 'while') endKeyword = 'endwhile';
    if (startKeyword === 'repeat') endKeyword = 'untuk';
    for (let i = endPC - 1; i >= 0; i--) {
        const line = lines[i].split('//')[0].trim();
        const firstStatement = line.split(';').map(s => s.trim()).filter(s => s)[0];
        if (!firstStatement) continue;
        if (firstStatement.startsWith(endKeyword)) nestingLevel++;
        else if (firstStatement.startsWith(startKeyword)) {
            if (nestingLevel === 0) return i;
            else nestingLevel--;
        }
    }
    return -1;
}

function parseOutputArgs(args) {
    const parts = [];
    let currentPart = "";
    let inString = false;
    let inChar = false;
    let bracketLevel = 0;
    for (let i = 0; i < args.length; i++) {
        const char = args[i];
        if (char === '"' && !inChar) inString = !inString;
        else if (char === "'" && !inString) inChar = !inChar;
        else if (char === '[' && !inString && !inChar) bracketLevel++;
        else if (char === ']' && !inString && !inChar) bracketLevel--;
        if (char === ',' && !inString && !inChar && bracketLevel === 0) {
            parts.push(currentPart.trim());
            currentPart = "";
        } else {
            currentPart += char;
        }
    }
    parts.push(currentPart.trim()); 
    return parts;
}

// --- 7. Main Runner ---

function runInterpreter(filePath) {
    const startTime = new Date();
    environment.clear();
    typeDefinitions.clear();
    outputBuffer = [];
    inputTokenBuffer = [];
    programName = path.basename(filePath); 

    let fileContent;
    try {
        fileContent = fs.readFileSync(filePath, 'utf-8');
    } catch (e) { console.error(`[Error] Gagal membaca file: ${e.message}`); return; }

    const multiLineCommentRegex = /\/\*[\s\S]*?\*\//g;
    fileContent = fileContent.replace(multiLineCommentRegex, '');
    const lines = fileContent.split('\n'); 
    const trimmedLines = lines.map(l => l.split('//')[0].trim());
    const programLineIndex = trimmedLines.findIndex(l => l.startsWith('program '));
    const kamusStart = trimmedLines.indexOf('kamus');
    const algoritmaStart = trimmedLines.indexOf('algoritma');
    const endProgram = trimmedLines.indexOf('endprogram');

    if (kamusStart === -1 || algoritmaStart === -1 || endProgram === -1 || programLineIndex === -1) {
        console.error("[Error] Struktur program tidak valid."); return;
    }

    programName = trimmedLines[programLineIndex].split(' ')[1];
    const kamusLines = lines.slice(kamusStart + 1, algoritmaStart);
    const algoritmaLines = lines.slice(algoritmaStart + 1, endProgram);

    try {
        parseKamus(kamusLines);
        executeAlgoritma(algoritmaLines);
    } catch (e) { console.error(`[Fatal Error] ${e.message}`); return; }

    console.log(`--- Properti Eksekusi ---`);
    console.log(`Nama Program: ${programName}`);
    console.log(`Waktu Eksekusi: ${startTime.toLocaleString('id-ID')}`);
    console.log(`--- Output Program ---`);
    console.log(outputBuffer.join('\n'));
}

// --- 8. Entry Point ---
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log("Penggunaan: node interpreter.js <nama_file.txt>");
    process.exit(1);
}
try {
    require.resolve('readline-sync');
    require.resolve('expr-eval');
} catch (e) {
    console.error("[Error] Dependensi tidak ditemukan.");
    console.error("Pastikan Anda sudah menjalankan: npm install readline-sync expr-eval");
    process.exit(1);
}
const filePath = args[0];
runInterpreter(filePath);
