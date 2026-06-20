import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GitHubAuthService } from '../github-auth/github-auth.service';
import axios from 'axios';
import { GeneratedTestFile } from './unit-test-generation.service';

@Injectable()
export class GitHubCommitService {
  constructor(private githubAuthService: GitHubAuthService) {}

  async commitTestsToRepository(
    sessionId: string,
    repoFullName: string,
    branch: string,
    testFiles: GeneratedTestFile[],
    commitMessage: string
  ): Promise<{ success: boolean; commitUrl?: string; error?: string }> {
    try {
      // Get GitHub connection
      const connection = await this.githubAuthService.getConnectionBySession(sessionId);
      if (!connection) {
        return { success: false, error: 'Not connected to GitHub' };
      }

      // Get the current branch reference
      const branchRef = await this.getBranchRef(connection.accessToken, repoFullName, branch);
      if (!branchRef) {
        return { success: false, error: 'Branch not found' };
      }

      // Create a new branch for tests
      const testBranchName = `unit-tests-${Date.now()}`;
      const newBranchRef = await this.createBranch(
        connection.accessToken,
        repoFullName,
        testBranchName,
        branchRef.object.sha
      );

      if (!newBranchRef) {
        return { success: false, error: 'Failed to create branch' };
      }

      // Create tree with all test files
      const treeSha = await this.createTree(
        connection.accessToken,
        repoFullName,
        testFiles,
        branchRef.object.sha
      );

      // Create commit
      const commitSha = await this.createCommit(
        connection.accessToken,
        repoFullName,
        commitMessage,
        treeSha,
        branchRef.object.sha
      );

      // Update branch reference
      await this.updateBranchRef(
        connection.accessToken,
        repoFullName,
        testBranchName,
        commitSha
      );

      // Create pull request
      const pullRequest = await this.createPullRequest(
        connection.accessToken,
        repoFullName,
        branch,
        testBranchName,
        commitMessage,
        this.generatePullRequestBody(testFiles.length)
      );

      return {
        success: true,
        commitUrl: pullRequest?.html_url,
      };
    } catch (error) {
      console.error('Error committing tests to GitHub:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to commit tests',
      };
    }
  }

  private async getBranchRef(accessToken: string, repoFullName: string, branch: string) {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repoFullName}/git/refs/heads/${branch}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting branch ref:', error);
      return null;
    }
  }

  private async createBranch(
    accessToken: string,
    repoFullName: string,
    branchName: string,
    fromSha: string
  ) {
    try {
      const response = await axios.post(
        `https://api.github.com/repos/${repoFullName}/git/refs`,
        {
          ref: `refs/heads/${branchName}`,
          sha: fromSha,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating branch:', error);
      return null;
    }
  }

  private async createTree(
    accessToken: string,
    repoFullName: string,
    files: GeneratedTestFile[],
    baseTreeSha: string
  ): Promise<string> {
    try {
      const tree = files.map(file => ({
        path: `tests/${file.path}`,
        mode: '100644',
        type: 'blob',
        content: file.content,
      }));

      const response = await axios.post(
        `https://api.github.com/repos/${repoFullName}/git/trees`,
        {
          base_tree: baseTreeSha,
          tree,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return response.data.sha;
    } catch (error) {
      console.error('Error creating tree:', error);
      throw new InternalServerErrorException('Failed to create git tree');
    }
  }

  private async createCommit(
    accessToken: string,
    repoFullName: string,
    message: string,
    treeSha: string,
    parentSha: string
  ): Promise<string> {
    try {
      const response = await axios.post(
        `https://api.github.com/repos/${repoFullName}/git/commits`,
        {
          message,
          tree: treeSha,
          parents: [parentSha],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return response.data.sha;
    } catch (error) {
      console.error('Error creating commit:', error);
      throw new InternalServerErrorException('Failed to create commit');
    }
  }

  private async updateBranchRef(
    accessToken: string,
    repoFullName: string,
    branchName: string,
    commitSha: string
  ) {
    try {
      await axios.patch(
        `https://api.github.com/repos/${repoFullName}/git/refs/heads/${branchName}`,
        {
          sha: commitSha,
          force: false,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
    } catch (error) {
      console.error('Error updating branch ref:', error);
      throw new InternalServerErrorException('Failed to update branch');
    }
  }

  private async createPullRequest(
    accessToken: string,
    repoFullName: string,
    baseBranch: string,
    headBranch: string,
    title: string,
    body: string
  ) {
    try {
      const response = await axios.post(
        `https://api.github.com/repos/${repoFullName}/pulls`,
        {
          title,
          body,
          head: headBranch,
          base: baseBranch,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      // PR might already exist or other issue, log but don't fail
      console.warn('Could not create pull request:', error.response?.data);
      return null;
    }
  }

  private generatePullRequestBody(testCount: number): string {
    return "## 🧪 Automated Unit Test Generation\n\nThis PR contains automatically generated unit tests for the repository.\n\n### 📊 Summary\n- **Generated Test Files**: " + testCount + "\n- **Test Type**: Unit Tests\n- **Generated by**: AI Playwright Agent\n\n### 📋 What's Included\n" + testCount + " new test files have been added to the tests/ directory. These tests cover the main source files in the repository.\n\n### ✅ Next Steps\n1. Review the generated tests\n2. Make any necessary adjustments\n3. Run the tests locally using the framework's test command\n4. Merge the PR if tests pass\n\n### 🚀 Running Tests\nSee the generated TEST_INSTRUCTIONS.md file for detailed instructions on running the tests for this project type.\n\n---\n*Note: These tests are AI-generated and should be reviewed before production use.*";
  }
}
