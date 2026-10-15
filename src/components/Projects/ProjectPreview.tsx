import { faArrowUpRightFromSquare, faCode } from "@fortawesome/free-solid-svg-icons";
import ProjectLink from "./ProjectLink.tsx";
import ProjectBadge from "./ProjectBadge.tsx";
import ProjectShot from "./ProjectShot.tsx";
import LanguageIcon from "../LanguageIcon.tsx";
import { Technologies } from "../../enum/technologies.ts";

const techNames: Record<Technologies, string> = {
  [Technologies.TYPESCRIPT]: "TypeScript",
  [Technologies.REACT]: "React",
  [Technologies.NESTJS]: "NestJS",
  [Technologies.ROBLOX]: "Roblox",
  [Technologies.DOCKER]: "Docker",
  [Technologies.MONGODB]: "MongoDB",
  [Technologies.SOCKET_IO]: "Socket.IO",
  [Technologies.KOTLIN]: "Kotlin",
  [Technologies.GRAPHQL]: "GraphQL",
  [Technologies.CRYPTOCURRENCY]: "Cryptocurrency",
  [Technologies.ASTRO]: "Astro",
  [Technologies.SANITY]: "Sanity",
  [Technologies.CLOUDFLARE]: "Cloudflare",
};

interface ProjectData {
  name: string;
  description: string;
  technologies: Technologies[];
  preview: string;
  website?: string;
  code?: string;
  company?: string;
}

interface Props {
  project: ProjectData;
}

export default function ProjectPreview({ project }: Props) {
  return (
    <article className="card">
      <ProjectShot src={project.preview} alt={project.name} />
      <div className="flex justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold">{project.name}</h3>
          {project.company && <p className="project-company">chez {project.company}</p>}
        </div>
        <div className="flex items-center gap-2">
          {project.website && <ProjectLink icon={faArrowUpRightFromSquare} link={project.website} label="Site" primary />}
          {project.code && <ProjectLink icon={faCode} link={project.code} label="Code" />}
        </div>
      </div>
      <p className="card-text">{project.description}</p>
      <div className="flex flex-wrap gap-2 mt-auto">
        {project.technologies.map((tech) => (
          <ProjectBadge key={tech} title={techNames[tech]}>
            <LanguageIcon className="w-4 h-4" technology={tech} />
          </ProjectBadge>
        ))}
      </div>
    </article>
  );
}
