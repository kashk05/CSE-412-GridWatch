function ReportCard({ report }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-sky-500/70 transition">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h3 className="font-semibold text-slate-50">
            {report.title || 'Pothole on 5th Street'}
          </h3>
          <p className="text-sm text-slate-300 mt-1 line-clamp-2">
            {report.description ||
              'Large pothole near the intersection causing traffic disruption and vehicle damage.'}
          </p>
        </div>

        <span
          className={`text-xs px-2 py-1 rounded-full border ${
            report.severity === 'High'
              ? 'border-rose-500 text-rose-300'
              : report.severity === 'Medium'
              ? 'border-amber-400 text-amber-200'
              : 'border-emerald-400 text-emerald-200'
          }`}
        >
          {report.severity || 'High'}
        </span>
      </div>

      <div className="mt-3 flex text-[11px] text-slate-400 gap-4">
        <span>Category: {report.category ?? 'Roadway Hazard'}</span>
        <span>Dept: {report.department ?? 'Transportation'}</span>
        <span>Status: {report.status ?? 'Open'}</span>
      </div>
    </article>
  )
}

export default ReportCard
