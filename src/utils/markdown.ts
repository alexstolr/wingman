export interface ParsedMarkdown {
  /** Parsed key-value pairs from the frontmatter block. */
  fields: Record<string, string>;
  /** The markdown body with frontmatter removed. */
  body: string;
}

/**
 * Parse YAML (---) or TOML (+++) frontmatter from a markdown string.
 * Handles simple key-value pairs and multi-line folded/literal scalars.
 */
export function parseFrontmatter(content: string): ParsedMarkdown {
  const trimmed = content.trimStart();
  const noFrontmatter: ParsedMarkdown = { fields: {}, body: content };

  if (!trimmed.startsWith("---") && !trimmed.startsWith("+++")) return noFrontmatter;
  const delimiter = trimmed.slice(0, 3);
  const after = trimmed.slice(3);
  if (after[0] !== "\n" && after[0] !== "\r") return noFrontmatter;

  const end = after.indexOf(`\n${delimiter}`);
  if (end === -1) return noFrontmatter;

  const yamlBlock = after.slice(0, end).trim();
  const body = after.slice(end + 4).trimStart();

  const fields: Record<string, string> = {};
  const lines = yamlBlock.split("\n");

  let currentKey: string | null = null;
  let isMultiLine = false;
  let multiLines: string[] = [];

  function commit() {
    if (currentKey && multiLines.length > 0) {
      fields[currentKey] = multiLines.join(" ").trim();
    }
    currentKey = null;
    isMultiLine = false;
    multiLines = [];
  }

  for (const line of lines) {
    if (isMultiLine && line.match(/^\s+\S/)) {
      multiLines.push(line.trim());
      continue;
    }
    if (isMultiLine) commit();

    if (line.match(/^\s*-\s/) || line.startsWith("  ")) continue;

    const colonIdx = line.indexOf(": ");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 2).trim();

    if (value === "" || value === ">-" || value === ">+" || value === ">" || value === "|" || value === "|-") {
      currentKey = key;
      isMultiLine = true;
      multiLines = [];
    } else {
      fields[key] = value;
    }
  }

  if (isMultiLine) commit();

  return { fields, body };
}

/** Convenience wrapper — returns the body with frontmatter stripped. */
export function stripFrontmatter(content: string): string {
  return parseFrontmatter(content).body;
}
