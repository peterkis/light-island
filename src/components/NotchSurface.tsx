import { useId } from 'react';
import { silhouette } from '../lib/geometry';

export function NotchSurface() {
  const gradient = `notch-${useId().replace(/:/g, '')}`;
  const initial = silhouette({ width: 160, height: 34, radius: 18, ear: 7 }).path;
  return <svg className="notch-surface pointer-events-none absolute inset-0" aria-hidden="true" width="160" height="34">
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0" className="notch-stop-top"/><stop offset="1" className="notch-stop-bottom"/>
    </linearGradient></defs>
    <path data-silhouette="fill" d={initial} fill={`url(#${gradient})`}/>
    <path data-silhouette="outline" d={initial} className="notch-outline" fill="none" vectorEffect="non-scaling-stroke"/>
  </svg>;
}
