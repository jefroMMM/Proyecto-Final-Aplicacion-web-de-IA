import { Badge } from "@/components/ui/badge";

export function SkillBadge({ skill }: { skill: string }) {
  return <Badge variant="default">{skill}</Badge>;
}
