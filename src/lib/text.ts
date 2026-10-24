export function wordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

// Same rule as the publisher: the first "# " line is the title.
export function titleOf(markdown: string): string {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : "Untitled";
}

// Post body for display: drop the "# Title" line (shown separately) and the "## Sources" section (listed separately).
export function bodyOf(markdown: string): string {
    return markdown
        .replace(/^#\s+.+$/m, "")
        .replace(/\n## Sources[\s\S]*$/, "")
        .trim();
}

// Plain-text preview for the 2-line clamp in the post list.
export function previewOf(markdown: string): string {
    return bodyOf(markdown)
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_`>]/g, "")
        .replace(/^\s*[-+]\s+/gm, "")
        .replace(/\s+/g, " ")
        .trim();
}

// Number of links in the "## Sources" section the writer appends.
export function sourceCountOf(markdown: string): number {
    const section = markdown.split(/\n## Sources\n/)[1] ?? "";
    return (section.match(/\]\(/g) ?? []).length;
}

// "https://www.cityclimate.org/a/b" -> "cityclimate.org"
export function domainOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}

// m:ss since the run started (client clock).
export function clock(ms: number): string {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
