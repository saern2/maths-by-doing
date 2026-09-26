import { z } from "zod";
import originalLessons from "@/app/lessons.json";
export const textFields = [
  ["brand", "Identity", "Website name", "Maths by Doing"],
  ["teacher", "Identity", "Teacher name", "Arslan Shaikh"],
  ["location", "Identity", "Location", "Hyderabad, Pakistan"],
  ["role", "Identity", "Teacher role", "Mathematics educator · Hyderabad"],
  [
    "heroEyebrow",
    "Introduction",
    "Small heading",
    "UNDERSTAND IT. PRACTISE IT. OWN IT.",
  ],
  ["heroLine1", "Introduction", "Headline, first line", "Less memorising."],
  ["heroLine2", "Introduction", "Headline, second line", "More understanding."],
  ["heroAccent", "Introduction", "Highlighted headline", "Maths by doing."],
  [
    "heroIntro",
    "Introduction",
    "Introduction",
    "Make sense of the steps, not just the answer. Learn mathematics with Arslan Shaikh — from your first algebra lesson to your next big exam.",
  ],
  [
    "heroNote",
    "Introduction",
    "Class summary",
    "Classes 6–12 · O Level · A Level",
  ],
  [
    "lessonsEyebrow",
    "Lessons section",
    "Small heading",
    "THE CLASSROOM IS ALWAYS OPEN",
  ],
  [
    "lessonsTitle",
    "Lessons section",
    "Heading",
    "A little practice.\nA new perspective.",
  ],
  [
    "lessonsIntro",
    "Lessons section",
    "Description",
    "Get to know Arslan’s teaching through his free YouTube lessons. Pick a topic and follow the working.",
  ],
  [
    "classesEyebrow",
    "Classes section",
    "Small heading",
    "FIND YOUR STARTING POINT",
  ],
  [
    "classesTitle",
    "Classes section",
    "Heading",
    "Your class.\nYour next breakthrough.",
  ],
  [
    "classesIntro",
    "Classes section",
    "Description",
    "From school foundations to advanced mathematics, start with the level that’s right for you.",
  ],
  [
    "classesFootnote",
    "Classes section",
    "Supporting note",
    "Looking for one-to-one support? Ask Arslan about individual online classes, timings and fees.",
  ],
  [
    "aboutEyebrow",
    "About the teacher",
    "Small heading",
    "THE TEACHER BEHIND THE WORKING",
  ],
  ["aboutTitle", "About the teacher", "Heading", "Maths is a skill."],
  [
    "aboutAccent",
    "About the teacher",
    "Highlighted heading",
    "Let’s work on it.",
  ],
  [
    "about1",
    "About the teacher",
    "Biography, paragraph 1",
    "Arslan Shaikh teaches mathematics and serves as a coordinator at Aga Khan School in Hyderabad, Pakistan.",
  ],
  [
    "about2",
    "About the teacher",
    "Biography, paragraph 2",
    "Through Maths by Doing, he shares lessons on mathematical concepts and worked examination questions. His channel covers topics including functions, algebra, trigonometry, matrices and AKU-EB papers.",
  ],
  [
    "about3",
    "About the teacher",
    "Biography, paragraph 3",
    "Alongside his YouTube teaching, he offers individual online mathematics classes. Get in touch to discuss your class, syllabus and the areas you want to work on.",
  ],
  [
    "registerEyebrow",
    "Registration section",
    "Small heading",
    "LET’S FIND YOUR WAY FORWARD",
  ],
  [
    "registerTitle",
    "Registration section",
    "Heading",
    "One small step.\nA better grasp\nof maths.",
  ],
  [
    "registerIntro",
    "Registration section",
    "Description",
    "Tell us your name, email and class to register your interest. Then connect with Arslan on WhatsApp to discuss a suitable class.",
  ],
  [
    "contactEyebrow",
    "Contact section",
    "Small heading",
    "A QUESTION IS A GOOD PLACE TO START",
  ],
  ["contactTitle", "Contact section", "Heading", "Let’s talk maths."],
  [
    "contactIntro",
    "Contact section",
    "Description",
    "Ask about your class, online tuition or registration.",
  ],
  ["phoneLabel", "Contact section", "Phone display", "0313-3097014"],
  [
    "footerNote",
    "Contact section",
    "Footer note",
    "Independent tuition enquiries · School affiliation is biographical.",
  ],
] as const;
export const classChoices = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "O Level",
  "A Level",
  "AKU-EB",
] as const;
const image = z
  .string()
  .max(2048)
  .refine((v) => {
    if (/^\/(?!\/)[a-zA-Z0-9/_\-.]+$/.test(v)) return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use an uploaded image or an https:// image URL.");
const link = z
  .string()
  .max(2048)
  .url()
  .refine((v) => new URL(v).protocol === "https:", "Use an https:// link.");
export const contentSchema = z
  .object({
    text: z
      .object(
        Object.fromEntries(
          textFields.map(([key]) => [key, z.string().trim().min(1).max(1500)]),
        ),
      )
      .strict(),
    images: z.object({ logo: image, portrait: image }).strict(),
    links: z
      .object({
        whatsapp: z.string().regex(/^https:\/\/wa\.me\/\d{7,15}$/),
        phone: z.string().regex(/^\+?[0-9]{7,15}$/),
        youtube: link,
        facebook: link,
      })
      .strict(),
    registrationClasses: z
      .array(z.string().trim().min(1).max(80))
      .min(1, "Keep at least one registration option.")
      .max(50)
      .refine(
        (values) =>
          new Set(values.map((v) => v.toLowerCase())).size === values.length,
        "Registration options must be unique.",
      )
      .default([...classChoices]),
    courses: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(100),
            level: z.string().trim().min(1).max(100),
            description: z.string().trim().min(1).max(700),
            topics: z.array(z.string().trim().min(1).max(120)).length(2),
            select: z.string().trim().max(80),
          })
          .strict(),
      )
      .length(3),
    lessons: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^[\w-]{11}$/, "Enter an 11-character YouTube video ID."),
            title: z.string().trim().min(1).max(180),
            category: z.string().trim().min(1).max(80),
            image,
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .refine(
    (c) => new Set(c.lessons.map((l) => l.id)).size === c.lessons.length,
    "Each lesson must have a unique video ID.",
  );
