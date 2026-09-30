import { Activity, Bell, FlaskConical, HeartPulse, Image, LifeBuoy, Users } from 'lucide-react';
import type { Source } from '../lib/domain';
export function WaveMark({ className = '' }: { className?: string }) {
  return <svg className={className} width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M3 14h5l3-7 5 14 3-7h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
export function SourceIcon({ source, size = 19 }: { source?: Source; size?: number }) {
  const Component = source ? { LIS: FlaskConical, HIS: HeartPulse, PACS: Image, NURSING: Users, IT: LifeBuoy, OA: Bell }[source] : Activity;
  return <Component size={size} strokeWidth={1.7} aria-hidden="true"/>;
}
