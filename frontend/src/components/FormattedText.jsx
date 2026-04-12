export default function FormattedText({ text, className = '' }) {
  if (!text) return null;

  // Split by newlines first, then handle bold (**text**) and bullet points
  const lines = text.split('\n');

  return (
    <div className={`space-y-1 ${className}`}>
      {lines.map((line, lineIdx) => {
        if (!line.trim()) return <div key={lineIdx} className="h-2" />;

        // Check if it's a bullet list item
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ') || /^\d+\.\s/.test(line.trim());
        const lineContent = isBullet
          ? line.trim().replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '')
          : line;

        // Parse **bold** within line
        const parts = lineContent.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold text-[#191c1d]">{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex gap-2 items-start">
              <span className="text-[#003fb1] font-bold mt-0.5 flex-shrink-0">•</span>
              <span className="leading-relaxed">{rendered}</span>
            </div>
          );
        }
        return <p key={lineIdx} className="leading-relaxed">{rendered}</p>;
      })}
    </div>
  );
}
