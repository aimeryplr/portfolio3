import { z } from 'astro/zod';
import {Technologies} from "../enum/technologies.ts";
import {ProjectType} from "../enum/projects.ts";
import type {SchemaContext} from "astro/content/config";

export const projectSchema = ({image}: SchemaContext) => z.object({
  name: z.string(),
  technologies: z.array(z.enum(Object.values(Technologies))),
  people: z.int(),
  type: z.enum(Object.values(ProjectType)),
  preview: image(),
  website: z.url().optional(),
  code: z.url().optional(),
})

export type Project = z.infer<ReturnType<typeof projectSchema>>