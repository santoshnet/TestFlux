'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FaCopy, 
  FaCheck, 
  FaGlobe, 
  FaClock, 
  FaHourglassHalf,
  FaCalendar
} from 'react-icons/fa';

interface Bug {
  id: string;
  title: string;
  severity: string;
  category: string;
  pageUrl: string;
  status: string;
}

interface Run {
  id: string;
  projectId: string;
  status: string;
  browser?: string;
  pagesVisited: number;
  bugsFound: number;
  pagesDiscovered: string; // JSON string
  userSteps?: string; // JSON string
  generatedTestCode?: string;
  errorMessage?: string;
  artifacts?: string; // JSON string
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export default function RunDetailsPage({ params }: { params: { runId: string } }) {
  const runId = params.runId;

  const [run, setRun] = useState<Run | null>(null);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const loadRunData = async () => {
    try {
      const runRes = await fetch(`/api/runs/${runId}`);
      if (runRes.ok) {
        const runData = await runRes.json();
        setRun(runData);
      }

      const bugsRes = await fetch(`/api/runs/${runId}/bugs`);
      if (bugsRes.ok) {
        const bugsData = await bugsRes.json();
        setBugs(bugsData);
      }
    } catch (err) {
      console.error('Error fetching run details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRunData();
  }, [runId]);

  // Poll every 2.5s while the run is active so the page updates live
  useEffect(() => {
    if (!run || (run.status !== 'running' && run.status !== 'queued')) return;
    const interval = setInterval(loadRunData, 2500);
    return () => clearInterval(interval);
  }, [runId, run?.status]);

  const handleCopyCode = () => {
    if (!run?.generatedTestCode) return;
    navigator.clipboard.writeText(run.generatedTestCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p className="loading-text">Loading run data...</p>
    </div>
  );
  if (!run) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>Run not found</div>;

  const discoveredPages: string[] = run.pagesDiscovered ? JSON.parse(run.pagesDiscovered) : [];
  const artifactsObj = run.artifacts ? JSON.parse(run.artifacts) : {};
  const stepResults: any[] = artifactsObj.stepResults || [];
  const intendedSteps: string[] = run.userSteps ? JSON.parse(run.userSteps) : [];
  const isScenarioRun = intendedSteps.length > 0;

  return (
    <div>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <Link href={`/projects/${run.projectId}`} style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', display: 'block', marginBottom: '8px' }}>
            ← Back to Project
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '2.0rem' }}>Run Session Detail</h1>
            <span className={`badge ${
              run.status === 'completed' ? 'badge-success' : 
              run.status === 'failed' ? 'badge-danger' : 
              'badge-info'
            }`}>
              {run.status}
            </span>
            {run.browser && (
              <span className="badge badge-muted" title="Browser used for this run" style={{ textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaGlobe size={12} />
                {run.browser}
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
            ID: {run.id} • Started {new Date(run.createdAt).toLocaleString()}
          </p>
        </div>
        
        {run.generatedTestCode && (
          <button className="btn btn-primary" onClick={handleCopyCode} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {copied ? <><FaCheck size={16} /> Copied!</> : <><FaCopy size={16} /> Copy Playwright Script</>}
          </button>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Pages Visited</p>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--accent-teal)' }}>{run.pagesVisited}</h2>
        </div>

        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Bugs Identified</p>
          <h2 style={{ fontSize: '1.8rem', color: run.bugsFound > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{run.bugsFound}</h2>
        </div>

        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Execution Time</p>
          <h2 style={{ fontSize: '1.8rem' }}>
            {run.completedAt && run.startedAt 
              ? `${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
              : 'running...'}
          </h2>
        </div>
      </div>

      {run.errorMessage && (
        <div className="card" style={{ borderColor: 'var(--color-danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)', marginBottom: '32px' }}>
          <h4 style={{ color: '#fca5a5', marginBottom: '8px' }}>Execution Failure Error</h4>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#fca5a5' }}>{run.errorMessage}</p>
        </div>
      )}

      {/* Main grids */}
      <div className="grid-layout">
        {/* Left column: Bugs & Code block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Bugs Identified Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Identified Bugs ({bugs.length})</h3>

            {bugs.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <FaCheck size={20} />
                Clean run! No critical issues or bugs detected on this build.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {bugs.map((bug) => (
                  <div key={bug.id} className="step-item" style={{ margin: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className={`badge ${
                          bug.severity === 'critical' ? 'badge-danger' : 
                          bug.severity === 'high' ? 'badge-danger' : 
                          bug.severity === 'medium' ? 'badge-warning' : 
                          'badge-muted'
                        }`} style={{ fontSize: '0.6rem' }}>
                          {bug.severity}
                        </span>
                        <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>{bug.category}</span>
                      </div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{bug.title}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all' }}>
                        {bug.pageUrl}
                      </p>
                    </div>

                    <Link href={`/bugs/${bug.id}`}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                        Inspect
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generated Playwright Code card */}
          {run.generatedTestCode && (
            <div className="card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Generated Playwright Code</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Paste this generated spec file directly into your Playwright repo to execute these checks in CI.
              </p>
              <pre className="code-block">{run.generatedTestCode}</pre>
            </div>
          )}
        </div>

        {/* Right column: Scenario steps or Sitemap */}
        <div className="card">
          {stepResults.length > 0 ? (
            /* ── Completed step results ── */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Step-by-Step Scenario</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {stepResults.filter((r) => r.status === 'passed').length}/{stepResults.length} passed
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {stepResults.map((res, index) => (
                  <div key={index} className="step-item" style={{ margin: '0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--accent-teal)', marginRight: '6px' }}>{index + 1}.</span>
                        {res.stepText ?? res.step ?? '—'}
                      </span>
                      <span className={`badge ${res.status === 'passed' ? 'badge-success' : 'badge-danger'}`}>
                        {res.status}
                      </span>
                    </div>
                    {res.detail && (
                      <p style={{ fontSize: '0.8rem', color: '#fca5a5', fontFamily: 'var(--font-mono)', paddingLeft: '20px' }}>
                        {res.detail}
                      </p>
                    )}
                    {res.screenshotUrl && (
                      <div
                        onClick={() => setSelectedScreenshot(res.screenshotUrl)}
                        style={{ alignSelf: 'flex-start', marginLeft: '20px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', height: '80px', width: '130px' }}
                      >
                        <img src={res.screenshotUrl} alt="Step screenshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          ) : isScenarioRun ? (
            /* ── Scenario run but results not yet available (queued/running/failed early) ── */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Scenario Steps</h3>
                <span className={`badge ${run.status === 'running' ? 'badge-info' : run.status === 'failed' ? 'badge-danger' : 'badge-muted'}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {run.status === 'running' ? <><FaHourglassHalf size={10} /> executing...</> : run.status === 'queued' ? <><FaClock size={10} /> queued</> : run.status}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {intendedSteps.map((step, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', opacity: 0.7 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-teal)', minWidth: '20px' }}>{index + 1}.</span>
                    <span style={{ fontSize: '0.85rem', flex: 1, fontFamily: 'var(--font-mono)' }}>{step}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      {run.status === 'running' ? '…' : '—'}
                    </span>
                  </div>
                ))}
              </div>
              {run.status === 'running' && (
                <p style={{ marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Page refreshes automatically every 2.5s…
                </p>
              )}
            </div>

          ) : (
            /* ── BFS crawl sitemap ── */
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Discovered Sitemap ({discoveredPages.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                {discoveredPages.map((page, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                    {page}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Modal overlay */}
      {selectedScreenshot && (
        <div className="modal-overlay" onClick={() => setSelectedScreenshot(null)}>
          <div className="modal-content" style={{ maxWidth: '90%', width: 'auto', background: 'none', border: 'none', boxShadow: 'none' }} onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedScreenshot} 
              alt="Expanded Screenshot" 
              style={{ maxHeight: '85vh', maxWidth: '100%', borderRadius: '8px', border: '2px solid var(--border-color)' }}
            />
            <p style={{ textAlign: 'center', marginTop: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Click anywhere outside to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
