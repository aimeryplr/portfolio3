import CodingHoursItem from "./CodingHoursItem.astro";
import {Technologies} from "../../enum/technologies.ts";
import type {ComponentProps} from "astro/types";

export const emptyCodingHoursProps: ComponentProps<typeof CodingHoursItem>[] = [Technologies.TYPESCRIPT, Technologies.REACT, Technologies.NESTJS].map(technology => ({
  hours: 0,
  percent: 0,
  technology
}));
