'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaGithub, FaSync, FaCode, FaStar, FaCodeBranch, FaExclamationCircle, FaFolder, FaLock } from 'react-icons/fa';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  private: boolean;
  fork: boolean;
  stars: number;
  forks: number;
  openIssues: number;
  htmlUrl: string | null;
  lastScannedAt: Date | null;
  isScanning: boolean;
}

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);

  useEffect(() => {
    checkGitHubConnection();
    loadRepositories();
  }, []);

  const checkGitHubConnection = async () => {
    try {
      const res = await fetch('/api/github-auth/status');
      const data = await res.json();
      setGithubConnected(data.connected);
    } catch (err) {
      console.error('Error checking GitHub connection:', err);
    }
  };

  const loadRepositories = async () => {
    try {
      const res = await fetch('/api/github-repositories');
      const data = await res.json();
      setRepositories(data.repositories || []);
    } catch (err) {
      console.error('Error loading repositories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!githubConnected) {
      window.location.href = '/api/github-auth/login';
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch('/api/github-repositories/sync', { method: 'POST' });
      const data = await res.json();
      setRepositories(data.repositories || []);
    } catch (err) {
      console.error('Error syncing repositories:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleScan = async (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) return;

    // Update local state to show scanning
    setRepositories(repos => repos.map(r => 
      r.id === repoId ? { ...r, isScanning: true } : r
    ));

    try {
      const res = await fetch(`/api/github-repositories/${repoId}/scan`, { method: 'POST' });
      const data = await res.json();
      
      // Update repository with scan results
      setRepositories(repos => repos.map(r => 
        r.id === repoId ? { ...r, isScanning: false, lastScannedAt: new Date() } : r
      ));
      
      // Navigate to repository details page
      window.location.href = `/repositories/${repoId}`;
    } catch (err) {
      console.error('Error scanning repository:', err);
      setRepositories(repos => repos.map(r => 
        r.id === repoId ? { ...r, isScanning: false } : r
      ));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
            <FaGithub style={{ marginRight: '12px', color: 'var(--accent-teal)' }} />
            GitHub Repositories
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {githubConnected 
              ? 'Connected to GitHub - Browse and scan your repositories'
              : 'Connect GitHub to browse and scan your repositories'
            }
          </p>
        </div>
        <button 
          onClick={handleSync}
          disabled={syncing}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaSync size={16} className={syncing ? 'spin' : ''} />
          {syncing ? 'Syncing...' : githubConnected ? 'Sync Repositories' : 'Connect GitHub'}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading repositories...</p>
        </div>
      ) : !githubConnected ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <FaGithub size={64} style={{ color: 'var(--text-secondary)', marginBottom: '24px' }} />
          <h3 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>Connect to GitHub</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
            Connect your GitHub account to browse repositories, scan code, and integrate with your QA testing workflows.
          </p>
          <button onClick={handleSync} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
            <FaGithub size={18} />
            Connect GitHub Account
          </button>
        </div>
      ) : repositories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <FaFolder size={64} style={{ color: 'var(--text-secondary)', marginBottom: '24px' }} />
          <h3 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>No Repositories Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Click "Sync Repositories" to load your GitHub repositories
          </p>
        </div>
      ) : (
        <div className="grid-layout">
          {repositories.map((repo) => (
            <div key={repo.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>
                    <Link href={`/repositories/${repo.id}`} style={{ color: 'var(--accent-teal)', textDecoration: 'none' }}>
                      {repo.name}
                    </Link>
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {repo.private && (
                      <span className="badge badge-info" title="Private repository">
                        <FaLock size={12} />
                      </span>
                    )}
                    {repo.fork && (
                      <span className="badge badge-secondary" title="Forked repository">
                        <FaCodeBranch size={12} />
                      </span>
                    )}
                  </div>
                </div>
                
                {repo.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px', lineHeight: 1.4 }}>
                    {repo.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {repo.language && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ 
                        width: '10px', 
                        height: '10px', 
                        borderRadius: '50%', 
                        background: getLanguageColor(repo.language) 
                      }} />
                      {repo.language}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaStar size={12} />
                    {repo.stars}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaCodeBranch size={12} />
                    {repo.forks}
                  </span>
                </div>

                {repo.lastScannedAt && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Last scanned: {new Date(repo.lastScannedAt).toLocaleString()}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <Link href={`/repositories/${repo.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                  <FaFolder size={14} style={{ marginRight: '6px' }} />
                  Browse
                </Link>
                <button 
                  onClick={() => handleScan(repo.id)}
                  disabled={repo.isScanning}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  {repo.isScanning ? (
                    <>
                      <FaSync size={14} className="spin" style={{ marginRight: '6px' }} />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <FaCode size={14} style={{ marginRight: '6px' }} />
                      Scan Code
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'Python': '#3572A5',
    'Java': '#b07219',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'C++': '#f34b7d',
    'C#': '#239120',
    'Ruby': '#701516',
    'PHP': '#4F5D95',
    'Swift': '#F05138',
    'Kotlin': '#A97BFF',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Shell': '#89e051',
  };
  return colors[language] || '#8b949e';
}