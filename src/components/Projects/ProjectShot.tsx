import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

// the screenshot (an Astro <Image /> passed through a slot) in a plain frame
export default function ProjectShot({ children }: Props) {
  return <div className="shot">{children}</div>;
}
