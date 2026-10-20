import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Plus,
  Server,
  CloudUpload,
  Trash2,
  RefreshCw,
  HardDrive,
  X,
  AlertCircle,
  Tag,
  CheckCircle2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [products, setProducts] = useState([]);
  const [serverInfo, setServerInfo] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  // 1. Fetch Server Info (EC2 stats)
  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (!res.ok) throw new Error('Offline');
      const data = await res.json();
      setServerInfo(data);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
      setServerInfo(null);
    }
  };

  // 2. Fetch Products
  const fetchProducts = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchProducts();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  // 3. Create Product with S3 Image Upload
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!name || !price) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price);
      formData.append('category', category);
      formData.append('description', description);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');

      // Success
      setToastMsg('Product added! Image stored in S3.');
      setTimeout(() => setToastMsg(''), 4000);
      setShowAddModal(false);
      resetForm();
      fetchProducts();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Delete Product
  const handleDeleteProduct = async (id, prodName) => {
    if (!window.confirm(`Delete "${prodName}" and its image from S3?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      setProducts(prev => prev.filter(p => p.id !== id));
      setToastMsg(`Product removed.`);
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setCategory('Electronics');
    setDescription('');
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="brand-title">CloudMart Store</h1>
            <p className="brand-subtitle">EC2 Node.js Backend • AWS S3 Product Media Storage</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </header>

      {/* EC2 & S3 Live Deployment Metrics Banner */}
      <div className="ec2-banner">
        <div className="ec2-metrics">
          <div className="metric-pill">
            <Server size={16} />
            <span>EC2 Host: <strong>{serverInfo?.server?.hostname || 'Connecting...'}</strong></span>
          </div>
          <div className="metric-pill">
            <HardDrive size={16} />
            <span>S3 Bucket: <strong>{serverInfo?.bucket || 'Checking...'}</strong></span>
          </div>
          <div className="metric-pill">
            <span>OS: <strong>{serverInfo?.server ? `${serverInfo.server.platform} (${serverInfo.server.arch})` : '—'}</strong></span>
          </div>
        </div>

        <div className={`status-pill ${isOnline ? '' : 'offline'}`}>
          <span className="status-dot"></span>
          <span>{isOnline ? 'EC2 Server Active' : 'Backend Disconnected'}</span>
        </div>
      </div>

      {/* Success Toast */}
      {toastMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--success)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--danger)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Products Section */}
      <div className="section-header">
        <h2 className="section-title">
          Store Products ({products.length})
        </h2>
        <button className="btn btn-secondary" onClick={fetchProducts} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-dim)' }}>
          <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>No products in the catalog yet.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowAddModal(true)}>
            Add First Product
          </button>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((prod) => (
            <div key={prod.id} className="product-card">
              <div className="product-image-container">
                <img
                  src={prod.imageUrl}
                  alt={prod.name}
                  className="product-image"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80';
                  }}
                />
                {prod.imageKey && (
                  <span className="s3-badge">
                    <CloudUpload size={12} />
                    S3 Stored
                  </span>
                )}
              </div>

              <div className="product-body">
                <span className="product-category">{prod.category}</span>
                <h3 className="product-name">{prod.name}</h3>
                <p className="product-desc">{prod.description || 'No description provided.'}</p>

                <div className="product-footer">
                  <span className="product-price">${parseFloat(prod.price).toFixed(2)}</span>
                  <button
                    className="btn btn-danger btn-icon"
                    onClick={() => handleDeleteProduct(prod.id, prod.name)}
                    title="Delete product"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add New Product */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Add New Product</h3>
              <button
                className="btn btn-secondary btn-icon"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Ergonomic Office Chair"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Price ($ USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="form-input"
                    placeholder="49.99"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Office">Office</option>
                    <option value="Clothing">Clothing</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows="2"
                  className="form-textarea"
                  placeholder="Short description of the item..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product Image (Uploaded straight to S3)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                <div
                  className="image-upload-box"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {filePreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                      <img
                        src={filePreview}
                        alt="Preview"
                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {selectedFile?.name} (Click to change)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <CloudUpload size={24} color="var(--primary)" style={{ marginBottom: '0.4rem' }} />
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Click to select an image for this product
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Uploading to S3...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
