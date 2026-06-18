'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Bug {
  id: string;
  runId: string;
  projectId: string;
  title: string;
  description: string;
  pageUrl: string;
  severity: string;
  category: string;
  screenshotUrls: string; // JSON string of urls
  videoUrl?: string;
  evidence?: string;
  reproductionSteps?: string;
  aiExplanation?: string;
  status: string;
}

export default function BugDetailsPage({ params }: { params: { bugId: string } }) {
  const bugId = params.bugId;

  const [bug, setBug] = useState<Bug | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadBug = async () => {
    try {
      const res = await fetch(`/api/bugs/${bugId}`);
      if (res.ok) {
        const data = await res.json();
        setBug(data);
      }
    } catch (err) {
      console.error('Error fetching bug details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBug();
  }, [bugId]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!bug) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/bugs/${bugId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setBug(updated);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>Loading bug details...</div>;
  if (!bug) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>Bug not found</div>;

  const screenshotList: string[] = bug.screenshotUrls ? JSON.parse(bug.screenshotUrls) : [];
  const regressionAssertCode = `// Regression Test assertion for bug: "${bug.title}"
test('reproduce bug: ${bug.title.replace(/'/g, "\\'")}', async ({ page }) => {
  await page.goto('${bug.pageUrl}');
  
  // Bug Category: ${bug.category.toUpperCase()} • Severity: ${bug.severity.toUpperCase()}
  // Target: ${bug.description.replace(/\n/g, ' ')}
  
  // Verify issue is resolved:
  // TODO: Add selector target assertion based on fix
  // expect(await page.locator('${bug.description.substring(0, 30)}').isVisible()).toBe(false);
});`;

  return (
    <div>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <Link href={`/runs/${bug.runId}`} style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', display: 'block', marginBottom: '8px' }}>
            ← Back to Run Session
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.8rem' }}>{bug.title}</h1>
            <span className={`badge ${
              bug.status === 'open' ? 'badge-info' : 
              bug.status === 'confirmed' ? 'badge-danger' : 
              'badge-success'
            }`}>
              {bug.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
            Bug ID: {bug.id} • Category: {bug.category.toUpperCase()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => handleUpdateStatus('confirmed')}
            disabled={updating || bug.status === 'confirmed'}
          >
            ⚠️ Confirm Bug
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => handleUpdateStatus('resolved')}
            disabled={updating || bug.status === 'resolved'}
          >
            ✓ Mark Resolved
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ color: 'var(--text-muted)' }}
            onClick={() => handleUpdateStatus('wontfix')}
            disabled={updating || bug.status === 'wontfix'}
          >
            Won't Fix
          </button>
        </div>
      </div>

      <div className="grid-layout">
        {/* Left Side: Audit description & Screenshot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Detail card */}
          <div className="card">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <span className={`badge ${
                bug.severity === 'critical' ? 'badge-danger' : 
                bug.severity === 'high' ? 'badge-danger' : 
                bug.severity === 'medium' ? 'badge-warning' : 
                'badge-muted'
              }`}>
                {bug.severity} severity
              </span>
              <span className="badge badge-info">{bug.category}</span>
            </div>

            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Defect Description</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '20px' }}>
              {bug.description}
            </p>

            <h4 style={{ fontSize: '0.95rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Target Webpage URL:</h4>
            <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)', wordBreak: 'break-all' }}>
              {bug.pageUrl}
            </span>
          </div>

          {/* Visual evidence screenshot */}
          {screenshotList.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Visual Evidence Screenshot</h3>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#05070c' }}>
                <img 
                  src={screenshotList[0]} 
                  alt="Bug screenshot" 
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Reproduction Steps, AI Explanation & Code */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Steps and explanation */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Steps to Reproduce</h3>
            <div style={{
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)', 
              lineHeight: 1.6, 
              padding: '12px', 
              backgroundColor: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'pre-wrap',
              marginBottom: '20px'
            }}>
              {bug.reproductionSteps || 'No reproduction steps documented.'}
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>AI Auditor Explanation</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {bug.aiExplanation || 'The AI auditor flagged this element based on standard console runtime failures or accessibility requirements.'}
            </p>
          </div>

          {/* Regression Code snippet */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Regression Spec Code</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Include this script in your Playwright collection to check if this specific bug re-occurs on future deploys.
            </p>
            <pre className="code-block" style={{ fontSize: '0.8rem' }}>{regressionAssertCode}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
