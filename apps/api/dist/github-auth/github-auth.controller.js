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
exports.GitHubAuthController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const github_connection_entity_1 = require("./github-connection.entity");
let GitHubAuthController = class GitHubAuthController {
    connectionRepository;
    constructor(connectionRepository) {
        this.connectionRepository = connectionRepository;
    }
    async getStatus(req) {
        const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
        const conn = await this.connectionRepository.findOne({
            where: { sessionId, active: true },
        });
        if (conn) {
            return {
                connected: true,
                login: conn.login,
                name: conn.name,
                avatarUrl: conn.avatarUrl,
                htmlUrl: conn.htmlUrl,
                connectedAt: conn.connectedAt,
            };
        }
        return { connected: false };
    }
    async login(res) {
        // Simulate GitHub OAuth login redirection.
        // In production, this redirects to github.com/login/oauth/authorize
        // For local development and out-of-the-box usage, we directly trigger the callback with a mock code.
        res.redirect('/api/github-auth/callback?code=mock_code_123');
    }
    async callback(req, res) {
        const code = req.query.code;
        const sessionId = 'local-demo-session'; // Using default session key for local ease of use
        // Create a mock active connection
        let conn = await this.connectionRepository.findOne({ where: { sessionId } });
        if (!conn) {
            conn = this.connectionRepository.create({
                sessionId,
                githubId: '998877',
                login: 'octocat-demo',
                name: 'The QA Octocat',
                avatarUrl: 'https://avatars.githubusercontent.com/u/5832347?v=4',
                htmlUrl: 'https://github.com/octocat',
                accessToken: 'mock_access_token_xyz',
                scope: 'repo,read:org',
                active: true,
            });
        }
        else {
            conn.active = true;
            conn.lastUsedAt = new Date();
        }
        await this.connectionRepository.save(conn);
        // Set cookie on response
        res.cookie('aia_session', sessionId, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
        });
        // Redirect back to frontend dashboard connections page
        const frontendUrl = process.env.NEXT_PUBLIC_API_URL
            ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
            : 'http://localhost:3000';
        res.redirect(`${frontendUrl}/projects?connected=github`);
    }
    async disconnect(req, res) {
        const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
        const conn = await this.connectionRepository.findOne({ where: { sessionId } });
        if (conn) {
            conn.active = false;
            await this.connectionRepository.save(conn);
        }
        res.clearCookie('aia_session');
        return res.status(common_1.HttpStatus.OK).json({ success: true });
    }
};
exports.GitHubAuthController = GitHubAuthController;
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GitHubAuthController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('login'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GitHubAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GitHubAuthController.prototype, "callback", null);
__decorate([
    (0, common_1.Post)('disconnect'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GitHubAuthController.prototype, "disconnect", null);
exports.GitHubAuthController = GitHubAuthController = __decorate([
    (0, common_1.Controller)('github-auth'),
    __param(0, (0, typeorm_1.InjectRepository)(github_connection_entity_1.GitHubConnection)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], GitHubAuthController);
//# sourceMappingURL=github-auth.controller.js.map