#include <iostream>     // Untuk input/output (cin, cout)
#include <string>       // Untuk std::string
#include <vector>       // Untuk std::vector (pengganti Array)
#include <map>          // Untuk std::map (pengganti Map)
#include <set>          // Untuk std::set (digunakan di resolveType)
#include <any>          // Untuk std::any (pengganti tipe dinamis JS)
#include <stdexcept>    // Untuk error (exception)
#include <fstream>      // Untuk membaca file (fs)
#include <sstream>      // Untuk string streams (parsing)
#include <regex>        // Untuk regex
#include <cmath>        // Untuk std::floor (div)
#include <filesystem>   // Untuk path::basename
#include <chrono>       // Untuk Waktu Eksekusi
#include <iomanip>      // Untuk memformat waktu
#include <algorithm>    // Untuk std::transform (lowercase)

// --- 1. Definisi Tipe & Global State ---

// Struct untuk menggantikan objek JS { value, type, isConst }
struct Variable {
    std::any value;
    std::string type;
    bool isConst;
};

// Struct untuk menggantikan objek JS { type, aliasedTo, fields }
struct TypeDef {
    std::string type; // "primitive", "alias", "struct"
    std::string aliasedTo;
    std::map<std::string, std::string> fields;
};

// Struct untuk hasil parseType
struct ParsedType {
    std::string baseType;
    std::vector<int> dimensions;
};

// Global State (diterjemahkan dari JS)
std::map<std::string, Variable> environment;
std::map<std::string, TypeDef> typeDefinitions;
std::vector<std::string> outputBuffer;
std::vector<std::string> inputTokenBuffer;
std::string programName = "Untitled";

// --- Deklarasi Fungsi (Penting di C++) ---
// Kita perlu mendeklarasikan fungsi sebelum digunakan
std::any evaluateExpression(std::string expr, const std::map<std::string, Variable>& env);
std::any createDefaultValue(const std::string& typeName);
std::string resolveType(std::string typeName);
std::any castValue(const std::any& value, const std::string& targetType);
void assignValue(const std::string& leftHandExpr, std::any rightValue, std::map<std::string, Variable>& env);
ParsedType parseType(const std::string& typeName);
std::string anyToString(const std::any& val);


// --- 2. Tipe Data & Helper Inti ---

// Helper untuk trim (tidak ada di C++ standar)
std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\n\r\f\v");
    if (std::string::npos == first) return str;
    size_t last = str.find_last_not_of(" \t\n\r\f\v");
    return str.substr(first, (last - first + 1));
}

/**
 * Helper C++: Mengubah string baru dengan karakter yang diubah.
 */
std::string setStringAtIndex(std::string str, int index, const std::string& charStr) {
    if (index < 0 || index >= str.length()) {
        throw std::out_of_range("Indeks string di luar jangkauan.");
    }
    char c = (charStr.length() > 0) ? charStr[0] : '\0';
    str[index] = c;
    return str;
}

ParsedType parseType(const std::string& typeName) {
    std::regex re(R"(([\w]+)((?:\[\d+\])*)$)");
    std::smatch match;
    if (!std::regex_match(typeName, match, re)) {
        return {typeName, {}};
    }
    
    std::string baseType = match[1];
    std::string dimString = match[2];
    std::vector<int> dimensions;
    
    std::regex dimRegex(R"(\[(\d+)\])");
    auto dim_begin = std::sregex_iterator(dimString.begin(), dimString.end(), dimRegex);
    auto dim_end = std::sregex_iterator();
    
    for (std::sregex_iterator i = dim_begin; i != dim_end; ++i) {
        dimensions.push_back(std::stoi((*i)[1]));
    }
    return {baseType, dimensions};
}

void initializeTypeSystem() {
    typeDefinitions.clear();
    const std::vector<std::string> primitives = {"integer", "real", "character", "string", "boolean"};
    for (const auto& p : primitives) {
        typeDefinitions[p] = {"primitive"};
    }
}

std::string resolveType(std::string typeName) {
    ParsedType pt = parseType(typeName);
    std::set<std::string> seen;
    std::string current = pt.baseType;
    
    while (typeDefinitions.count(current) && typeDefinitions.at(current).type == "alias") {
        if (seen.count(current)) {
            throw std::runtime_error("Deteksi definisi tipe sirkular: " + current);
        }
        seen.insert(current);
        current = typeDefinitions.at(current).aliasedTo;
    }
    
    if (pt.dimensions.empty()) {
        return current;
    }

    std::string result = current;
    if (!pt.dimensions.empty()) {
        result += "[";
        for(size_t i = 0; i < pt.dimensions.size(); ++i) {
            result += std::to_string(pt.dimensions[i]);
            if (i < pt.dimensions.size() - 1) {
                result += "][";
            }
        }
        result += "]";
    }
    return result;
}

