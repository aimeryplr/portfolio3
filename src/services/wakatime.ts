import ky from "ky";

const WAKATIME_API_KEY = import.meta.env.WAKATIME_API_KEY;

const api = ky.create({
  prefix: "https://api.wakatime.com/api/v1",
  headers: {
    Authorization: `Basic ${btoa(WAKATIME_API_KEY)}`,
  }
})

export interface LanguageCodingHours {
  name: "TypeScript";
  hours: number;
  percent: number;
}

export async function fetchTSCodingHours(): Promise<LanguageCodingHours> {
  const res = await api.get<{ data: { languages: LanguageCodingHours[] } }>('users/current/stats/all_time').json()
  return res.data.languages.find((language) => language.name === "TypeScript")!;
}