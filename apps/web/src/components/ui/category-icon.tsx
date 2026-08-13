import {
  Wheat, HeartPulse, Cpu, GraduationCap, Leaf, Sun, Factory, Building2, Truck, Landmark,
  Droplets, ShieldAlert, Scale, FlaskConical, Dna, LandmarkIcon, Users, Handshake, Waves,
  Sparkles, type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  wheat: Wheat,
  'heart-pulse': HeartPulse,
  cpu: Cpu,
  'graduation-cap': GraduationCap,
  leaf: Leaf,
  sun: Sun,
  factory: Factory,
  'building-2': Building2,
  truck: Truck,
  landmark: Landmark,
  droplets: Droplets,
  'shield-alert': ShieldAlert,
  scale: Scale,
  'flask-conical': FlaskConical,
  dna: Dna,
  'landmark-dome': LandmarkIcon,
  users: Users,
  handshake: Handshake,
  waves: Waves,
  sparkles: Sparkles,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}