// Versi C++ dari createArrayRecursive
std::vector<std::any> createArrayRecursive(std::vector<int> dimensions, const std::string& baseType) {
    int size = dimensions[0];
    std::vector<int> remainingDims(dimensions.begin() + 1, dimensions.end());
    std::vector<std::any> arr(size);
    
    for (int i = 0; i < size; ++i) {
        if (remainingDims.empty()) {
            arr[i] = createDefaultValue(baseType);
        } else {
            arr[i] = createArrayRecursive(remainingDims, baseType);
        }
    }
    return arr;
}

std::any createDefaultValue(const std::string& typeName) {
    std::string resolvedFullType = resolveType(typeName);
    ParsedType pt = parseType(resolvedFullType);
    
    if (!typeDefinitions.count(pt.baseType)) {
        throw std::runtime_error("Tipe data tidak dikenal: '" + pt.baseType + "'");
    }
    
    const TypeDef& typeDef = typeDefinitions.at(pt.baseType);
    std::any baseTypeDefault;
    
    if (typeDef.type == "primitive") {
        if (pt.baseType == "integer") baseTypeDefault = 0;
        else if (pt.baseType == "real") baseTypeDefault = 0.0;
        else if (pt.baseType == "boolean") baseTypeDefault = false;
        else if (pt.baseType == "string") baseTypeDefault = std::string("");
        else if (pt.baseType == "character") baseTypeDefault = std::string("");
        else baseTypeDefault = nullptr;
    } else if (typeDef.type == "struct") {
        std::map<std::string, std::any> structInstance;
        for (const auto& field : typeDef.fields) {
            structInstance[field.first] = createDefaultValue(field.second);
        }
        baseTypeDefault = structInstance;
    } else {
        baseTypeDefault = nullptr;
    }
    
    if (!pt.dimensions.empty()) {
        return createArrayRecursive(pt.dimensions, pt.baseType);
    }
    
    return baseTypeDefault;
}

// Helper untuk mengubah std::any ke string untuk casting
std::string anyToString(const std::any& val) {
    if (val.type() == typeid(int)) return std::to_string(std::any_cast<int>(val));
    if (val.type() == typeid(double)) return std::to_string(std::any_cast<double>(val));
    if (val.type() == typeid(bool)) return std::any_cast<bool>(val) ? "true" : "false";
    if (val.type() == typeid(std::string)) return std::any_cast<std::string>(val);
    if (val.type() == typeid(const char*)) return std::any_cast<const char*>(val);
    if (val.type() == typeid(nullptr)) return "null";
    return "[Object]";
}

std::any castValue(const std::any& value, const std::string& targetType) {
    std::string resolvedType = resolveType(targetType);
    ParsedType pt = parseType(resolvedType);
    
    if (value.type() == typeid(std::vector<std::any>) || value.type() == typeid(std::map<std::string, std::any>)) {
        return value;
    }

    std::string strValue = anyToString(value);
    
    if (pt.baseType == "integer") {
        try { return std::stoi(strValue); }
        catch (...) { throw std::runtime_error("Input '" + strValue + "' tidak valid untuk integer."); }
    }
    if (pt.baseType == "real") {
        try { return std::stod(strValue); }
        catch (...) { throw std::runtime_error("Input '" + strValue + "' tidak valid untuk real."); }
    }
    if (pt.baseType == "boolean") {
        if (value.type() == typeid(bool)) return value;
        std::transform(strValue.begin(), strValue.end(), strValue.begin(), ::tolower);
        return (strValue == "true");
    }
    if (pt.baseType == "string") {
        return strValue;
    }
    if (pt.baseType == "character") {
        return strValue.empty() ? std::string("") : std::string(1, strValue[0]);
    }
    return value;
}


// --- 3. Parser Fungsi & Ekspresi (STUB) ---

/*
 * =========================================================================
 * == PERINGATAN: EVALUATOR EKSPRESI (STUB) ==
 * =========================================================================
 * Kode Node.js asli menggunakan library 'expr-eval' yang SANGAT canggih.
 *
 * Menerjemahkan fungsionalitas itu ke C++ dari nol adalah proyek yang
 * sangat besar.
 *
 * Fungsi 'evaluateExpression' di bawah ini adalah STUB/PLACEHOLDER
 * yang SANGAT disederhanakan. Ini HANYA akan menangani literal
 * (angka, string) dan nama variabel tunggal.
 *
 * Ini TIDAK AKAN berfungsi untuk "x + y", "a > 10", "size(arr)", "a div 2", dll.
 *
 * Untuk fungsionalitas penuh, Anda perlu mengintegrasikan library
 * C++ pihak ketiga seperti 'ExprTk' atau 'muparser'.
 * =========================================================================
 */
