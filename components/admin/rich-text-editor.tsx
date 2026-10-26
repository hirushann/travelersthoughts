"use client";

import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import type { MediaItem } from "@/lib/media/storage";
import { MediaPicker } from "./media-picker";

// Markup the visual editor has no model for; such posts open in HTML mode so nothing is lost.
const UNSUPPORTED = /<(figcaption|iframe|pre|h5|mark|sub|sup)\b/i;

export function hasUnsupportedMarkup(html: string) {
  return UNSUPPORTED.test(html);
}

type Props = {
  initialHtml: string;
  onChange: (html: string) => void;
  invalid?: boolean;
};

export function RichTextEditor({ initialHtml, onChange, invalid }: Props) {
  const [mode, setMode] = useState<"visual" | "html">(hasUnsupportedMarkup(initialHtml) ? "html" : "visual");
  const [html, setHtml] = useState(initialHtml);
  const [pickerOpen, setPickerOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
        codeBlock: false,
      }),
      Image.configure({ inline: false }),
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: mode === "visual" ? initialHtml : "",
    editorProps: {
      attributes: {
        class: "article-body prose prose-lg max-w-none min-h-[60vh] px-6 py-6 outline-none sm:px-10",
        "aria-label": "Post content",
      },
    },
    onUpdate: ({ editor }) => {
      const next = editor.getHTML();
      setHtml(next);
      onChange(next);
    },
  });

  function switchMode(next: "visual" | "html") {
    if (next === mode) return;
    if (next === "visual") {
      if (hasUnsupportedMarkup(html) && !confirm("This content has captions or embeds the visual editor will remove. Switch anyway?")) return;
      editor?.commands.setContent(html, { emitUpdate: false });
    }
    setMode(next);
  }

  function insertImage(item: MediaItem) {
    setPickerOpen(false);
    if (mode === "visual") {
      editor?.chain().focus().setImage({ src: item.url, alt: item.alt ?? "" }).run();
    } else {
      const next = `${html}\n<figure><img src="${item.url}" alt="${(item.alt ?? "").replace(/"/g, "&quot;")}"></figure>`;
      setHtml(next);
      onChange(next);
    }
  }

  return (
    <div className={`overflow-hidden rounded-2xl border bg-surface ${invalid ? "border-accent" : "border-line"}`}>
      {/* Sits just below the editor page's sticky save bar (h-16). */}
      <div className="sticky top-16 z-10 flex flex-wrap items-center gap-1 border-b border-line bg-surface/95 px-2 py-1.5 backdrop-blur">
        {mode === "visual" && editor ? <Toolbar editor={editor} onImage={() => setPickerOpen(true)} /> : (
          <button type="button" className={toolButton(false)} onClick={() => setPickerOpen(true)}>
            Image
          </button>
        )}
        <div className="ml-auto flex rounded-lg border border-line p-0.5 text-xs">
          {(["visual", "html"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`rounded-md px-2.5 py-1 ${mode === m ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
            >
              {m === "visual" ? "Visual" : "HTML"}
            </button>
          ))}
        </div>
      </div>

      {mode === "visual" ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          value={html}
          onChange={(e) => {
            setHtml(e.target.value);
            onChange(e.target.value);
          }}
          spellCheck={false}
          aria-label="Post content (HTML)"
          className="block min-h-[60vh] w-full resize-y bg-surface px-6 py-5 font-mono text-[13px] leading-relaxed outline-none"
        />
      )}

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={insertImage} />
    </div>
  );
}

const toolButton = (active: boolean) =>
  `rounded-lg px-2.5 py-1.5 text-sm transition ${active ? "bg-ink text-paper" : "text-muted hover:bg-sunken hover:text-ink"}`;

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = prompt("Link URL (leave empty to remove)", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  const c = () => editor.chain().focus();
  const buttons: { label: string; title: string; active?: boolean; disabled?: boolean; run: () => void }[] = [
    { label: "B", title: "Bold", active: s.bold, run: () => c().toggleBold().run() },
    { label: "I", title: "Italic", active: s.italic, run: () => c().toggleItalic().run() },
    { label: "U", title: "Underline", active: s.underline, run: () => c().toggleUnderline().run() },
    { label: "H2", title: "Section heading", active: s.h2, run: () => c().toggleHeading({ level: 2 }).run() },
    { label: "H3", title: "Sub-heading", active: s.h3, run: () => c().toggleHeading({ level: 3 }).run() },
    { label: "• List", title: "Bulleted list", active: s.bullet, run: () => c().toggleBulletList().run() },
    { label: "1. List", title: "Numbered list", active: s.ordered, run: () => c().toggleOrderedList().run() },
    { label: "“ Quote", title: "Quote", active: s.quote, run: () => c().toggleBlockquote().run() },
    { label: "Link", title: "Add or edit link", active: s.link, run: setLink },
    { label: "Image", title: "Insert image", run: onImage },
    {
      label: s.table ? "Delete table" : "Table",
      title: s.table ? "Remove this table" : "Insert a 3×3 table",
      run: () => (s.table ? c().deleteTable().run() : c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()),
    },
    { label: "—", title: "Divider", run: () => c().setHorizontalRule().run() },
    { label: "↶", title: "Undo", disabled: !s.canUndo, run: () => c().undo().run() },
    { label: "↷", title: "Redo", disabled: !s.canRedo, run: () => c().redo().run() },
  ];

  return (
    <>
      {buttons.map((b) => (
        <button
          key={b.title}
          type="button"
          title={b.title}
          aria-label={b.title}
          aria-pressed={b.active}
          disabled={b.disabled}
          onClick={b.run}
          className={`${toolButton(Boolean(b.active))} disabled:opacity-30 ${b.label === "B" ? "font-bold" : b.label === "I" ? "italic" : b.label === "U" ? "underline" : ""}`}
        >
          {b.label}
        </button>
      ))}
      {s.table && (
        <>
          <button type="button" className={toolButton(false)} onClick={() => c().addRowAfter().run()}>+ Row</button>
          <button type="button" className={toolButton(false)} onClick={() => c().addColumnAfter().run()}>+ Col</button>
          <button type="button" className={toolButton(false)} onClick={() => c().deleteRow().run()}>− Row</button>
          <button type="button" className={toolButton(false)} onClick={() => c().deleteColumn().run()}>− Col</button>
        </>
      )}
    </>
  );
}
