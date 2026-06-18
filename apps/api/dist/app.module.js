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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const path = __importStar(require("path"));
const project_entity_1 = require("./projects/project.entity");
const run_entity_1 = require("./runs/run.entity");
const bug_entity_1 = require("./bugs/bug.entity");
const agent_task_entity_1 = require("./agents/agent-task.entity");
const github_connection_entity_1 = require("./github-auth/github-connection.entity");
const projects_module_1 = require("./projects/projects.module");
const runs_module_1 = require("./runs/runs.module");
const bugs_module_1 = require("./bugs/bugs.module");
const agents_module_1 = require("./agents/agents.module");
const github_auth_module_1 = require("./github-auth/github-auth.module");
const storage_module_1 = require("./storage/storage.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                // .env lives at workspace root, two levels up from apps/api/
                envFilePath: [
                    path.resolve(__dirname, '../../../../.env'), // dist/   → root
                    path.resolve(__dirname, '../../../.env'), // src/    → root (ts-node)
                    path.resolve(process.cwd(), '../../.env'), // CWD fallback
                    path.resolve(process.cwd(), '.env'), // same-dir fallback
                ],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const dbPath = configService.get('DATABASE_PATH') || './data/database.sqlite';
                    return {
                        type: 'sqlite',
                        database: dbPath,
                        entities: [project_entity_1.Project, run_entity_1.Run, bug_entity_1.Bug, agent_task_entity_1.AgentTask, github_connection_entity_1.GitHubConnection],
                        synchronize: true, // Auto-create tables for local development
                        logging: false,
                    };
                },
            }),
            projects_module_1.ProjectsModule,
            runs_module_1.RunsModule,
            bugs_module_1.BugsModule,
            agents_module_1.AgentsModule,
            github_auth_module_1.GitHubAuthModule,
            storage_module_1.StorageModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map