std::any evaluateExpression(std::string expr, const std::map<std::string, Variable>& env) {
    expr = trim(expr);

    // 1. Cek literal string
    if (expr.length() >= 2 && expr.front() == '"' && expr.back() == '"') {
        return expr.substr(1, expr.length() - 2);
    }
    // 2. Cek literal karakter
    if (expr.length() >= 2 && expr.front() == '\'' && expr.back() == '\'') {
        return expr.substr(1, expr.length() - 2);
    }
    // 3. Cek literal boolean
    if (expr == "true") return true;
    if (expr == "false") return false;
    
    // 4. Cek literal angka (sederhana)
    try {
        if (expr.find('.') != std::string::npos) {
            return std::stod(expr); // Real
        }
        return std::stoi(expr); // Integer
    } catch (...) {
        // Bukan angka, lanjutkan
    }

    // 5. Cek variabel
    if (env.count(expr)) {
        return env.at(expr).value;
    }
    
    // 6. Cek Array Access (sangat sederhana) misal: arr[0]
    // Ini juga bagian dari STUB, parser yang nyata akan menangani ini.
    std::regex arrAccess(R"(([\w]+)\[(.)\])"); // Hanya 1 digit index
    std::smatch arrMatch;
    if (std::regex_match(expr, arrMatch, arrAccess)) {
        std::string varName = arrMatch[1];
        int index = std::stoi(arrMatch[2]);
        if (env.count(varName)) {
            const auto& val = env.at(varName).value;
            if (val.type() == typeid(std::vector<std::any>)) {
                return std::any_cast<std::vector<std::any>>(val).at(index);
            } else if (val.type() == typeid(std::string)) {
                 return std::string(1, std::any_cast<std::string>(val).at(index));
            }
        }
    }

    // STUB FALLBACK
    // std::cerr << "[Peringatan] Evaluasi ekspresi kompleks ('" << expr << "') tidak didukung di stub ini." << std::endl;
    if (expr.find_first_of("+-*/><=!|&") != std::string::npos) {
         // Jika ini ekspresi kompleks, kita tidak bisa menanganinya.
         // Kembalikan 'false' atau 0 untuk membiarkan loop/if gagal secara default.
         return false; 
    }

    // Gagal total, mungkin nama var salah
    throw std::runtime_error("Tidak dapat mengevaluasi ekspresi (atau STUB tidak menangani): " + expr);
}

