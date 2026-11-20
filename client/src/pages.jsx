import { lazy, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Bell, BookOpen, Check, CheckCheck, ChevronRight,
  CircleHelp, Clock3, Compass, FilePlus2, FileText, Fingerprint, HeartHandshake, KeyRound, MapPin, Package,
  Search, ShieldCheck, Sparkles, Trophy, Upload, Users, WalletCards, X
} from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import api, { errorMessage } from './services/api.js';
import { Button, EmptyState, ErrorState, formatDate, formatRelative, Loading, PageHeader, StatusPill } from './components/ui.jsx';

const AdminDashboardCharts = lazy(() => import('./components/AnalyticsCharts.jsx'));
const categories = ['Electronics', 'Cards & IDs', 'Books & stationery', 'Bags', 'Keys', 'Drinkware', 'Clothing', 'Other'];
const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

export function LandingPage() {
  return <div className="marketing">
    <header className="marketing-nav"><Link to="/" className="brand-lockup"><span className="brand-mark"><Compass size={21} /></span><span className="brand-name">lostlink<span>.</span></span></Link><nav><a href="#how-it-works">How it works</a><a href="#why-lostlink">Why LostLink</a></nav><div className="marketing-actions"><Link className="nav-login" to="/login">Log in</Link><Link className="button button-primary button-small" to="/register">Get started <ArrowRight size={15} /></Link></div></header>
    <main>
      <section className="hero-section">
        <div className="hero-copy"><div className="hero-pill"><span /> Your campus, a little more connected</div><h1>Lost something?<br /><em>Let’s find it.</em></h1><p className="hero-subtitle">A kinder, smarter way to reconnect students with the things they thought were gone for good.</p><div className="hero-actions"><Link to="/register" className="button button-primary button-large">Find your thing <ArrowRight size={17} /></Link><Link to="/login" className="button button-white button-large">I found something</Link></div><div className="hero-social-proof"><div className="avatar-stack"><span>A</span><span>M</span><span>J</span><span>+</span></div><div><b>A little help goes a long way</b><small>Join your campus community</small></div></div></div>
        <div className="hero-visual" aria-label="A matching lost item report"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-halo"><div className="hero-pin"><Compass size={40} /></div><div className="hero-connect"><span /><i /><span /></div></div><div className="floating-card card-lost"><div className="item-art item-art-blue"><WalletCards size={28} /></div><div className="floating-copy"><small>LOST · LIBRARY</small><b>Campus ID card</b><span>Yesterday, 3:40 pm</span></div><span className="card-dot dot-blue" /></div><div className="floating-card card-found"><div className="item-art item-art-green"><WalletCards size={28} /></div><div className="floating-copy"><small>FOUND · LIBRARY</small><b>Student ID card</b><span>Today, 9:15 am</span></div><span className="match-badge"><Sparkles size={12} /> 94%</span></div><div className="floating-notice"><span><Check size={14} /></span><b>Something just clicked.</b></div></div>
      </section>
      <section className="trust-strip"><span>MADE FOR CAMPUS LIFE</span><div><span><ShieldCheck size={16} /> Private by design</span><span><Fingerprint size={16} /> Verified handovers</span><span><Sparkles size={16} /> Thoughtful matching</span></div></section>
      <section id="how-it-works" className="steps-section"><div className="section-intro"><p className="eyebrow">HOW LOSTLINK WORKS</p><h2>Small steps. Happy reunions.</h2><p>No more shouting into group chats. Just a clearer path from “I lost it” to “I got it back.”</p></div><div className="step-grid"><article><span className="step-number">01</span><span className="step-icon step-violet"><FilePlus2 size={21} /></span><h3>Tell your campus</h3><p>Share what went missing or what you picked up. A few useful details go a long way.</p></article><article><span className="step-number">02</span><span className="step-icon step-green"><Sparkles size={21} /></span><h3>Let the clues connect</h3><p>LostLink looks for details that line up, then lets the right people know privately.</p></article><article><span className="step-number">03</span><span className="step-icon step-peach"><HeartHandshake size={21} /></span><h3>Make the handoff</h3><p>Verify ownership and meet up with a one-time SafeReturn code. That's the good part.</p></article></div></section>
      <section id="why-lostlink" className="bottom-cta"><div className="cta-art"><div className="cta-orb"><MapPin size={35} /></div><span className="cta-spark cta-spark-one">✦</span><span className="cta-spark cta-spark-two">✳</span></div><div><p className="eyebrow">A BETTER WAY BACK</p><h2>Good things find<br />their way home.</h2><p>Start with a report. Stay for the little moments that make campus feel like a community.</p><Link to="/register" className="button button-white">Join LostLink <ArrowRight size={16} /></Link></div></section>
    </main>
    <footer className="marketing-footer"><Link to="/" className="brand-lockup"><span className="brand-mark"><Compass size={18} /></span><span className="brand-name">lostlink<span>.</span></span></Link><span>Find what you've lost. Return what you've found.</span><span>Made for campus, with care.</span></footer>
  </div>;
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await login(values); navigate('/dashboard'); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  }
  return <AuthFrame title="Welcome back." subtitle="The right thing has a way of finding its way home."><form onSubmit={submit} className="auth-form">
    <label>Email address<input type="email" autoComplete="email" required placeholder="you@campus.edu" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} /></label>
    <label>Password<input type="password" autoComplete="current-password" required placeholder="Your password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} /></label>
    {error && <ErrorState error={error} />}
    <Button className="auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></Button>
    <p className="demo-hint">Try the demo: <button type="button" onClick={() => setValues({ email: 'alex@lostlink.edu', password: 'LostLink2026!' })}>student</button> or <button type="button" onClick={() => setValues({ email: 'admin@lostlink.edu', password: 'LostLink2026!' })}>admin</button></p>
    <p className="auth-switch">New to LostLink? <Link to="/register">Create an account</Link></p>
  </form></AuthFrame>;
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', enrollment: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await register(values); navigate('/dashboard'); } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  }
  return <AuthFrame title="Make LostLink yours." subtitle="A campus where things—and people—find their way back."><form onSubmit={submit} className="auth-form">
    <label>Your name<input autoComplete="name" required minLength="2" maxLength="80" placeholder="How should we call you?" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} /></label>
    <label>College email<input type="email" autoComplete="email" required placeholder="you@campus.edu" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} /></label>
    <label>Enrollment number<input required minLength="3" maxLength="40" placeholder="Your student ID" value={values.enrollment} onChange={(e) => setValues({ ...values, enrollment: e.target.value })} /></label>
    <label>Create a password<input type="password" autoComplete="new-password" minLength="10" maxLength="72" required placeholder="At least 10 characters" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} /></label>
    {error && <ErrorState error={error} />}
    <Button className="auth-submit" disabled={busy}>{busy ? 'Creating account…' : 'Create my account'} <ArrowRight size={16} /></Button>
    <p className="auth-switch">Already part of the community? <Link to="/login">Sign in</Link></p>
  </form></AuthFrame>;
}

