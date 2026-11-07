import type { Metadata } from 'next';
import PickleballApp from '@/components/pickleball/PickleballApp';

export const metadata: Metadata = { title: 'Open Play | ATP-Nabunturan' };

export default function PickleballPage() {
  return <PickleballApp />;
}