// ===== FUNGSI ASSIGNVALUE YANG DIPERBARUI (Versi C++) =====
// Ini adalah bagian tersulit karena memodifikasi std::any secara rekursif
void assignValue(const std::string& leftHandExpr, std::any rightValue, std::map<std::string, Variable>& env) {
    std::regex accessorRegex(R"((?:\.[\w]+)|(?:\[.*?\]))");
    std::regex baseMatchRegex(R"(([\w]+)(.*))");
    std::smatch baseMatch;
    
    if (!std::regex_match(leftHandExpr, baseMatch, baseMatchRegex)) {
        throw std::runtime_error("Sintaks assignment tidak valid: " + leftHandExpr);
    }
    
    std::string varName = baseMatch[1];
    std::string accessorString = baseMatch[2];
    
    if (!env.count(varName)) {
        throw std::runtime_error("Variabel '" + varName + "' belum dideklarasikan.");
    }
    Variable& varData = env.at(varName); // Dapatkan referensi
    if (varData.isConst) {
        throw std::runtime_error("Tidak bisa mengubah nilai '" + varName + "' (konstan).");
    }

    std::vector<std::string> accessors;
    auto acc_begin = std::sregex_iterator(accessorString.begin(), accessorString.end(), accessorRegex);
    auto acc_end = std::sregex_iterator();
    for (std::sregex_iterator i = acc_begin; i != acc_end; ++i) {
        accessors.push_back((*i).str());
    }

    // Kasus 1: Assignment Sederhana (x = 10)
    if (accessors.empty()) {
        varData.value = castValue(rightValue, varData.type);
        return;
    }

    // Kasus 2: Assignment Kompleks (std::any*)
    std::any* currentTarget = &varData.value;
    std::string currentType = varData.type;

    for (size_t i = 0; i < accessors.size(); ++i) {
        const std::string& part = accessors[i];
        bool isLastAccessor = (i == accessors.size() - 1);
        
        ParsedType pt = parseType(resolveType(currentType));

        if (part.front() == '.') { // Struct member
            const std::string memberName = part.substr(1);
            if (!typeDefinitions.count(pt.baseType) || typeDefinitions.at(pt.baseType).type != "struct") {
                throw std::runtime_error("Tipe '" + pt.baseType + "' bukan struct.");
            }
            const TypeDef& typeDef = typeDefinitions.at(pt.baseType);
            if (!typeDef.fields.count(memberName)) {
                throw std::runtime_error("Struct '" + pt.baseType + "' tidak punya member '" + memberName + "'.");
            }
            
            auto* structMap = std::any_cast<std::map<std::string, std::any>>(currentTarget);
            if (!structMap) throw std::runtime_error("Internal: Gagal cast ke struct map.");

            if (isLastAccessor) {
                (*structMap)[memberName] = castValue(rightValue, typeDef.fields.at(memberName));
                return;
            } else {
                currentTarget = &(*structMap)[memberName];
                currentType = typeDef.fields.at(memberName);
            }
        } else { // Array index or String index
            std::string indexExpr = part.substr(1, part.length() - 2);
            if (indexExpr.empty()) throw std::runtime_error("Index array tidak boleh kosong.");
            
            // Mengandalkan stub evaluator... ini mungkin gagal
            int index = std::any_cast<int>(evaluateExpression(indexExpr, env));

            if (pt.dimensions.empty()) { // Bukan array
                if (pt.baseType == "string") {
                    if (isLastAccessor) {
                        std::string newChar = std::any_cast<std::string>(castValue(rightValue, "character"));
                        std::string& oldString = *std::any_cast<std::string>(currentTarget);
                        oldString = setStringAtIndex(oldString, index, newChar);
                        return;
                    } else {
                        throw std::runtime_error("Tidak bisa mengakses member/index dari sebuah karakter string.");
                    }
                }
                throw std::runtime_error("Tidak bisa mengakses index pada tipe non-array.");
            } else { // Ini adalah array
                auto* arrVec = std::any_cast<std::vector<std::any>>(currentTarget);
                if (!arrVec) throw std::runtime_error("Internal: Gagal cast ke vector.");
                if (index < 0 || index >= arrVec->size()) {
                     throw std::out_of_range("Indeks array di luar jangkauan.");
                }

                if (isLastAccessor) {
                    std::string elementType = (pt.dimensions.size() > 1) 
                        ? (pt.baseType + "[" + std::to_string(pt.dimensions[1]) + "]") // Disederhanakan
                        : pt.baseType;
                    (*arrVec)[index] = castValue(rightValue, elementType);
                    return;
                } else {
                    currentTarget = &(*arrVec)[index];
                    std::string nextType = pt.baseType;
                    if(pt.dimensions.size() > 1) {
                        for(size_t d=1; d < pt.dimensions.size(); ++d) {
                            nextType += "[" + std::to_string(pt.dimensions[d]) + "]";
                        }
                    }
                    currentType = nextType;
                }
            }
        }
    }
}
// ===========================================


// --- 4. Parser Kamus ---

// Helper untuk split string
std::vector<std::string> split(const std::string& s, char delimiter) {
   std::vector<std::string> tokens;
   std::string token;
   std::istringstream tokenStream(s);
   while (std::getline(tokenStream, token, delimiter)) {
      tokens.push_back(token);
   }
   return tokens;
}

