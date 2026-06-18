'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FaGlobe, 
  FaSpider, 
  FaChrome, 
  FaHourglassHalf, 
  FaExclamationTriangle,
  FaTimes,
  FaHome,
  FaLock,
  FaClipboardList,
  FaShoppingCart,
  FaSearch,
  FaCheck
} from 'react-icons/fa';

interface Project {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: string;
  maxDepth: number;
  maxPages: number;
  aiProvider: string;
  tags?: string;
  createdAt: string;
}

interface Run {
  id: string;
  status: string;
  browser?: string;
  pagesVisited: number;
  bugsFound: number;
  createdAt: string;
}

// ─── Chromium Install Modal ──────────────────────────────────────────────────
function ChromiumInstallModal({ onClose }: { onClose: () => void }) {
  const commands = [
    { label: 'pnpm', cmd: 'pnpm exec playwright install chromium' },
    { label: 'npx',  cmd: 'npx playwright install chromium' },
    { label: 'npm',  cmd: 'npm exec playwright install chromium' },
  ];
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.75)',
               display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-card,#1a1a2e)', border: '1px solid #ef4444', borderRadius: '12px',
                 padding: '32px', maxWidth: '560px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaGlobe size={32} style={{ color: '#fca5a5' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fca5a5' }}>Chromium Not Installed</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Playwright browser binaries are missing on this server
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1, display: 'flex', alignItems: 'center' }}
            aria-label="Close">
            <FaTimes size={24} />
          </button>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '18px' }}>
          The <strong style={{ color: 'var(--text-primary)' }}>Test in Chromium</strong> feature requires Playwright's
          Chromium binary to be downloaded on the server. Run one of the commands below in your terminal.
        </p>

        {/* Commands */}
        <p style={{ margin: '0 0 8px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                    color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>Install Command</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {commands.map(({ label, cmd }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px',
                                      background: 'rgba(0,0,0,0.35)', borderRadius: '6px',
                                      border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-teal)', minWidth: '32px' }}>{label}</span>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#e2e8f0', flex: 1 }}>{cmd}</code>
              <button
                onClick={() => navigator.clipboard.writeText(cmd).catch(() => {})}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px',
                         color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.7rem', padding: '3px 8px' }}>
                Copy
              </button>
            </div>
          ))}
        </div>

        {/* After-install tip */}
        <div style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.25)',
                      borderRadius: '6px', padding: '12px 16px', marginBottom: '18px' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--accent-teal)', lineHeight: 1.5 }}>
            <strong>After installing:</strong> restart the API server, then try the button again.
          </p>
        </div>

        {/* Linux deps */}
        <details style={{ marginBottom: '20px' }}>
          <summary style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
            On Linux? You may also need system dependencies
          </summary>
          <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(0,0,0,0.3)',
                        borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#e2e8f0' }}>
              npx playwright install-deps chromium
            </code>
          </div>
        </details>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.85rem' }}>Close</button>
          <a href="https://playwright.dev/docs/browsers#install-browsers" target="_blank" rel="noopener noreferrer"
             className="btn btn-primary" style={{ fontSize: '0.85rem', textDecoration: 'none' }}>
            View Playwright Docs ↗
          </a>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggeringChromium, setTriggeringChromium] = useState(false);
  // null = unknown (checking), true = installed, false = missing
  const [playwrightInstalled, setPlaywrightInstalled] = useState<boolean | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Scenario builder state — textarea-based, persisted per project in localStorage
  const STORAGE_KEY = `scenario-steps-${projectId}`;
  const DEFAULT_STEPS = `Open Home page\nClick Contact Us`;
  const [stepsText, setStepsText] = useState<string>('');
  const stepsInitialized = useRef(false);

  // Parse textarea text → array of non-empty trimmed lines
  const parsedSteps = stepsText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  // Load persisted steps on mount — runs first, marks initialized
  useEffect(() => {
    stepsInitialized.current = false;
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    setStepsText(saved !== null ? saved : DEFAULT_STEPS);
    // Mark initialized after setting so the save effect doesn't fire on this cycle
    requestAnimationFrame(() => { stepsInitialized.current = true; });
  }, [projectId]);

  // Persist whenever steps change — only after initial load to avoid wiping with ''
  useEffect(() => {
    if (!stepsInitialized.current) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, stepsText);
    }
  }, [stepsText, STORAGE_KEY]);

  const loadProjectData = async () => {
    try {
      const projRes = await fetch(`/api/projects/${projectId}`);
      const projData = await projRes.json();
      setProject(projData);

      const runsRes = await fetch(`/api/projects/${projectId}/runs`);
      const runsData = await runsRes.json();
      setRuns(runsData);
    } catch (err) {
      console.error('Error fetching project details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();

    // Check chromium install — default is null (unknown), not true, so we never false-allow
    fetch('/api/system/status')
      .then((res) => res.json())
      .then((data) => setPlaywrightInstalled(data.playwrightInstalled ?? false))
      .catch(() => setPlaywrightInstalled(false));
  }, [projectId]);

  const handleLaunchCrawl = async () => {
    setTriggering(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/runs/${data.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to trigger BFS crawl.');
      }
    } catch (err) {
      console.error('Error triggering crawl:', err);
      alert('Error triggering crawl: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTriggering(false);
    }
  };

  const handleLaunchScenario = async () => {
    if (parsedSteps.length === 0) return;
    setTriggering(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userSteps: parsedSteps }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/runs/${data.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to trigger custom scenario run.');
      }
    } catch (err) {
      console.error('Error triggering scenario run:', err);
      alert('Error triggering scenario run: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTriggering(false);
    }
  };

  // Launch a Chromium-specific run: uses scenario steps if present, otherwise falls back to full BFS crawl
  const handleTestInChromium = async () => {
    // Already know it's not installed — show modal immediately, skip the network call
    if (playwrightInstalled === false) {
      setShowInstallModal(true);
      return;
    }

    setTriggeringChromium(true);
    try {
      const body: Record<string, any> = { browser: 'chromium' };
      if (parsedSteps.length > 0) {
        body.userSteps = parsedSteps;
      }
      const res = await fetch(`/api/projects/${projectId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/runs/${data.id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        // 400 with a Playwright message → binaries missing, show install modal
        if (
          res.status === 400 &&
          typeof data.message === 'string' &&
          data.message.toLowerCase().includes('playwright')
        ) {
          setPlaywrightInstalled(false);
          setShowInstallModal(true);
        } else {
          alert(data.message || 'Failed to start Chromium test run.');
        }
      }
    } catch (err) {
      console.error('Error starting Chromium test run:', err);
      alert('Error starting Chromium test run: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTriggeringChromium(false);
    }
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p className="loading-text">Loading project details...</p>
    </div>
  );
  if (!project) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>Project not found</div>;

  return (
    <div>
      {/* Install modal — overlays everything when Chromium is missing */}
      {showInstallModal && <ChromiumInstallModal onClose={() => setShowInstallModal(false)} />}

      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <Link href="/projects" style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', display: 'block', marginBottom: '8px' }}>
            ← Back to Directory
          </Link>
          <h1 style={{ fontSize: '2rem' }}>{project.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            Target: {project.url}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleLaunchCrawl}
            disabled={triggering}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaSpider size={16} />
            Trigger BFS Crawl
          </button>
         

          {/* Chromium button — status-aware */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <button
              className="btn btn-primary"
              onClick={handleTestInChromium}
              disabled={triggeringChromium}
              title={
                playwrightInstalled === false
                  ? 'Chromium not installed — click for setup instructions'
                  : parsedSteps.length > 0
                  ? `Run ${parsedSteps.length} scenario step(s) in Chromium`
                  : 'Open all pages and click every link in Chromium'
              }
              style={{
                backgroundColor: playwrightInstalled === false ? '#7f1d1d' : '#1a73e8',
                borderColor: playwrightInstalled === false ? '#ef4444' : '#1a73e8',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {triggeringChromium ? (
                <><FaHourglassHalf size={16} /> Starting...</>
              ) : playwrightInstalled === false ? (
                <><FaExclamationTriangle size={16} /> Test in Chromium</>
              ) : (
                <>
                  <FaChrome size={16} />
                  Test in Chromium
                </>
              )}
            </button>
            {/* Status hint under the button */}
            {playwrightInstalled === null && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>checking...</span>
            )}
            {playwrightInstalled === false && (
              <span
                style={{ fontSize: '0.65rem', color: '#f87171', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setShowInstallModal(true)}
              >
                not installed — fix this
              </span>
            )}
            {playwrightInstalled === true && (
              <span style={{ fontSize: '0.65rem', color: '#4ade80' }}>● ready</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid-layout">
        {/* Left column: Historical runs */}
        <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ padding: '24px 24px 16px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Historical Runs</h3>
          </div>

          {runs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No crawl runs completed for this project.
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Status</th>
                    <th>Visited</th>
                    <th>Bugs</th>
                    <th>Started At</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} style={{ cursor: 'pointer' }}>
                      <td>
                        <Link href={`/runs/${run.id}`} style={{ fontWeight: 600 }}>
                          {run.id.substring(0, 13)}...
                        </Link>
                      </td>
                      <td>
                        <Link href={`/runs/${run.id}`}>
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
                        <Link href={`/runs/${run.id}`}>{run.pagesVisited} pages</Link>
                      </td>
                      <td>
                        <Link href={`/runs/${run.id}`}>
                          <span style={{ color: run.bugsFound > 0 ? 'var(--color-danger)' : 'var(--text-primary)', fontWeight: run.bugsFound > 0 ? 'bold' : 'normal' }}>
                            {run.bugsFound}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/runs/${run.id}`}>
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

        {/* Right column: Configurations & Custom step builder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Step Builder */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Scenario Step Builder</h3>
              <span style={{ fontSize: '0.72rem', color: parsedSteps.length > 0 ? 'var(--accent-teal)' : 'var(--text-secondary)', fontWeight: 600 }}>
                {parsedSteps.length} step{parsedSteps.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Quick-fill templates */}
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: '0 0 6px' }}>
                Quick templates
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  {
                    label: 'Homepage tour',
                    steps: 'Open Home page\nScroll to Our Recent Projects\nClick Contact Us',
                    icon: <FaHome size={12} />
                  },
                  {
                    label: 'Login flow',
                    steps: 'Open Home page\nClick Login\nEmail: user@example.com\nPassword: yourpassword\nClick Submit',
                    icon: <FaLock size={12} />
                  },
                  {
                    label: 'Contact form',
                    steps: 'Open Home page\nClick Contact Us\nName: John Doe\nEmail: john@example.com\nMessage: Hello, I have a question\nClick Submit',
                    icon: <FaClipboardList size={12} />
                  },
                  {
                    label: 'Checkout flow',
                    steps: 'Open Home page\nClick Shop\nClick Add to Cart\nClick Checkout\nEmail: user@example.com\nClick Continue',
                    icon: <FaShoppingCart size={12} />
                  },
                  {
                    label: 'Search test',
                    steps: 'Open Home page\nClick Search\nSearch: test query\nClick Search button',
                    icon: <FaSearch size={12} />
                  },
                ].map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => setStepsText(tpl.steps)}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
                      borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer',
                      fontSize: '0.72rem', padding: '4px 10px', whiteSpace: 'nowrap',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                    title="Click to load this template"
                  >
                    {tpl.icon}
                    {tpl.label}
                  </button>
                ))}
                <button
                  onClick={() => setStepsText('')}
                  style={{
                    background: 'none', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '4px', color: '#f87171', cursor: 'pointer',
                    fontSize: '0.72rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                  title="Clear all steps"
                >
                  <FaTimes size={12} />
                  Clear
                </button>
              </div>
            </div>

            {/* Textarea — one line per step */}
            <textarea
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              placeholder={`One step per line. Examples:\n\nOpen Home page\nClick Contact Us\nHover navigation menu\nEmail: user@example.com\nPassword: secret123\nClick Submit\nAssert text Welcome\nScroll to Footer\nScroll bottom\nPress Enter\nGo back\nWait 2 seconds\nScreenshot`}
              style={{
                width: '100%', minHeight: '160px', resize: 'vertical',
                fontFamily: 'var(--font-mono)', fontSize: '0.82rem', lineHeight: '1.6',
                background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)',
                borderRadius: '6px', color: 'var(--text-primary)', padding: '10px 12px',
                boxSizing: 'border-box', outline: 'none',
              }}
              spellCheck={false}
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '6px 0 0' }}>
              Each line = one step. Press <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '3px', padding: '1px 5px', fontSize: '0.68rem' }}>Enter</kbd> to start a new step.
              Supported: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>Open [url]</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>Click [button]</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>Hover [element]</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>Field: value</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>Assert text [text]</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>Press [key]</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>Scroll to [text]</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>Scroll top/bottom</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>Go back</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>Wait 2s</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>Screenshot</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>End/Stop</code>
            </p>

            {/* Conditional syntax instructions */}
            <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.25)', borderRadius: '6px' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-teal)', margin: '0 0 8px' }}>
                Conditional Steps
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.4 }}>
                Add conditional logic to handle different scenarios:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                <div style={{ color: 'var(--text-primary)' }}>
                  <code style={{ color: 'var(--accent-teal)' }}>IF text 'Login failed' THEN click Register</code>
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  <code style={{ color: 'var(--accent-teal)' }}>IF text 'Error' THEN click Close ELSE click Retry</code>
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  <code style={{ color: 'var(--accent-teal)' }}>IF text 'Invalid Username' wait 3s THEN click Register</code>
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  <code style={{ color: 'var(--accent-teal)' }}>IF status code 401 THEN click Register</code>
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  <code style={{ color: 'var(--accent-teal)' }}>IF element exists '.error-modal' THEN click Dismiss</code>
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  <code style={{ color: 'var(--accent-teal)' }}>IF url contains 'dashboard' THEN click Profile</code>
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  <code style={{ color: 'var(--accent-teal)' }}>IF status code 401 THEN click register</code>
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  <code style={{ color: 'var(--accent-teal)' }}>IF status code 500 THEN click Retry</code>
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  <code style={{ color: 'var(--accent-teal)' }}>IF status code 403 THEN click Logout</code>
                </div>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '8px 0 0' }}>
                Conditions: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>text</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>element exists</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>element visible</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>url contains</code> · <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>status code</code>
                · Add <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>wait Xs</code> before THEN for delayed elements (e.g., toast messages)
              </p>
            </div>

            {/* Live numbered preview */}
            {parsedSteps.length > 0 && (
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                  Preview ({parsedSteps.length} steps)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                  {parsedSteps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', padding: '5px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-teal)', minWidth: '18px', textAlign: 'right' }}>{idx + 1}.</span>
                      <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Project Details configuration summary */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Configurations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Inference Engine</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-teal)' }}>{project.aiProvider.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Max Depth Limit</span>
                <span style={{ fontWeight: 600 }}>{project.maxDepth}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Max Pages limit</span>
                <span style={{ fontWeight: 600 }}>{project.maxPages}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
