import { Fragment } from "react";

const URL_SPLIT = /(https?:\/\/[^\s<>"']+)/gi;

type AutoLinkTextProps = {
  text: string;
  preserveWhitespace?: boolean;
};

/** Linkify bare URLs in plain text (used when body has no HTML). */
export default function AutoLinkText({ text, preserveWhitespace }: AutoLinkTextProps) {
  const parts = text.split(URL_SPLIT);
  return (
    <span className={preserveWhitespace ? "whitespace-pre-wrap" : undefined}>
      {parts.map((part, i) =>
        /^https?:\/\//i.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
          >
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  );
}
