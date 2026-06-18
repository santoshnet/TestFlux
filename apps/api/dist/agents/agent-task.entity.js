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
exports.AgentTask = void 0;
const typeorm_1 = require("typeorm");
let AgentTask = class AgentTask {
    id;
    prompt;
    repoUrl;
    targetRef;
    details; // JSON string
    assignedAgent;
    status; // 'queued' | 'running' | 'completed' | 'failed'
    messages; // JSON string of message logs
    suggestedActions; // JSON string of suggested actions
    analytics; // JSON string of token usage/cost/duration
    result; // JSON string of outputs
    createdAt;
    updatedAt;
};
exports.AgentTask = AgentTask;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AgentTask.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], AgentTask.prototype, "prompt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AgentTask.prototype, "repoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AgentTask.prototype, "targetRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AgentTask.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 64 }),
    __metadata("design:type", String)
], AgentTask.prototype, "assignedAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 24, default: 'completed' }),
    __metadata("design:type", String)
], AgentTask.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AgentTask.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AgentTask.prototype, "suggestedActions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AgentTask.prototype, "analytics", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AgentTask.prototype, "result", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AgentTask.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AgentTask.prototype, "updatedAt", void 0);
exports.AgentTask = AgentTask = __decorate([
    (0, typeorm_1.Entity)('agent_tasks')
], AgentTask);
//# sourceMappingURL=agent-task.entity.js.map