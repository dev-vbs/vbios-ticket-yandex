import React, { useState } from 'react';

interface FieldHelpProps {
  text: string;
}

function FieldHelp({ text }: FieldHelpProps) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-xs hover:bg-blue-200 hover:text-blue-700"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(s => !s)}
        tabIndex={-1}
      >
        ?
      </button>
      {show && (
        <div className="absolute left-5 top-0 z-50 bg-white border rounded shadow px-2 py-1 text-xs w-48">
          {text}
        </div>
      )}
    </span>
  );
}

export default FieldHelp;
