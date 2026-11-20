import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { ArrowRight, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api, { errorMessage } from '../services/api.js';
import { EmptyState, ErrorState, PageHeader } from '../components/ui.jsx';

export default function MapPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [error, setError] = useState('');
  useEffect(() => { Promise.all([api.get('/analytics/heatmap'), api.get('/locations')]).then(([a, b]) => { setStats(a.data.locations); setLocations(b.data); }).catch((reason) => setError(errorMessage(reason))); }, []);
  const filtered = stats.filter((item) => (filter === 'ALL' || item.type === filter) && (category === 'ALL' || item.category === category));
  const locationTotals = Object.values(filtered.reduce((acc, item) => { acc[item.name] = acc[item.name] || { name: item.name, count: 0, lost: 0, found: 0 }; acc[item.name].count += item.count; acc[item.name][item.type.toLowerCase()] += item.count; return acc; }, {})).sort((a, b) => b.count - a.count);
  const mapped = locations.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  const center = mapped.length ? [mapped.reduce((sum, item) => sum + item.latitude, 0) / mapped.length, mapped.reduce((sum, item) => sum + item.longitude, 0) / mapped.length] : null;
  const icon = useMemo(() => L.divIcon({ className: 'map-pin-wrap', html: '<div class="map-pin-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), []);
  const availableCategories = [...new Set(stats.map((item) => item.category))];
  return <><PageHeader eyebrow="AROUND THE QUAD" title="Campus map" description="See where reports are coming from. Pin locations are shown only when your campus has configured real coordinates." action={<span className="map-live-pill"><span /> Live campus activity</span>} />
    {error && <ErrorState error={error} />}
    <div className="map-filters"><div className="filter-chips">{[['ALL', 'All activity'], ['LOST', 'Lost'], ['FOUND', 'Found']].map(([key, label]) => <button key={key} className={`filter-chip ${filter === key ? 'chip-active' : ''}`} onClick={() => setFilter(key)}>{label}</button>)}</div><select aria-label="Filter by item category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="ALL">All categories</option>{availableCategories.map((name) => <option key={name}>{name}</option>)}</select></div>
    {center ? <div className="map-canvas"><MapContainer center={center} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{mapped.map((place) => { const activity = locationTotals.find((item) => item.name === place.name); return activity ? <Marker key={place.id} position={[place.latitude, place.longitude]} icon={icon}><Popup><b>{place.name}</b><br />{activity.count} report{activity.count === 1 ? '' : 's'} · {activity.lost} lost · {activity.found} found</Popup></Marker> : null; })}</MapContainer></div> : <div className="map-unconfigured"><span><MapPin size={23} /></span><h3>This campus map is waiting for its pins.</h3><p>For accurate locations, an administrator needs to add campus locations with real latitude and longitude coordinates. Until then, explore activity by place below.</p>{['ADMIN', 'MODERATOR'].includes(user?.role) && <Link to="/admin" className="text-link">Configure locations <ArrowRight size={14} /></Link>}</div>}
    <section className="panel location-panel"><div className="panel-heading"><div><p className="eyebrow">CAMPUS PULSE</p><h2>Activity by location</h2></div><span className="location-total">{filtered.reduce((sum, item) => sum + item.count, 0)} reports</span></div>{locationTotals.length ? <div className="location-list">{locationTotals.map((place, index) => <div className="location-row" key={place.name}><span className="location-rank">{String(index + 1).padStart(2, '0')}</span><span className="location-pin"><MapPin size={16} /></span><b>{place.name}</b><div className="location-meter"><i style={{ width: `${Math.min(100, place.count / locationTotals[0].count * 100)}%` }} /></div><span className="location-breakdown"><i>{place.lost} lost</i><i>{place.found} found</i></span><strong>{place.count}</strong></div>)}</div> : <EmptyState title="No activity to show yet" description="Reports submitted around campus will appear here." />}</section>
  </>;
}
