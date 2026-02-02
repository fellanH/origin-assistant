#!/usr/bin/env bun
/**
 * AI Elements Documentation Scraper
 *
 * Scrapes component documentation from https://ai-sdk.dev/elements
 * and saves as local markdown files for offline reference.
 *
 * Usage:
 *   bun docs/ai-elements/scraper.ts
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://ai-sdk.dev";
const OUTPUT_DIR = __dirname;

// All component pages organized by category
// URLs are under /elements/... path
const PAGES: Record<string, Array<[string, string]>> = {
  // Top-level docs
  docs: [
    ["introduction", "/elements"],
    ["usage", "/elements/usage"],
    ["troubleshooting", "/elements/troubleshooting"],
  ],
  // Examples
  examples: [
    ["chatbot", "/elements/examples/chatbot"],
    ["v0-clone", "/elements/examples/v0"],
    ["workflow", "/elements/examples/workflow"],
  ],
  // Chatbot components
  chatbot: [
    ["attachments", "/elements/components/attachments"],
    ["chain-of-thought", "/elements/components/chain-of-thought"],
    ["checkpoint", "/elements/components/checkpoint"],
    ["confirmation", "/elements/components/confirmation"],
    ["context", "/elements/components/context"],
    ["conversation", "/elements/components/conversation"],
    ["inline-citation", "/elements/components/inline-citation"],
    ["message", "/elements/components/message"],
    ["model-selector", "/elements/components/model-selector"],
    ["plan", "/elements/components/plan"],
    ["prompt-input", "/elements/components/prompt-input"],
    ["queue", "/elements/components/queue"],
    ["reasoning", "/elements/components/reasoning"],
    ["shimmer", "/elements/components/shimmer"],
    ["sources", "/elements/components/sources"],
    ["suggestion", "/elements/components/suggestion"],
    ["task", "/elements/components/task"],
    ["tool", "/elements/components/tool"],
  ],
  // Code components
  code: [
    ["agent", "/elements/components/agent"],
    ["artifact", "/elements/components/artifact"],
    ["code-block", "/elements/components/code-block"],
    ["commit", "/elements/components/commit"],
    ["environment-variables", "/elements/components/environment-variables"],
    ["file-tree", "/elements/components/file-tree"],
    ["package-info", "/elements/components/package-info"],
    ["sandbox", "/elements/components/sandbox"],
    ["schema-display", "/elements/components/schema-display"],
    ["snippet", "/elements/components/snippet"],
    ["stack-trace", "/elements/components/stack-trace"],
    ["terminal", "/elements/components/terminal"],
    ["test-results", "/elements/components/test-results"],
    ["web-preview", "/elements/components/web-preview"],
  ],
  // Voice components
  voice: [
    ["audio-player", "/elements/components/audio-player"],
    ["mic-selector", "/elements/components/mic-selector"],
    ["persona", "/elements/components/persona"],
    ["speech-input", "/elements/components/speech-input"],
    ["transcription", "/elements/components/transcription"],
    ["voice-selector", "/elements/components/voice-selector"],
  ],
  // Workflow components
  workflow: [
    ["canvas", "/elements/components/canvas"],
    ["connection", "/elements/components/connection"],
    ["controls", "/elements/components/controls"],
    ["edge", "/elements/components/edge"],
    ["node", "/elements/components/node"],
    ["panel", "/elements/components/panel"],
    ["toolbar", "/elements/components/toolbar"],
  ],
  // Utility components
  utility: [
    ["image", "/elements/components/image"],
    ["loader", "/elements/components/loader"],
    ["open-in-chat", "/elements/components/open-in-chat"],
  ],
};

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) {
      console.log(`  HTTP ${response.status}`);
      return null;
    }
    return await response.text();
  } catch (e) {
    console.log(`  Error: ${e}`);
    return null;
  }
}

function extractMainContent(html: string): string {
  // Use a simple regex-based extraction since we don't have a DOM parser
  // Look for the main content area

  // Remove script and style tags
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove SVG elements (icons, etc)
  html = html.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "");

  // Remove button elements
  html = html.replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, "");

  // Try to find main content
  let content = "";

  // Look for <main> tag
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    content = mainMatch[1];
  } else {
    // Look for article
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      content = articleMatch[1];
    } else {
      // Fallback to body
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = bodyMatch[1];
      }
    }
  }

  // Remove nav, footer, aside, header
  content = content.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "");
  content = content.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "");
  content = content.replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "");
  content = content.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "");

  // Remove interactive preview panels (they contain lots of noise)
  content = content.replace(/<div[^>]*data-panel-group[^>]*>[\s\S]*?<\/div>/gi, "");

  // Clean up class attributes with Tailwind noise before conversion
  content = content.replace(/class="[^"]*"/gi, "");
  content = content.replace(/style="[^"]*"/gi, "");
  content = content.replace(/data-[a-z-]+="[^"]*"/gi, "");
  content = content.replace(/aria-[a-z-]+="[^"]*"/gi, "");
  content = content.replace(/role="[^"]*"/gi, "");
  content = content.replace(/tabindex="[^"]*"/gi, "");

  // Convert to markdown-ish format
  content = htmlToMarkdown(content);

  return content.trim();
}

function htmlToMarkdown(html: string): string {
  let md = html;

  // Decode HTML entities first
  md = md.replace(/&nbsp;/g, " ");
  md = md.replace(/&amp;/g, "&");
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&#x27;/g, "'");
  md = md.replace(/&#x2F;/g, "/");
  md = md.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));

  // Headers (clean inner content of any remaining tags)
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, content) => `\n# ${stripTags(content)}\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, content) => `\n## ${stripTags(content)}\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, content) => `\n### ${stripTags(content)}\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, content) => `\n#### ${stripTags(content)}\n`);
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, content) => `\n##### ${stripTags(content)}\n`);
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, content) => `\n###### ${stripTags(content)}\n`);

  // Code blocks - extract just the text content
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, content) => {
    // Try to detect language from class
    const langMatch = content.match(/language-(\w+)/i);
    const lang = langMatch ? langMatch[1] : "";
    // Strip all HTML tags from code content
    const code = stripTags(content).trim();
    return `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
  });

  // Inline code - strip inner tags
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, content) => `\`${stripTags(content)}\``);

  // Bold
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");

  // Italic
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");

  // Links - clean inner content
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    return `[${stripTags(text)}](${href})`;
  });

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)");

  // Lists
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => `- ${stripTags(content).trim()}\n`);
  md = md.replace(/<\/?[uo]l[^>]*>/gi, "\n");

  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");

  // Tables - basic support
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, content) => {
    return `\n${content}\n`;
  });
  md = md.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, content) => `| ${content} |\n`);
  md = md.replace(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi, (_, content) => `${stripTags(content)} | `);

  // Divs and spans - just keep content
  md = md.replace(/<div[^>]*>/gi, "");
  md = md.replace(/<\/div>/gi, "");
  md = md.replace(/<span[^>]*>/gi, "");
  md = md.replace(/<\/span>/gi, "");

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, "\n\n");
  md = md.replace(/[ \t]+$/gm, "");
  md = md.replace(/^[ \t]+$/gm, "");

  // Remove lines that are just CSS-like noise (Tailwind classes that leaked through)
  md = md.replace(/^[\[\]&>:a-z0-9_-]+$/gmi, "");
  md = md.replace(/^\[&[^\]]+\][^\n]*$/gm, "");

  // Fix code blocks that got mangled
  md = md.replace(/```(\w+)\n\n/g, "```$1\n");
  md = md.replace(/\n\n```/g, "\n```");

  // Clean up excessive newlines again
  md = md.replace(/\n{3,}/g, "\n\n");

  return md;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function createIndex(categories: Record<string, Array<[string, string]>>): string {
  const lines = [
    "# AI Elements Documentation",
    "",
    "> Local mirror of https://ai-sdk.dev/elements",
    "> ",
    `> Scraped: ${new Date().toISOString().split("T")[0]}`,
    "",
    "## Contents",
    "",
  ];

  for (const [category, pages] of Object.entries(categories)) {
    lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    lines.push("");
    for (const [name] of pages) {
      const filename = `${category}/${name}.md`;
      const displayName = name
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      lines.push(`- [${displayName}](${filename})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log("AI Elements Documentation Scraper");
  console.log("=".repeat(40));
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log();

  // Create output directories
  for (const category of Object.keys(PAGES)) {
    await mkdir(join(OUTPUT_DIR, category), { recursive: true });
  }

  // Track stats
  let successCount = 0;
  let errorCount = 0;

  // Scrape each page
  for (const [category, pages] of Object.entries(PAGES)) {
    console.log(`\n[${category.toUpperCase()}]`);

    for (const [name, path] of pages) {
      const url = new URL(path, BASE_URL).toString();
      const outputFile = join(OUTPUT_DIR, category, `${name}.md`);

      process.stdout.write(`  Fetching: ${name}... `);

      const html = await fetchPage(url);
      if (!html) {
        errorCount++;
        console.log("FAILED");
        continue;
      }

      const content = extractMainContent(html);
      if (!content || content.length < 50) {
        errorCount++;
        console.log("NO CONTENT");
        continue;
      }

      // Add metadata header
      const header = `---
source: ${url}
scraped: ${new Date().toISOString()}
category: ${category}
---

`;
      const fullContent = header + content;

      // Write to file
      await writeFile(outputFile, fullContent, "utf-8");
      successCount++;
      console.log(`OK (${content.length.toLocaleString()} chars)`);

      // Be nice to the server
      await sleep(300);
    }
  }

  // Create index file
  process.stdout.write("\nCreating index... ");
  const indexContent = createIndex(PAGES);
  await writeFile(join(OUTPUT_DIR, "README.md"), indexContent, "utf-8");
  console.log("OK");

  // Summary
  console.log();
  console.log("=".repeat(40));
  console.log(`Complete! ${successCount} pages scraped, ${errorCount} errors`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);
