import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  title: string;
}

export default function ProjectBadge({ children, title }: Props) {
  return (
    <span className="tag">
      {children}
      {title}
    </span>
  );
}
