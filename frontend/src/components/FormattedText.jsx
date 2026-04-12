import React from 'react';

const FormattedText = ({ text }) => {
  if (!text) return null;

  // Tách văn bản thành các đoạn và xử lý in đậm
  const parseLine = (line) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const lines = text.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <p key={index} className="min-h-[1em]">
          {parseLine(line)}
        </p>
      ))}
    </div>
  );
};

export default FormattedText;
