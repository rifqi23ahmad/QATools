import React from 'react';
import compareStyles from '../tools/CompareView.module.css';

// Helper kecil untuk escape HTML, dipakai di ringkasan
const escapeHtml = (text) => text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

function CompareResultView({ 
  outputLeft, 
  outputRight, 
  summary, 
  titleLeft, 
  titleRight, 
  onSummaryClick 
}) {
  return (
    <div id="compare-results-section" style={{ marginTop: '2rem' }}>
      <div className={compareStyles.diffLayout}>
        <div className={compareStyles.diffView}>
          
          {/* Panel Kiri */}
          <div className={compareStyles.diffPane}>
            <div className={compareStyles.diffPaneHeader}>{titleLeft}</div>
            <pre 
              className={compareStyles.diffOutput}
              dangerouslySetInnerHTML={{ __html: outputLeft }}
            />
          </div>

          {/* Panel Kanan */}
          <div className={compareStyles.diffPane}>
            <div className={compareStyles.diffPaneHeader}>{titleRight}</div>
            <pre 
              className={compareStyles.diffOutput}
              dangerouslySetInnerHTML={{ __html: outputRight }}
            />
          </div>
        </div>

        {/* Sidebar Ringkasan */}
        <div className={compareStyles.diffSummarySidebar}>
          <h3 id="summary-header">Ditemukan {summary.length} perbedaan</h3>
          <div id="summary-list" className={compareStyles.summaryList}>
            {summary.map((c, index) => {
              const cleanText = escapeHtml(c.text.trim().substring(0, 50));
              const lineDisplay = c.type === 'added' ? c.lineRight : c.lineLeft;
              
              const itemClass = `${compareStyles.summaryListItem} ${compareStyles.clickableSummary} ${compareStyles['item-' + c.type] || ''}`;

              return (
                <div 
                  key={index}
                  className={itemClass}
                  onClick={() => onSummaryClick(c.lineLeft, c.lineRight)} // Panggil prop
                >
                  <strong>{c.type.charAt(0).toUpperCase() + c.type.slice(1)}</strong> pada baris {lineDisplay}
                  <code>...{cleanText}...</code>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompareResultView;