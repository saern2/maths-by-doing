"use client";
import { useEffect, useState, useCallback, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  LayoutDashboard,
  FileText,
  Video,
  Image as ImageIcon,
  Users,
  LogOut,
  ArrowRight,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Upload,
  Search,
  Mail,
  Save,
  RefreshCw,
} from "lucide-react";
import {
  textFields,
  classChoices,
  contentSchema,
  type SiteContent,
} from "@/lib/site-content";
type Snapshot = { content: SiteContent; revision: number; updatedAt: string };
type Enquiry = {
  id: string;
  name: string;
  email: string;
  student_class: string;
  created_at: string;
  status: string;
  notes: string;
};
const tabs = [
  ["overview", "Overview", LayoutDashboard],
  ["content", "Website content", FileText],
  ["lessons", "Video lessons", Video],
  ["images", "Images", ImageIcon],
  ["enquiries", "Student enquiries", Users],
] as const;
const statusLabels = {
  new: "New",
  contacted: "Contacted",
  enrolled: "Enrolled",
  archived: "Archived",
};
async function api<T = { ok: boolean }>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const r = await fetch(url, options);
  let data;
  try {
    data = await r.json();
  } catch {
    throw new Error("The server did not respond. Please try again.");
  }
  if (!r.ok)
    throw new Error(
      (data as { error?: string }).error || "Unable to complete request.",
    );
  return data as T;
}
export default function AdminStudio({ initial }: { initial: Snapshot }) {
  const router = useRouter();
  const [tab, setTab] = useState<string>("overview"),
    [content, setContent] = useState(initial.content),
    [saved, setSaved] = useState(initial),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]),
    [total, setTotal] = useState(0),
    [counts, setCounts] = useState({ all: 0, fresh: 0 }),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState<Enquiry | null>(null);
  const [newVideo, setNewVideo] = useState(""),
    [uploading, setUploading] = useState("");
  const dirty = JSON.stringify(content) !== JSON.stringify(saved.content);
  const loadEnquiries = useCallback(
    (signal?: AbortSignal) =>
      api<{ enquiries: Enquiry[]; total: number; all: number; fresh: number }>(
        "/api/admin/enquiries?" +
          new URLSearchParams({ page: String(page), q: query, status: filter }),
        { signal },
      )
        .then((d) => {
          if (signal?.aborted) return;
          setEnquiries(d.enquiries);
          setTotal(d.total);
          setCounts({ all: d.all, fresh: d.fresh });
        })
        .catch((e) => {
          if (!signal?.aborted)
            setError(
              e instanceof Error ? e.message : "Unable to load enquiries.",
            );
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        }),
    [page, query, filter],
  );
  useEffect(() => {
    const controller = new AbortController();
    void loadEnquiries(controller.signal);
    return () => controller.abort();
  }, [loadEnquiries]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function switchTab(id: string) {
    setTab(id);
    setError("");
    setNotice("");
  }
  function updateText(key: string, value: string) {
    setContent((c) => ({ ...c, text: { ...c.text, [key]: value } }));
  }
  async function publish() {
    setError("");
    setNotice("");
    const parsed = contentSchema.safeParse(content);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .slice(0, 3)
          .map((i) => i.path.join(".") + ": " + i.message)
          .join(" · "),
      );
      return;
    }
    if (!window.confirm("Publish these changes to your live website?")) return;
    setBusy(true);
    try {
      const d = await api<Snapshot>("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: parsed.data,
          revision: saved.revision,
        }),
      });
      setSaved(d);
      setContent(d.content);
      setNotice("Published. Your changes are now live on the website.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (dirty && !window.confirm("Leave without publishing your changes?"))
      return;
    try {
      await api("/api/admin/logout", { method: "POST" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign out.");
    }
  }
  function lesson(index: number, field: string, value: string) {
    setContent((c) => ({
      ...c,
      lessons: c.lessons.map((l, i) =>
        i === index ? { ...l, [field]: value } : l,
      ),
    }));
  }
  function addLesson() {
    let id = newVideo.trim();
    try {
      const url = new URL(id);
      id =
        url.hostname === "youtu.be"
          ? url.pathname.slice(1)
          : url.searchParams.get("v") || url.pathname.split("/").pop() || "";
    } catch {}
    if (!/^[\w-]{11}$/.test(id)) {
      setError("Paste a YouTube video link or its 11-character video ID.");
      return;
    }
    if (content.lessons.some((l) => l.id === id)) {
      setError("This lesson is already in your list.");
      return;
    }
    setContent((c) => ({
      ...c,
      lessons: [
        {
          id,
          title: "New lesson — add a title",
          category: "Free video lesson",
          image: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg",
        },
        ...c.lessons,
      ],
    }));
    setNewVideo("");
    setError("");
  }
  function moveLesson(index: number, direction: number) {
    setContent((c) => {
      const lessons = [...c.lessons];
      [lessons[index], lessons[index + direction]] = [
        lessons[index + direction],
        lessons[index],
      ];
      return { ...c, lessons };
    });
  }
  async function upload(
    e: ChangeEvent<HTMLInputElement>,
    key: "logo" | "portrait",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(key);
    try {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      )
        throw new Error(
          "Choose a PNG, JPEG, or WebP image smaller than 10 MB.",
        );
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx)
        throw new Error(
          "This browser cannot prepare images. Use an image URL below.",
        );
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error("Unable to prepare image.")),
          "image/webp",
          0.85,
        ),
      );
      if (blob.size > 1024 * 1024)
        throw new Error(
          "The image is still too large. Choose a smaller image.",
        );
      const d = await api<{ url: string }>("/api/admin/images", {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      setContent((c) => ({ ...c, images: { ...c.images, [key]: d.url } }));
      setNotice("Image uploaded. Publish changes to show it on your website.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading("");
      e.target.value = "";
    }
  }
  async function saveEnquiry() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/enquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      setNotice("Enquiry updated.");
      setSelected(null);
      await loadEnquiries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save enquiry.");
    } finally {
      setBusy(false);
    }
  }
  const section = tabs.find((t) => t[0] === tab)!;
  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <a href="/admin" className="studio-brand">
          <BookOpen size={29} />
          <span>
            Maths by Doing<small>TEACHER STUDIO</small>
          </span>
        </a>
        <p className="sidebar-label">YOUR WORKSPACE</p>
        <nav aria-label="Admin navigation">
          {tabs.map(([id, title, Icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => switchTab(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{title}</span>
              {id === "enquiries" && counts.fresh > 0 && <b>{counts.fresh}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="studio-tip">
            <span>ONE STEP AT A TIME</span>
            <p>
              A new lesson today.
              <br />A little more confidence tomorrow.
            </p>
          </div>
          <a href="/" target="_blank" rel="noreferrer">
            View live website <ArrowUpRight size={17} />
          </a>
          <button onClick={logout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-topbar">
          <span>
            <span className="status-dot" /> Your teaching workspace
          </span>
          <a href="/" target="_blank" rel="noreferrer">
            Open website <ArrowUpRight size={16} />
          </a>
        </header>
        <div className="studio-body">
          <div className="studio-page-title">
            <div>
              <p className="studio-kicker">MATHS BY DOING / STUDIO</p>
              <h1>{section[1]}</h1>
              <p>
                {tab === "overview"
                  ? "A clear view of what matters. Make a little progress today."
                  : tab === "content"
                    ? "Your words, your voice. Update the details students see."
                    : tab === "lessons"
                      ? "Share the working. Help students find their next lesson."
                      : tab === "images"
                        ? "Put a familiar face to the teaching."
                        : "Every enquiry is the beginning of a conversation."}
              </p>
            </div>
            {tab !== "enquiries" && (
              <button
                className="studio-primary"
                onClick={publish}
                disabled={!dirty || busy || !!uploading}
              >
                <Upload size={17} />
                {busy ? "Publishing…" : "Publish changes"}
              </button>
            )}
          </div>
          {error && (
            <div className="admin-alert" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="admin-success" role="status">
              <Check size={17} />
              {notice}
            </div>
          )}
          {dirty && (
            <div className="draft-bar">
              <span>
                <span className="draft-dot" /> You have unpublished changes.
              </span>
              <button
                onClick={() => {
                  if (
                    window.confirm("Discard all unpublished website changes?")
                  ) {
                    setContent(saved.content);
                    setNotice("Changes discarded.");
                  }
                }}
              >
                Discard changes
              </button>
            </div>
          )}
          {tab === "overview" && (
            <>
              <section className="studio-welcome">
                <div>
                  <span className="studio-kicker">HELLO, TEACHER</span>
                  <h2>
                    A good day to
                    <br />
                    make a difference.
                  </h2>
                  <p>
                    Your lessons, your students, your next chapter.
                    <br />
                    Everything you need is right here.
                  </p>
                  <button onClick={() => switchTab("content")}>
                    Make your website yours <ArrowRight size={18} />
                  </button>
                </div>
                <div className="welcome-art" aria-hidden="true">
                  <span className="art-ring" />
                  <span className="art-grid" />
                  <span className="art-pi">π</span>
                  <span className="art-equation">y = x²</span>
                  <span className="art-caption">
                    SMALL STEPS. REAL PROGRESS.
                  </span>
                </div>
              </section>
              <div className="studio-stats">
                <button onClick={() => switchTab("enquiries")}>
                  <Users />
                  <span>Total enquiries</span>
                  <strong>{loading ? "—" : counts.all}</strong>
                  <small>Students taking their first step</small>
                </button>
                <button onClick={() => switchTab("enquiries")}>
                  <Mail />
                  <span>New conversations</span>
                  <strong>{loading ? "—" : counts.fresh}</strong>
                  <small>Ready for your follow-up</small>
                </button>
                <button onClick={() => switchTab("lessons")}>
                  <Video />
                  <span>Published lessons</span>
                  <strong>{saved.content.lessons.length}</strong>
                  <small>A classroom that stays open</small>
                </button>
              </div>
              <div className="studio-two-columns">
                <section className="studio-card">
                  <div className="card-heading">
                    <h2>Make it your own</h2>
                    <span className="muted">QUICK ACTIONS</span>
                  </div>
                  {[
                    [
                      "content",
                      "Refresh your website",
                      "Edit your introduction, classes and contact details.",
                      FileText,
                    ],
                    [
                      "lessons",
                      "Share a new lesson",
                      "Add a YouTube video to your lesson collection.",
                      Video,
                    ],
                    [
                      "images",
                      "Update your images",
                      "A fresh portrait or a new logo.",
                      ImageIcon,
                    ],
                  ].map(([id, title, desc, Icon]) => {
                    const ActionIcon = Icon as typeof FileText;
                    return (
                      <button
                        className="quick-action"
                        key={String(id)}
                        onClick={() => switchTab(String(id))}
                      >
                        <span>
                          <ActionIcon size={20} />
                        </span>
                        <div>
                          <b>{String(title)}</b>
                          <p>{String(desc)}</p>
                        </div>
                        <ArrowUpRight size={19} />
                      </button>
                    );
                  })}
                </section>
                <section className="studio-card">
                  <div className="card-heading">
                    <h2>Recent enquiries</h2>
                    <button onClick={() => switchTab("enquiries")}>
                      View all <ArrowRight size={14} />
                    </button>
                  </div>
                  {loading ? (
                    <p className="empty-state">Loading enquiries…</p>
                  ) : enquiries.length === 0 ? (
                    <div className="empty-state">
                      <Mail size={28} />
                      <h3>A new conversation starts here.</h3>
                      <p>
                        When a student registers interest, their details will
                        appear here.
                      </p>
                    </div>
                  ) : (
                    enquiries.slice(0, 4).map((e) => (
                      <button
                        className="recent-enquiry"
                        key={e.id}
                        onClick={() => {
                          switchTab("enquiries");
                          setSelected(e);
                        }}
                      >
                        <span className="student-avatar">
                          {e.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <b>{e.name}</b>
                          <p>{e.student_class}</p>
                        </div>
                        <span className={"enquiry-status " + e.status}>
                          {statusLabels[e.status as keyof typeof statusLabels]}
                        </span>
                      </button>
                    ))
                  )}
                </section>
              </div>
              <p className="studio-last-saved">
                Last published {new Date(saved.updatedAt).toLocaleString()}.
                Content changes appear when visitors refresh the site.
              </p>
            </>
          )}
          {tab === "content" && (
            <div className="content-editor">
              <div className="editor-note">
                <BookOpen size={20} />
                <p>
                  Keep it natural. Write as you would speak to a student.
                  <br />
                  <span>
                    Open a section, make your changes, then publish when you’re
                    ready.
                  </span>
                </p>
              </div>
              {[...new Set(textFields.map((f) => f[1]))].map((group, index) => (
                <details
                  className="studio-card editor-section"
                  key={group}
                  open={index === 0}
                >
                  <summary>
                    <span className="section-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2>{group}</h2>
                      <p>
                        {textFields.filter((f) => f[1] === group).length}{" "}
                        editable fields
                      </p>
                    </div>
                    <Plus size={18} />
                  </summary>
                  <div className="editor-fields">
                    {textFields
                      .filter((f) => f[1] === group)
                      .map(([key, , label]) => (
                        <label key={key}>
                          {label}
                          <textarea
                            rows={
                              key.includes("Intro") ||
                              (key.startsWith("about") && key.length === 6)
                                ? 3
                                : 2
                            }
                            value={content.text[key]}
                            onChange={(e) => updateText(key, e.target.value)}
                            maxLength={1500}
                          />
                        </label>
                      ))}
                  </div>
                </details>
              ))}
              <details className="studio-card editor-section">
                <summary>
                  <span className="section-number">08</span>
                  <div>
                    <h2>Contact links</h2>
                    <p>WhatsApp, phone and social profiles</p>
                  </div>
                  <Plus size={18} />
                </summary>
                <div className="editor-fields">
                  {(
                    Object.keys(content.links) as (keyof SiteContent["links"])[]
                  ).map((key) => (
                    <label key={key}>
                      {key === "whatsapp"
                        ? "WhatsApp link (https://wa.me/COUNTRYNUMBER)"
                        : key === "phone"
                          ? "Phone number with country code"
                          : key === "youtube"
                            ? "YouTube channel URL"
                            : "Facebook profile URL"}
                      <input
                        value={content.links[key]}
                        onChange={(e) =>
                          setContent((c) => ({
                            ...c,
                            links: { ...c.links, [key]: e.target.value },
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </details>
              <details className="studio-card editor-section">
                <summary>
                  <span className="section-number">09</span>
                  <div>
                    <h2>Class cards</h2>
                    <p>Descriptions of your three teaching programmes</p>
                  </div>
                  <Plus size={18} />
                </summary>
                <div className="editor-fields">
                  {content.courses.map((c, i) => (
                    <fieldset key={i}>
                      <legend>Programme {i + 1}</legend>
                      {(["title", "level", "description"] as const).map(
                        (key) => (
                          <label key={key}>
                            {key}
                            <textarea
                              value={c[key]}
                              maxLength={key === "description" ? 700 : 100}
                              onChange={(e) =>
                                setContent((v) => ({
                                  ...v,
                                  courses: v.courses.map((course, n) =>
                                    n === i
                                      ? { ...course, [key]: e.target.value }
                                      : course,
                                  ),
                                }))
                              }
                            />
                          </label>
                        ),
                      )}
                      {c.topics.map((topic, j) => (
                        <label key={j}>
                          Topic {j + 1}
                          <input
                            value={topic}
                            maxLength={120}
                            onChange={(e) =>
                              setContent((v) => ({
                                ...v,
                                courses: v.courses.map((course, n) =>
                                  n === i
                                    ? {
                                        ...course,
                                        topics: course.topics.map((t, k) =>
                                          k === j ? e.target.value : t,
                                        ),
                                      }
                                    : course,
                                ),
                              }))
                            }
                          />
                        </label>
                      ))}
                      <label>
                        Default enquiry class
                        <select
                          value={c.select}
                          onChange={(e) =>
                            setContent((v) => ({
                              ...v,
                              courses: v.courses.map((course, n) =>
                                n === i
                                  ? {
                                      ...course,
                                      select: e.target.value as typeof c.select,
                                    }
                                  : course,
                              ),
                            }))
                          }
                        >
                          {classChoices.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                    </fieldset>
                  ))}
                </div>
              </details>
            </div>
          )}
          {tab === "lessons" && (
            <>
              <section className="studio-card add-lesson">
                <div>
                  <h2>A new lesson to share?</h2>
                  <p>
                    Paste a YouTube link, then add a title your students will
                    recognise.
                  </p>
                </div>
                <div className="inline-input">
                  <input
                    aria-label="YouTube video link or ID"
                    placeholder="https://www.youtube.com/watch?v=…"
                    value={newVideo}
                    onChange={(e) => setNewVideo(e.target.value)}
                  />
                  <button
                    className="studio-primary"
                    onClick={addLesson}
                    disabled={content.lessons.length >= 100}
                  >
                    <Plus size={17} /> Add lesson
                  </button>
                </div>
              </section>
              <p className="muted lesson-count">
                {content.lessons.length} lessons · Use the arrows to change
                their order · Publish to apply changes
              </p>
              <div className="admin-lesson-grid">
                {content.lessons.map((l, i) => (
                  <article className="studio-card lesson-editor" key={l.id}>
                    <div className="lesson-editor-image">
                      <img src={l.image} alt="" loading="lazy" />
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <a
                        href={"https://www.youtube.com/watch?v=" + l.id}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={"Watch " + l.title}
                      >
                        <ArrowUpRight size={18} />
                      </a>
                    </div>
                    <div className="lesson-editor-fields">
                      <label>
                        Lesson title
                        <input
                          value={l.title}
                          maxLength={180}
                          onChange={(e) => lesson(i, "title", e.target.value)}
                        />
                      </label>
                      <label>
                        Category
                        <input
                          value={l.category}
                          maxLength={80}
                          onChange={(e) =>
                            lesson(i, "category", e.target.value)
                          }
                        />
                      </label>
                      <details>
                        <summary>Thumbnail URL</summary>
                        <input
                          aria-label={"Thumbnail for " + l.title}
                          value={l.image}
                          onChange={(e) => lesson(i, "image", e.target.value)}
                        />
                      </details>
                      <div className="lesson-actions">
                        <span>{l.id}</span>
                        <button
                          aria-label={"Move " + l.title + " up"}
                          disabled={i === 0}
                          onClick={() => moveLesson(i, -1)}
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          aria-label={"Move " + l.title + " down"}
                          disabled={i === content.lessons.length - 1}
                          onClick={() => moveLesson(i, 1)}
                        >
                          <ArrowDown size={17} />
                        </button>
                        <button
                          aria-label={"Remove " + l.title}
                          disabled={content.lessons.length <= 1}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Remove this lesson from your website?",
                              )
                            )
                              setContent((c) => ({
                                ...c,
                                lessons: c.lessons.filter((_, n) => n !== i),
                              }));
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === "images" && (
            <>
              <div className="editor-note">
                <ImageIcon size={22} />
                <p>
                  Clear images make a warm first impression.
                  <br />
                  <span>
                    Upload a PNG, JPEG or WebP. Large images are resized
                    automatically. Publish to show them on the website.
                  </span>
                </p>
              </div>
              <div className="studio-two-columns">
                {(["portrait", "logo"] as const).map((key) => (
                  <section className="studio-card image-editor" key={key}>
                    <div className={"image-preview " + key}>
                      <img
                        src={content.images[key]}
                        alt={
                          key === "portrait"
                            ? "Teacher portrait preview"
                            : "Website logo preview"
                        }
                      />
                    </div>
                    <div className="image-editor-fields">
                      <h2>
                        {key === "portrait"
                          ? "Your teacher portrait"
                          : "Your website logo"}
                      </h2>
                      <p>
                        {key === "portrait"
                          ? "Used in the introduction and about section."
                          : "Used in your website header and footer."}
                      </p>
                      <label className="studio-secondary upload-label">
                        <Upload size={17} />
                        {uploading === key
                          ? "Preparing image…"
                          : "Choose a new image"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => void upload(e, key)}
                          disabled={!!uploading}
                        />
                      </label>
                      <label>
                        Or use an image URL
                        <input
                          value={content.images[key]}
                          onChange={(e) =>
                            setContent((c) => ({
                              ...c,
                              images: { ...c.images, [key]: e.target.value },
                            }))
                          }
                        />
                      </label>
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
          {tab === "enquiries" && (
            <>
              <div className="enquiry-tools">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setLoading(true);
                    setPage(1);
                    setQuery(search);
                    if (query === search && page === 1) void loadEnquiries();
                  }}
                >
                  <Search size={18} />
                  <input
                    aria-label="Search enquiries"
                    placeholder="Search name, email or class…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button type="submit">Search</button>
                </form>
                <select
                  aria-label="Filter enquiry status"
                  value={filter}
                  onChange={(e) => {
                    setLoading(true);
                    setFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All statuses</option>
                  {Object.entries(statusLabels).map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <button
                  className="studio-secondary"
                  onClick={() => {
                    setLoading(true);
                    void loadEnquiries();
                  }}
                  aria-label="Refresh enquiries"
                >
                  <RefreshCw size={17} />
                </button>
              </div>
              <div className="studio-card enquiries-list">
                <div className="card-heading">
                  <h2>
                    {total} {total === 1 ? "enquiry" : "enquiries"}
                  </h2>
                  <span className="muted">PRIVATE · ONLY VISIBLE TO YOU</span>
                </div>
                {loading ? (
                  <p className="empty-state">Loading enquiries…</p>
                ) : enquiries.length === 0 ? (
                  <div className="empty-state">
                    <Mail size={30} />
                    <h3>No enquiries here yet.</h3>
                    <p>
                      {query || filter !== "all"
                        ? "Try a different search or status."
                        : "New student registrations will appear here."}
                    </p>
                  </div>
                ) : (
                  enquiries.map((e) => (
                    <button
                      className={
                        "enquiry-row " +
                        (selected?.id === e.id ? "selected" : "")
                      }
                      key={e.id}
                      onClick={() => setSelected({ ...e })}
                    >
                      <span className="student-avatar">
                        {e.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <b>{e.name}</b>
                        <span>{e.email}</span>
                      </div>
                      <span className="enquiry-class">{e.student_class}</span>
                      <span className={"enquiry-status " + e.status}>
                        {statusLabels[e.status as keyof typeof statusLabels]}
                      </span>
                      <time>{new Date(e.created_at).toLocaleDateString()}</time>
                      <ArrowUpRight size={17} />
                    </button>
                  ))
                )}
                <div className="pagination">
                  <button
                    disabled={page <= 1 || loading}
                    onClick={() => {
                      setLoading(true);
                      setPage((p) => p - 1);
                    }}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {Math.max(1, Math.ceil(total / 25))}
                  </span>
                  <button
                    disabled={page * 25 >= total || loading}
                    onClick={() => {
                      setLoading(true);
                      setPage((p) => p + 1);
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
              {selected && (
                <section
                  className="studio-card enquiry-detail"
                  aria-label="Edit selected enquiry"
                >
                  <div className="card-heading">
                    <div>
                      <p className="studio-kicker">FOLLOW UP</p>
                      <h2>{selected.name}</h2>
                    </div>
                    <button onClick={() => setSelected(null)}>Close</button>
                  </div>
                  <p>
                    {selected.student_class} ·{" "}
                    <a href={"mailto:" + selected.email}>
                      {selected.email} <ArrowUpRight size={14} />
                    </a>
                  </p>
                  <label>
                    Status
                    <select
                      value={selected.status}
                      onChange={(e) =>
                        setSelected({ ...selected, status: e.target.value })
                      }
                    >
                      {Object.entries(statusLabels).map(([v, l]) => (
                        <option value={v} key={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Private notes
                    <textarea
                      rows={4}
                      maxLength={2000}
                      placeholder="Availability, syllabus, next steps…"
                      value={selected.notes}
                      onChange={(e) =>
                        setSelected({ ...selected, notes: e.target.value })
                      }
                    />
                  </label>
                  <div className="detail-actions">
                    <span className="muted">
                      Notes are never shown on the public website.
                    </span>
                    <button
                      className="studio-primary"
                      onClick={saveEnquiry}
                      disabled={busy}
                    >
                      <Save size={17} />
                      {busy ? "Saving…" : "Save enquiry"}
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
          <footer className="studio-footer">
            <span>Maths by Doing · Teacher studio</span>
            <span>Made for the people who make a difference.</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
