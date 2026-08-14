"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = __importStar(require("bcrypt"));
var seed_password_1 = require("../src/config/seed-password");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, senhaResolvida, isDev, salt, senhaPadrao, usuarios, _i, usuarios_1, u, enderecos, _b, enderecos_1, end, produtos, _c, produtos_1, prod;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('🌱 Iniciando o Seed do Banco de Dados...');
                    _a = (0, seed_password_1.resolveSeedPassword)(), senhaResolvida = _a.password, isDev = _a.isDev;
                    return [4 /*yield*/, bcrypt.genSalt(10)];
                case 1:
                    salt = _d.sent();
                    return [4 /*yield*/, bcrypt.hash(senhaResolvida, salt)];
                case 2:
                    senhaPadrao = _d.sent();
                    if (!isDev) {
                        console.log('🔒 Ambiente não-desenvolvimento: usando SEED_ADMIN_PASSWORD do ambiente.');
                    }
                    usuarios = [
                        { nome: 'Administrador SGE', email: 'admin@fortal.com.br', perfil: 'ADMIN' },
                        { nome: 'Gestor Operacional', email: 'gestor@fortal.com.br', perfil: 'GESTOR' },
                        { nome: 'Operador Logístico', email: 'operador@fortal.com.br', perfil: 'OPERADOR' },
                    ];
                    _i = 0, usuarios_1 = usuarios;
                    _d.label = 3;
                case 3:
                    if (!(_i < usuarios_1.length)) return [3 /*break*/, 6];
                    u = usuarios_1[_i];
                    return [4 /*yield*/, prisma.usuario.upsert({
                            where: { email: u.email },
                            update: {},
                            create: {
                                nome: u.nome,
                                email: u.email,
                                senha: senhaPadrao,
                                perfil: u.perfil,
                                ativo: true,
                            },
                        })];
                case 4:
                    _d.sent();
                    _d.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    console.log("\u2705 ".concat(usuarios.length, " Usu\u00E1rios inseridos (ADMIN, GESTOR, OPERADOR)."));
                    enderecos = [
                        { codigo: 'A-01-01', zona: 'A', tipoZona: 'SECO', capacidade: 1000 },
                        { codigo: 'A-01-02', zona: 'A', tipoZona: 'SECO', capacidade: 1000 },
                        { codigo: 'B-01-01', zona: 'B', tipoZona: 'REFRIGERADO', capacidade: 500 },
                        { codigo: 'B-01-02', zona: 'B', tipoZona: 'REFRIGERADO', capacidade: 500 },
                        { codigo: 'C-01-01', zona: 'C', tipoZona: 'CONGELADO', capacidade: 300 },
                    ];
                    _b = 0, enderecos_1 = enderecos;
                    _d.label = 7;
                case 7:
                    if (!(_b < enderecos_1.length)) return [3 /*break*/, 10];
                    end = enderecos_1[_b];
                    return [4 /*yield*/, prisma.endereco.upsert({
                            where: { codigo: end.codigo },
                            update: {},
                            create: {
                                codigo: end.codigo,
                                zona: end.zona,
                                tipoZona: end.tipoZona,
                                capacidade: end.capacidade,
                                ocupado: 0,
                                ativo: true,
                            },
                        })];
                case 8:
                    _d.sent();
                    _d.label = 9;
                case 9:
                    _b++;
                    return [3 /*break*/, 7];
                case 10:
                    console.log("\u2705 ".concat(enderecos.length, " Endere\u00E7os inseridos (Zonas SECO, REFRIGERADO, CONGELADO)."));
                    produtos = [
                        { sku: 'SKU-SECO-001', descricao: 'Arroz Branco 5kg', categoria: 'Alimentos', perecivel: false, tipoZonaRequerida: 'SECO', curvaAbc: 'A', custoMedio: 20.50 },
                        { sku: 'SKU-REFR-001', descricao: 'Iogurte Natural', categoria: 'Laticínios', perecivel: true, tipoZonaRequerida: 'REFRIGERADO', curvaAbc: 'B', custoMedio: 5.00 },
                        { sku: 'SKU-CONG-001', descricao: 'Picanha Bovina', categoria: 'Carnes', perecivel: true, tipoZonaRequerida: 'CONGELADO', curvaAbc: 'A', custoMedio: 80.00 },
                    ];
                    _c = 0, produtos_1 = produtos;
                    _d.label = 11;
                case 11:
                    if (!(_c < produtos_1.length)) return [3 /*break*/, 14];
                    prod = produtos_1[_c];
                    return [4 /*yield*/, prisma.produto.upsert({
                            where: { sku: prod.sku },
                            update: {},
                            create: {
                                sku: prod.sku,
                                descricao: prod.descricao,
                                categoria: prod.categoria,
                                perecivel: prod.perecivel,
                                tipoZonaRequerida: prod.tipoZonaRequerida,
                                curvaAbc: prod.curvaAbc,
                                custoMedio: prod.custoMedio,
                                ativo: true,
                            },
                        })];
                case 12:
                    _d.sent();
                    _d.label = 13;
                case 13:
                    _c++;
                    return [3 /*break*/, 11];
                case 14:
                    console.log("\u2705 ".concat(produtos.length, " Produtos inseridos (Curvas A/B/C)."));
                    console.log('🎯 Seed concluído com sucesso!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
