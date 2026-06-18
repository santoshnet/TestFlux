'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaPlus, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

interface Project {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: string;
  maxDepth: number;
  maxPages: number;
  aiProvider: string;
  tags?: string; // JSON string
  createdAt: string;
}

export default function ProjectsPage() {
   const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [playwrightInstalled, setPlaywrightInstalled] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxPages, setMaxPages] = useState(50);
  const [aiProvider, setAiProvider] = useState('claude');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();

    fetch('/api/system/status')
      .then((res) => res.json())
      .then((data) => setPlaywrightInstalled(data.playwrightInstalled))
      .catch((err) => console.error('Error checking system status:', err));
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    setSaving(true);
    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          url,
          description,
          maxDepth,
          maxPages,
          aiProvider,
          tags: tagsArray,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        // Clear form
        setName('');
        setUrl('');
        setDescription('');
        setMaxDepth(3);
        setMaxPages(50);
        setAiProvider('claude');
        setTagsInput('');
        fetchProjects();
      }
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>Test Projects Directory</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Select or create a target site configuration to run audits.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPlus size={16} />
          Create New Project
        </button>
      </div>

      {!playwrightInstalled && (
        <div className="card" style={{ borderColor: 'var(--color-danger)', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5', padding: '16px 24px', marginBottom: '32px', borderRadius: '8px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>
            <FaExclamationTriangle size={18} style={{ color: '#fca5a5' }} />
            Playwright Browser Not Installed
          </h4>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', lineHeight: 1.5 }}>
            The Playwright Chromium browser binaries are missing on the host server. Playwright crawls and scenarios will fail to run.
            To fix this, please run the following command in your terminal on the server machine:
          </p>
          <pre style={{ margin: '10px 0 0 0', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', overflowX: 'auto' }}>
            pnpm exec playwright install chromium
          </pre>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading projects database...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '1rem' }}>No projects configured yet.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Setup First Project
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map((project) => {
            const tags = project.tags ? JSON.parse(project.tags) : [];
            return (
              <div key={project.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <span className="badge badge-success">{project.status}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {project.aiProvider.toUpperCase()}
                    </span>
                  </div>
                  
                  <Link href={`/projects/${project.id}`}>
                    <h3 style={{ fontSize: '1.3rem', marginBottom: '8px', cursor: 'pointer' }} className="text-glow-teal">
                      {project.name}
                    </h3>
                  </Link>
                  
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '12px', wordBreak: 'break-all' }}>
                    {project.url}
                  </p>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                    {tags.map((tag: string) => (
                      <span key={tag} className="badge badge-muted" style={{ textTransform: 'lowercase', fontSize: '0.65rem' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Link href={`/projects/${project.id}`} style={{ flexGrow: 1 }}>
                      <button className="btn btn-secondary" style={{ width: '100%', padding: '8px' }}>
                        Configure & Run
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem' }}>New Audit Project</h3>
              <button 
                onClick={() => setShowModal(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}
              >
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ padding: '24px' }}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="My SaaS Portal" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target URL</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="https://example.com" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea 
                  className="form-input" 
                  style={{ height: '80px', resize: 'none' }}
                  placeholder="Marketing landing site and auth portals."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Max Crawl Depth</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min={1} 
                    max={5}
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Crawl Pages</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min={5} 
                    max={100}
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">AI Inference Engine</label>
                  <select 
                    className="form-input form-select"
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                  >
                    <option value="claude">Anthropic Claude</option>
                    <option value="openai">OpenAI GPT-4o</option>
                    <option value="groq">Groq Llama 3.3</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma separated)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="marketing, login-flow" 
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
