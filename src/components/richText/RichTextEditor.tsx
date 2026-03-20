import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  toolbarMode?: "always" | "focus";
  toolbarClassName?: string;
  editorClassName?: string;
  compact?: boolean;
};

function isHtml(content: string): boolean {
  if (!content) return false;
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function textToHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function normalizeFormattingHtml(html: string): string {
  if (!html) return html;
  return html
    .replace(/<\/b>/gi, "</strong>")
    .replace(/<b>/gi, "<strong>")
    .replace(/<\/i>/gi, "</em>")
    .replace(/<i>/gi, "<em>");
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text…",
  disabled = false,
  rows = 6,
  className = "",
  toolbarMode = "always",
  toolbarClassName = "",
  editorClassName = "",
  compact = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isToolbarInteracting, setIsToolbarInteracting] = useState(false);
  const isInternalUpdate = useRef(false);
  const savedSelectionRef = useRef<Range | null>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    link: false,
  });

  const valueToDisplayHtml = (val: string): string => {
    if (!val) return "";
    return normalizeFormattingHtml(isHtml(val) ? val : textToHtml(val));
  };

  function getStoredContent(): string {
    if (!editorRef.current) return "";
    return normalizeFormattingHtml(editorRef.current.innerHTML);
  }

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = valueToDisplayHtml(value);
    }
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection?.rangeCount && editorRef.current) {
        const range = selection.getRangeAt(0);
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          updateActiveFormats();
        }
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  useEffect(() => {
    if (!isInternalUpdate.current && editorRef.current) {
      const displayHtml = valueToDisplayHtml(value);
      if (editorRef.current.innerHTML !== displayHtml) {
        editorRef.current.innerHTML = displayHtml || "";
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const updateActiveFormats = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    let isInLink = false;
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      let node: Node | null = range.commonAncestorContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "A") {
          isInLink = true;
          break;
        }
        node = node.parentNode;
      }
    }
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      link: isInLink,
    });
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    isInternalUpdate.current = true;
    onChange(getStoredContent());
    updateActiveFormats();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const execCommand = (command: string, commandValue?: string) => {
    document.execCommand(command, false, commandValue);
    editorRef.current?.focus();
    handleInput();
    setTimeout(updateActiveFormats, 0);
  };

  const insertLink = () => {
    let url = linkUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
    const selectedText = linkText.trim() || url;
    setShowLinkDialog(false);
    setLinkUrl("");
    setLinkText("");

    let range: Range | null = savedSelectionRef.current;
    savedSelectionRef.current = null;
    if (!range && window.getSelection()?.rangeCount && editorRef.current) {
      range = window.getSelection()!.getRangeAt(0);
    }
    if (range && editorRef.current) {
      range.deleteContents();
      const linkElement = document.createElement("a");
      linkElement.href = url;
      linkElement.target = "_blank";
      linkElement.rel = "noopener noreferrer";
      linkElement.className = "text-blue-600 hover:text-blue-800 underline font-medium";
      linkElement.textContent = selectedText;
      range.insertNode(linkElement);
      const newRange = document.createRange();
      newRange.setStartAfter(linkElement);
      newRange.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(newRange);
      handleInput();
      setTimeout(() => editorRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      execCommand("bold");
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "u") {
      e.preventDefault();
      execCommand("underline");
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "i") {
      e.preventDefault();
      execCommand("italic");
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection?.rangeCount && editorRef.current) {
        savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
      }
      setLinkText(selection?.toString() || "");
      setLinkUrl("");
      setShowLinkDialog(true);
    }
  };

  const showToolbar = toolbarMode === "always" || isFocused || isToolbarInteracting;

  return (
    <div className={`space-y-3 ${className}`}>
      {showToolbar && (
        <div
          onMouseDown={(ev) => {
            ev.preventDefault();
            setIsToolbarInteracting(true);
            editorRef.current?.focus();
          }}
          onMouseUp={() => setIsToolbarInteracting(false)}
          onMouseLeave={() => setIsToolbarInteracting(false)}
          className={`flex flex-nowrap items-center gap-0.5 rounded-lg border border-gray-300 bg-white shadow-sm ${
            compact ? "gap-0 p-1" : "p-1.5"
          } ${toolbarClassName}`}
        >
          {(() => {
            const btn = compact
              ? "rounded px-1.5 py-0.5 text-xs"
              : "rounded-md px-3 py-1.5 text-sm";
            const active = "border border-blue-300 bg-blue-100 text-blue-700";
            const inactive = "border border-transparent text-gray-700 hover:bg-gray-100";
            return (
              <>
                <button
                  type="button"
                  onClick={() => execCommand("bold")}
                  disabled={disabled}
                  className={`${btn} font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                    activeFormats.bold ? active : inactive
                  }`}
                  title="Bold (⌘B)"
                >
                  <span className="font-bold">B</span>
                </button>
                <button
                  type="button"
                  onClick={() => execCommand("italic")}
                  disabled={disabled}
                  className={`${btn} font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                    activeFormats.italic ? active : inactive
                  }`}
                  title="Italic (⌘I)"
                >
                  <span className="italic">I</span>
                </button>
                <button
                  type="button"
                  onClick={() => execCommand("underline")}
                  disabled={disabled}
                  className={`${btn} font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                    activeFormats.underline ? active : inactive
                  }`}
                  title="Underline (⌘U)"
                >
                  <span className="underline">U</span>
                </button>
                <div className={`mx-0.5 w-px bg-gray-300 ${compact ? "h-3" : "h-5"}`} />
                <button
                  type="button"
                  onClick={() => {
                    const selection = window.getSelection();
                    if (selection?.rangeCount && editorRef.current) {
                      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
                    }
                    setLinkText(selection?.toString() || "");
                    setLinkUrl("");
                    setShowLinkDialog(true);
                  }}
                  disabled={disabled}
                  className={`${btn} font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                    activeFormats.link ? active : inactive
                  }`}
                  title="Link (⌘K)"
                >
                  🔗
                </button>
              </>
            );
          })()}
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          if (!isToolbarInteracting) setIsFocused(false);
          handleInput();
        }}
        className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        } ${editorClassName}`}
        style={{ minHeight: `${rows * 24}px`, whiteSpace: "pre-wrap" }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {showLinkDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) {
              setShowLinkDialog(false);
              savedSelectionRef.current = null;
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
            onKeyDown={(ev) => ev.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Insert link</h3>
            {linkText ? (
              <p className="mt-2 text-sm text-gray-600">
                Text: <span className="font-medium text-gray-900">&quot;{linkText}&quot;</span>
              </p>
            ) : null}
            <label className="mt-4 block">
              <span className="text-sm font-medium text-gray-700">URL</span>
              <input
                type="url"
                value={linkUrl}
                onChange={(ev) => setLinkUrl(ev.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="https://example.com"
                autoFocus
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && linkUrl.trim()) {
                    ev.preventDefault();
                    insertLink();
                  }
                  if (ev.key === "Escape") {
                    setShowLinkDialog(false);
                    savedSelectionRef.current = null;
                  }
                }}
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                onClick={() => {
                  setShowLinkDialog(false);
                  savedSelectionRef.current = null;
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!linkUrl.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={insertLink}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
