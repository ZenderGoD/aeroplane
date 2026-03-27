import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://anuragair.com", lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: "https://anuragair.com/landing", lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: "https://anuragair.com/embed", lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: "https://anuragair.com/airport", lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];
}