void parseKamus(const std::vector<std::string>& lines) {
    initializeTypeSystem();

    std::regex typeAliasRegex(R"(^\s*type\s+([\w]+)\s+([\w]+)\s*$)", std::regex_constants::icase);
    std::regex typeStructStartRegex(R"(^\s*type\s+([\w]+)\s*<\s*$)", std::regex_constants::icase);
    std::regex constRegex(R"(^\s*const\s+([\w]+)\s*:\s*(.+?)\s*=\s*(.+)$)", std::regex_constants::icase);
    std::regex varRegex(R"(^\s*([\w\s,]+)\s*:\s*(.+)\s*$)", std::regex_constants::icase);
    std::regex structMemberRegex(R"(^\s*([\w\s,]+)\s*:\s*(.+)\s*$)", std::regex_constants::icase);

    // Loop 1: Parsing Tipe (Alias dan Struct)
    for (size_t i = 0; i < lines.size(); ++i) {
        std::string line = trim(lines[i].substr(0, lines[i].find("//")));
        if (line.empty()) continue;

        std::smatch match;
        if (std::regex_match(line, match, typeAliasRegex)) {
            typeDefinitions[match[1]] = {"alias", match[2]};
        } else if (std::regex_match(line, match, typeStructStartRegex)) {
            std::string structName = match[1];
            std::map<std::string, std::string> fields;
            size_t j = i + 1;
            while (j < lines.size()) {
                std::string memberLine = trim(lines[j].substr(0, lines[j].find("//")));
                if (memberLine == ">") break;
                if (memberLine.empty()) { j++; continue; }
                
                std::smatch memberMatch;
                if (std::regex_match(memberLine, memberMatch, structMemberRegex)) {
                    std::string varListStr = trim(memberMatch[1]);
                    std::string typeName = trim(memberMatch[2]);
                    std::vector<std::string> vars = split(varListStr, ',');
                    for (const std::string& var : vars) {
                        fields[trim(var)] = typeName;
                    }
                }
                j++;
            }
            typeDefinitions[structName] = {"struct", "", fields};
            i = j;
        }
    }

    // Loop 2: Parsing Variabel dan Konstanta
    for (size_t i = 0; i < lines.size(); ++i) {
        std::string line = trim(lines[i].substr(0, lines[i].find("//")));
        if (line.empty() || line.rfind("type ", 0) == 0) {
            if (line.find('<') != std::string::npos) {
                while (i < lines.size() && lines[i].find('>') == std::string::npos) i++;
            }
            continue;
        }

        std::smatch match;
        if (std::regex_match(line, match, constRegex)) {
            std::string varName = trim(match[1]);
            std::string typeName = trim(match[2]);
            std::string valueStrRaw = trim(match[3]);
            std::string resolvedType = resolveType(typeName);
            ParsedType pt = parseType(resolvedType);

            if (pt.baseType == "string" && (valueStrRaw.front() != '"' || valueStrRaw.back() != '"')) {
                throw std::runtime_error("Nilai konstan string untuk '" + varName + "' harus menggunakan kutip ganda (\").");
            }
            if (pt.baseType == "character" && (valueStrRaw.front() != '\'' || valueStrRaw.back() != '\'')) {
                throw std::runtime_error("Nilai konstan character untuk '" + varName + "' harus menggunakan kutip tunggal (').");
            }
            
            // Unquote value jika string atau char
            std::string valueToCast = valueStrRaw;
            if ((pt.baseType == "string" || pt.baseType == "character") && valueStrRaw.length() > 1) {
                valueToCast = valueStrRaw.substr(1, valueStrRaw.length() - 2);
            }

            std::any value = castValue(valueToCast, resolvedType);
            environment[varName] = {value, resolvedType, true};

        } else if (std::regex_match(line, match, varRegex)) {
            std::string varListStr = trim(match[1]);
            std::string typeName = trim(match[2]);
            std::string resolvedType = resolveType(typeName);
            std::vector<std::string> vars = split(varListStr, ',');
            for (const std::string& v : vars) {
                std::string varName = trim(v);
                if (varName.empty()) continue;
                std::any defaultValue = createDefaultValue(resolvedType);
                environment[varName] = {defaultValue, resolvedType, false};
            }
        }
    }
}


// --- 5. Executor Algoritma ---

// Helper untuk mem-parsing argumen output/input
std::vector<std::string> parseOutputArgs(const std::string& args) {
    std::vector<std::string> parts;
    std::string currentPart;
    bool inString = false;
    bool inChar = false;
    int bracketLevel = 0;
    for (char c : args) {
        if (c == '"' && !inChar) inString = !inString;
        else if (c == '\'' && !inString) inChar = !inChar;
        else if (c == '[' && !inString && !inChar) bracketLevel++;
        else if (c == ']' && !inString && !inChar) bracketLevel--;

        if (c == ',' && !inString && !inChar && bracketLevel == 0) {
            parts.push_back(trim(currentPart));
            currentPart = "";
        } else {
            currentPart += c;
        }
    }
    parts.push_back(trim(currentPart));
    return parts;
}

// Helper untuk menemukan target lompatan (if, while, for)
struct JumpTarget {
    size_t pc;
    std::string match;
};

