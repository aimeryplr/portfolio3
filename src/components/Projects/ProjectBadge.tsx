import type { ReactNode } from "react";
import { Chip } from "@heroui/react/chip";

interface Props {
  children: ReactNode;
  title: string;
}

export default function ProjectBadge({ children, title }: Props) {
  return (
    <Chip color="accent" variant="tertiary" className="gap-1.5 border font-mono font-bold text-[13px]">
      {children}
      <Chip.Label>{title}</Chip.Label>
    </Chip>
  );
}
