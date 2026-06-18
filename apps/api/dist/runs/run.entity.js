"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Run = void 0;
const typeorm_1 = require("typeorm");
let Run = class Run {
    id;
    projectId;
    status; // 'queued' | 'running' | 'completed' | 'failed'
    startedAt;
    completedAt;
    pagesVisited;
    bugsFound;
    pagesDiscovered; // JSON string of discovered URLs
    userSteps; // JSON string of user steps for targeted runs
    generatedTestCode; // generated spec.ts code
    summary; // JSON string of summary statistics (duration, details)
    errorMessage;
    artifacts; // JSON string of screenshots/testCodeUrl
    browser; // 'chromium' | 'firefox' | 'webkit'
    createdAt;
    updatedAt;
};
exports.Run = Run;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Run.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ length: 36 }),
    __metadata("design:type", String)
], Run.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 24, default: 'queued' }),
    __metadata("design:type", String)
], Run.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Run.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], Run.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Run.prototype, "pagesVisited", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Run.prototype, "bugsFound", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Run.prototype, "pagesDiscovered", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Run.prototype, "userSteps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Run.prototype, "generatedTestCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Run.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Run.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Run.prototype, "artifacts", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 32, default: 'chromium' }),
    __metadata("design:type", String)
], Run.prototype, "browser", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Run.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Run.prototype, "updatedAt", void 0);
exports.Run = Run = __decorate([
    (0, typeorm_1.Entity)('runs')
], Run);
//# sourceMappingURL=run.entity.js.map