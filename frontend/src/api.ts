import { Signal, SignalStatus, AuditLog } from './app/types';

// Utility to get auth token
export const getToken = () => localStorage.getItem('token');
export const setToken = (token: string) => localStorage.setItem('token', token);
export const removeToken = () => localStorage.removeItem('token');

// Re-usable fetch with auth
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      console.warn("Auth map triggered", response.status);
    }
    const errText = await response.text();
    let parsedMsg = errText;
    try {
        const json = JSON.parse(errText);
        parsedMsg = json.message || errText;
    } catch {}
    
    // Standardizing backend exceptions for the frontend
    const errorObj = new Error(parsedMsg);
    (errorObj as any).status = response.status;
    throw errorObj;
  }
  return response;
}

// Map Backend IssueResponse to Frontend Signal
function mapIssueToSignal(issue: any): Signal {
  return {
    id: issue.id.toString(),
    title: issue.title,
    description: issue.description,
    voteCount: issue.voteCount,
    status: issue.status,
    createdAt: issue.createdAt,
    trending: false, // Could be calculated based on recent votes
    hot: false,
    reporterHash: issue.reporterAlias || 'Anon-Unknown', 
  };
}

export const api = {
  // Auth
  async login(username: string, password: string):Promise<string> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    setToken(data.token);
    return data.token;
  },

  // Issues
  async getPublicFeed(status?: string, horizon?: string): Promise<Signal[]> {
    let url = '/api/issues?size=50&sort=createdAt,desc';
    if (status && status !== 'ALL') url += `&status=${status}`;
    
    if (horizon && horizon !== 'ALL') {
      const now = new Date();
      let startStr = '';
      if (horizon === 'LAST_7_DAYS') {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        startStr = start.toISOString();
      } else if (horizon === 'THIS_SEMESTER') {
        // Assume fallback semester boundaries (Jan or Aug)
        const start = new Date(now.getFullYear(), now.getMonth() >= 7 ? 7 : 0, 1);
        startStr = start.toISOString();
      }
      if (startStr) url += `&startDate=${startStr}`;
    }
    
    const res = await fetchWithAuth(url);
    const data = await res.json();
    return data.content.map(mapIssueToSignal);
  },

  async getAdminFeed(): Promise<Signal[]> {
    const res = await fetchWithAuth('/api/issues/admin?size=100&sort=createdAt,desc');
    const data = await res.json();
    return data.content.map(mapIssueToSignal);
  },

  async createIssue(title: string, description: string): Promise<Signal> {
    const res = await fetchWithAuth('/api/issues', {
      method: 'POST',
      body: JSON.stringify({ title, description, reporterHash: 'anon_' + Math.floor(Math.random()*1000) })
    });
    const data = await res.json();
    return mapIssueToSignal(data);
  },

  // Voting
  async upvote(id: string): Promise<void> {
    await fetchWithAuth(`/api/issues/${id}/upvote`, { method: 'POST' });
  },

  async downvote(id: string): Promise<void> {
    await fetchWithAuth(`/api/issues/${id}/downvote`, { method: 'POST' });
  },

  // Admin Actions
  async updateStatus(id: string, status: SignalStatus): Promise<void> {
    // Determine which endpoint to call based on status
    if (status === 'REPORTED') await fetchWithAuth(`/api/issues/${id}/report`, { method: 'POST' });
    else if (status === 'IN_PROGRESS') await fetchWithAuth(`/api/issues/${id}/start`, { method: 'POST' });
    else if (status === 'RESOLVED') await fetchWithAuth(`/api/issues/${id}/resolve`, { method: 'POST' });
    else if (status === 'REJECTED') await fetchWithAuth(`/api/issues/${id}/reject`, { method: 'POST' });
  },

  async hideIssue(id: string): Promise<void> {
    await fetchWithAuth(`/api/issues/${id}/hide`, { method: 'POST' });
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetchWithAuth('/api/admin/audit?size=100&sort=createdAt,desc');
    const data = await res.json();
    return data.content;
  }
};
