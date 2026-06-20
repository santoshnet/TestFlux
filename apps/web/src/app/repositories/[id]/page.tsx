'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FaGithub, 
  FaArrowLeft, 
  FaFolder, 
  FaFile, 
  FaCode, 
  FaSync, 
  FaExclamationCircle,
  FaStar,
  FaCodeBranch,
  FaLock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlus,
  FaFlask,
  FaShieldAlt
} from 'react-icons/fa';
import { FaLock as FaLock6 } from 'react-icons/fa6';

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
  scanResults: any;
  lastScannedAt: Date | null;
  isScanning: boolean;
}

interface File {
  name: string;
  path: string;
  type: string;
  size: number;
}

export default function RepositoryDetailPage({ params }: { params: { id: string } }) {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'scan'>('files');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [showTestGenerationModal, setShowTestGenerationModal] = useState(false);
  const [generatingTests, setGeneratingTests] = useState(false);
  const [testGenerationResult, setTestGenerationResult] = useState<any>(null);
  const [committingTests, setCommittingTests] = useState(false);
  const [showSecurityScanModal, setShowSecurityScanModal] = useState(false);
  const [scanningSecurity, setScanningSecurity] = useState(false);
  const [securityScanResult, setSecurityScanResult] = useState<any>(null);

  useEffect(() => {
    loadRepository();
    loadFiles('');
  }, [params.id]);

  const loadRepository = async () => {
    try {
      const res = await fetch(`/api/github-repositories/${params.id}`);
      const data = await res.json();
      setRepository(data.repository);
    } catch (err) {
      console.error('Error loading repository:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (path: string) => {
    try {
      const res = await fetch(`/api/github-repositories/${params.id}/files?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      setFiles(data.files || []);
      setCurrentPath(path);
    } catch (err) {
      console.error('Error loading files:', err);
    }
  };

  const loadFileContent = async (file: File) => {
    setSelectedFile(file);
    try {
      const res = await fetch(`/api/github-repositories/${params.id}/content?path=${encodeURIComponent(file.path)}`);
      const data = await res.json();
      if (data.success) {
        // Base64 decode
        const content = atob(data.content);
        setFileContent(content);
      }
    } catch (err) {
      console.error('Error loading file content:', err);
    }
  };

  const handleScan = async () => {
    if (!repository) return;

    setScanning(true);
    try {
      const res = await fetch(`/api/github-repositories/${params.id}/scan`, { method: 'POST' });
      const data = await res.json();
      
      await loadRepository();
      setActiveTab('scan');
    } catch (err) {
      console.error('Error scanning repository:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleFolderClick = (file: File) => {
    if (file.type === 'dir') {
      loadFiles(file.path);
    } else {
      loadFileContent(file);
    }
  };

  const handleBackClick = () => {
    if (currentPath) {
      const parentPath = currentPath.split('/').slice(0, -1).join('/');
      loadFiles(parentPath);
    }
  };

  const handleCreateQAProject = async () => {
    if (!repository) return;

    setCreatingProject(true);
    try {
      // Create a new project using repository information
      const projectData = {
        name: `${repository.name}-qa-project`,
        url: repository.htmlUrl || '',
        description: `QA testing project for ${repository.fullName}`,
        maxDepth: 3,
        maxPages: 50,
        aiProvider: 'claude',
        tags: JSON.stringify(['github', repository.language || 'unknown']),
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (res.ok) {
        const data = await res.json();
        setShowCreateProjectModal(false);
        // Redirect to the new project
        window.location.href = `/projects/${data.id}`;
      } else {
        throw new Error('Failed to create project');
      }
    } catch (err) {
      console.error('Error creating QA project:', err);
      alert('Failed to create QA project. Please try again.');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleGenerateTests = async () => {
    if (!repository) return;

    setGeneratingTests(true);
    setTestGenerationResult(null);
    try {
      const res = await fetch(`/api/unit-test-generation/${repository.id}/generate`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        setTestGenerationResult(data.data);
      } else {
        throw new Error(data.error || 'Failed to generate tests');
      }
    } catch (err) {
      console.error('Error generating tests:', err);
      alert('Failed to generate tests. Please try again.');
    } finally {
      setGeneratingTests(false);
    }
  };

  const handleCommitTests = async () => {
    if (!testGenerationResult || !repository) return;

    setCommittingTests(true);
    try {
      const res = await fetch(`/api/unit-test-generation/${repository.id}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName: repository.fullName,
          branch: 'main',
          testFiles: testGenerationResult.generatedTests,
          commitMessage: `Add automated unit tests for ${repository.name}`,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Tests committed successfully! Pull request created.');
        setShowTestGenerationModal(false);
        if (data.commitUrl) {
          window.open(data.commitUrl, '_blank');
        }
      } else {
        throw new Error(data.error || 'Failed to commit tests');
      }
    } catch (err) {
      console.error('Error committing tests:', err);
      alert('Failed to commit tests. Please try again.');
    } finally {
      setCommittingTests(false);
    }
  };

  const handleSecurityScan = async () => {
    if (!repository) return;

    setScanningSecurity(true);
    setSecurityScanResult(null);
    try {
      const res = await fetch(`/api/security-scanning/${repository.id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName: repository.fullName,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSecurityScanResult(data.data);
      } else {
        throw new Error(data.error || 'Failed to scan repository');
      }
    } catch (err) {
      console.error('Error scanning security:', err);
      alert('Failed to scan repository. Please try again.');
    } finally {
      setScanningSecurity(false);
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#fbbf24'; // Yellow
    if (score >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'rgba(220, 38, 38, 0.2)',
      high: 'rgba(234, 88, 12, 0.2)',
      medium: 'rgba(234, 179, 8, 0.2)',
      low: 'rgba(132, 204, 22, 0.2)',
    };
    return colors[severity] || colors.low;
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'A+': 'rgba(16, 185, 129, 0.2)',
      'A': 'rgba(16, 185, 129, 0.15)',
      'B': 'rgba(251, 191, 36, 0.15)',
      'C': 'rgba(249, 115, 22, 0.15)',
      'D': 'rgba(239, 68, 68, 0.15)',
      'F': 'rgba(220, 38, 38, 0.2)',
    };
    return colors[grade] || colors['A'];
  };

  if (loading) {
    return (
      <div className="card loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading repository details...</p>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
        <FaExclamationCircle size={64} style={{ color: 'var(--color-danger)', marginBottom: '24px' }} />
        <h3 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>Repository Not Found</h3>
        <Link href="/repositories">
          <button className="btn btn-secondary">Back to Repositories</button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
          <div>
            <Link href="/repositories" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px', textDecoration: 'none' }}>
              <FaArrowLeft size={14} />
              Back to Repositories
            </Link>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaGithub style={{ color: 'var(--accent-teal)' }} />
              {repository.name}
              {repository.private && (
                <span className="badge badge-info">
                  <FaLock6 size={12} style={{ marginRight: '4px' }} />
                  Private
                </span>
              )}
              {repository.fork && (
                <span className="badge badge-secondary">
                  <FaCodeBranch size={12} style={{ marginRight: '4px' }} />
                  Fork
                </span>
              )}
            </h1>
            {repository.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
                {repository.description}
              </p>
            )}
            <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {repository.language && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    background: getLanguageColor(repository.language) 
                  }} />
                  {repository.language}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaStar size={14} />
                {repository.stars} stars
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaCodeBranch size={14} />
                {repository.forks} forks
              </span>
              {repository.lastScannedAt && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaCheckCircle size={14} />
                  Scanned {new Date(repository.lastScannedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleScan}
              disabled={scanning}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {scanning ? (
                <>
                  <FaSync size={16} className="spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <FaCode size={16} />
                  Scan Repository
                </>
              )}
            </button>
            <button
              onClick={() => setShowSecurityScanModal(true)}
              className="btn btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaShieldAlt size={16} />
              Security Scan
            </button>
            <button
              onClick={() => setShowTestGenerationModal(true)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaFlask size={16} />
              Generate Unit Tests
            </button>
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaPlus size={16} />
              Create QA Project
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('files')}
            className={activeTab === 'files' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            style={{ 
              borderBottom: activeTab === 'files' ? '2px solid var(--accent-teal)' : 'none',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0'
            }}
          >
            <FaFolder size={14} style={{ marginRight: '6px' }} />
            Files
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={activeTab === 'scan' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
            style={{ 
              borderBottom: activeTab === 'scan' ? '2px solid var(--accent-teal)' : 'none',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0'
            }}
          >
            <FaCode size={14} style={{ marginRight: '6px' }} />
            Scan Results
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'files' ? (
        <div className="grid-layout" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* File Browser */}
          <div className="card" style={{ padding: '0' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>File Browser</h3>
              {currentPath && (
                <button onClick={handleBackClick} className="btn btn-secondary btn-sm">
                  <FaArrowLeft size={14} style={{ marginRight: '6px' }} />
                  Back
                </button>
              )}
            </div>
            <div style={{ padding: '8px', minHeight: '400px' }}>
              {currentPath && (
                <div style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                  {currentPath}
                </div>
              )}
              {files.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <FaFolder size={48} style={{ marginBottom: '16px' }} />
                  <p>This folder is empty</p>
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => handleFolderClick(file)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'var(--transition-smooth)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 242, 254, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {file.type === 'dir' ? (
                      <FaFolder size={18} style={{ color: '#54aeff' }} />
                    ) : (
                      <FaFile size={18} style={{ color: 'var(--text-secondary)' }} />
                    )}
                    <span style={{ flex: 1, fontSize: '0.9rem' }}>{file.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* File Content */}
          {selectedFile ? (
            <div className="card" style={{ padding: '0' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>
                  <FaFile size={14} style={{ marginRight: '8px', color: 'var(--text-secondary)' }} />
                  {selectedFile.name}
                </h3>
              </div>
              <pre style={{ 
                padding: '16px', 
                margin: 0, 
                overflow: 'auto', 
                maxHeight: '400px',
                fontSize: '0.85rem',
                lineHeight: 1.4,
                fontFamily: 'monospace',
                background: 'rgba(0, 0, 0, 0.3)'
              }}>
                {fileContent || 'Loading file content...'}
              </pre>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              <FaFile size={64} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Select a file to view its content</p>
            </div>
          )}
        </div>
      ) : (
        <ScanResults repository={repository} />
      )}

      {/* Create QA Project Modal */}
      {showCreateProjectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Create QA Project</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Create a new QA testing project for this repository. This will allow you to run automated tests on the repository.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Project Name
              </label>
              <input
                type="text"
                defaultValue={`${repository?.name}-qa-project`}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Repository URL
              </label>
              <input
                type="text"
                defaultValue={repository?.htmlUrl || ''}
                readOnly
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateProjectModal(false)}
                className="btn btn-secondary"
                disabled={creatingProject}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateQAProject}
                className="btn btn-primary"
                disabled={creatingProject}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {creatingProject ? (
                  <>
                    <FaSync size={16} className="spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FaPlus size={16} />
                    Create Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Test Generation Modal */}
      {showTestGenerationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ maxWidth: '700px', width: '90%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaFlask size={20} />
              Unit Test Generation
            </h3>
            
            {!testGenerationResult ? (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Generate unit tests for this repository. The system will automatically detect the project type 
                  and generate appropriate tests using {repository?.language || 'the appropriate testing framework'}.
                </p>
                
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
                    Project Information:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>Name:</span> {repository?.name}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Language:</span> {repository?.language || 'Unknown'}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Stars:</span> {repository?.stars}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>Forks:</span> {repository?.forks}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowTestGenerationModal(false)}
                    className="btn btn-secondary"
                    disabled={generatingTests}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateTests}
                    className="btn btn-primary"
                    disabled={generatingTests}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {generatingTests ? (
                      <>
                        <FaSync size={16} className="spin" />
                        Generating Tests...
                      </>
                    ) : (
                      <>
                        <FaFlask size={16} />
                        Generate Unit Tests
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>
                    Project Detection Results:
                  </h4>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(0, 242, 254, 0.05)', 
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem'
                  }}>
                    <div><strong>Type:</strong> {testGenerationResult.projectType.type}</div>
                    <div><strong>Framework:</strong> {testGenerationResult.projectType.framework || 'Not detected'}</div>
                    <div><strong>Testing Framework:</strong> {testGenerationResult.projectType.testingFramework || 'Jest'}</div>
                    <div><strong>Confidence:</strong> {Math.round(testGenerationResult.projectType.confidence * 100)}%</div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>
                    Generated Tests ({testGenerationResult.generatedTests.length} files):
                  </h4>
                  <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto', 
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px'
                  }}>
                    {testGenerationResult.generatedTests.map((test: any, index: number) => (
                      <div key={index} style={{ 
                        padding: '8px', 
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{test.path}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            {test.language} • {test.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>
                    Summary:
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {testGenerationResult.summary}
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>
                    Running Instructions:
                  </h4>
                  <pre style={{ 
                    background: 'rgba(0, 0, 0, 0.3)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.4
                  }}>
                    {testGenerationResult.instructions}
                  </pre>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setShowTestGenerationModal(false);
                      setTestGenerationResult(null);
                    }}
                    className="btn btn-secondary"
                    disabled={committingTests}
                  >
                    Close
                  </button>
                  <button
                    onClick={handleCommitTests}
                    className="btn btn-primary"
                    disabled={committingTests}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {committingTests ? (
                      <>
                        <FaSync size={16} className="spin" />
                        Committing...
                      </>
                    ) : (
                      <>
                        <FaGithub size={16} />
                        Commit to GitHub
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Scan Modal */}
      {showSecurityScanModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ maxWidth: '800px', width: '90%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaShieldAlt size={20} />
              Security Scan
            </h3>
            
            {!securityScanResult ? (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Scan this repository for security vulnerabilities including code injection, XSS, SQL injection, hardcoded secrets, and more.
                </p>
                
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
                    Scan Coverage:
                  </h4>
                  <ul style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <li>✅ Technology-specific security rules</li>
                    <li>✅ OWASP Top 10 vulnerability detection</li>
                    <li>✅ CWE mapping and classification</li>
                    <li>✅ Secret detection (API keys, tokens, passwords)</li>
                    <li>✅ AI-powered fix suggestions</li>
                    <li>✅ Security scoring (0-100)</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowSecurityScanModal(false)}
                    className="btn btn-secondary"
                    disabled={scanningSecurity}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSecurityScan}
                    className="btn btn-danger"
                    disabled={scanningSecurity}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {scanningSecurity ? (
                      <>
                        <FaSync size={16} className="spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <FaShieldAlt size={16} />
                        Start Security Scan
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>
                    Security Score: {securityScanResult.securityScore}/100
                    <span style={{ 
                      marginLeft: '12px', 
                      padding: '4px 12px', 
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      background: getGradeColor(securityScanResult.grade),
                    }}>
                      Grade: {securityScanResult.grade}
                    </span>
                  </h4>
                  <div style={{
                    width: '100%',
                    height: '24px',
                    background: '#333',
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${securityScanResult.securityScore}%`,
                      height: '100%',
                      background: getSecurityScoreColor(securityScanResult.securityScore),
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>
                    Project Information
                  </h4>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(0, 242, 254, 0.05)', 
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px'
                  }}>
                    <div><strong>Type:</strong> {securityScanResult.projectType.type}</div>
                    <div><strong>Framework:</strong> {securityScanResult.projectType.framework || 'N/A'}</div>
                    <div><strong>Platform:</strong> {securityScanResult.projectType.platform || 'N/A'}</div>
                    <div><strong>Language:</strong> {securityScanResult.projectType.language || 'N/A'}</div>
                    <div><strong>Build System:</strong> {securityScanResult.projectType.buildSystem || 'N/A'}</div>
                    <div><strong>Confidence:</strong> {Math.round((securityScanResult.projectType.confidence || 0) * 100)}%</div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>
                    Dependencies ({securityScanResult.dependencies.length})
                  </h4>
                  {securityScanResult.vulnerableDependencies.length > 0 && (
                    <div style={{ 
                      marginBottom: '8px', 
                      padding: '8px', 
                      background: 'rgba(220, 38, 38, 0.1)', 
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      color: '#f87171'
                    }}>
                      ⚠️ {securityScanResult.vulnerableDependencies.length} vulnerable dependencies detected
                    </div>
                  )}
                  <div style={{ 
                    maxHeight: '80px', 
                    overflowY: 'auto', 
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {securityScanResult.dependencies.slice(0, 20).map((dep: string, index: number) => (
                      <div key={index} style={{ display: 'inline-block', margin: '2px 4px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                        {dep}
                      </div>
                    ))}
                    {securityScanResult.dependencies.length > 20 && <div style={{ marginTop: '4px' }}>+{securityScanResult.dependencies.length - 20} more...</div>}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>
                    Security Recommendations
                  </h4>
                  <div style={{ 
                    maxHeight: '100px', 
                    overflowY: 'auto', 
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px'
                  }}>
                    {securityScanResult.recommendations.map((rec: string, index: number) => (
                      <div key={index} style={{ 
                        padding: '6px', 
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                      }}>
                        <span style={{ color: '#00f2fe' }}>✓</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(220, 38, 38, 0.1)', 
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f87171' }}>
                      {securityScanResult.summary.critical}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Critical</div>
                  </div>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(234, 88, 12, 0.1)', 
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fb923c' }}>
                      {securityScanResult.summary.high}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>High</div>
                  </div>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(234, 179, 8, 0.1)', 
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>
                      {securityScanResult.summary.medium}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Medium</div>
                  </div>
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(132, 204, 22, 0.1)', 
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a3e635' }}>
                      {securityScanResult.summary.low}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Low</div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>
                    Vulnerability Categories
                  </h4>
                  <div style={{ 
                    maxHeight: '100px', 
                    overflowY: 'auto', 
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px'
                  }}>
                    {Object.entries(securityScanResult.categories).map(([category, count]: [string, number]) => (
                      <div key={category} style={{ 
                        padding: '6px', 
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>{category}</span>
                        <span style={{ fontWeight: 'bold' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>
                    Security Issues ({securityScanResult.issues.length})
                  </h4>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px'
                  }}>
                    {securityScanResult.issues.map((issue: any, index: number) => (
                      <div key={index} style={{ 
                        padding: '10px', 
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: '0.85rem',
                      }}>
                        <div style={{ 
                          fontWeight: 600, 
                          marginBottom: '4px',
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center' 
                        }}>
                          <span>{issue.name}</span>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            background: getSeverityColor(issue.severity),
                          }}>
                            {issue.severity.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '4px' }}>
                          {issue.file}:{issue.line} • {issue.category} {issue.platform && `• ${issue.platform}`} {issue.framework && `• ${issue.framework}`}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          {issue.cwe && `CWE: ${issue.cwe}`} {issue.cwe && issue.owasp && ' • '} {issue.owasp && `OWASP: ${issue.owasp}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setShowSecurityScanModal(false);
                      setSecurityScanResult(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScanResults({ repository }: { repository: Repository }) {
  if (!repository.scanResults) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
        <FaCode size={64} style={{ color: 'var(--text-secondary)', marginBottom: '24px' }} />
        <h3 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>No Scan Results</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Click "Scan Repository" to analyze the code
        </p>
      </div>
    );
  }

  const scanResults = repository.scanResults;

  return (
    <div className="grid-layout">
      {/* Summary */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Scan Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.05)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Files</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-teal)' }}>{scanResults.summary.totalFiles}</p>
          </div>
          <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.05)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Lines</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-teal)' }}>{scanResults.summary.totalLines.toLocaleString()}</p>
          </div>
        </div>
        
        {Object.keys(scanResults.summary.languages).length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Languages</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(scanResults.summary.languages).map(([lang, count]) => (
                <span key={lang} className="badge badge-info">
                  {lang}: {count as number}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Insights</h3>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {scanResults.insights.map((insight: string, index: number) => (
            <li key={index} style={{ marginBottom: '12px', display: 'flex', alignItems: 'start', gap: '8px' }}>
              <FaCheckCircle size={14} style={{ color: 'var(--color-success)', marginTop: '2px' }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* AI Analysis */}
      {scanResults.aiAnalysis && (
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>AI Analysis</h3>
          <div style={{ 
            padding: '16px', 
            background: 'rgba(0, 242, 254, 0.03)', 
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            fontSize: '0.9rem'
          }}>
            {scanResults.aiAnalysis}
          </div>
        </div>
      )}

      {/* File Issues */}
      {scanResults.files && scanResults.files.filter((f: any) => f.issues.length > 0).length > 0 && (
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Potential Issues</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Language</th>
                  <th>Issues</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {scanResults.files
                  .filter((f: any) => f.issues.length > 0)
                  .slice(0, 10)
                  .map((file: any, index: number) => (
                    <tr key={index}>
                      <td>{file.path}</td>
                      <td>{file.language}</td>
                      <td>
                        {file.issues.map((issue: any, i: number) => (
                          <div key={i} style={{ fontSize: '0.8rem', marginBottom: '2px' }}>
                            {issue.message}
                          </div>
                        ))}
                      </td>
                      <td>
                        {file.issues.map((issue: any, i: number) => (
                          <span key={i} className={`badge badge-${issue.severity === 'high' ? 'danger' : issue.severity === 'medium' ? 'warning' : 'info'}`} style={{ marginRight: '4px', fontSize: '0.7rem' }}>
                            {issue.severity}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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