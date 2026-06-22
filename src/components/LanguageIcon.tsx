import type { Technologies } from "../enum/technologies.ts";

import cryptocurrency from "../icons/technologies/cryptocurrency.svg?raw";
import docker from "../icons/technologies/docker.svg?raw";
import graphql from "../icons/technologies/graphql.svg?raw";
import kotlin from "../icons/technologies/kotlin.svg?raw";
import mongodb from "../icons/technologies/mongodb.svg?raw";
import nestjs from "../icons/technologies/nestjs.svg?raw";
import reactIcon from "../icons/technologies/react.svg?raw";
import roblox from "../icons/technologies/roblox.svg?raw";
import socketIo from "../icons/technologies/socket-io.svg?raw";
import ts from "../icons/technologies/ts.svg?raw";

const icons: Record<string, string> = {
  cryptocurrency,
  docker,
  graphql,
  kotlin,
  mongodb,
  nestjs,
  react: reactIcon,
  roblox,
  "socket-io": socketIo,
  ts,
};

interface Props {
  technology: Technologies;
  className?: string;
}

export default function LanguageIcon({ technology, className }: Props) {
  const svg = icons[technology];
  if (!svg) return null;

  const colored = svg
    .replace(/width="[^"]*"/, "")
    .replace(/height="[^"]*"/, "")
    .replace("<svg", `<svg class="${className ?? ""}"`);

  return <span dangerouslySetInnerHTML={{ __html: colored }} />;
}
