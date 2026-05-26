import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseFrontmatter } from "../utils/markdown";

interface Props {
  content: string;
}

/**
 * Renders markdown with frontmatter shown as a styled metadata block above
 * the body, rather than as raw text inside the document.
 */
export default function MarkdownPreview({ content }: Props) {
  const { fields, body } = parseFrontmatter(content);
  const hasFrontmatter = Object.keys(fields).length > 0;

  return (
    <div>
      {hasFrontmatter && (
        <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Frontmatter
          </p>
          <dl className="grid gap-y-1.5" style={{ gridTemplateColumns: "auto 1fr" }}>
            {Object.entries(fields).map(([key, value]) => (
              <>
                <dt key={`${key}-k`} className="pr-4 text-xs font-medium text-gray-500 capitalize leading-5">
                  {key}
                </dt>
                <dd key={`${key}-v`} className="text-xs text-gray-800 leading-5">
                  {value}
                </dd>
              </>
            ))}
          </dl>
        </div>
      )}

      <div className="prose prose-sm prose-gray max-w-none
        prose-headings:font-semibold prose-headings:text-gray-900
        prose-p:text-gray-700 prose-p:leading-relaxed
        prose-li:text-gray-700
        prose-code:bg-gray-100 prose-code:text-gray-800 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-gray-950 prose-pre:text-gray-100
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-gray-200 prose-blockquote:text-gray-500
        prose-strong:text-gray-900
        prose-hr:border-gray-200">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {body}
        </ReactMarkdown>
      </div>
    </div>
  );
}
