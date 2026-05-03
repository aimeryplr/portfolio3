// 1. Import utilities from `astro:content`
import {defineCollection} from 'astro:content';

// 2. Import loader(s)
import {file} from 'astro/loaders';

// 3. Import Zod
import {projectSchema} from "./types/project.schema.ts";

// 4. Define a `loader` and `schema` for each collection
const projects = defineCollection({
  loader: file("src/data/projects.json"),
  schema: projectSchema,
});

// 5. Export a single `collections` object to register your collection(s)
export const collections = { projects };