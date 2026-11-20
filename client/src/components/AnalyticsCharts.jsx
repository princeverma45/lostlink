import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from './ui.jsx';

const colors = ['#7157e8', '#31b8a4', '#ffb547', '#ef7586', '#5874db', '#aa71d4'];

export default function AnalyticsCharts({ data }) {
  const pieData = data.categories.map((row) => ({ name: row.name, value: row.value }));
  const locations = Object.values(data.locations.reduce((acc, row) => {
    acc[row.name] = acc[row.name] || { name: row.name, lost: 0, found: 0 };
    acc[row.name][row.type.toLowerCase()] += row.count;
    return acc;
  }, {}));
  return <div className="charts-grid"><section className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">REPORT MIX</p><h2>Items by category</h2></div></div>{pieData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={66} outerRadius={95} paddingAngle={4}>{pieData.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="chart-legend">{pieData.map((row, i) => <span key={row.name}><i style={{ background: colors[i % colors.length] }} />{row.name}<b>{row.value}</b></span>)}</div></div> : <EmptyState title="No reports to chart yet" description="Category analytics will appear once students submit reports." />}</section><section className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">AROUND CAMPUS</p><h2>Reports by location</h2></div></div>{locations.length ? <ResponsiveContainer width="100%" height={300}><BarChart data={locations} margin={{ left: -20, right: 12, top: 16 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecebf2" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8b899a' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8b899a' }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="lost" fill="#806cf0" radius={[5, 5, 0, 0]} /><Bar dataKey="found" fill="#4fc5a9" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="Location data is on its way" description="Once reports come in, you’ll see activity by campus location." />}</section></div>;
}
