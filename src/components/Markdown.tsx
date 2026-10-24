import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders LLM/user markdown. react-markdown does not render raw HTML and drops unsafe link protocols by default.
export function Markdown({ children }: { children: string }) {
    return (
        <div className="prose-draft">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a> }}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
}
