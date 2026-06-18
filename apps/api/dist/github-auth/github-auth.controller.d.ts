import { Repository } from 'typeorm';
import { GitHubConnection } from './github-connection.entity';
import { Request, Response } from 'express';
export declare class GitHubAuthController {
    private connectionRepository;
    constructor(connectionRepository: Repository<GitHubConnection>);
    getStatus(req: Request): Promise<any>;
    login(res: Response): Promise<void>;
    callback(req: Request, res: Response): Promise<void>;
    disconnect(req: Request, res: Response): Promise<any>;
}
//# sourceMappingURL=github-auth.controller.d.ts.map