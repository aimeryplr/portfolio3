import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  title?: string;
}

export default function ProjectBadge({ children, title }: Props) {
  return (
    <div title={title} className="bg-surface-secondary rounded-xl w-10 h-10 flex justify-center items-center">
      {children}
    </div>
  );
}
