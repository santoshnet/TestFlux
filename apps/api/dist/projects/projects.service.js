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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const project_entity_1 = require("./project.entity");
let ProjectsService = class ProjectsService {
    projectsRepository;
    constructor(projectsRepository) {
        this.projectsRepository = projectsRepository;
    }
    async findAll() {
        return this.projectsRepository.find({ order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const project = await this.projectsRepository.findOne({ where: { id } });
        if (!project) {
            throw new common_1.NotFoundException(`Project with ID ${id} not found`);
        }
        return project;
    }
    async create(projectData) {
        const project = this.projectsRepository.create({
            ...projectData,
            credentials: projectData.credentials ? (typeof projectData.credentials === 'string' ? projectData.credentials : JSON.stringify(projectData.credentials)) : null,
            tags: projectData.tags ? (typeof projectData.tags === 'string' ? projectData.tags : JSON.stringify(projectData.tags)) : JSON.stringify([]),
        });
        return this.projectsRepository.save(project);
    }
    async update(id, updateData) {
        const project = await this.findOne(id);
        if (updateData.credentials !== undefined) {
            project.credentials = updateData.credentials ? (typeof updateData.credentials === 'string' ? updateData.credentials : JSON.stringify(updateData.credentials)) : null;
        }
        if (updateData.tags !== undefined) {
            project.tags = updateData.tags ? (typeof updateData.tags === 'string' ? updateData.tags : JSON.stringify(updateData.tags)) : JSON.stringify([]);
        }
        Object.assign(project, {
            ...updateData,
            credentials: project.credentials,
            tags: project.tags,
        });
        return this.projectsRepository.save(project);
    }
    async remove(id) {
        const result = await this.projectsRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`Project with ID ${id} not found`);
        }
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map