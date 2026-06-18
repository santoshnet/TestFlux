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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BugsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bug_entity_1 = require("./bug.entity");
let BugsService = class BugsService {
    bugsRepository;
    constructor(bugsRepository) {
        this.bugsRepository = bugsRepository;
    }
    async findAllByRun(runId) {
        return this.bugsRepository.find({
            where: { runId },
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const bug = await this.bugsRepository.findOne({ where: { id } });
        if (!bug) {
            throw new common_1.NotFoundException(`Bug with ID ${id} not found`);
        }
        return bug;
    }
    async updateStatus(id, status) {
        const bug = await this.findOne(id);
        bug.status = status;
        return this.bugsRepository.save(bug);
    }
};
exports.BugsService = BugsService;
exports.BugsService = BugsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(bug_entity_1.Bug)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BugsService);
//# sourceMappingURL=bugs.service.js.map