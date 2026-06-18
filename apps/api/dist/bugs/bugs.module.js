"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BugsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bug_entity_1 = require("./bug.entity");
const bugs_service_1 = require("./bugs.service");
const bugs_controller_1 = require("./bugs.controller");
let BugsModule = class BugsModule {
};
exports.BugsModule = BugsModule;
exports.BugsModule = BugsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([bug_entity_1.Bug])],
        providers: [bugs_service_1.BugsService],
        controllers: [bugs_controller_1.BugsController],
        exports: [bugs_service_1.BugsService],
    })
], BugsModule);
//# sourceMappingURL=bugs.module.js.map