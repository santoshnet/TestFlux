"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const run_entity_1 = require("./run.entity");
const project_entity_1 = require("../projects/project.entity");
const bug_entity_1 = require("../bugs/bug.entity");
const runs_service_1 = require("./runs.service");
const runs_controller_1 = require("./runs.controller");
const run_execution_service_1 = require("./run-execution.service");
const storage_module_1 = require("../storage/storage.module");
const config_1 = require("@nestjs/config");
let RunsModule = class RunsModule {
};
exports.RunsModule = RunsModule;
exports.RunsModule = RunsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([run_entity_1.Run, project_entity_1.Project, bug_entity_1.Bug]),
            storage_module_1.StorageModule,
            config_1.ConfigModule,
        ],
        providers: [runs_service_1.RunsService, run_execution_service_1.RunExecutionService],
        controllers: [runs_controller_1.RunsController],
        exports: [runs_service_1.RunsService, run_execution_service_1.RunExecutionService],
    })
], RunsModule);
//# sourceMappingURL=runs.module.js.map