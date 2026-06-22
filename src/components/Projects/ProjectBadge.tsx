import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function ProjectBadge({ children }: Props) {
  return (
    <div className="bg-surface-secondary rounded-xl w-10 h-10 flex justify-center items-center">
      {children}
    </div>
  );
}