export type SiteContent = z.infer<typeof contentSchema>;
export const defaultContent: SiteContent = {
  text: Object.fromEntries(textFields.map(([k, , , v]) => [k, v])),
  images: { logo: "/maths-by-doing-logo.png", portrait: "/arslan-shaikh.jpg" },
  links: {
    whatsapp: "https://wa.me/923133097014",
    phone: "+923133097014",
    youtube: "https://www.youtube.com/@mathsbydoing",
    facebook: "https://www.facebook.com/arlsan.shaikh.9",
  },
  registrationClasses: [...classChoices],
  courses: [
    {
      title: "Build your foundation",
      level: "CLASSES 6–8",
      description:
        "Give the basics the attention they deserve. Enquire about support with school mathematics and the move into algebra.",
      topics: ["School mathematics", "Foundations for the next class"],
      select: "Class 6",
    },
    {
      title: "Prepare with purpose",
      level: "CLASSES 9–12 · AKU-EB",
      description:
        "Explore worked exam questions on the channel, then enquire about individual help for your class and syllabus.",
      topics: ["Past-paper walkthroughs", "Topic-focused practice"],
      select: "Class 9",
    },
    {
      title: "Take the next step",
      level: "O LEVEL · A LEVEL",
      description:
        "Discuss your Cambridge mathematics syllabus, the topics you find challenging and your online tuition needs.",
      topics: ["Syllabus-specific enquiries", "Individual online tuition"],
      select: "O Level",
    },
  ],
  lessons: originalLessons,
};
