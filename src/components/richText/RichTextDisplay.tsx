import { useMemo, useRef, useState, type ClipboardEvent, type MouseEvent } from "react";
import AutoLinkText from "./AutoLinkText";

type RichTextDisplayProps = {
  content: string;
  className?: string;
  inline?: boolean;
};

const MAP_MARKER_REGEX = /\[map:([^\]]+)\]/g;

function isHtml(content: string): boolean {
  if (!content) return false;
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function normalizeFormattingHtml(html: string): string {
  if (!html) return html;
  return html
    .replace(/<\/b>/gi, "</strong>")
    .replace(/<b>/gi, "<strong>")
    .replace(/<\/i>/gi, "</em>")
    .replace(/<i>/gi, "<em>");
}

function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function processHtmlContent(content: string): string {
  let html = normalizeFormattingHtml(content);
  html = html.replace(MAP_MARKER_REGEX, (_match, location: string) => {
    const encodedLocation = encodeURIComponent(location);
    const escapedLocation = String(location)
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<div data-map-marker="${String(location).replace(/"/g, "&quot;")}" style="margin:0.75rem 0;width:100%;max-width:100%;display:block;line-height:0;">
      <div style="background:#f8fafc;padding:0.25rem 0.5rem;font-size:0.7rem;color:#111827;border:1px solid #d1d5db;border-bottom:none;border-radius:0.5rem 0.5rem 0 0;display:flex;align-items:center;gap:0.25rem;line-height:1.2;">
        <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapedLocation}</span>
      </div>
      <iframe src="https://www.google.com/maps?q=${encodedLocation}&output=embed&zoom=15" width="100%" height="95" style="border:0;display:block;border-radius:0 0 0.5rem 0.5rem;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map: ${escapedLocation}"></iframe>
    </div>`;
  });
  html = html.replace(/<a\s+([^>]*)>/gi, (_match, attrs: string) => {
    let newAttrs = attrs;
    if (!attrs.includes("target=")) newAttrs += ' target="_blank"';
    if (!attrs.includes("rel=")) newAttrs += ' rel="noopener noreferrer"';
    if (!attrs.includes("class="))
      newAttrs += ' class="text-blue-600 hover:text-blue-800 underline font-medium"';
    return `<a ${newAttrs}>`;
  });
  return stripUnsafeHtml(html);
}

export default function RichTextDisplay({
  content,
  className = "",
  inline = false,
}: RichTextDisplayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [displayId] = useState(() => `rt-${Math.random().toString(36).slice(2, 11)}`);

  const clearMapSelectionHighlight = () => {
    containerRef.current?.querySelectorAll(".map-selected").forEach((n) => {
      n.classList.remove("map-selected");
    });
  };

  const handleMapMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target || !containerRef.current) return;
    const mapContainer = target.closest("[data-map-marker]") as HTMLElement | null;
    if (!mapContainer || !containerRef.current.contains(mapContainer)) {
      clearMapSelectionHighlight();
      return;
    }
    event.preventDefault();
    clearMapSelectionHighlight();
    mapContainer.classList.add("map-selected");
    const range = document.createRange();
    range.selectNode(mapContainer);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const handleCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    const temp = document.createElement("div");
    temp.appendChild(range.cloneContents());
    const mapContainers = temp.querySelectorAll("[data-map-marker]");
    if (mapContainers.length === 0) return;
    mapContainers.forEach((container) => {
      const marker = container.getAttribute("data-map-marker");
      if (marker) {
        container.parentNode?.replaceChild(document.createTextNode(`[map:${marker}]`), container);
      }
    });
    event.preventDefault();
    event.clipboardData.setData("text/plain", temp.textContent ?? "");
    event.clipboardData.setData("text/html", temp.innerHTML);
  };

  const processedHtml = useMemo(() => {
    if (!content || !isHtml(content)) return null;
    return processHtmlContent(content);
  }, [content]);

  if (!content) return null;

  const hasMapMarker = MAP_MARKER_REGEX.test(content);
  MAP_MARKER_REGEX.lastIndex = 0;

  if (!isHtml(content) && !hasMapMarker) {
    const Tag = inline ? "span" : "div";
    return (
      <Tag className={`text-slate-700 leading-relaxed ${className}`}>
        <AutoLinkText text={content} preserveWhitespace />
      </Tag>
    );
  }

  if (!isHtml(content) && hasMapMarker) {
    const wrapped = content.replace(/\n/g, "<br>");
    const html = processHtmlContent(wrapped);
    const Tag = inline ? "span" : "div";
    return (
      <Tag className={className}>
        <style>{`
          #${displayId} [data-map-marker].map-selected {
            outline: 2px solid #93c5fd;
            outline-offset: 2px;
            border-radius: 0.75rem;
          }
        `}</style>
        <div
          ref={containerRef}
          id={displayId}
          className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap"
          onMouseDown={handleMapMouseDown}
          onCopy={handleCopy}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Tag>
    );
  }

  const Tag = inline ? "span" : "div";
  return (
    <Tag className={className}>
      <style>{`
        #${displayId} a { color: #2563eb !important; text-decoration: underline !important; }
        #${displayId} a:hover { color: #1e40af !important; }
        #${displayId} [data-map-marker].map-selected {
          outline: 2px solid #93c5fd;
          outline-offset: 2px;
          border-radius: 0.75rem;
        }
      `}</style>
      <div
        ref={containerRef}
        id={displayId}
        className="prose prose-sm max-w-none text-slate-700 leading-relaxed [&_strong]:font-semibold"
        style={{ whiteSpace: "pre-wrap" }}
        onMouseDown={handleMapMouseDown}
        onCopy={handleCopy}
        dangerouslySetInnerHTML={{ __html: processedHtml ?? "" }}
      />
    </Tag>
  );
}
