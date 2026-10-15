import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
  icon: IconDefinition;
  link: string;
  label: string;
  primary?: boolean; // the live site: a labelled, filled button instead of a bare icon
}

export default function ProjectLink({ icon, link, label, primary }: Props) {
  if (primary) {
    return (
      <a className="project-link project-link-primary" href={link} target="_blank" rel="noopener noreferrer">
        {label}
        <FontAwesomeIcon className="w-3 h-3" icon={icon} />
      </a>
    );
  }
  return (
    <a className="project-link" href={link} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
      <FontAwesomeIcon className="w-4 h-4" icon={icon} />
    </a>
  );
}
