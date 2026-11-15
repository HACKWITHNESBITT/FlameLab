import { Link } from "react-router-dom";
import { stripTokens } from "../utils/citations";

function citeTarget(cite: string): string {
  const m = /^rec:([A-Za-z0-9_.-]+)#/.exec(cite);
  return m ? `/investigations/${m[1]}` : "#";
}

/** SI sentence with raw tokens stripped and citation chips linked to the record. */
export function SiText({ text, citations }: { text: string; citations: string[] }) {
  return (
    <span>
      {stripTokens(text)}
      {citations.map((c) => (
        <Link key={c} to={citeTarget(c)} className="cite" title={`Source field ${c}`}>
          {c}
        </Link>
      ))}
    </span>
  );
}
