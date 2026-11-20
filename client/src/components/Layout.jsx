import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, ChevronDown, CircleHelp, Compass, FilePlus2, FileSearch, FileText, HeartHandshake, Home, LogOut,
  MapPinned, Menu, Shield, Sparkles, Trophy, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { initials } from './ui.jsx';

const studentLinks = [
  { to: '/dashboard', label: 'Overview', icon: Home },
  { to: '/reports', label: 'Browse reports', icon: FileSearch },
  { to: '/my-reports', label: 'My reports', icon: FileText },
  { to: '/matches', label: 'Smart matches', icon: Sparkles },
  { to: '/claims', label: 'Claims & handovers', icon: HeartHandshake },
  { to: '/assistant', label: 'Recovery assistant', icon: CircleHelp },
  { to: '/map', label: 'Campus map', icon: MapPinned },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    api.get('/notifications').then(({ data }) => setUnread(data.notifications.filter((item) => !item.readAt).length)).catch(() => {});
  }, [location.pathname]);

  const links = [...studentLinks, ...(user?.role === 'ADMIN' || user?.role === 'MODERATOR'
    ? [{ to: '/admin', label: 'Administration', icon: Shield }]
    : [])];

  return <div className="app-shell">
    {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <Link to="/dashboard" className="brand-lockup" aria-label="LostLink home">
        <span className="brand-mark"><Compass size={21} strokeWidth={2.2} /></span>
        <span className="brand-name">lostlink<span>.</span></span>
        <button className="sidebar-close" aria-label="Close menu" onClick={(event) => { event.preventDefault(); setOpen(false); }}><X size={19} /></button>
      </Link>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">
        {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}>
          <Icon size={18} strokeWidth={1.9} /><span>{label}</span>{label === 'Notifications' && unread > 0 && <span className="nav-count">{unread}</span>}
        </NavLink>)}
      </nav>
      <div className="sidebar-divider" />
      <div className="workspace-label">QUICK ACTIONS</div>
      <Link to="/report/lost" className="nav-link"><FilePlus2 size={18} /><span>Report something lost</span></Link>
      <Link to="/report/found" className="nav-link"><MapPinned size={18} /><span>Report something found</span></Link>
      <div className="sidebar-spacer" />
      <div className="trust-card">
        <span className="trust-icon"><Sparkles size={16} /></span>
        <div><strong>Good things add up</strong><p>You've earned <b>{user?.contribution || 0}</b> trust points</p></div>
      </div>
      <button className="user-switcher" onClick={() => navigate('/profile')}>
        <span className="avatar">{initials(user?.name)}</span>
        <span className="user-details"><b>{user?.name}</b><small>{user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'MODERATOR' ? 'Moderator' : 'Student account'}</small></span>
        <ChevronDown size={16} />
      </button>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={21} /></button>
        <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{links.find((link) => location.pathname.startsWith(link.to))?.label || (location.pathname.startsWith('/report') ? 'New report' : 'Your campus')}</b></div>
        <div className="topbar-actions">
          <Link to="/notifications" className="icon-button notification-button" aria-label="Notifications"><Bell size={18} />{unread > 0 && <i />}</Link>
          <span className="topbar-divider" />
          <button className="top-profile" onClick={() => navigate('/profile')}><span className="avatar avatar-small">{initials(user?.name)}</span><b>{user?.name?.split(' ')[0]}</b><ChevronDown size={15} /></button>
          <button className="icon-button logout-button" aria-label="Log out" title="Log out" onClick={() => { logout(); navigate('/'); }}><LogOut size={17} /></button>
        </div>
      </header>
      <div className="page-content"><Outlet /></div>
    </main>
  </div>;
}
