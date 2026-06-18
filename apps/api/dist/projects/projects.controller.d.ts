import { ProjectsService } from './projects.service';
import { Project } from './project.entity';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    findAll(): Promise<Project[]>;
    findOne(id: string): Promise<Project>;
    create(projectData: Partial<Project>): Promise<Project>;
    update(id: string, updateData: Partial<Project>): Promise<Project>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=projects.controller.d.ts.map