function AuthFrame({ children, title, subtitle }) {
  return <div className="auth-page"><div className="auth-side"><Link to="/" className="brand-lockup"><span className="brand-mark"><Compass size={21} /></span><span className="brand-name">lostlink<span>.</span></span></Link><div className="auth-side-content"><span className="auth-art"><HeartHandshake size={32} /></span><p className="eyebrow">FIND WHAT YOU'VE LOST</p><h2>It’s more than<br />just a lost thing.</h2><p>It's the notes your friend left behind. The bottle you carried everywhere. The small stuff that makes a day yours.</p><div className="auth-side-foot"><span /><span /><span /> A little help goes a long way.</div></div></div><div className="auth-main"><Link to="/" className="auth-mobile-brand"><Compass size={18} /> lostlink<span>.</span></Link><div className="auth-card"><span className="auth-welcome-icon"><Sparkles size={18} /></span><h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>{children}</div><p className="auth-privacy"><ShieldCheck size={14} /> Your campus account stays yours. Always.</p></div></div>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const url = user?.role === 'ADMIN' || user?.role === 'MODERATOR' ? '/analytics/admin' : '/analytics/student';
    api.get(url).then(({ data: result }) => setData(result)).catch((reason) => setError(errorMessage(reason)));
  }, [user?.role]);
  if (error) return <><PageHeader eyebrow="YOUR CAMPUS" title="Welcome back." /><ErrorState error={error} /></>;
  if (!data) return <><PageHeader eyebrow="YOUR CAMPUS" title="Welcome back." /><Loading /></>;
  const admin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const stats = admin ? [
    { label: 'Students', value: data.stats.students, icon: Users, tone: 'violet', foot: 'registered accounts' },
    { label: 'Items reported', value: data.stats.lost + data.stats.found, icon: Package, tone: 'blue', foot: `${data.stats.lost} lost · ${data.stats.found} found` },
    { label: 'Need a review', value: data.stats.claims + data.stats.pendingReports, icon: Clock3, tone: 'orange', foot: `${data.stats.claims} claims · ${data.stats.pendingReports} reports` },
    { label: 'Recovered', value: data.stats.recovered, icon: HeartHandshake, tone: 'green', foot: `${data.stats.recoveryRate}% recovery rate` }
  ] : [
    { label: 'Lost reports', value: data.stats.lost, icon: Search, tone: 'violet', foot: 'items you’re looking for' },
    { label: 'Found reports', value: data.stats.found, icon: Package, tone: 'blue', foot: 'items you’ve helped with' },
    { label: 'Smart matches', value: data.stats.matches, icon: Sparkles, tone: 'orange', foot: 'possible connections' },
    { label: 'Recovered', value: data.stats.recovered, icon: HeartHandshake, tone: 'green', foot: 'back where they belong' }
  ];
  return <div className="dashboard-page">
    <PageHeader eyebrow={admin ? 'CAMPUS OVERVIEW' : 'YOUR CAMPUS'} title={<>{greeting()}, {user?.name?.split(' ')[0]} <span className="wave">✦</span></>} description={admin ? 'A thoughtful look at what’s happening across your campus.' : 'Here’s what’s happening around you today.'} action={<Link to="/report/lost" className="button button-primary"><FilePlus2 size={16} /> New report</Link>} />
    <section className="stat-grid">{stats.map(({ label, value, icon: Icon, tone, foot }, index) => <article className={`stat-card stat-${tone}`} key={label} style={{ animationDelay: `${index * 70}ms` }}><div className="stat-top"><span className="stat-label">{label}</span><span className="stat-icon"><Icon size={18} /></span></div><strong>{value}</strong><span className="stat-foot"><i />{foot}</span></article>)}</section>
    {admin ? <AdminDashboardCharts data={data} /> : <div className="dashboard-grid">
      <section className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR ACTIVITY</p><h2>Latest reports</h2></div><Link className="text-link" to="/reports">Browse all <ArrowRight size={14} /></Link></div>
        {data.reports.length ? <div className="activity-list">{data.reports.map((report) => <Link className="activity-row" to={`/reports/${report.id}`} key={report.id}><span className={`activity-icon ${report.type === 'LOST' ? 'icon-lost' : 'icon-found'}`}>{report.type === 'LOST' ? <Search size={17} /> : <Package size={17} />}</span><span className="activity-info"><b>{report.title}</b><small>{report.locationName} · {formatRelative(report.createdAt)}</small></span><StatusPill status={report.status} /><ChevronRight size={15} className="activity-chevron" /></Link>)}</div> : <EmptyState title="Your story starts here" description="Share a lost or found item and help your campus reconnect." action={<Link className="text-link" to="/report/lost">Create your first report <ArrowRight size={14} /></Link>} />}
      </section>
      <section className="panel right-rail"><div className="panel-heading"><div><p className="eyebrow">A FEW GOOD THINGS</p><h2>Quick actions</h2></div></div><div className="quick-actions"><Link to="/report/lost"><span className="quick-icon quick-violet"><Search size={18} /></span><span><b>I lost something</b><small>Tell us what went missing</small></span><ArrowRight size={16} /></Link><Link to="/report/found"><span className="quick-icon quick-green"><Package size={18} /></span><span><b>I found something</b><small>Help it find its person</small></span><ArrowRight size={16} /></Link><Link to="/matches"><span className="quick-icon quick-orange"><Sparkles size={18} /></span><span><b>Check my matches</b><small>See what's lining up</small></span><ArrowRight size={16} /></Link></div><div className="mini-note"><span><ShieldCheck size={17} /></span><p><b>Your details stay private.</b><br />Ownership clues are never shown to other students.</p></div></section>
    </div>}
    {!admin && <section className="dashboard-bottom-note"><span className="note-spark"><Sparkles size={16} /></span><p><b>Good things are happening around you.</b> One thoughtful report can make someone’s whole week.</p><Link to="/leaderboard">See campus helpers <ArrowRight size={14} /></Link></section>}
  </div>;
}

