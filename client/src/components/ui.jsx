import { AlertCircle, CheckCircle2, LoaderCircle, SearchX } from 'lucide-react';

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function PageHeader({ eyebrow, title, description, action }) {
  return <div className="page-heading">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>
    {action && <div className="heading-action">{action}</div>}
  </div>;
}

export function Loading({ label = 'Loading your workspace…' }) {
  return <div className="loading-state"><LoaderCircle className="spin" size={22} />{label}</div>;
}

export function EmptyState({ title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><SearchX size={21} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function ErrorState({ error }) {
  return <div className="error-state"><AlertCircle size={18} /><span>{error}</span></div>;
}

export function Toast({ toast }) {
  if (!toast) return null;
  const Icon = toast.type === 'error' ? AlertCircle : CheckCircle2;
  return <div className={`toast toast-${toast.type || 'success'}`} role="status"><Icon size={18} />{toast.message}</div>;
}

export function StatusPill({ status }) {
  const label = String(status || 'reported').replaceAll('_', ' ').toLowerCase();
  return <span className={`status-pill status-${label.replaceAll(' ', '-')}`}>{label}</span>;
}

export function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
}

export function formatDate(date) {
  return date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export function formatRelative(date) {
  if (!date) return '';
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}
