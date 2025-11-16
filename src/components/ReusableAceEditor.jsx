import React, { useMemo, forwardRef } from 'react';

// 1. Impor semua dependensi Ace Editor di SATU TEMPAT
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-sql'; // <-- DITAMBAHKAN
import 'ace-builds/src-noconflict/theme-textmate';      // Tema terang (untuk JSON Formatter)
import 'ace-builds/src-noconflict/theme-tomorrow_night'; // Tema gelap (untuk API Requestor)
import 'ace-builds/src-noconflict/ext-language_tools';

// 2. Logika 'wrapper' untuk mengatasi masalah import .default
const AceComp = (AceEditor && AceEditor.default) ? AceEditor.default : AceEditor;

const ReusableAceEditor = forwardRef(function ReusableAceEditor({ 
  value, 
  onChange, 
  mode, 
  theme, 
  height = '300px', 
  width = '100%', 
  fontSize = 15,
  ...rest
}, ref) { // <--- Terima ref

  return (
    <AceComp
      ref={ref} // <--- Teruskan ref ke AceEditor
      mode={mode}
      theme={theme}
      onChange={onChange}
      value={value}
      width={width}
      height={height}
      fontSize={fontSize}
      showPrintMargin={false}
      showGutter={true}
      highlightActiveLine={true}
      name={rest.name || 'reusable-ace-editor'}
      editorProps={{ $blockScrolling: true }}
      setOptions={{
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        showLineNumbers: true,
        tabSize: 2,
        useWorker: true 
      }}
      style={{ 
        lineHeight: 1.5, 
        borderRadius: '6px', 
        border: '1px solid var(--card-border)' 
      }}
      {...rest}
    />
  );
});

export default ReusableAceEditor;