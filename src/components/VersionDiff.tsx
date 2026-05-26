import { diffLines } from "diff";

interface Props {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
}

export default function VersionDiff({ oldContent, newContent, oldLabel, newLabel }: Props) {
  const parts = diffLines(oldContent, newContent);

  return (
    <div className="text-xs font-mono rounded-lg overflow-hidden border border-gray-100">
      {(oldLabel || newLabel) && (
        <div className="flex text-[10px] text-gray-400 bg-gray-50 border-b border-gray-100">
          <span className="flex-1 px-3 py-1.5 border-r border-gray-100">{oldLabel ?? "before"}</span>
          <span className="flex-1 px-3 py-1.5">{newLabel ?? "after"}</span>
        </div>
      )}
      <div className="max-h-72 overflow-y-auto bg-gray-950">
        {parts.map((part, i) => {
          const lines = part.value.replace(/\n$/, "").split("\n");
          const bg = part.added ? "bg-green-950" : part.removed ? "bg-red-950" : "";
          const text = part.added ? "text-green-300" : part.removed ? "text-red-300" : "text-gray-400";
          const prefix = part.added ? "+" : part.removed ? "-" : " ";

          return lines.map((line, j) => (
            <div key={`${i}-${j}`} className={`flex gap-2 px-3 py-0.5 leading-5 ${bg}`}>
              <span className={`w-3 flex-shrink-0 select-none ${text}`}>{prefix}</span>
              <span className={text}>{line}</span>
            </div>
          ));
        })}
      </div>
    </div>
  );
}
