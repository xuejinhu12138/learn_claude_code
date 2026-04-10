// import { type Skill } from '../types/skill';

// class SkillRegistry {
//   private skills: Record<string, Skill> = {};

//   register(skill: Skill): void {
//     if (this.skills[skill.id]) {
//         throw new Error(`Skill "${skill.id}" is already registered.`);
//     }
//     this.skills[skill.id] = skill;
//   }

//   get(id: string): Skill | undefined {
//     return this.skills[id];
//   }

//   list(): Skill[] {
//     return Object.values(this.skills);
//   }

//   has(id: string): boolean {
//     return id in this.skills;
//   }

//   clear(): void {
//     this.skills = {};
//   }

//   registerSkills(skills: Skill[]): void {
//     for (const skill of skills) {
//       this.register(skill);
//     }
//   }
// }

// export const skillRegistry = new SkillRegistry();