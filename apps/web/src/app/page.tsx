'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaBolt, FaCheckCircle, FaExclamationTriangle, FaFolderOpen } from 'react-icons/fa';

interface RunItem {
  id: string;
  projectId: string;
  projectName?: string;
  status: string;
  pagesVisited: number;
  bugsFound: number;
  createdAt: string;
}

interface ProjectItem {
  id: string;
  name: string;
  url: string;
}

export default function OverviewPage() {
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const projRes = await fetch('/api/projects');
        const projData = await projRes.json();
        setProjects(projData);

        // Fetch runs for all projects and combine them
        const allRuns: RunItem[] = [];
        for (const proj of projData) {
          const runRes = await fetch(`/api/projects/${proj.id}/runs`);
          const runData = await runRes.json();
          const runsWithProject = runData.map((r: any) => ({
            ...r,
            projectName: proj.name,
          }));
          allRuns.push(...runsWithProject);
        }

        // Sort by date descending
        allRuns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRuns(allRuns.slice(0, 8)); // Top 8 runs
      } catch (err) {
        console.error('Error loading overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalBugs = runs.reduce((acc, r) => acc + r.bugsFound, 0);
  const successRate = runs.length > 0 
    ? Math.round((runs.filter((r) => r.status === 'completed').length / runs.length) * 100) 
    : 100;

  return (
    <div>
      {/* Welcome Banner */}
      <div className="card" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'radial-gradient(ellipse at top right, rgba(0, 242, 254, 0.15) 0%, rgba(11, 15, 25, 0.7) 100%)' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '10px' }}>
            Autonomous QA <span className="text-gradient">Agent Engine</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Audit your sites, run simulated journeys, detect accessibility infractions and generate production-ready Playwright tests autonomously.
          </p>
        </div>
        <div>
          <Link href="/projects">
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaBolt size={16} />
              Setup First Audit
            </button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Total QA Audits</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--accent-teal)' }} className="text-glow-teal">{runs.length}</h2>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Bugs Uncovered</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--color-danger)' }}>{totalBugs}</h2>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Crawl Success Rate</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--color-success)' }}>{successRate}%</h2>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Test Projects</p>
          <h2 style={{ fontSize: '2rem', color: 'var(--accent-violet)' }}>{projects.length}</h2>
        </div>
      </div>

      {/* Detail Block */}
      <div className="grid-layout">
        {/* Left Side: Recent Runs */}
        <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ padding: '24px 24px 16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Recent Audit Runs</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Showing last 8 sessions</span>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p className="loading-text">Loading runs list...</p>
            </div>
          ) : runs.length === 0 ? (
            <div style={{ padding: '60px 40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>No audit runs logged yet.</p>
              <Link href="/projects">
                <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaFolderOpen size={14} />
                  Create a project to start
                </button>
              </Link>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Status</th>
                    <th>Pages Crawled</th>
                    <th>Bugs Found</th>
                    <th>Run Date</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} style={{ cursor: 'pointer' }}>
                      <td>
                        <Link href={`/runs/${run.id}`} style={{ display: 'block', width: '100%' }}>
                          <span style={{ fontWeight: 600 }}>{run.projectName || 'Default'}</span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/runs/${run.id}`} style={{ display: 'block', width: '100%' }}>
                          <span className={`badge ${
                            run.status === 'completed' ? 'badge-success' : 
                            run.status === 'failed' ? 'badge-danger' : 
                            'badge-info'
                          }`}>
                            {run.status}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/runs/${run.id}`} style={{ display: 'block', width: '100%' }}>
                          {run.pagesVisited}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/runs/${run.id}`} style={{ display: 'block', width: '100%' }}>
                          <span style={{ color: run.bugsFound > 0 ? 'var(--color-danger)' : 'var(--text-primary)', fontWeight: run.bugsFound > 0 ? 'bold' : 'normal' }}>
                            {run.bugsFound}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/runs/${run.id}`} style={{ display: 'block', width: '100%' }}>
                          {new Date(run.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Setup Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>How it Works</h3>
            <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>1.</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Create a Project</strong> by entering your target website url.
                </p>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>2.</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Run Crawl or Scenario</strong>. Either crawl the entire website BFS-style, or enter custom step strings.
                </p>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>3.</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Analyze Detections</strong>. The AI flags layout failures, JS uncaught exceptions, and contrast issues.
                </p>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>4.</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Export Test Script</strong>. Click download to get a clean `.spec.ts` script for your local repo.
                </p>
              </li>
            </ul>
          </div>

          <div className="card" style={{ borderLeft: '3px solid var(--accent-violet)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Active Providers</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Your system defaults to Anthropic Claude-3.5-Sonnet if API keys are configured.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span className="badge badge-muted">Claude: Fallback Mock</span>
              <span className="badge badge-muted">OpenAI: Fallback Mock</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