JumpTarget findJumpTarget(const std::vector<std::string>& lines, size_t startPC, const std::vector<std::string>& targets) {
    int nestingLevel = 0;
    std::string startLine = trim(lines[startPC].substr(0, lines[startPC].find("//")));
    std::string startKeyword = split(startLine, ' ')[0];
    
    std::string matchingEnd;
    if (startKeyword == "if" || startKeyword == "else") matchingEnd = "endif";
    if (startKeyword == "for") matchingEnd = "endfor";
    if (startKeyword == "while") matchingEnd = "endwhile";
    if (startKeyword == "repeat") matchingEnd = "untuk";

    for (size_t i = startPC + 1; i < lines.size(); ++i) {
        std::string line = trim(lines[i].substr(0, lines[i].find("//")));
        if (line.empty()) continue;
        
        std::string firstStatement = line;
        if(line.find(';') != std::string::npos) firstStatement = trim(split(line, ';')[0]);
        if(firstStatement.empty()) continue;

        std::string keyword = split(firstStatement, ' ')[0];

        if (keyword == startKeyword) nestingLevel++;
        else if (firstStatement.rfind(matchingEnd, 0) == 0) {
            if (nestingLevel == 0) {
                for(const auto& t : targets) if(firstStatement.rfind(t, 0) == 0) return {i, firstStatement};
            } else nestingLevel--;
        } else if (nestingLevel == 0) {
            for(const auto& t : targets) if(firstStatement.rfind(t, 0) == 0) return {i, firstStatement};
        }
    }
    return {lines.size() - 1, "endprogram"};
}

// Helper untuk menemukan blok awal (for, while)
int findMatchingBlock(const std::vector<std::string>& lines, size_t endPC, const std::string& startKeyword) {
    int nestingLevel = 0;
    std::string endKeyword;
    if (startKeyword == "for") endKeyword = "endfor";
    if (startKeyword == "while") endKeyword = "endwhile";
    if (startKeyword == "repeat") endKeyword = "untuk";

    for (int i = endPC - 1; i >= 0; i--) {
        std::string line = trim(lines[i].substr(0, lines[i].find("//")));
        if (line.empty()) continue;
        
        std::string firstStatement = line;
        if(line.find(';') != std::string::npos) firstStatement = trim(split(line, ';')[0]);
        if(firstStatement.empty()) continue;

        if (firstStatement.rfind(endKeyword, 0) == 0) nestingLevel++;
        else if (firstStatement.rfind(startKeyword, 0) == 0) {
            if (nestingLevel == 0) return i;
            else nestingLevel--;
        }
    }
    return -1;
}

// Helper untuk mencetak std::any (untuk output)
std::string prettyPrintAny(const std::any& val) {
    if (val.type() == typeid(std::string)) return std::any_cast<std::string>(val);
    if (val.type() == typeid(bool)) return std::any_cast<bool>(val) ? "true" : "false";
    if (val.type() == typeid(int)) return std::to_string(std::any_cast<int>(val));
    if (val.type() == typeid(double)) return std::to_string(std::any_cast<double>(val));
    
    // (Tambahkan logika untuk print array/struct jika perlu)
    if (val.type() == typeid(std::vector<std::any>)) return "[Array]";
    if (val.type() == typeid(std::map<std::string, std::any>)) return "[Struct]";

    return anyToString(val);
}


