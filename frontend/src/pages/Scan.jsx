import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { scansApi, categoriesApi, accountsApi } from '../api';
import { Modal, Badge, PageHeader, LoadingSpinner } from '../components/Common';
import { FaCloudUploadAlt, FaCamera, FaCheck, FaRedo, FaSpinner, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function ScanPage() {
  const [scans, setScans] = useState([]);
  const [currentScanId, setCurrentScanId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [tab, setTab] = useState('upload'); // 'upload' | 'history'
  const [polling, setPolling] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  useEffect(() => {
    categoriesApi.list().then(r => {
      const flat = [];
      const walk = (nodes) => nodes.forEach(n => { flat.push(n); if (n.children) walk(n.children); });
      walk(r.data || []);
      setCategories(flat);
    });
    accountsApi.list().then(r => setAccounts(r.data || []));
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await scansApi.list({ limit: 20 });
      setScans(res.data || []);
    } catch {}
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    setLoading(true);
    setStatus('uploading');
    try {
      const res = await scansApi.upload(acceptedFiles);
      toast.success(`${acceptedFiles.length} file(s) uploaded, processing...`);
      const scanId = res.data[0]?.id;
      setCurrentScanId(scanId);
      startPolling(scanId);
    } catch (err) {
      toast.error(err.message);
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'], 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  const startPolling = (scanId) => {
    setPolling(true);
    setStatus('processing');
    const interval = setInterval(async () => {
      try {
        const res = await scansApi.status(scanId);
        if (res.data.status === 'completed') {
          clearInterval(interval);
          setPolling(false);
          setStatus('completed');
          const results = await scansApi.results(scanId);
          setDocuments(results.data?.documents || []);
          setLoading(false);
          toast.success('Scan complete!');
        } else if (res.data.status === 'failed') {
          clearInterval(interval);
          setPolling(false);
          setStatus('failed');
          setLoading(false);
          toast.error('Scan failed. Please retry.');
        }
      } catch {
        clearInterval(interval);
        setPolling(false);
        setLoading(false);
      }
    }, 2000);
  };

  const handleConfirm = async () => {
    if (!currentScanId) return;

    const confirmDocs = documents.map((doc, i) => ({
      documentIndex: i,
      categoryId: doc._categoryId || '',
      accountId: doc._accountId || '',
      amount: parseFloat(doc._amount || doc.total_amount || 0),
      description: doc._description || doc.vendor_name || 'Scanned transaction',
      merchantName: doc.vendor_name || '',
      transactionDate: doc._date || doc.document_date || new Date().toISOString().split('T')[0],
    }));

    try {
      await scansApi.confirm(currentScanId, confirmDocs);
      toast.success('Transactions created!');
      setDocuments([]);
      setCurrentScanId(null);
      setStatus(null);
      loadHistory();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRetry = async () => {
    if (!currentScanId) return;
    try {
      await scansApi.retry(currentScanId);
      startPolling(currentScanId);
      setStatus('processing');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confidenceColor = (score) => {
    if (!score) return 'gray';
    if (score >= 0.85) return 'green';
    if (score >= 0.65) return 'yellow';
    return 'red';
  };

  const updateDoc = (index, field, value) => {
    setDocuments(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  return (
    <div>
      <PageHeader title="Scan Invoices" />

      <div className="flex gap-2 mb-6">
        <button className={`btn-secondary ${tab === 'upload' ? 'bg-accent text-white' : ''}`} onClick={() => setTab('upload')}>Upload</button>
        <button className={`btn-secondary ${tab === 'history' ? 'bg-accent text-white' : ''}`} onClick={() => { setTab('history'); loadHistory(); }}>History</button>
      </div>

      {tab === 'upload' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Zone */}
          <div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-accent bg-accent/10' : 'border-navy-600 hover:border-accent/50'
              }`}
            >
              <input {...getInputProps()} />
              <FaCloudUploadAlt className="text-5xl text-gray-500 mx-auto mb-4" />
              <p className="text-lg text-gray-300 mb-2">
                {isDragActive ? 'Drop files here...' : 'Drag & drop invoices, receipts, or bills'}
              </p>
              <p className="text-sm text-gray-500 mb-4">Supports JPG, PNG, WebP, HEIC, PDF — up to 20 files at once</p>
              <div className="flex gap-3 justify-center">
                <button type="button" className="btn-primary flex items-center gap-2">
                  <FaCloudUploadAlt /> Upload Files
                </button>
                <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                  <FaCamera /> Take Photo
                  <input type="file" capture="environment" accept="image/*" className="hidden" onChange={(e) => {
                    if (e.target.files?.length) onDrop(Array.from(e.target.files));
                  }} />
                </label>
              </div>
            </div>

            {/* Status */}
            {loading && (
              <div className="card mt-4 text-center">
                <FaSpinner className="animate-spin text-3xl text-accent mx-auto mb-2" />
                <p className="text-gray-300">
                  {status === 'uploading' ? 'Uploading files...' : 'AI is analyzing your documents...'}
                </p>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div>
            {documents.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Extracted Documents ({documents.length})</h3>
                  <div className="flex gap-2">
                    <button className="btn-secondary flex items-center gap-2" onClick={handleRetry}>
                      <FaRedo /> Retry
                    </button>
                    <button className="btn-primary flex items-center gap-2" onClick={handleConfirm}>
                      <FaCheck /> Confirm All
                    </button>
                  </div>
                </div>

                {documents.map((doc, i) => (
                  <div key={doc.id || i} className="card">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="font-medium text-gray-200">Document {i + 1}</span>
                        <Badge color={confidenceColor(doc.confidence_score)}>
                          Confidence: {((doc.confidence_score || 0) * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <Badge color="blue">{doc.document_type || 'unknown'}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <label className="label">Vendor</label>
                        <input className="input" value={doc.vendor_name || ''} onChange={(e) => updateDoc(i, 'vendor_name', e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Total Amount</label>
                        <input type="number" step="0.01" className="input" value={doc._amount || doc.total_amount || ''} onChange={(e) => updateDoc(i, '_amount', e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Date</label>
                        <input type="date" className="input" value={doc._date || doc.document_date || ''} onChange={(e) => updateDoc(i, '_date', e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Category</label>
                        <select className="input" value={doc._categoryId || ''} onChange={(e) => updateDoc(i, '_categoryId', e.target.value)}>
                          <option value="">Select</option>
                          {categories.filter(c => c.type === 'expense').map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Account</label>
                        <select className="input" value={doc._accountId || ''} onChange={(e) => updateDoc(i, '_accountId', e.target.value)}>
                          <option value="">Select</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Invoice #</label>
                        <input className="input" value={doc.invoice_number || ''} readOnly />
                      </div>
                    </div>

                    {doc.line_items && doc.line_items.length > 0 && (
                      <div className="mt-3">
                        <label className="label">Line Items</label>
                        <div className="text-xs space-y-1">
                          {(typeof doc.line_items === 'string' ? JSON.parse(doc.line_items) : doc.line_items).map((item, j) => (
                            <div key={j} className="flex justify-between text-gray-400">
                              <span>{item.description}</span>
                              <span>${item.total?.toFixed(2) || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : !loading ? (
              <div className="card text-center py-12">
                <p className="text-gray-500">Upload an invoice to see extracted data here</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="card">
          {scans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No scan history yet</p>
          ) : (
            <div className="space-y-3">
              {scans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between p-3 bg-navy-900 rounded-lg">
                  <div>
                    <span className="text-gray-200">{scan.filename}</span>
                    <span className="text-xs text-gray-500 ml-3">{new Date(scan.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={scan.status === 'completed' ? 'green' : scan.status === 'failed' ? 'red' : 'yellow'}>
                      {scan.status}
                    </Badge>
                    {scan.document_count > 0 && <span className="text-sm text-gray-400">{scan.document_count} doc(s)</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
