import type { IconDefinition } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
  icon: IconDefinition;
  link: string;
}

export default function ProjectLink({ icon, link }: Props) {
  return (
    <a
      href={link}
      target="_blank"
      onClick={(e) => e.stopPropagation()}
    >
      <button className="w-10 h-10 bg-accent text-accent-foreground rounded-lg cursor-pointer flex items-center justify-center border-none">
        <FontAwesomeIcon className="w-5 h-5" icon={icon} />
      </button>
    </a>
  );
}
