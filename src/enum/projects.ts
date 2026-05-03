export enum ProjectType {
  PROFESSIONAL='professional',
  PERSONAL='personal',
}

export const ProjectTypeNames: {[key in ProjectType]: string} = {
  [ProjectType.PERSONAL]: "Personnel",
  [ProjectType.PROFESSIONAL]: "Professionnel",
}