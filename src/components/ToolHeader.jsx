import React from 'react';

/**
 * Komponen header yang dapat digunakan ulang untuk setiap tool.
 * Ia menerima 'title' dan 'description' sebagai props.
 */
function ToolHeader({ title, description }) {
  return (
    <div className="tool-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export default ToolHeader;