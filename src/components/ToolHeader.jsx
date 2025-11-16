import React from 'react';

function ToolHeader({ title, description }) {
  return (
    <div className="tool-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export default ToolHeader;