void executeAlgoritma(const std::vector<std::string>& lines) {
    size_t pc = 0;
    while (pc < lines.size()) {
        std::string fullLine = trim(lines[pc].substr(0, lines[pc].find("//")));
        if (fullLine.empty()) { pc++; continue; }
        
        std::vector<std::string> statements = split(fullLine, ';');
        bool incrementPC = true;
        bool didJump = false;

        for (std::string line : statements) {
            line = trim(line);
            if (line.empty()) continue;

            try {
                if (line.rfind("output(", 0) == 0) {
                    std::string content = line.substr(7, line.length() - 8);
                    std::vector<std::string> parts = parseOutputArgs(content);
                    std::string outputLine;
                    for (size_t i=0; i < parts.size(); ++i) {
                        std::any value = evaluateExpression(parts[i], environment);
                        outputLine += prettyPrintAny(value);
                        if(i < parts.size() - 1) outputLine += " ";
                    }
                    outputBuffer.push_back(outputLine);
                } 
                else if (line.rfind("input(", 0) == 0) {
                    std::string content = line.substr(6, line.length() - 7);
                    std::vector<std::string> vars = parseOutputArgs(content);
                    for (const std::string& v : vars) {
                        std::string token;
                        while (token.empty()) {
                            if (inputTokenBuffer.empty()) {
                                std::string lineInput;
                                std::getline(std::cin, lineInput);
                                std::stringstream ss(lineInput);
                                std::string buf;
                                while (ss >> buf) inputTokenBuffer.push_back(buf);
                                if (inputTokenBuffer.empty()) continue;
                            }
                            token = inputTokenBuffer.front();
                            inputTokenBuffer.erase(inputTokenBuffer.begin());
                        }
                        assignValue(v, token, environment);
                    }
                }
                // Regex assignment yang disederhanakan
                else if (line.find('=') != std::string::npos && line.rfind("if ", 0) != 0 && line.rfind("for ", 0) != 0) {
                    std::regex assignRegex(R"(^\s*([\w\.\[\]'""]+)\s*=\s*(.+)$)");
                    std::smatch match;
                    if(std::regex_match(line, match, assignRegex)) {
                        std::string leftHandExpr = trim(match[1]);
                        std::string expr = trim(match[2]);
                        std::any value = evaluateExpression(expr, environment);
                        assignValue(leftHandExpr, value, environment);
                    } else {
                         throw std::runtime_error("Sintaks assignment salah: " + line);
                    }
                }
                else if (line.rfind("if ", 0) == 0) {
                    std::regex re(R"(^if\s+(.+)\s+then$)");
                    std::smatch match;
                    if(!std::regex_match(line, match, re)) throw std::runtime_error("Sintaks 'if' salah: " + line);
                    bool result = std::any_cast<bool>(evaluateExpression(match[1], environment));
                    if (!result) {
                        JumpTarget jump = findJumpTarget(lines, pc, {"else if", "else", "endif"});
                        pc = jump.pc; incrementPC = false; didJump = true; break;
                    }
                }
                else if (line.rfind("else if", 0) == 0) {
                    // Jika kita sampai di sini, 'if' sebelumnya PASTI true,
                    // jadi kita harus melompat ke endif
                    JumpTarget jump = findJumpTarget(lines, pc, {"endif"});
                    pc = jump.pc; incrementPC = false; didJump = true; break;
                }
                else if (line == "else") {
                    // Sama, jika kita sampai di sini, 'if' atau 'else if' sebelumnya PASTI true
                    JumpTarget jump = findJumpTarget(lines, pc, {"endif"});
                    pc = jump.pc; incrementPC = false; didJump = true; break;
                }
                else if (line == "endif") { /* No-op */ }
                else if (line.rfind("for ", 0) == 0) {
                    std::regex re(R"(^for\s+(\w+)\s*=\s*(.+)\s+to\s+(.+)\s+do$)");
                    std::smatch match;
                    if(!std::regex_match(line, match, re)) throw std::runtime_error("Sintaks 'for' salah: " + line);
                    
                    std::string loopVar = match[1];
                    std::string startExpr = match[2];
                    std::string endExpr = match[3];

                    int startVal = std::any_cast<int>(evaluateExpression(startExpr, environment));
                    int endVal = std::any_cast<int>(evaluateExpression(endExpr, environment));

                    // Simpan endVal di environment (seperti di JS)
                    environment["__FOR_" + loopVar + "_END__"] = {endVal, "integer", false};
                    assignValue(loopVar, startVal, environment);

                    if (startVal > endVal) {
                        JumpTarget jump = findJumpTarget(lines, pc, {"endfor"});
                        pc = jump.pc; incrementPC = false; didJump = true; break;
                    }
                }
                else if (line == "endfor") {
                    int forLinePC = findMatchingBlock(lines, pc, "for");
                    if(forLinePC == -1) throw std::runtime_error("'endfor' tanpa 'for'");
                    
                    std::string forLine = trim(lines[forLinePC].substr(0, lines[forLinePC].find("//")));
                    std::regex re(R"(^for\s+(\w+)\s*=\s*(.+)\s+to\s+(.+)\s+do$)");
                    std::smatch match;
                    std::regex_match(forLine, match, re); // Pasti cocok
                    
                    std::string loopVar = match[1];
                    int endVal = std::any_cast<int>(environment["__FOR_" + loopVar + "_END__"].value);
                    int currentVal = std::any_cast<int>(environment[loopVar].value) + 1;
                    
                    assignValue(loopVar, currentVal, environment);
                    if (currentVal <= endVal) {
                        pc = forLinePC + 1; // Lompat ke *setelah* 'for'
                        incrementPC = false; didJump = true; break;
                    } else {
                        environment.erase("__FOR_" + loopVar + "_END__");
                    }
                }
                else if (line.rfind("while ", 0) == 0) {
                     std::regex re(R"(^while\s+(.+)\s+do$)");
                     std::smatch match;
                     if(!std::regex_match(line, match, re)) throw std::runtime_error("Sintaks 'while' salah: " + line);
                     bool result = std::any_cast<bool>(evaluateExpression(match[1], environment));
                     if(!result) {
                        JumpTarget jump = findJumpTarget(lines, pc, {"endwhile"});
                        pc = jump.pc + 1; // Lompat MELEWATI 'endwhile'
                        incrementPC = false; didJump = true; break;
                     }
                }
                else if (line == "endwhile") {
                    int whileLinePC = findMatchingBlock(lines, pc, "while");
                    if(whileLinePC == -1) throw std::runtime_error("'endwhile' tanpa 'while'");
                    pc = whileLinePC; // Lompat KEMBALI KE 'while'
                    incrementPC = false; didJump = true; break;
                }
                else if (line == "repeat") { /* No-op */ }
                else if (line.rfind("untuk ", 0) == 0) {
                    std::regex re(R"(^untuk\s+(.+)$)");
                    std::smatch match;
                    if(!std::regex_match(line, match, re)) throw std::runtime_error("Sintaks 'untuk' salah: " + line);
                    bool result = std::any_cast<bool>(evaluateExpression(match[1], environment));
                    int repeatLinePC = findMatchingBlock(lines, pc, "repeat");
                    if(repeatLinePC == -1) throw std::runtime_error("'untuk' tanpa 'repeat'");
                    if(result) {
                        pc = repeatLinePC + 1; // Lompat ke setelah 'repeat'
                        incrementPC = false; didJump = true; break;
                    }
                }
                else {
                    throw std::runtime_error("Sintaks tidak dikenal di algoritma: " + line);
                }

            } catch (const std::exception& e) {
                std::cerr << "\n[Runtime Error] Terjadi kesalahan pada baris " << (pc + 1) << ":" << std::endl;
                std::cerr << ">>> " << line << std::endl;
                std::cerr << e.what() << std::endl;
                exit(1);
            }
        }
        if (incrementPC && !didJump) {
            pc++;
        }
    }
}


