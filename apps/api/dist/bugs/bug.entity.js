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
exports.Bug = void 0;
const typeorm_1 = require("typeorm");
let Bug = class Bug {
    id;
    runId;
    projectId;
    title;
    description;
    pageUrl;
    severity; // 'critical' | 'high' | 'medium' | 'low'
    category; // 'accessibility' | 'js-error' | 'layout' | 'functional'
    screenshotUrls; // JSON string of screenshot URLs
    videoUrl;
    evidence; // JSON string of other details (logs, network fails)
    reproductionSteps;
    aiExplanation;
    status; // 'open' | 'confirmed' | 'wontfix' | 'resolved'
    createdAt;
    updatedAt;
};
exports.Bug = Bug;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Bug.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ length: 36 }),
    __metadata("design:type", String)
], Bug.prototype, "runId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ length: 36 }),
    __metadata("design:type", String)
], Bug.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Bug.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Bug.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Bug.prototype, "pageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 24 }),
    __metadata("design:type", String)
], Bug.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 32 }),
    __metadata("design:type", String)
], Bug.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Bug.prototype, "screenshotUrls", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Bug.prototype, "videoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Bug.prototype, "evidence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Bug.prototype, "reproductionSteps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Bug.prototype, "aiExplanation", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 24, default: 'open' }),
    __metadata("design:type", String)
], Bug.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Bug.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Bug.prototype, "updatedAt", void 0);
exports.Bug = Bug = __decorate([
    (0, typeorm_1.Entity)('bugs')
], Bug);
//# sourceMappingURL=bug.entity.js.map