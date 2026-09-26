"use client";
import { useState, useEffect, useRef, FormEvent } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  Pause,
  BookOpen,
  MessageCircle,
  MapPin,
  Check,
  GraduationCap,
  Monitor,
  PenTool,
  Phone,
  Video,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { SiteContent } from "@/lib/site-content";

export default function Home({ content }: { content: SiteContent }) {
  const classes = content.registrationClasses;
  const t = content.text;
  const lessons = content.lessons;
  const whatsapp = content.links.whatsapp;
  const courses = content.courses.map((c, i) => ({
    ...c,
    number: String(i + 1).padStart(2, "0"),
    icon: [BookOpen, PenTool, GraduationCap][i],
  }));
  const [studentClass, setStudentClass] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const requestId = useRef("");
  const [video, setVideo] = useState<(typeof lessons)[number] | null>(null);
  const [paused, setPaused] = useState(false);
  const [chat, setChat] = useState(false);
  function choose(value: string) {
    setStudentClass(classes.includes(value) ? value : "");
    document.getElementById("register")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => unknown;
        };
      }
    ).modelContext;
    if (!context) return;
    const controller = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "start_class_registration",
            description:
              "Select a class and open the registration form. Does not submit or send personal information.",
            inputSchema: {
              type: "object",
              properties: { studentClass: { type: "string", enum: classes } },
              required: ["studentClass"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute: (input: unknown) => {
              const value = (input as { studentClass?: string })?.studentClass;
              if (!value || !classes.includes(value))
                throw new Error("Choose a supported class");
              choose(value);
              return {
                stage: "form_open",
                studentClass: value,
                submitted: false,
              };
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => controller.abort();
  }, [classes]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!studentClass) {
      setError("Please select your class.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError("");
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: requestId.current,
          name,
          email,
          studentClass,
          website: new FormData(e.currentTarget).get("website") || "",
        }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error);
      setStatus("saved");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save. Please try again.",
      );
      setStatus("error");
    }
  }
  const contactText = encodeURIComponent(
    `Assalam-o-Alaikum ${t.teacher}, I would like to enquire about ${studentClass || "maths"} classes. My name is ${name || "[your name]"}.${email ? " My email is " + email + "." : ""}`,
  );
  return (
    <main id="top" className={paused ? "motion-paused" : ""}>
      <div className="math-atmosphere" aria-hidden="true">
        <span>∑</span>
        <span>π</span>
        <span>√x</span>
        <span>x² + y²</span>
        <span>∞</span>
        <span>sin θ</span>
      </div>
      <header className="nav wrap">
        <a className="brand" href="#top" aria-label={t.brand + " home"}>
          <img
            className="brand-logo"
            src={content.images.logo}
            alt=""
            width="60"
            height="60"
          />
          <span>
            {t.brand}
            <small>WITH {t.teacher.toUpperCase()}</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#about">Meet your teacher</a>
          <a href="#classes">Classes</a>
          <a href="#lessons">Free lessons</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="button small" href="#register">
          Join a class <ArrowUpRight size={16} />
        </a>
      </header>
      <section className="hero wrap">
        <div className="hero-coordinate" aria-hidden="true">
          x → understanding · y → practice
        </div>
        <div className="hero-copy">
          <p className="eyebrow">{t.heroEyebrow}</p>
          <h1>
            {t.heroLine1}
            <br />
            {t.heroLine2}
            <br />
            <em>{t.heroAccent}</em>
          </h1>
          <p className="intro">{t.heroIntro}</p>
          <div className="actions">
            <a className="button" href="#register">
              Find your class <ArrowUpRight size={18} />
            </a>
            <a className="text-button" href="#lessons">
              <Play size={17} /> Explore free lessons
            </a>
          </div>
          <div className="hero-note">
            <BookOpen size={18} /> {t.heroNote}
          </div>
        </div>
        <div className="hero-visual">
          <div className="math-note note-equation" aria-hidden="true">
            <small>ONE STEP AT A TIME</small>
            <span>x² − 5x + 6 = 0</span>
            <b>(x − 2)(x − 3) = 0</b>
          </div>
          <div className="portrait-panel">
            <div className="portrait-label">
              <span>YOUR NEXT CHAPTER IN MATHS</span>
              <span>∑</span>
            </div>
            <img
              className="hero-portrait"
              src={content.images.portrait}
              alt={t.teacher + ", the teacher behind " + t.brand}
              width="900"
              height="900"
            />
            <div className="portrait-caption">
              <div>
                <span>MEET YOUR TEACHER</span>
                <h2>{t.teacher}</h2>
                <p>
                  <MapPin size={14} /> {t.location}
                </p>
              </div>
              <a href="#about" aria-label={"Meet " + t.teacher}>
                <ArrowUpRight size={26} />
              </a>
            </div>
            <div className="portrait-tag">
              <BookOpen size={17} /> Learn. Practise. Understand.
            </div>
          </div>
          <div className="math-note note-graph" aria-hidden="true">
            <svg viewBox="0 0 180 100">
              <path
                d="M15 80H165M90 90V8"
                stroke="currentColor"
                fill="none"
                opacity=".3"
              />
              <path
                className="parabola"
                d="M35 15Q90 145 145 15"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
              />
              <circle className="graph-point" r="4" fill="currentColor" />
              <text x="110" y="95" fill="currentColor" fontSize="13">
                y = x²
              </text>
            </svg>
          </div>
        </div>
      </section>
      <div className="level-strip">
        <div className="wrap">
          <span>
            A STRONGER FOUNDATION.
            <br />A CLEARER WAY FORWARD.
          </span>
          <b>Classes 6–8</b>
          <b>Classes 9–12</b>
          <b>O Level</b>
          <b>A Level</b>
          <b>AKU-EB</b>
        </div>
      </div>
      <section id="lessons" className="lessons-section section">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <Video size={16} /> {t.lessonsEyebrow}
              </p>
              <h2>
                {t.lessonsTitle.split("\n").map((line, i) => (
                  <span key={i} style={{ display: "block" }}>
                    {line}
                  </span>
                ))}
              </h2>
            </div>
            <div className="heading-aside">
              <p>{t.lessonsIntro}</p>
              <a
                className="text-button"
                href={content.links.youtube}
                target="_blank"
                rel="noreferrer"
              >
                View the full channel <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <div
            className="video-carousel"
            aria-label="Continuously scrolling YouTube lessons"
          >
            <div
              className={
                "lesson-window " + (paused || video ? "is-paused" : "")
              }
            >
              <div className="lesson-train">
                {[0, 1].map((copy) => (
                  <div
                    className="lesson-group"
                    key={copy}
                    aria-hidden={copy === 1 ? true : undefined}
                  >
                    {lessons.map((lesson) => (
                      <button
                        className="video-card"
                        key={lesson.id}
                        tabIndex={copy === 1 ? -1 : 0}
                        onClick={() => setVideo(lesson)}
                        aria-label={"Watch " + lesson.title}
                      >
                        <div className="thumbnail">
                          <span className="thumbnail-label">
                            {lesson.title}
                          </span>
                          <img
                            src={lesson.image}
                            alt=""
                            width="480"
                            height="270"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.opacity = "0";
                            }}
                          />
                          <span className="play-circle">
                            <Play size={21} fill="currentColor" />
                          </span>
                        </div>
                        <div className="video-details">
                          <span>{lesson.category}</span>
                          <h3>{lesson.title}</h3>
                          <p>
                            {t.teacher} <ArrowUpRight size={17} />
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="carousel-bottom">
              <span>
                {lessons.length} lessons · Pick a topic. Follow the working.
              </span>
              <div className="carousel-controls">
                <button
                  onClick={() => setPaused(!paused)}
                  aria-label={paused ? "Resume animations" : "Pause animations"}
                  aria-pressed={paused}
                >
                  {paused ? <Play size={15} /> : <Pause size={15} />}
                  <span>{paused ? "Resume motion" : "Pause motion"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="classes" className="wrap section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.classesEyebrow}</p>
            <h2>
              {t.classesTitle.split("\n").map((line, i) => (
                <span key={i} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </h2>
          </div>
          <p className="heading-aside">{t.classesIntro}</p>
        </div>
        <div className="course-grid">
          {courses.map((c) => (
            <article className="course" key={c.number}>
              <div className="course-top">
                <c.icon size={26} strokeWidth={1.4} />
                <span>{c.number}</span>
              </div>
              <p className="eyebrow">{c.level}</p>
              <h3>{c.title}</h3>
              <p>{c.description}</p>
              <ul>
                {c.topics.map((t) => (
                  <li key={t}>
                    <Check size={15} />
                    {t}
                  </li>
                ))}
              </ul>
              <button
                className="course-action"
                onClick={() => choose(c.select)}
              >
                Enquire about classes <ArrowUpRight size={18} />
              </button>
            </article>
          ))}
        </div>
        <p className="course-footnote">
          <Monitor size={17} /> {t.classesFootnote}
        </p>
      </section>
      <section id="about" className="about-section">
        <div className="wrap about-grid">
          <div className="about-heading">
            <p className="eyebrow">{t.aboutEyebrow}</p>
            <h2>
              {t.aboutTitle}
              <br />
              <em>{t.aboutAccent}</em>
            </h2>
            <div className="teacher-sign">
              <img
                src={content.images.portrait}
                alt=""
                width="58"
                height="58"
                loading="lazy"
              />
              <div>
                <b>{t.teacher}</b>
                <span>{t.role}</span>
              </div>
            </div>
          </div>
          <div className="about-copy">
            <p>{t.about1}</p>
            <p>{t.about2}</p>
            <p>{t.about3}</p>
            <a
              className="text-button"
              href={content.links.facebook}
              target="_blank"
              rel="noreferrer"
            >
              Connect on Facebook <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
      </section>
      <section id="register" className="wrap section register-section">
        <div className="register-copy">
          <p className="eyebrow">{t.registerEyebrow}</p>
          <h2>
            {t.registerTitle.split("\n").map((line, i) => (
              <span key={i} style={{ display: "block" }}>
                {line}
              </span>
            ))}
          </h2>
          <p className="intro">{t.registerIntro}</p>
          <div className="registration-steps">
            <p>
              <span>01</span> Share your class and contact details
            </p>
            <p>
              <span>02</span> Discuss your syllabus and availability
            </p>
            <p>
              <span>03</span> Confirm your class directly with {t.teacher}
            </p>
          </div>
        </div>
        <div className="registration-card">
          {status === "saved" ? (
            <div className="success" role="status">
              <div className="success-icon">
                <Check size={26} />
              </div>
              <h3>Your interest is registered.</h3>
              <p>
                Thanks, {name}. Your enquiry for {studentClass} has been saved.
                To discuss timings and fees, send your details to {t.teacher} on
                WhatsApp.
              </p>
              <a
                className="button"
                href={whatsapp + "?text=" + contactText}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} /> Continue on WhatsApp
              </a>
              <p className="fine-print">
                WhatsApp opens a prepared message. You choose when to send it.
                Registration does not confirm a class booking.
              </p>
              <button
                className="text-button"
                onClick={() => {
                  setStatus("idle");
                  requestId.current = "";
                  setName("");
                  setEmail("");
                  setStudentClass("");
                }}
              >
                Register another enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <p className="eyebrow">CLASS REGISTRATION</p>
              <h3>Start with a hello.</h3>
              <p className="form-subtitle">All three fields are required.</p>
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  requestId.current = "";
                }}
                placeholder="Enter your full name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  requestId.current = "";
                }}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={254}
                required
              />
              <label htmlFor="student-class">Your class or programme</label>
              <Select
                value={studentClass}
                onValueChange={(v) => {
                  setStudentClass(v);
                  requestId.current = "";
                }}
                required
              >
                <SelectTrigger id="student-class" className="class-select">
                  <SelectValue placeholder="Select your class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="honeypot" aria-hidden="true">
                <label htmlFor="website">Leave this empty</label>
                <input
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <p className="fine-print">
                Your details are saved for your class enquiry. No payment is
                taken here. Confirm fees and availability directly with{" "}
                {t.teacher}.
              </p>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button submit-button"
                type="submit"
                disabled={status === "saving"}
              >
                {status === "saving"
                  ? "Saving your enquiry…"
                  : "Register your interest"}
                <ArrowRight size={18} />
              </button>
              <p className="form-bottom">
                <MessageCircle size={15} /> Prefer to talk?{" "}
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  Chat on WhatsApp
                </a>
              </p>
            </form>
          )}
        </div>
      </section>
      <section id="contact" className="contact-band">
        <div className="wrap">
          <div>
            <p className="eyebrow">{t.contactEyebrow}</p>
            <h2>{t.contactTitle}</h2>
            <p>{t.contactIntro}</p>
          </div>
          <a
            className="button"
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={20} /> Chat with {t.teacher}{" "}
            <ArrowUpRight size={18} />
          </a>
        </div>
      </section>
      <footer className="wrap">
        <div className="footer-top">
          <a href="#top" className="brand">
            <img
              className="brand-logo"
              src={content.images.logo}
              alt=""
              width="60"
              height="60"
            />
            <span>
              {t.brand}
              <small>WITH {t.teacher.toUpperCase()}</small>
            </span>
          </a>
          <div className="footer-contact">
            <a href={"tel:" + content.links.phone}>
              <Phone size={15} /> {t.phoneLabel}
            </a>
            <span>
              <MapPin size={15} /> {t.location}
            </span>
          </div>
          <div className="footer-links">
            <a href={content.links.youtube} target="_blank" rel="noreferrer">
              YouTube ↗
            </a>
            <a href={content.links.facebook} target="_blank" rel="noreferrer">
              Facebook ↗
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {t.brand}
          </span>
          <span>{t.footerNote}</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
      <a
        className="designer-float"
        href="https://agentixsquad.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Designed by Agentixsquad — visit website"
      >
        <span>
          Designed by <strong>Agentixsquad</strong>
        </span>
        <ArrowUpRight size={17} />
      </a>
      <button
        className="chat-float"
        onClick={() => setChat(true)}
        aria-label="Open WhatsApp contact options"
      >
        <MessageCircle size={23} />
        <span>Let’s chat</span>
      </button>
      <Dialog open={chat} onOpenChange={setChat}>
        <DialogContent className="chat-dialog">
          <DialogTitle>Say hello to {t.teacher}</DialogTitle>
          <DialogDescription>
            Ask about mathematics classes and availability. Continue to WhatsApp
            to send your message directly.
          </DialogDescription>
          <a
            className="button"
            href={
              whatsapp +
              "?text=" +
              encodeURIComponent(
                "Assalam-o-Alaikum " +
                  t.teacher +
                  ", I would like to ask about maths classes.",
              )
            }
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} /> Open WhatsApp
          </a>
          <a className="text-button" href={"tel:" + content.links.phone}>
            <Phone size={16} /> Call {t.phoneLabel}
          </a>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!video}
        onOpenChange={(open) => {
          if (!open) setVideo(null);
        }}
      >
        <DialogContent className="video-dialog">
          <DialogTitle>{video?.title}</DialogTitle>
          <DialogDescription>
            Learn with {t.teacher} on {t.brand}.
          </DialogDescription>
          {video && (
            <iframe
              key={video.id}
              src={
                "https://www.youtube-nocookie.com/embed/" +
                video.id +
                "?autoplay=1&rel=0"
              }
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}
          <a
            className="text-button"
            href={"https://www.youtube.com/watch?v=" + video?.id}
            target="_blank"
            rel="noreferrer"
          >
            Watch on YouTube <ArrowUpRight size={16} />
          </a>
        </DialogContent>
      </Dialog>
    </main>
  );
}
