export enum ProjectType {
  PROFESSIONAL='professional',
  FREELANCE='freelance',
  PERSONAL='personal',
}

export const ProjectTypeNames: {[key in ProjectType]: string} = {
  [ProjectType.PERSONAL]: "Personnel",
  [ProjectType.PROFESSIONAL]: "Professionnel",
  [ProjectType.FREELANCE]: "Freelance",
}