// --- 7. Main Runner ---

void runInterpreter(const std::string& filePath) {
    auto startTime = std::chrono::system_clock::now();
    
    environment.clear();
    typeDefinitions.clear();
    outputBuffer.clear();
    inputTokenBuffer.clear();
    programName = std::filesystem::path(filePath).filename().string();

    std::ifstream file(filePath);
    if (!file.is_open()) {
        std::cerr << "[Error] Gagal membaca file: " << filePath << std::endl;
        return;
    }
    
    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string fileContent = buffer.str();
    file.close();

    // Hapus komentar multi-baris
    fileContent = std::regex_replace(fileContent, std::regex(R"(/\*[\s\S]*?\*/)"), "");

    std::vector<std::string> lines;
    std::stringstream ss(fileContent);
    std::string line;
    
    int programLineIndex = -1, kamusStart = -1, algoritmaStart = -1, endProgram = -1;
    
    int i = 0;
    while (std::getline(ss, line)) {
        lines.push_back(line); // Simpan baris asli (dengan komentar //)
        std::string trimmedLine = trim(line.substr(0, line.find("//")));
        
        if (programLineIndex == -1 && trimmedLine.rfind("program ", 0) == 0) programLineIndex = i;
        if (kamusStart == -1 && trimmedLine == "kamus") kamusStart = i;
        if (algoritmaStart == -1 && trimmedLine == "algoritma") algoritmaStart = i;
        if (endProgram == -1 && trimmedLine == "endprogram") endProgram = i;
        i++;
    }

    if (kamusStart == -1 || algoritmaStart == -1 || endProgram == -1 || programLineIndex == -1) {
        std::cerr << "[Error] Struktur program tidak valid (kurang program/kamus/algoritma/endprogram)." << std::endl;
        return;
    }

    programName = split(trim(lines[programLineIndex].substr(0, lines[programLineIndex].find("//"))), ' ')[1];
    
    std::vector<std::string> kamusLines(lines.begin() + kamusStart + 1, lines.begin() + algoritmaStart);
    std::vector<std::string> algoritmaLines(lines.begin() + algoritmaStart + 1, lines.begin() + endProgram);

    try {
        parseKamus(kamusLines);
        executeAlgoritma(algoritmaLines);
    } catch (const std::exception& e) {
        std::cerr << "[Fatal Error] " << e.what() << std::endl;
        return;
    }

    std::time_t startTime_t = std::chrono::system_clock::to_time_t(startTime);
    std::tm* ptm = std::localtime(&startTime_t);

    std::cout << "--- Properti Eksekusi ---" << std::endl;
    std::cout << "Nama Program: " << programName << std::endl;
    std::cout << "Waktu Eksekusi: " << std::put_time(ptm, "%d-%m-%Y %H:%M:%S") << std::endl;
    std::cout << "--- Output Program ---" << std::endl;
    for (const std::string& out : outputBuffer) {
        std::cout << out << std::endl;
    }
}


// --- 8. Entry Point ---
int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cout << "Penggunaan: " << argv[0] << " <nama_file.txt>" << std::endl;
        return 1;
    }

    std::string filePath = argv[1];
    runInterpreter(filePath);

    return 0;
}
