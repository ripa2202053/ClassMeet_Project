import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

const PDFViewer = ({ socket, roomId, user, onClose }) => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedPdfUrl, setSharedPdfUrl] = useState(null);
  const [sharedPage, setSharedPage] = useState(1);
  const [sharedBy, setSharedBy] = useState('');
  const [scale, setScale] = useState(1.0);
  const fileInputRef = useRef();

  React.useEffect(() => {
    if (socket) {
      socket.on('pdf-shared', ({ pdfData, page, sharedBy: by }) => {
        setSharedPdfUrl(pdfData);
        setSharedPage(page);
        setSharedBy(by);
      });

      socket.on('pdf-page-changed', ({ page }) => {
        setSharedPage(page);
        setCurrentPage(page);
      });

      socket.on('pdf-stopped', () => {
        setSharedPdfUrl(null);
        setSharedBy('');
        setSharedPage(1);
      });
    }

    return () => {
      if (socket) {
        socket.off('pdf-shared');
        socket.off('pdf-page-changed');
        socket.off('pdf-stopped');
      }
    };
  }, [socket]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      // dataURL হিসেবে রাখো — react-pdf সরাসরি support করে
      setPdfUrl(ev.target.result);
      setPdfFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleShare = () => {
    if (!pdfUrl || !socket) return;
    setIsSharing(true);
    setCurrentPage(1);

    socket.emit('pdf-share', {
      roomId,
      pdfData: pdfUrl,
      page: 1,
      sharedBy: user?.name,
    });
  };

  const handleStopShare = () => {
    setIsSharing(false);
    setPdfFile(null);
    setPdfUrl(null);
    setCurrentPage(1);
    setNumPages(null);

    if (socket) socket.emit('pdf-stop', { roomId });
  };

  const changePage = (newPage) => {
    if (newPage < 1 || newPage > numPages) return;
    setCurrentPage(newPage);
    if (isSharing && socket) {
      socket.emit('pdf-page-change', { roomId, page: newPage });
    }
  };

  const activePdfUrl = isSharing ? pdfUrl : sharedPdfUrl;
  const activePage   = isSharing ? currentPage : sharedPage;
  const canNavigate  = isSharing;

  /* ── Upload screen ────────────────────────────────────────────── */
  if (!activePdfUrl && !pdfUrl) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>📄 PDF Viewer</h3>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.uploadArea} onClick={() => fileInputRef.current.click()}>
          <div style={styles.uploadIcon}>📄</div>
          <p style={styles.uploadText}>Click to select a PDF</p>
          <p style={styles.uploadSub}>Share PDF with everyone in class</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {sharedPdfUrl && (
          <div style={styles.sharedBanner}>
            <span>📄 {sharedBy} is sharing a PDF</span>
          </div>
        )}
      </div>
    );
  }

  /* ── Viewer screen ────────────────────────────────────────────── */
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          📄 {isSharing ? `Sharing: ${pdfFile?.name}` : `${sharedBy} is sharing`}
        </h3>
        <div style={styles.headerRight}>
          {!isSharing && pdfUrl && (
            <button style={styles.shareBtn} onClick={handleShare}>
              🚀 Share with Class
            </button>
          )}
          {isSharing && (
            <button style={styles.stopBtn} onClick={handleStopShare}>
              ⏹️ Stop Sharing
            </button>
          )}
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>

      {isSharing && (
        <div style={styles.shareBanner}>
          <div style={styles.shareDot} />
          <span>You are sharing this PDF with everyone</span>
        </div>
      )}

      {!isSharing && sharedPdfUrl && (
        <div style={styles.viewBanner}>📄 Viewing {sharedBy}'s PDF</div>
      )}

      <div style={styles.controls}>
        <button
          style={{ ...styles.pageBtn, opacity: activePage <= 1 ? 0.4 : 1 }}
          onClick={() => canNavigate && changePage(activePage - 1)}
          disabled={activePage <= 1}
        >◀</button>

        <span style={styles.pageInfo}>
          Page {activePage} / {numPages || '?'}
        </span>

        <button
          style={{ ...styles.pageBtn, opacity: activePage >= numPages ? 0.4 : 1 }}
          onClick={() => canNavigate && changePage(activePage + 1)}
          disabled={activePage >= numPages}
        >▶</button>

        <button style={styles.zoomBtn} onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>➖</button>
        <span style={styles.zoomText}>{Math.round(scale * 100)}%</span>
        <button style={styles.zoomBtn} onClick={() => setScale(s => Math.min(2.5, s + 0.2))}>➕</button>
      </div>

      <div style={styles.pdfContainer}>
        <Document
          file={activePdfUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<div style={styles.loading}>Loading PDF…</div>}
          error={<div style={styles.error}>Failed to load PDF.<br/>Please try another file.</div>}
        >
          <Page
            pageNumber={activePage}
            scale={scale}
            loading={<div style={styles.loading}>Loading page…</div>}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      {!isSharing && pdfUrl && (
        <div style={styles.ownPdfBar}>
          <span style={styles.ownPdfText}>Your PDF is ready</span>
          <button style={styles.shareBtn} onClick={handleShare}>
            🚀 Share with Class
          </button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container:    { backgroundColor: '#0d1b2a', border: '1px solid #00d4ff22', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#091420', borderBottom: '1px solid #00d4ff22' },
  title:        { color: '#00d4ff', fontSize: '13px', fontWeight: '500', margin: 0 },
  headerRight:  { display: 'flex', alignItems: 'center', gap: '8px' },
  closeBtn:     { padding: '3px 8px', backgroundColor: '#ff444422', color: '#ff4444', border: '1px solid #ff444444', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  shareBtn:     { padding: '5px 12px', backgroundColor: '#00d4ff', color: '#0a0e1a', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' },
  stopBtn:      { padding: '5px 12px', backgroundColor: '#ff444422', color: '#ff4444', border: '1px solid #ff444444', borderRadius: '5px', cursor: 'pointer', fontSize: '11px' },
  shareBanner:  { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(0,212,255,0.1)', borderBottom: '1px solid #00d4ff22', padding: '6px 16px', color: '#00d4ff', fontSize: '11px' },
  shareDot:     { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00d4ff' },
  viewBanner:   { backgroundColor: 'rgba(0,255,136,0.1)', borderBottom: '1px solid #00ff8822', padding: '6px 16px', color: '#00ff88', fontSize: '11px' },
  controls:     { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#091420', borderBottom: '1px solid #00d4ff22', flexWrap: 'wrap' },
  pageBtn:      { padding: '4px 10px', backgroundColor: '#1a3a5c', color: '#00d4ff', border: '1px solid #00d4ff44', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  pageInfo:     { color: '#7ecfff', fontSize: '12px', flex: 1, textAlign: 'center' },
  zoomBtn:      { padding: '4px 8px', backgroundColor: '#1a3a5c', color: '#00d4ff', border: '1px solid #00d4ff44', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  zoomText:     { color: '#7ecfff', fontSize: '11px', minWidth: '35px', textAlign: 'center' },
  pdfContainer: { flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '10px', display: 'flex', justifyContent: 'center', backgroundColor: '#060d16' },
  uploadArea:   { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', cursor: 'pointer', border: '2px dashed #1a3a5c', margin: '16px', borderRadius: '10px', gap: '8px' },
  uploadIcon:   { fontSize: '40px' },
  uploadText:   { color: '#00d4ff', fontSize: '14px', fontWeight: '500' },
  uploadSub:    { color: '#7ecfff', fontSize: '12px' },
  sharedBanner: { backgroundColor: 'rgba(0,255,136,0.1)', border: '1px solid #00ff8822', margin: '10px 16px', padding: '8px 12px', borderRadius: '6px', color: '#00ff88', fontSize: '12px', textAlign: 'center' },
  ownPdfBar:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', backgroundColor: '#091420', borderTop: '1px solid #00d4ff22' },
  ownPdfText:   { color: '#7ecfff', fontSize: '11px' },
  loading:      { color: '#7ecfff', padding: '20px', textAlign: 'center' },
  error:        { color: '#ff4444', padding: '20px', textAlign: 'center', lineHeight: '1.6' },
};

export default PDFViewer;