export function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    setLoading(true);
    api.get('/reports', { params: type ? { type } : {} }).then(({ data }) => setReports(data.reports)).catch((reason) => setError(errorMessage(reason))).finally(() => setLoading(false));
  }, [type]);
  const visible = reports.filter((report) => `${report.title} ${report.category} ${report.locationName} ${report.description}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader eyebrow="CAMPUS BOARD" title="Something might be yours." description="A little looking goes a long way. Browse what’s been lost and found around campus." action={<Link to="/report/found" className="button button-primary"><FilePlus2 size={16} /> Share a report</Link>} />
    <div className="filter-toolbar"><div className="search-field"><Search size={17} /><input placeholder="Search reports, places, categories…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search reports" /></div><div className="filter-chips">{[['', 'Everything'], ['LOST', 'Lost'], ['FOUND', 'Found']].map(([value, label]) => <button key={value} className={`filter-chip ${type === value ? 'chip-active' : ''}`} onClick={() => setType(value)}>{label}</button>)}</div></div>
    {error ? <ErrorState error={error} /> : loading ? <Loading /> : visible.length ? <div className="report-grid">{visible.map((report) => <ReportCard key={report.id} report={report} />)}</div> : <EmptyState title="Nothing here just yet" description="Try a different search or share the first report from your campus." action={<Link to="/report/lost" className="button button-primary button-small">Create a report</Link>} />}
  </>;
}

export function MyReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/reports/mine').then(({ data }) => setReports(data.reports)).catch((reason) => setError(errorMessage(reason))).finally(() => setLoading(false)); }, []);
  return <><PageHeader eyebrow="YOUR LITTLE CORNER" title="My reports" description="Keep an eye on the items you’ve shared and the little steps they’ve taken." action={<Link to="/report/lost" className="button button-primary"><FilePlus2 size={16} /> New report</Link>} />
    {error ? <ErrorState error={error} /> : loading ? <Loading /> : reports.length ? <div className="report-grid">{reports.map((report) => <ReportCard key={report.id} report={report} />)}</div> : <EmptyState title="You haven’t shared a report yet" description="Lost something or found something? Start a report and help it find its way." action={<Link to="/report/lost" className="button button-primary button-small">Create a report</Link>} />}
  </>;
}

export function RecoveryAssistantPage() {
  const [form, setForm] = useState({ item: '', category: '', location: '', date: '' });
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function search(event) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const { data } = await api.get('/reports', { params: {
        type: 'FOUND', q: form.item || undefined, category: form.category || undefined,
        location: form.location || undefined, date: form.date || undefined, limit: 50
      } });
      setResults(data.reports); setSearched(true);
    } catch (reason) { setError(errorMessage(reason)); } finally { setLoading(false); }
  }
  return <><PageHeader eyebrow="LET’S LOOK TOGETHER" title="Recovery assistant" description="A few clues are all we need to search real reports from your campus. No guesswork, no fake answers." />
    <div className="assistant-layout"><form className="panel assistant-form" onSubmit={search}><span className="assistant-icon"><Sparkles size={20} /></span><h2>Let’s retrace a few steps.</h2><p>We’ll look through found reports and show you the details that might line up.</p><label>What did you lose?<input placeholder="e.g. a black calculator" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} /></label><label>What kind of thing is it?<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Any category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><div className="form-grid"><label>Where might it be?<input placeholder="e.g. library" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label><label>When did you lose it?<input type="date" value={form.date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label></div>{error && <ErrorState error={error} />}<Button disabled={loading}>{loading ? 'Looking through reports…' : 'Find possible matches'} <Search size={15} /></Button></form><section className="assistant-results">{searched ? <><div className="panel-heading"><div><p className="eyebrow">REAL CAMPUS REPORTS</p><h2>{results.length ? `${results.length} found ${results.length === 1 ? 'item' : 'items'} to look at` : 'No close clues yet'}</h2></div></div>{results.length ? <div className="report-grid assistant-report-grid">{results.map((report) => <ReportCard key={report.id} report={report} />)}</div> : <div className="panel assistant-empty"><span className="quick-icon quick-orange"><Search size={17} /></span><h3>Nothing in the board matches just yet.</h3><p>Try a nearby location or a broader description. You can also create a lost report and we’ll look for matches as new items are shared.</p><Link className="button button-primary button-small" to="/report/lost">Create a lost report <ArrowRight size={14} /></Link></div>}</> : <div className="panel assistant-empty"><span className="quick-icon quick-violet"><BookOpen size={17} /></span><h3>Start with what you remember.</h3><p>Search your campus’s current found reports. We’ll show real items and where they were picked up.</p><div className="assistant-tip"><ShieldCheck size={15} /> Match scores are clues—not proof of ownership.</div></div>}</section></div>
  </>;
}

function ReportCard({ report }) {
  return <Link to={`/reports/${report.id}`} className="report-card"><div className={`report-card-art ${report.type === 'LOST' ? 'art-lost' : 'art-found'}`}>{report.images?.[0] ? <img src={report.images[0].path} alt="" /> : report.type === 'LOST' ? <Search size={29} /> : <Package size={29} />}<span className={`type-tag type-${report.type.toLowerCase()}`}>{report.type === 'LOST' ? 'Lost item' : 'Found item'}</span><span className="report-code">{report.reportCode}</span></div><div className="report-card-body"><div className="report-category">{report.category}<span>·</span>{report.color}</div><h3>{report.title}</h3><p>{report.description}</p><div className="report-card-foot"><span><MapPin size={14} />{report.locationName}</span><span>{formatRelative(report.createdAt)}</span></div></div></Link>;
}

export function ReportFormPage() {
  const { type = 'lost' } = useParams();
  const isFound = type === 'found';
  const [form, setForm] = useState({ title: '', category: '', description: '', color: '', brand: '', eventDate: new Date().toISOString().slice(0, 10), eventTime: '', locationName: '', privateVerification: '', custodyStatus: '' });
  const [image, setImage] = useState(null);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [confirmDuplicates, setConfirmDuplicates] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { api.get('/locations').then(({ data }) => setLocations(data)).catch(() => {}); }, []);
  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => { if (value) payload.append(key, value); });
    if (image) payload.append('image', image);
    if (confirmDuplicates) payload.append('confirmDuplicates', 'true');
    try {
      const { data } = await api.post(`/reports/${isFound ? 'found' : 'lost'}`, payload);
      navigate(`/reports/${data.report.id}`, { state: { created: true } });
    } catch (reason) {
      if (reason.response?.status === 409 && reason.response.data.duplicates) {
        setDuplicates(reason.response.data.duplicates); setConfirmDuplicates(false);
      } else setError(errorMessage(reason));
    } finally { setBusy(false); }
  }
  return <><PageHeader eyebrow={isFound ? 'PASS IT FORWARD' : 'LET’S FIND IT'} title={isFound ? 'Found something?' : 'Lost something?'} description={isFound ? 'A few details can help the right person find their way back to it.' : 'Tell us a little about it. We’ll look for clues and let you know if something lines up.'} />
    <div className="form-layout"><form className="panel report-form" onSubmit={submit}>
      <div className="form-section-title"><span>01</span><div><h2>Tell us about the item</h2><p>Clear details make for better matches.</p></div></div>
      <div className="form-grid"><label className="field-wide">What’s the item called?<input required minLength="2" maxLength="100" placeholder="e.g. Black scientific calculator" value={form.title} onChange={(e) => update('title', e.target.value)} /></label>
        <label>Category<select required value={form.category} onChange={(e) => update('category', e.target.value)}><option value="">Choose a category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Color<input required placeholder="e.g. Midnight blue" value={form.color} onChange={(e) => update('color', e.target.value)} /></label>
        <label>Brand <span className="optional">(optional)</span><input placeholder="e.g. Casio" value={form.brand} onChange={(e) => update('brand', e.target.value)} /></label>
        <label className="field-wide">A few more details<textarea required minLength="8" maxLength="1000" rows="3" placeholder="Anything distinctive that could help someone recognize it…" value={form.description} onChange={(e) => update('description', e.target.value)} /></label>
      </div>
      <div className="form-section-title form-section-spaced"><span>02</span><div><h2>{isFound ? 'Where did you find it?' : 'Where did you last see it?'}</h2><p>A place and a time can help narrow the search.</p></div></div>
      <div className="form-grid"><label>Campus location<input list="campus-locations" required placeholder="Choose or enter a location" value={form.locationName} onChange={(e) => update('locationName', e.target.value)} /><datalist id="campus-locations">{locations.map((location) => <option key={location.id} value={location.name} />)}</datalist></label>
        <label>{isFound ? 'Date found' : 'Date lost'}<input type="date" required value={form.eventDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => update('eventDate', e.target.value)} /></label>
        <label>Approximate time <span className="optional">(optional)</span><input type="time" value={form.eventTime} onChange={(e) => update('eventTime', e.target.value)} /></label>
        {isFound && <label>Where is it now?<input required placeholder="e.g. With campus reception" value={form.custodyStatus} onChange={(e) => update('custodyStatus', e.target.value)} /></label>}
      </div>
      {!isFound && <div className="private-clue"><span><ShieldCheck size={17} /></span><label>Private ownership clue <small>Only you and trusted moderators can see this. Add at least one answer, with one answer per line (for example: a sticker, engraving, or a detail only you know).</small><textarea required minLength="4" maxLength="500" rows="2" placeholder={'Blue star sticker\nSmall initials inside'} value={form.privateVerification} onChange={(e) => update('privateVerification', e.target.value)} /></label></div>}
      <div className="form-section-title form-section-spaced"><span>03</span><div><h2>A photo helps, too</h2><p>Keep personal information and serial numbers out of view.</p></div></div>
      <label className="upload-zone"><Upload size={19} /><b>{image ? image.name : 'Add a photo of the item'}</b><small>JPG, PNG, or WebP · up to 5 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImage(e.target.files?.[0] || null)} /></label>
      {error && <ErrorState error={error} />}
      {duplicates.length > 0 && <div className="duplicate-warning"><b>A couple of reports look similar</b><p>Have a quick look. If this is a genuinely different item, submit once more to continue.</p>{duplicates.map((item) => <Link key={item.id} to={`/reports/${item.id}`}>{item.reportCode} · {item.title} — {item.locationName}</Link>)}<label className="checkbox-line"><input type="checkbox" checked={confirmDuplicates} onChange={(e) => setConfirmDuplicates(e.target.checked)} /> I checked these and this is a different item.</label></div>}
      <div className="form-actions"><Link to="/dashboard" className="button button-quiet">Cancel</Link><Button disabled={busy || (duplicates.length > 0 && !confirmDuplicates)}>{busy ? 'Saving your report…' : confirmDuplicates ? 'Continue with report' : duplicates.length ? 'Review similar reports' : 'Share report'} <ArrowRight size={16} /></Button></div>
    </form><aside className="form-aside"><div className="aside-note"><span><Sparkles size={17} /></span><h3>Little details, big difference.</h3><p>Color, location, and a specific detail can help us find a meaningful match. Our match score is a helpful estimate, never proof of ownership.</p></div><div className="aside-note aside-safe"><span><ShieldCheck size={17} /></span><h3>Your information stays yours.</h3><p>We never share private ownership clues, your enrollment number, or your email with other students.</p></div></aside></div>
  </>;
}

export function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState('');
  const refresh = () => Promise.all([api.get('/matches'), api.get('/claims')]).then(([a, b]) => { setMatches(a.data.matches); setClaims(b.data.claims); });
  useEffect(() => { refresh().catch((reason) => setError(errorMessage(reason))).finally(() => setLoading(false)); }, []);
  async function createClaim(match) {
    setBusy(match.id); setNotice(''); setError('');
    try {
      const responses = (answers[match.id] || '').split('\n').map((item) => item.trim()).filter(Boolean);
      const { data } = await api.post('/claims', { lostReportId: match.lostReport.id, foundReportId: match.foundReport.id, answers: responses });
      setNotice(data.verificationPassed ? 'Your ownership answers matched. The finder can now review the claim.' : 'Your claim was saved for moderator review. The private answers did not match.');
      await refresh();
    } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(''); }
  }
  async function reviewClaim(id, decision) {
    setBusy(id); setError(''); setNotice('');
    try { await api.put(`/claims/${id}/verify`, { decision }); setNotice(decision === 'approve' ? 'Ownership verified. You can now set up a SafeReturn handover.' : 'Claim decision saved.'); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(''); }
  }
  if (loading) return <><PageHeader eyebrow="THE CLUES ARE IN" title="Smart matches" /><Loading /></>;
  return <><PageHeader eyebrow="THE CLUES ARE IN" title="Smart matches" description="When details line up, good things can happen. These scores are estimates—not proof of ownership." action={<Button variant="white" onClick={() => { setLoading(true); api.post('/matches/recalculate').then(refresh).catch((reason) => setError(errorMessage(reason))).finally(() => setLoading(false)); }}><Sparkles size={15} /> Refresh matches</Button>} />
    {error && <ErrorState error={error} />}{notice && <div className="success-banner"><Check size={17} />{notice}</div>}
    {matches.length === 0 ? <EmptyState title="The clues are still gathering" description="We'll let you know when a lost and found report share enough details to be worth a closer look." action={<Link to="/reports" className="text-link">Browse campus reports <ArrowRight size={14} /></Link>} /> :
      <div className="matches-list">{matches.map((match) => {
        const ownsLost = match.lostReport.user?.id === user.id;
        const ownsFound = match.foundReport.user?.id === user.id;
        const existing = claims.find((claim) => claim.lostReportId === match.lostReport.id && claim.foundReportId === match.foundReport.id);
        return <article className="panel match-card" key={match.id}><div className="match-score"><strong>{match.score}<small>%</small></strong><span>possible match</span><div className="score-meter"><i style={{ width: `${match.score}%` }} /></div></div><div className="match-main"><div className="match-items"><div><small>LOST REPORT</small><Link to={`/reports/${match.lostReport.id}`}><b>{match.lostReport.title}</b></Link><span><MapPin size={13} />{match.lostReport.locationName} · {formatDate(match.lostReport.eventDate)}</span></div><ArrowRight className="match-arrow" size={18} /><div><small>FOUND REPORT</small><Link to={`/reports/${match.foundReport.id}`}><b>{match.foundReport.title}</b></Link><span><MapPin size={13} />{match.foundReport.locationName} · {formatDate(match.foundReport.eventDate)}</span></div></div><div className="match-tags">{match.characteristics.map((item) => <span key={item}><Check size={12} />{item}</span>)}</div>
          {existing ? <div className="claim-status-row"><StatusPill status={existing.status} /><span>Claim submitted {formatRelative(existing.createdAt)}</span>{existing.status === 'PENDING_VERIFICATION' && ownsFound && <div className="claim-actions"><Button disabled={busy === existing.id} onClick={() => reviewClaim(existing.id, 'approve')}>Approve claim</Button><Button variant="quiet" disabled={busy === existing.id} onClick={() => reviewClaim(existing.id, 'dispute')}>Needs review</Button></div>}</div> :
            ownsLost && <div className="claim-entry"><label>Private ownership answers <small>One per line. These are compared privately with your report's clues.</small><textarea rows="2" value={answers[match.id] || ''} onChange={(e) => setAnswers({ ...answers, [match.id]: e.target.value })} placeholder="Enter your item’s private details" /></label><Button disabled={busy === match.id || !answers[match.id]?.trim()} onClick={() => createClaim(match)}>{busy === match.id ? 'Checking…' : 'Start ownership check'} <ArrowRight size={15} /></Button></div>}
          </div><div className="match-disclaimer"><ShieldCheck size={14} /> A match helps you look closer. Only a verified claim can start a handover.</div></article>;
      })}</div>}
    <ClaimsAndHandover claims={claims} refresh={refresh} onError={setError} onNotice={setNotice} />
  </>;
}

export function ClaimsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const refresh = () => api.get('/claims').then(({ data }) => setClaims(data.claims));
  async function review(claimId, decision) {
    setBusy(claimId); setError('');
    try { await api.put(`/claims/${claimId}/verify`, { decision }); setNotice(decision === 'approve' ? 'Ownership verified. The participants can now arrange a SafeReturn.' : 'The claim was sent for further review.'); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(''); }
  }
  useEffect(() => { refresh().catch((reason) => setError(errorMessage(reason))).finally(() => setLoading(false)); }, []);
  return <><PageHeader eyebrow="A GOOD THING IN MOTION" title="Claims & handovers" description="Review ownership requests and keep track of verified SafeReturn handoffs." />{error && <ErrorState error={error} />}{notice && <div className="success-banner"><Check size={16} />{notice}</div>}{loading ? <Loading /> : claims.length ? <div className="claims-page-grid"><div className="claims-list">{claims.map((claim) => {
    const canReview = ['ADMIN', 'MODERATOR'].includes(user.role) || claim.foundReport?.userId === user.id;
    return <article className="panel claim-overview" key={claim.id}><div className="claim-card-top"><span className="quick-icon quick-violet"><KeyRound size={17} /></span><StatusPill status={claim.status} /></div><h3>{claim.lostReport?.title || 'Item claim'}</h3><p>{claim.lostReport?.reportCode} ↔ {claim.foundReport?.reportCode}</p><small>Submitted {formatRelative(claim.createdAt)} · private answer check {claim.answersPassed ? 'matched' : 'needs review'}</small>{claim.status === 'PENDING_VERIFICATION' && canReview && <div className="claim-actions"><Button disabled={busy === claim.id} onClick={() => review(claim.id, 'approve')}>Approve claim</Button><Button variant="quiet" disabled={busy === claim.id} onClick={() => review(claim.id, 'dispute')}>Needs review</Button></div>}</article>;
  })}</div><ClaimsAndHandover claims={claims} refresh={refresh} onError={setError} onNotice={setNotice} /></div> : <EmptyState title="No claims to look after" description="When a claim is submitted for one of your reports, the review and SafeReturn journey will appear here." action={<Link to="/matches" className="text-link">Look at possible matches <ArrowRight size={14} /></Link>} />}</>;
}

function ClaimsAndHandover({ claims, refresh, onError, onNotice }) {
  const { user } = useAuth();
  const [active, setActive] = useState(null);
  const [token, setToken] = useState('');
  const [handover, setHandover] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!claims.length) return null;
  async function create(claimId) {
    setBusy(true);
    try { const { data } = await api.post('/handover/create', { claimId }); setHandover(data); setActive(claimId); onNotice('SafeReturn code created. It expires in 15 minutes.'); }
    catch (reason) { onError(errorMessage(reason)); } finally { setBusy(false); }
  }
  async function complete() {
    if (!active || !token.trim()) return;
    setBusy(true);
    try { await api.post(`/handover/${handover?.handoverId || active}/complete`, { token }); onNotice('Handover complete. The item is now marked as recovered.'); setHandover(null); setActive(null); setToken(''); await refresh(); }
    catch (reason) { onError(errorMessage(reason)); } finally { setBusy(false); }
  }
  return <section className="claims-section"><div className="section-divider"><span />YOUR CLAIMS & HANDOVERS<span /></div><div className="claims-grid">{claims.map((claim) => <article className="panel claim-card" key={claim.id}><div className="claim-card-top"><span className="quick-icon quick-violet"><KeyRound size={17} /></span><StatusPill status={claim.status} /></div><h3>{claim.lostReport?.title || 'Item claim'}</h3><p>{claim.foundReport?.reportCode} · submitted {formatRelative(claim.createdAt)}</p>{claim.status === 'VERIFIED' && <Button disabled={busy} onClick={() => create(claim.id)}><ShieldCheck size={15} /> Create SafeReturn code</Button>}</article>)}</div>
    {handover && <div className="handover-panel"><button className="modal-close" aria-label="Close" onClick={() => { setHandover(null); setActive(null); }}><X size={18} /></button><div className="handover-qr"><img src={handover.qrCode} alt="SafeReturn QR code" /></div><div><p className="eyebrow">SAFERETURN · ONE-TIME CODE</p><h3>Meet up. Verify. Hand it home.</h3><p>This code expires at {new Date(handover.expiresAt).toLocaleTimeString()}. Share it only with the other person in this handover.</p><code className="token-display">{handover.token}</code><label className="handover-input">Enter the code to complete the handover<input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the shared code" /></label><Button disabled={busy || !token.trim()} onClick={complete}>{busy ? 'Verifying…' : 'Complete handover'} <Check size={15} /></Button></div></div>}
  </section>;
}

export function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get(`/reports/${id}`).then(({ data }) => setReport(data.report)).catch((reason) => setError(errorMessage(reason))); }, [id]);
  if (error) return <><PageHeader eyebrow="CAMPUS BOARD" title="Report details" /><ErrorState error={error} /></>;
  if (!report) return <Loading />;
  return <><Link to="/reports" className="back-link"><ArrowRight size={14} /> Back to reports</Link><div className="detail-layout"><article className="panel detail-main"><div className={`detail-art ${report.type === 'LOST' ? 'art-lost' : 'art-found'}`}>{report.images?.[0] ? <img src={report.images[0].path} alt={report.title} /> : report.type === 'LOST' ? <Search size={45} /> : <Package size={45} />}<span className={`type-tag type-${report.type.toLowerCase()}`}>{report.type === 'LOST' ? 'Lost item' : 'Found item'}</span></div><div className="detail-body"><p className="report-category">{report.category} <span>·</span> {report.color}</p><h1>{report.title}</h1><p>{report.description}</p><div className="detail-meta"><span><MapPin size={16} />{report.locationName}</span><span><Clock3 size={16} />{formatDate(report.eventDate)}{report.eventTime ? ` · ${report.eventTime}` : ''}</span>{report.brand && <span><Package size={16} />{report.brand}</span>}</div>{report.custodyStatus && <div className="custody-note"><ShieldCheck size={16} /><span><b>Safe and sound</b>{report.custodyStatus}</span></div>}</div></article><aside className="panel detail-sidebar"><p className="eyebrow">REPORT DETAILS</p><div className="detail-code">{report.reportCode}</div><div className="detail-owner"><span className="avatar">{report.user?.name?.slice(0, 1)}</span><div><b>Shared by {report.user?.name}</b><small>{formatRelative(report.createdAt)}</small></div></div><div className="detail-status"><span>Current status</span><StatusPill status={report.status} /></div><div className="timeline"><h3>Journey so far</h3>{report.history?.map((step) => <div className="timeline-item" key={step.id}><i /><div><b>{step.status.replaceAll('_', ' ').toLowerCase()}</b><small>{step.note || 'Status updated'} · {formatDate(step.createdAt)}</small></div></div>)}</div><Link to="/matches" className="button button-primary detail-match"><Sparkles size={16} /> Check for a match</Link><p className="privacy-foot"><ShieldCheck size={13} /> Private details are always protected.</p></aside></div></>;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  function refresh() { return api.get('/notifications').then(({ data }) => setNotifications(data.notifications)); }
  useEffect(() => { refresh().catch((reason) => setError(errorMessage(reason))).finally(() => setLoading(false)); }, []);
  async function markRead(id) {
    try { await api.put(`/notifications/${id}/read`); setNotifications((list) => list.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item)); }
    catch (reason) { setError(errorMessage(reason)); }
  }
  const unread = notifications.filter((item) => !item.readAt).length;
  return <><PageHeader eyebrow="A LITTLE SOMETHING" title="Your notifications" description={unread ? `${unread} little updates are waiting for you.` : 'You’re all caught up. We’ll let you know when something happens.'} action={unread > 0 && <Button variant="white" onClick={async () => { for (const item of notifications.filter((entry) => !entry.readAt)) await markRead(item.id); }}><CheckCheck size={15} /> Mark all read</Button>} />
    {error && <ErrorState error={error} />}{loading ? <Loading /> : notifications.length ? <div className="notification-list">{notifications.map((item) => <article className={`panel notification-row ${!item.readAt ? 'notification-unread' : ''}`} key={item.id}><span className="notification-icon"><Bell size={17} /></span><div className="notification-copy"><p>{item.message}</p><small>{formatRelative(item.createdAt)} · {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>{!item.readAt && <button className="mark-read" onClick={() => markRead(item.id)}>Mark read</button>}</article>)}</div> : <EmptyState title="Quiet in a good way" description="Match suggestions, claim updates, and handovers will find their way here." />}</>;
}

export function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/leaderboard').then(({ data }) => setUsers(data.users)).catch((reason) => setError(errorMessage(reason))); }, []);
  const sorted = [...users].sort((a, b) => b.contribution - a.contribution);
  return <><PageHeader eyebrow="GOOD THINGS ADD UP" title="Campus helpers" description="A little kindness travels. Meet the people making LostLink feel like a community." /><div className="leaderboard-layout"><section className="leaderboard-hero"><span className="leaderboard-glow" /><div className="trophy-circle"><Trophy size={30} /></div><p className="eyebrow">CAMPUS COMMUNITY</p><h2>Small acts.<br />Big heart.</h2><p>Every verified return makes campus a little more thoughtful. Points celebrate real contributions, not how many times someone reports.</p><div className="leaderboard-figures"><div><b>{sorted.length}</b><span>helpful students</span></div><div><b>{sorted.reduce((sum, item) => sum + item.contribution, 0)}</b><span>trust points earned</span></div></div></section><section className="panel leaderboard-list"><div className="panel-heading"><div><p className="eyebrow">THE GOOD EGG LIST</p><h2>Most helpful lately</h2></div><span className="leaderboard-badge"><BadgeCheck size={14} /> Verified returns</span></div>{error ? <ErrorState error={error} /> : sorted.length ? sorted.map((person, i) => <div className={`leader-row ${i === 0 ? 'leader-first' : ''}`} key={person.id}><span className={`leader-rank ${i < 3 ? `rank-${i + 1}` : ''}`}>{i === 0 ? '✦' : String(i + 1).padStart(2, '0')}</span><span className="avatar">{person.name.slice(0, 1)}</span><span className="leader-name"><b>{person.name}</b><small>{i === 0 ? 'Campus kindness champion' : 'Campus helper'}</small></span><strong>{person.contribution}<small> pts</small></strong></div>) : <EmptyState title="The first good egg could be you" description="Complete a verified handover to earn your first trust points." />}</section></div></>;
}

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, enrollment: user.enrollment || '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault(); setBusy(true); setNotice(''); setError('');
    try { const { data } = await api.put('/auth/profile', form); setUser(data.user); setNotice('Your profile has been updated.'); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(false); }
  }
  return <><PageHeader eyebrow="YOUR LITTLE CORNER" title="Your profile" description="A few details about you and your place in the campus community." /><div className="profile-layout"><section className="panel profile-card"><div className="profile-cover"><span className="profile-cover-spark">✦</span><span className="avatar avatar-large">{user.name.slice(0, 1)}</span></div><div className="profile-body"><div className="profile-name"><h2>{user.name}</h2><span className="role-tag">{user.role.toLowerCase()}</span></div><p>{user.email}</p><div className="profile-metric"><span className="quick-icon quick-violet"><Sparkles size={17} /></span><div><b>{user.contribution || 0} trust points</b><small>Earned through real acts of kindness</small></div></div><div className="profile-metric"><span className="quick-icon quick-green"><ShieldCheck size={17} /></span><div><b>Your details are protected</b><small>Private clues are never shared with other students</small></div></div></div></section><form className="panel profile-form" onSubmit={save}><p className="eyebrow">ACCOUNT DETAILS</p><h2>Make yourself at home.</h2><label>Your name<input required minLength="2" maxLength="80" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>College email<input value={user.email} disabled /></label><label>Enrollment number<input required minLength="3" maxLength="40" value={form.enrollment} onChange={(e) => setForm({ ...form, enrollment: e.target.value })} /></label>{notice && <div className="success-banner"><Check size={16} />{notice}</div>}{error && <ErrorState error={error} />}<Button disabled={busy}>{busy ? 'Saving…' : 'Save changes'} <ArrowRight size={15} /></Button></form></div></>;
}

export function AdminPage() {
  const [tab, setTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [locationForm, setLocationForm] = useState({ name: '', latitude: '', longitude: '' });
  const refresh = async () => {
    const calls = [api.get('/analytics/admin'), api.get('/admin/reports'), api.get('/admin/claims'), api.get('/admin/users'), api.get('/locations')];
    const [a, r, c, u, l] = await Promise.all(calls);
    setAnalytics(a.data); setReports(r.data.reports); setClaims(c.data.claims); setUsers(u.data.users); setLocations(l.data);
  };
  useEffect(() => { refresh().catch((reason) => setError(errorMessage(reason))); }, []);
  async function moderate(id, status) {
    setBusy(id); setError('');
    try { await api.put(`/admin/reports/${id}`, { status }); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(''); }
  }
  async function reviewClaim(id, decision) {
    setBusy(id); setError('');
    try { await api.put(`/claims/${id}/verify`, { decision }); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(''); }
  }
  async function changeRole(id, role) {
    setBusy(id); setError('');
    try { await api.put(`/admin/users/${id}/role`, { role }); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(''); }
  }
  async function addLocation(event) {
    event.preventDefault(); setBusy('location'); setError('');
    try { await api.post('/admin/locations', { ...locationForm, latitude: locationForm.latitude || undefined, longitude: locationForm.longitude || undefined }); setLocationForm({ name: '', latitude: '', longitude: '' }); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(''); }
  }
  async function removeLocation(id) {
    setBusy(id); setError('');
    try { await api.delete(`/admin/locations/${id}`); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(''); }
  }
  if (!analytics) return <><PageHeader eyebrow="ADMINISTRATION" title="Campus control room" /><ErrorState error={error || 'Loading campus records…'} /></>;
  return <><PageHeader eyebrow="ADMINISTRATION" title="Campus control room" description="A thoughtful overview of reports, claims, and the community helping items find their way home." /><div className="admin-tabs">{[['overview', 'Overview'], ['reports', `Reports ${reports.length}`], ['claims', `Claims ${claims.length}`], ['people', `People ${users.length}`], ['locations', 'Locations']].map(([key, label]) => <button key={key} className={tab === key ? 'admin-tab-active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>{error && <ErrorState error={error} />}
    {tab === 'overview' && <><div className="admin-mini-stats">{[['Registered students', analytics.stats.students, Users], ['Lost reports', analytics.stats.lost, Search], ['Found reports', analytics.stats.found, Package], ['Open claims', analytics.stats.claims, KeyRound], ['Recovered', analytics.stats.recovered, HeartHandshake]].map(([label, value, Icon]) => <div className="panel admin-mini-stat" key={label}><Icon size={17} /><span>{label}</span><b>{value}</b></div>)}</div><AdminDashboardCharts data={analytics} /><div className="panel admin-summary"><div className="panel-heading"><div><p className="eyebrow">NEEDS A HUMAN</p><h2>Moderation queue</h2></div></div><p>{analytics.stats.pendingReports} reports and {analytics.stats.claims} claims may need a closer look.</p><Button variant="white" onClick={() => setTab('reports')}>Review reports <ArrowRight size={14} /></Button></div></>}
    {tab === 'reports' && <div className="panel admin-table-panel"><div className="panel-heading"><div><p className="eyebrow">REPORT MANAGEMENT</p><h2>Campus reports</h2></div></div>    <div className="table-scroll"><table><thead><tr><th>Report</th><th>Type</th><th>Reported by</th><th>Location</th><th>Status</th><th>Review flags</th><th>Moderation</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td><Link to={`/reports/${report.id}`}><b>{report.title}</b><small>{report.reportCode}</small></Link></td><td>{report.type}</td><td>{report.user?.name}</td><td>{report.locationName}</td><td><StatusPill status={report.status} /></td><td>{report.duplicateFlag ? <span className="duplicate-flag">Similar reports</span> : '—'}</td><td><select disabled={busy === report.id} value={report.status} onChange={(e) => moderate(report.id, e.target.value)}><option value="REPORTED">Reported</option><option value="DISPUTED">Disputed</option><option value="CLOSED">Closed</option><option value="REMOVED">Remove</option></select></td></tr>)}</tbody></table></div></div>}
    {tab === 'claims' && <div className="claims-admin-list">{claims.length ? claims.map((claim) => <article className="panel admin-claim-row" key={claim.id}><span className="quick-icon quick-violet"><KeyRound size={18} /></span><div className="admin-claim-info"><b>{claim.lostReport?.title} ↔ {claim.foundReport?.title}</b><small>Claimant: {claim.claimant?.name} · {formatRelative(claim.createdAt)}</small><span>Private answer check: {claim.answersPassed ? 'Matched' : 'Not matched'}</span></div><StatusPill status={claim.status} /><div className="claim-actions"><Button disabled={busy === claim.id} onClick={() => reviewClaim(claim.id, 'approve')}>Approve</Button><Button variant="quiet" disabled={busy === claim.id} onClick={() => reviewClaim(claim.id, 'dispute')}>Dispute</Button></div></article>) : <EmptyState title="No claims need review" description="New claims and ownership disputes will show up here." />}</div>}
    {tab === 'people' && <div className="panel admin-table-panel"><div className="panel-heading"><div><p className="eyebrow">COMMUNITY</p><h2>People on LostLink</h2></div></div><div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Enrollment</th><th>Trust points</th><th>Role</th></tr></thead><tbody>{users.map((person) => <tr key={person.id}><td><b>{person.name}</b></td><td>{person.email}</td><td>{person.enrollment}</td><td>{person.contribution}</td><td><select disabled={busy === person.id || person.email === 'admin@lostlink.edu'} value={person.role} onChange={(e) => changeRole(person.id, e.target.value)}><option value="STUDENT">Student</option><option value="MODERATOR">Moderator</option><option value="ADMIN">Admin</option></select></td></tr>)}</tbody></table></div></div>}
    {tab === 'locations' && <div className="admin-location-layout"><form className="panel location-form" onSubmit={addLocation}><p className="eyebrow">CAMPUS MAP</p><h2>Add a real place.</h2><p>Coordinates are optional. Without them, the location still appears in report analytics.</p><label>Campus location<input required minLength="2" maxLength="100" value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="e.g. Science Library" /></label><div className="form-grid"><label>Latitude<input type="number" step="any" min="-90" max="90" value={locationForm.latitude} onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })} placeholder="Optional" /></label><label>Longitude<input type="number" step="any" min="-180" max="180" value={locationForm.longitude} onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })} placeholder="Optional" /></label></div><Button disabled={busy === 'location'}>{busy === 'location' ? 'Adding…' : 'Add campus location'} <ArrowRight size={15} /></Button></form><section className="panel location-panel admin-locations"><div className="panel-heading"><div><p className="eyebrow">CONFIGURED PLACES</p><h2>{locations.length} campus locations</h2></div></div>{locations.map((location) => <div className="configured-location" key={location.id}><MapPin size={16} /><b>{location.name}</b><span>{location.latitude != null ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'No map coordinates'}</span><button className="location-remove" type="button" aria-label={`Remove ${location.name}`} title="Remove location" disabled={busy === location.id} onClick={() => removeLocation(location.id)}><X size={14} /></button></div>)}</section></div>}
  </>;
}

export function NotFoundPage() {
  return <div className="not-found"><span><Compass size={29} /></span><p className="eyebrow">A LITTLE OFF THE MAP</p><h1>We can’t find that page.</h1><p>Maybe it wandered off. Let’s get you back to somewhere familiar.</p><Link to="/dashboard" className="button button-primary">Back to your campus <ArrowRight size={15} /></Link></div>;
}
