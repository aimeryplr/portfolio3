import { useState } from "react";
import { faCode, faGlobe } from "@fortawesome/free-solid-svg-icons";
import ProjectLink from "./ProjectLink.tsx";
import ProjectBadge from "./ProjectBadge.tsx";
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
};

import wave1 from "../../icons/waves/Vector.svg?raw";
import wave2 from "../../icons/waves/Vector-1.svg?raw";
import wave3 from "../../icons/waves/Vector-2.svg?raw";

interface ProjectData {
  name: string;
  description: string;
  technologies: Technologies[];
  preview: string;
  website?: string;
  code?: string;
}

interface Props {
  project: ProjectData;
}

function stripSvgSize(raw: string) {
  return raw
    .replace(/width="[^"]*"/, "")
    .replace(/height="[^"]*"/, "")
    .replace("<svg", '<svg style="width:100%;height:auto;flex-shrink:0"');
}

export default function ProjectPreview({ project }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col gap-4 bg-surface overflow-hidden px-8 py-6 w-full box-border rounded-2xl transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-xl hover:shadow-primary/15 border-2 border-transparent hover:border-accent"
    >
      <div className="flex justify-between">
        <div className="flex gap-2 items-center">
          <h3 className="text-xl font-bold">{project.name}</h3>
          {project.website && <ProjectLink icon={faGlobe} link={project.website} />}
          {project.code && <ProjectLink icon={faCode} link={project.code} />}
        </div>
        <div className="flex justify-end items-center gap-2">
          {project.technologies.map((tech) => (
            <ProjectBadge key={tech} title={techNames[tech]}>
              <LanguageIcon className="text-foreground w-7 h-7" technology={tech} />
            </ProjectBadge>
          ))}
        </div>
      </div>
      <img
        className="relative z-1 object-contain w-full h-80"
        src={project.preview}
        alt={project.name}
        loading="lazy"
      />
      <div
        className="overflow-hidden relative z-1 transition-all duration-300 ease-out"
        style={{ maxHeight: hovered ? "200px" : "0" }}
      >
        <p className="text-surface-foreground">{project.description}</p>
      </div>
      <WaveLayer raw={wave1} duration={12} direction="left" playing={hovered} />
      <WaveLayer raw={wave2} duration={16} direction="right" playing={hovered} />
      <WaveLayer raw={wave3} duration={10} direction="left" playing={hovered} />
    </div>
  );
}

function WaveLayer({ raw, duration, direction, playing }: { raw: string; duration: number; direction: "left" | "right"; playing: boolean }) {
  const stripped = stripSvgSize(raw);
  const from = direction === "left" ? "0%" : "-50%";
  const to = direction === "left" ? "-50%" : "0%";
  const id = `wave-${duration}-${direction}`;

  return (
    <div className="absolute left-0 bottom-0 w-full h-auto overflow-hidden pointer-events-none">
      <div
        className="flex w-[200%]"
        style={{
          animation: `${id} ${duration}s linear infinite`,
          animationPlayState: playing ? "running" : "paused",
        }}
      >
        <span className="w-1/2 flex-shrink-0" dangerouslySetInnerHTML={{ __html: stripped }} />
        <span className="w-1/2 flex-shrink-0" dangerouslySetInnerHTML={{ __html: stripped }} />
      </div>
      <style>{`
        @keyframes ${id} {
          from { transform: translateX(${from}); }
          to { transform: translateX(${to}); }
        }
      `}</style>
    </div>
  );
}
