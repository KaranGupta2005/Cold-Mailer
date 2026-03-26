import { useState } from 'react';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    senderName: '',
    subject: '',
    message: '',
    emailList: '',
    logoUrl: '',
    noHeader: false,
    batchSize: 20,
    batchDelay: 300000,
    emailDelay: 3000
  });

  const [footer, setFooter] = useState({
    name: 'Bhavit Jain',
    title: 'Head of Corporate Partnerships | IEEE DTU Student Branch',
    batch: 'Class of 2027, Engineering Physics',
    university: 'Delhi Technological University (formerly DCE), Delhi',
    mobile: '+91-9773725773',
    email: 'jainbhavit2018@gmail.com',
    linkedin: ''
  });

  const [attachments, setAttachments] = useState([]);
  const [headerImage, setHeaderImage] = useState(null);
  const [headerPreview, setHeaderPreview] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [emailCount, setEmailCount] = useState(0);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'emailList') {
      setEmailCount(value.split(/[\n,]/).filter(e => e.trim()).length);
    }
  };

  const handleFooterChange = (e) => {
    setFooter(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    setAttachments(Array.from(e.target.files));
  };

  const handleHeaderImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setHeaderImage(file);
    setHeaderPreview(URL.createObjectURL(file));
  };

  const removeHeaderImage = () => {
    setHeaderImage(null);
    setHeaderPreview(null);
    setFormData(prev => ({ ...prev, logoUrl: '' }));
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const insertFormat = (type) => {
    const textarea = document.getElementById('message-area');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = formData.message.substring(start, end);
    let replacement = '';

    if (type === 'bold') replacement = `**${selected || 'bold text'}**`;
    else if (type === 'italic') replacement = `*${selected || 'italic text'}*`;
    else if (type === 'list') replacement = `\n- ${selected || 'List item 1'}\n- List item 2\n- List item 3\n`;
    else if (type === 'link') replacement = `[${selected || 'link text'}](https://example.com)`;

    const newMessage = formData.message.substring(0, start) + replacement + formData.message.substring(end);
    setFormData(prev => ({ ...prev, message: newMessage }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + replacement.length;
      textarea.selectionEnd = start + replacement.length;
    }, 0);
  };

  const uploadFiles = async () => {
    if (attachments.length === 0) return [];
    const fd = new FormData();
    attachments.forEach(file => fd.append('attachments', file));
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setUploadedFiles(data.files);
        return data.files.map(f => f.path);
      }
      return [];
    } catch (error) {
      console.error('Upload error:', error);
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.emailList.trim()) return setStatus({ type: 'error', message: 'Please enter at least one email address' });
    if (!formData.senderName.trim()) return setStatus({ type: 'error', message: 'Please enter sender name' });
    if (!formData.subject.trim()) return setStatus({ type: 'error', message: 'Please enter email subject' });
    if (!formData.message.trim()) return setStatus({ type: 'error', message: 'Please enter email message' });

    setLoading(true);
    setStatus({ type: 'info', message: 'Uploading attachments...' });

    try {
      let logoUrl = formData.logoUrl;
      if (headerImage) {
        const headerForm = new FormData();
        headerForm.append('headerImage', headerImage);
        const headerRes = await fetch('/api/upload-header', { method: 'POST', body: headerForm });
        const headerData = await headerRes.json();
        if (headerData.success) logoUrl = headerData.serverPath;
      }

      const attachmentPaths = await uploadFiles();
      setStatus({ type: 'info', message: 'Starting email campaign...' });

      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, logoUrl, footer, attachmentPaths })
      });

      const data = await response.json();

      if (data.success) {
        setStatus({
          type: 'success',
          message: `Campaign started successfully! Sending to ${data.totalEmails} recipients. Check server console for progress.`
        });
        setTimeout(() => {
          setFormData({ senderName: '', subject: '', message: '', emailList: '', logoUrl: '', noHeader: false, batchSize: 20, batchDelay: 300000, emailDelay: 3000 });
          setAttachments([]);
          setHeaderImage(null);
          setHeaderPreview(null);
          setEmailCount(0);
        }, 3000);
      } else {
        setStatus({ type: 'error', message: 'Error: ' + data.error });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Error: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header-content">
            <h1>Mass Mailer Pro</h1>
            <p className="tagline">Professional Email Campaign Manager</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="form">

          {/* Campaign Details */}
          <div className="section">
            <div className="section-header">
              <h2>Campaign Details</h2>
              <p>Configure your email campaign settings</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Sender Name <span className="required">*</span></label>
                <input type="text" name="senderName" value={formData.senderName} onChange={handleChange} placeholder="Your Name or Organization" required />
              </div>
              <div className="form-group">
                <label>Email Subject <span className="required">*</span></label>
                <input type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="Your email subject line" required />
              </div>
            </div>

            <div className="form-group">
              <label>Header Image <span style={{ color: '#718096', fontWeight: 400 }}>(optional)</span></label>
              {formData.noHeader ? (
                <div className="no-header-notice">No header — email will appear as a plain message</div>
              ) : headerPreview ? (
                <div className="header-preview">
                  <img src={headerPreview} alt="Header preview" />
                  <button type="button" className="remove-btn" onClick={removeHeaderImage}>Remove</button>
                </div>
              ) : (
                <>
                  <label htmlFor="header-upload" className="file-upload-label">
                    Upload Header Image
                    <input id="header-upload" type="file" onChange={handleHeaderImageChange} accept=".jpg,.jpeg,.png,.gif,.webp" style={{ display: 'none' }} />
                  </label>
                  <small>PNG, JPG, GIF — will appear full-width at the top of every email</small>
                </>
              )}
              <label className="toggle-label">
                <input
                  type="checkbox"
                  name="noHeader"
                  checked={formData.noHeader}
                  onChange={handleChange}
                />
                <span className="toggle-text">No header — send as plain email</span>
              </label>
            </div>

            <div className="form-group">
              <label>Message <span className="required">*</span></label>
              <div className="toolbar">
                <button type="button" className="toolbar-btn" title="Bold" onClick={() => insertFormat('bold')}><b>B</b></button>
                <button type="button" className="toolbar-btn" title="Italic" onClick={() => insertFormat('italic')}><i>I</i></button>
                <button type="button" className="toolbar-btn" title="Bullet List" onClick={() => insertFormat('list')}>&#8226; List</button>
                <button type="button" className="toolbar-btn" title="Link" onClick={() => insertFormat('link')}>Link</button>
                <span className="toolbar-hint">**bold** | *italic* | - bullet | [text](url) | pipes for tables</span>
              </div>
              <textarea
                id="message-area"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Write your email message here..."
                rows="12"
                required
              />
            </div>
          </div>

          {/* Recipients */}
          <div className="section">
            <div className="section-header">
              <h2>Recipients</h2>
              <p>Add email addresses (one per line or comma-separated)</p>
            </div>
            <div className="form-group">
              <label>
                Email List <span className="required">*</span>
                {emailCount > 0 && <span className="email-count">{emailCount} emails</span>}
              </label>
              <textarea name="emailList" value={formData.emailList} onChange={handleChange} placeholder="email1@example.com&#10;email2@example.com" rows="8" required />
            </div>
          </div>

          {/* Attachments */}
          <div className="section">
            <div className="section-header">
              <h2>Attachments</h2>
              <p>Upload files to send with your emails (optional)</p>
            </div>
            <div className="form-group">
              <label htmlFor="file-upload" className="file-upload-label">
                Choose Files
                <input id="file-upload" type="file" onChange={handleFileChange} multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" style={{ display: 'none' }} />
              </label>
              <small>Supported: PDF, DOC, DOCX, JPG, PNG, GIF (Max 25MB per file)</small>
              {attachments.length > 0 && (
                <div className="file-list">
                  {attachments.map((file, index) => (
                    <div key={index} className="file-item">
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">({(file.size / 1024).toFixed(2)} KB)</span>
                      </div>
                      <button type="button" className="remove-btn" onClick={() => removeAttachment(index)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Email Signature */}
          <div className="section">
            <div className="section-header">
              <h2>Email Signature</h2>
              <p>Appears at the bottom of every email with DTU logo</p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" value={footer.name} onChange={handleFooterChange} placeholder="Bhavit Jain" />
              </div>
              <div className="form-group">
                <label>Title / Role</label>
                <input type="text" name="title" value={footer.title} onChange={handleFooterChange} placeholder="Head of Corporate Partnerships | IEEE DTU" />
              </div>
              <div className="form-group">
                <label>Batch / Program</label>
                <input type="text" name="batch" value={footer.batch} onChange={handleFooterChange} placeholder="Class of 2027, Engineering Physics" />
              </div>
              <div className="form-group">
                <label>University</label>
                <input type="text" name="university" value={footer.university} onChange={handleFooterChange} placeholder="Delhi Technological University (formerly DCE), Delhi" />
              </div>
              <div className="form-group">
                <label>Mobile</label>
                <input type="text" name="mobile" value={footer.mobile} onChange={handleFooterChange} placeholder="+91-XXXXXXXXXX" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={footer.email} onChange={handleFooterChange} placeholder="you@gmail.com" />
              </div>
            </div>
            <div className="form-group">
              <label>LinkedIn URL <span style={{ color: '#718096', fontWeight: 400 }}>(optional)</span></label>
              <input type="url" name="linkedin" value={footer.linkedin} onChange={handleFooterChange} placeholder="https://linkedin.com/in/yourprofile" />
            </div>
          </div>

          {/* Sending Settings */}
          <div className="section">
            <div className="section-header">
              <h2>Sending Settings</h2>
              <p>Configure batch processing to avoid rate limits</p>
            </div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Batch Size</label>
                <input type="number" name="batchSize" value={formData.batchSize} onChange={handleChange} min="1" max="100" />
                <small>Emails per batch (recommended: 20)</small>
              </div>
              <div className="form-group">
                <label>Batch Delay — {(formData.batchDelay / 60000).toFixed(1)} min</label>
                <input type="number" name="batchDelay" value={formData.batchDelay} onChange={handleChange} min="0" step="1000" />
                <small>Wait between batches (ms) — randomized ±50%</small>
              </div>
              <div className="form-group">
                <label>Email Delay — {(formData.emailDelay / 1000).toFixed(1)} sec</label>
                <input type="number" name="emailDelay" value={formData.emailDelay} onChange={handleChange} min="0" step="100" />
                <small>Wait between emails (ms) — randomized ±50%</small>
              </div>
            </div>
          </div>

          {status.message && (
            <div className={`status status-${status.type}`}>{status.message}</div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (<><span className="spinner"></span>Processing...</>) : 'Send Campaign'}
          </button>
        </form>

        <footer className="footer">
          <p>Tip: Gmail has a daily limit of approximately 500 emails. Use batch delays to stay within limits.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
