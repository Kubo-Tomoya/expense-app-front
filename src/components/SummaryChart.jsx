import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PIE_COLORS = ['#1a4fa0', '#2e8b57', '#e0a62b', '#8e6fce', '#888'];

/**
 * 集計用のグラフ。
 *
 * F-20対応：series1Name・series2Nameを渡した場合のみ、valueとvalue2の2系列を
 * 並べた比較棒グラフになる（S-04の収支推移モード）。
 * 未指定のときは従来どおり1系列で描画するため、既存モードの表示は変わらない
 */
function SummaryChart({ type, data, height = 280, series1Name, series2Name }) {
  if (!data || data.length === 0) {
    return <p style={{ fontSize: '13px', color: '#888' }}>データがありません</p>;
  }

  const isComparison = Boolean(series1Name && series2Name);

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(entry) => entry.name}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => `¥${v.toLocaleString()}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(v) => `¥${v.toLocaleString()}`} />
        {isComparison && <Legend wrapperStyle={{ fontSize: '12px' }} />}
        <Bar dataKey="value" name={series1Name ?? '金額'} fill="#1a4fa0" radius={[4, 4, 0, 0]} />
        {isComparison && <Bar dataKey="value2" name={series2Name} fill="#9aa5b1" radius={[4, 4, 0, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default SummaryChart;