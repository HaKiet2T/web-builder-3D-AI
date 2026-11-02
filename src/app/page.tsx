import { MonitorStorefront } from '@/components/ui/MonitorStorefront';
import { monitors } from '@/data/monitors';

export default function Home() {
  return <MonitorStorefront products={monitors} />;
}
