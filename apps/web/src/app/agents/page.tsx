'use client';

import React, { useEffect, useState } from 'react';
import { FaRobot, FaCheckCircle, FaClock, FaPaperPlane } from 'react-icons/fa';

interface Task {
  id: string;
  prompt: string;
  assignedAgent: string;
  status: string;
  createdAt: string;
  analytics?: string; // JSON string
  messages?: string; // JSON string
}

export default function AgentsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>({
    totalTasks: 0,
    successRate: 100,
    routingSplits: [],
    averageDurationMs: 0,
  });

  // Chat states
  const [prompt, setPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant' | 'error'; content: string }>>([
    {
      role: 'assistant',
      content: 'Hello! I am your AI Code Agent. I can help you research code, debug browser run failures, or auto-generate Playwright automation scripts. Ask me anything to get started!',
    },
  ]);
  const [sending, setSending] = useState(false);

  const loadAgentData = async () => {
    try {
      const tasksRes = await fetch('/api/agents/tasks');
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }

      const analyticsRes = await fetch('/api/agents/analytics');
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error('Error fetching agent tasks & analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgentData();
  }, []);

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMsg = prompt;
    setPrompt('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg }),
      });

      if (res.ok) {
        const data = await res.json();
        const msgList = data.messages ? JSON.parse(data.messages) : [];
        const assistantMsg = msgList.find((m: any) => m.role === 'assistant');
        
        if (assistantMsg) {
          setChatMessages((prev) => [...prev, { role: 'assistant', content: assistantMsg.content }]);
        } else {
          setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Task dispatched to background agent. Check historical runs below.' }]);
        }
        
        loadAgentData(); // Reload analytics and task list
      } else {
        setChatMessages((prev) => [...prev, { role: 'error', content: 'Subagent failed to process request.' }]);
      }
    } catch (err) {
      console.error('Error chatting with agent:', err);
      setChatMessages((prev) => [...prev, { role: 'error', content: 'Connection failure.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem' }}>AI Code Agents Hub</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Direct autonomous subagents to audit codebases, write tests, or analyze crawl crash logs.</p>
      </div>

      <div className="grid-layout" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Left column: Chat interface */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '600px', padding: '0px', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaRobot size={18} style={{ color: 'var(--accent-teal)' }} />
              Active Agent Chat Console
            </h3>
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaCheckCircle size={10} />
              Agent Online
            </span>
          </div>

          {/* Chat scroll wrapper */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: msg.role === 'user' ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: msg.role === 'user' ? '1px solid rgba(0, 242, 254, 0.2)' : '1px solid var(--border-color)',
                  color: msg.role === 'error' ? '#f87171' : 'var(--text-primary)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Agent is thinking...
              </div>
            )}
          </div>

          {/* Chat form */}
          <form onSubmit={handleSendPrompt} style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Generate a Playwright login scenario for a user..." 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={sending}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sending ? 'Sending...' : <><FaPaperPlane size={14} /> Send</>}
            </button>
          </form>
        </div>

        {/* Right column: Analytics and Agent status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Analytics Overview card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Routing Analytics</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Tasks Routed</span>
                <span style={{ fontWeight: 600 }}>{analytics.totalTasks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Success execution rate</span>
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{Math.round(analytics.successRate)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Avg Response Time</span>
                <span style={{ fontWeight: 600 }}>{Math.round(analytics.averageDurationMs / 1000)}s</span>
              </div>
            </div>
          </div>

          {/* Routing splits card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Agent Allocations</h3>
            {analytics.routingSplits.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No tasks allocated yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analytics.routingSplits.map((item: any) => (
                  <div key={item.agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.agent}</span>
                    <span className="badge badge-info">{item.count} tasks</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task list log table */}
      <div className="card" style={{ marginTop: '32px', padding: '0px', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.2rem' }}>Subagent Routed Tasks Logs</h3>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading task logs...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No routed subagent tasks found.</div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Prompt</th>
                  <th>Assigned Agent</th>
                  <th>Status</th>
                  <th>Routed Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.prompt}
                    </td>
                    <td>{task.assignedAgent}</td>
                    <td>
                      <span className={`badge ${task.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>{new Date(task.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
