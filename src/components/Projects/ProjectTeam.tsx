import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { Chip } from "@heroui/react/chip";

interface Props {
  people: number;
}

// one silhouette per person, so the team size reads before the label does
export default function ProjectTeam({ people }: Props) {
  return (
    <Chip color="accent" variant="soft" className="gap-1.5 border font-mono font-bold text-[13px]">
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {Array.from({ length: people }, (_, i) => (
          <FontAwesomeIcon key={i} className="w-2.5 h-2.5" icon={faUser} />
        ))}
      </span>
      <Chip.Label>{people === 1 ? "seul" : `${people} personnes`}</Chip.Label>
    </Chip>
  );
}
