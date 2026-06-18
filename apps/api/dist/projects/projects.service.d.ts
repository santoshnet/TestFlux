import { Repository } from 'typeorm';
import { Project } from './project.entity';
export declare class ProjectsService {
    private projectsRepository;
    constructor(projectsRepository: Repository<Project>);
    findAll(): Promise<Project[]>;
    findOne(id: string): Promise<Project>;
    create(projectData: any): Promise<Project>;
    update(id: string, updateData: any): Promise<Project>;
    remove(id: string): Promise<void>;
}
//# sourceMappingURL=projects.service.d.ts.map