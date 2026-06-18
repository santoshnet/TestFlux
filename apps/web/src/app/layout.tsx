'use client';

import './globals.css';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FaChartBar, 
  FaFolder, 
  FaRobot, 
  FaPlug, 
  FaTimes,
  FaHeartbeat
} from 'react-icons/fa';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [gitStatus, setGitStatus] = useState<{ connected: boolean; login?: string; avatarUrl?: string }>({
    connected: false,
  });

  useEffect(() => {
    // Check GitHub Auth status on mount
    fetch('/api/github-auth/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.connected) {
          setGitStatus(data);
        }
      })
      .catch((err) => console.error('Error fetching github status:', err));
  }, []);

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/github-auth/disconnect', { method: 'POST' });
      if (res.ok) {
        setGitStatus({ connected: false });
      }
    } catch (err) {
      console.error('Error disconnecting github:', err);
    }
  };

  return (
    <html lang="en">
      <head>
        <title>AI Playwright Agent | Autonomous QA Testing</title>
        <meta name="description" content="Autonomous Website QA Auditor and Playwright Test Generator" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <div className="dashboard-container">
          {/* Sidebar */}
          <aside className="sidebar">
            <div style={{ marginBottom: '40px' }}>
              <Link href="/">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--gradient-neon)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: '#0b0f19'
                  }}>
                    A
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }} className="text-gradient">PLAYWRIGHT</h2>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI QA Agent</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Navigation links */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
              <Link href="/">
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: pathname === '/' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                  color: pathname === '/' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                  borderLeft: pathname === '/' ? '3px solid var(--accent-teal)' : '3px solid transparent',
                  fontWeight: pathname === '/' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FaChartBar size={18} />
                  Dashboard
                </div>
              </Link>

              <Link href="/projects">
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: pathname.startsWith('/projects') ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                  color: pathname.startsWith('/projects') ? 'var(--accent-teal)' : 'var(--text-secondary)',
                  borderLeft: pathname.startsWith('/projects') ? '3px solid var(--accent-teal)' : '3px solid transparent',
                  fontWeight: pathname.startsWith('/projects') ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FaFolder size={18} />
                  Test Projects
                </div>
              </Link>

              <Link href="/agents">
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: pathname === '/agents' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                  color: pathname === '/agents' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                  borderLeft: pathname === '/agents' ? '3px solid var(--accent-teal)' : '3px solid transparent',
                  fontWeight: pathname === '/agents' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FaRobot size={18} />
                  AI Code Agents
                </div>
              </Link>
            </nav>

            {/* GitHub Integration Panel in Sidebar Footer */}
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              marginTop: 'auto'
            }}>
              {gitStatus.connected ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <img 
                      src={gitStatus.avatarUrl} 
                      alt="Avatar" 
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--accent-teal)' }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {gitStatus.login}
                      </p>
                      <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>GitHub Live</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleDisconnect}
                    className="btn btn-danger" 
                    style={{ width: '100%', fontSize: '0.75rem', padding: '6px 12px' }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center' }}>
                    Connect your repositories to export generated code.
                  </p>
                  <Link href="/api/github-auth/login">
                    <button 
                      className="btn btn-primary" 
                      style={{ width: '100%', fontSize: '0.75rem', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <FaPlug size={14} />
                      Connect GitHub
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </aside>

          {/* Main content wrapper */}
          <main className="main-content">
            <header className="header">
              <div>
                <h3 style={{ fontSize: '1.1rem' }}>
                  {pathname === '/' ? 'System Overview' : pathname.startsWith('/projects') ? 'Project Directory' : 'Autonomous AI Agents'}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaHeartbeat size={12} />
                  Agent Status: Active
                </span>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-teal)', boxShadow: '0 0 8px var(--accent-teal)' }}></div>
              </div>
            </header>

            <div className="content-body">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
