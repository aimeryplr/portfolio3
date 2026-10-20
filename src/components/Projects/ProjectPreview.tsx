import type { ReactNode } from "react";
import { faArrowUpRightFromSquare, faCode } from "@fortawesome/free-solid-svg-icons";
import ProjectLink from "./ProjectLink.tsx";
import ProjectBadge from "./ProjectBadge.tsx";
import ProjectShot from "./ProjectShot.tsx";
import ProjectTeam from "./ProjectTeam.tsx";
import { Card } from "@heroui/react/card";
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
  [Technologies.ETHERS]: "Ethers.js",
  [Technologies.ASTRO]: "Astro",
  [Technologies.SANITY]: "Sanity",
  [Technologies.CLOUDFLARE]: "Cloudflare",
};

interface ProjectData {
  name: string;
  description: string;
  // what I did: role and scope
  role?: string;
  // one concrete fact: a number, a hard problem, a result
  detail?: string;
  technologies: Technologies[];
  website?: string;
  code?: string;
  company?: string;
  people: number;
}

interface Props {
  project: ProjectData;
  // filled by the "shot" slot in index.astro
  shot: ReactNode;
}

export default function ProjectPreview({ project, shot }: Props) {
  return (
    <Card className="min-w-0 flex-1" render={(props) => <article {...props} />}>
      <ProjectShot seed={project.name + 5}>{shot}</ProjectShot>
      <Card.Header className="flex-row items-baseline justify-between gap-4">
        <div>
          <Card.Title className="text-xl leading-7 font-bold">{project.name}</Card.Title>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <ProjectTeam people={project.people} />
            {project.company && <p className="font-mono text-[12px] tracking-[0.04em] text-muted">chez {project.company}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.website && <ProjectLink icon={faArrowUpRightFromSquare} link={project.website} label="Site" primary />}
          {project.code && <ProjectLink icon={faCode} link={project.code} label="Code" primary />}
        </div>
      </Card.Header>
      <Card.Content>
        <Card.Description className="text-[15px]">{project.description}</Card.Description>
        {(project.role || project.detail) && (
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[14px]">
            {project.role && (
              <>
                <dt className="font-mono text-[12px] leading-5 tracking-[0.04em] text-accent">rôle</dt>
                <dd className="text-muted">{project.role}</dd>
              </>
            )}
            {project.detail && (
              <>
                <dt className="font-mono text-[12px] leading-5 tracking-[0.04em] text-accent">détail</dt>
                <dd className="text-muted">{project.detail}</dd>
              </>
            )}
          </dl>
        )}
      </Card.Content>
      <Card.Footer className="flex-wrap gap-2">
        {project.technologies.map((tech) => (
          <ProjectBadge key={tech} title={techNames[tech]}>
            <LanguageIcon className="w-4 h-4" technology={tech} />
          </ProjectBadge>
        ))}
      </Card.Footer>
    </Card>
  );
}
