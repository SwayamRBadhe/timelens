import {
  Landmark,
  Swords,
  FlaskConical,
  Cpu,
  Orbit,
  Palette,
  Trophy,
  ChartNoAxesCombined,
  TriangleAlert,
  Users,
  Compass,
  UserRound,
  BookOpen,
} from "lucide-react";
import type { Category } from "@/lib/history/types";
const icons = {
  POLITICS: Landmark,
  WAR_CONFLICT: Swords,
  SCIENCE: FlaskConical,
  TECHNOLOGY: Cpu,
  SPACE: Orbit,
  CULTURE: Palette,
  SPORTS: Trophy,
  ECONOMY: ChartNoAxesCombined,
  DISASTER: TriangleAlert,
  SOCIETY: Users,
  EXPLORATION: Compass,
  PEOPLE: UserRound,
  OTHER: BookOpen,
};
export function CategoryIcon({ category, size = 16 }: { category: Category; size?: number }) {
  const Icon = icons[category];
  return <Icon size={size} aria-hidden="true" strokeWidth={1.6} />;
}
