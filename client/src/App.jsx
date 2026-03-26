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
    sendingAccount: 'account1',
    batchSize: 20,
    batchDelay: 180000,
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
      if (data.success) { setUploadedFiles(data.files); return data.files.map(f => f.path); }
      return [];
    } catch { return []; }
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
      setStatus({ type: 'info', message: 'Starting campaign...' });

      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, logoUrl, footer, attachmentPaths })
      });

      const data = await response.json();

      if (data.success) {
        setStatus({ type: 'success', message: `Campaign started — sending to ${data.totalEmails} recipients.` });
        setTimeout(() => {
          setFormData({ senderName: '', subject: '', message: '', emailList: '', logoUrl: '', noHeader: false, sendingAccount: 'account1', batchSize: 20, batchDelay: 180000, emailDelay: 3000 });
          setAttachments([]);
          setHeaderImage(null);
          setHeaderPreview(null);
          setEmailCount(0);
          setStatus({ type: '', message: '' });
        }, 4000);
      } else {
        setStatus({ type: 'error', message: data.error });
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">

        {/* Header */}
        <header className="header">
          <div className="header-content">
            <h1>Mass Mailer</h1>
            <p className="tagline">IEEE DTU — Email Campaign Manager</p>
          </div>
          <div className="header-badge">ieeedtucs123@gmail.com</div>
        </header>

        <form onSubmit={handleSubmit} className="form">

          {/* Campaign */}
          <div className="section">
            <div className="section-header"><h2>Campaign</h2></div>

            <div className="form-grid">
              <div className="form-group">
                <label>Sender Name <span className="required">*</span></label>
                <input type="text" name="senderName" value={formData.senderName} onChange={handleChange} placeholder="IEEE DTU" required />
              </div>
              <div className="form-group">
                <label>Subject <span className="required">*</span></label>
                <input type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="Email subject line" required />
              </div>
            </div>

            {/* Sending Account */}
            <div className="form-group">
              <label>Sending Account <span className="required">*</span></label>
              <div className="account-selector">
                <label className={`account-option ${formData.sendingAccount === 'account1' ? 'selected' : ''}`}>
                  <input type="radio" name="sendingAccount" value="account1" checked={formData.sendingAccount === 'account1'} onChange={handleChange} />
                  <div className="account-info">
                    <span className="account-email">ieeedtucs123@gmail.com</span>
                    <span className="account-label">Primary</span>
                  </div>
                </label>
                <label className={`account-option ${formData.sendingAccount === 'account2' ? 'selected' : ''}`}>
                  <input type="radio" name="sendingAccount" value="account2" checked={formData.sendingAccount === 'account2'} onChange={handleChange} />
                  <div className="account-info">
                    <span className="account-email">ieee.dce.corporate@gmail.com</span>
                    <span className="account-label">Secondary</span>
                  </div>
                </label>
                <label className={`account-option ${formData.sendingAccount === 'both' ? 'selected' : ''}`}>
                  <input type="radio" name="sendingAccount" value="both" checked={formData.sendingAccount === 'both'} onChange={handleChange} />
                  <div className="account-info">
                    <span className="account-email">Both accounts</span>
                    <span className="account-label">Rotate every 40 emails</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Header Image */}
            <div className="form-group">
              <label>Header Image <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.8rem' }}>optional</span></label>
              {formData.noHeader ? (
                <div className="no-header-notice">Plain email mode — no header banner</div>
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
                  <small>PNG, JPG, GIF — full-width banner at top of email</small>
                </>
              )}
              <label className="toggle-label">
                <input type="checkbox" name="noHeader" checked={formData.noHeader} onChange={handleChange} />
                <span className="toggle-text">Send as plain email (no header)</span>
              </label>
            </div>

            {/* Message */}
            <div className="form-group">
              <label>Message <span className="required">*</span></label>
              <div className="toolbar">
                <button type="button" className="toolbar-btn" onClick={() => insertFormat('bold')}><b>B</b></button>
                <button type="button" className="toolbar-btn" onClick={() => insertFormat('italic')}><i>I</i></button>
                <button type="button" className="toolbar-btn" onClick={() => insertFormat('list')}>List</button>
                <button type="button" className="toolbar-btn" onClick={() => insertFormat('link')}>Link</button>
                <span className="toolbar-hint">**bold** &nbsp;|&nbsp; *italic* &nbsp;|&nbsp; - bullet &nbsp;|&nbsp; [text](url) &nbsp;|&nbsp; | pipes | for | tables |</span>
              </div>
              <textarea id="message-area" name="message" value={formData.message} onChange={handleChange} placeholder="Write your message here..." rows="12" required />
            </div>
          </div>

          {/* Recipients */}
          <div className="section">
            <div className="section-header"><h2>Recipients</h2></div>
            <div className="form-group">
              <label>
                Email List <span className="required">*</span>
                {emailCount > 0 && <span className="email-count">{emailCount} addresses</span>}
              </label>
              <textarea name="emailList" value={formData.emailList} onChange={handleChange} placeholder={"email1@example.com\nemail2@example.com\nemail3@example.com"} rows="8" required />
              <small>One per line or comma-separated — duplicates removed automatically</small>
            </div>
          </div>

          {/* Attachments */}
          <div className="section">
            <div className="section-header"><h2>Attachments</h2></div>
            <div className="form-group">
              <label htmlFor="file-upload" className="file-upload-label">
                Choose Files
                <input id="file-upload" type="file" onChange={handleFileChange} multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif" style={{ display: 'none' }} />
              </label>
              <small style={{ marginTop: 8 }}>PDF, DOC, DOCX, JPG, PNG — max 25MB per file</small>
              {attachments.length > 0 && (
                <div className="file-list" style={{ marginTop: 12 }}>
                  {attachments.map((file, index) => (
                    <div key={index} className="file-item">
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <button type="button" className="remove-btn" onClick={() => removeAttachment(index)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Signature */}
          <div className="section">
            <div className="section-header"><h2>Signature</h2></div>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" value={footer.name} onChange={handleFooterChange} placeholder="Your Name" />
              </div>
              <div className="form-group">
                <label>Title / Role</label>
                <input type="text" name="title" value={footer.title} onChange={handleFooterChange} placeholder="Role | Organization" />
              </div>
              <div className="form-group">
                <label>Batch / Program</label>
                <input type="text" name="batch" value={footer.batch} onChange={handleFooterChange} placeholder="Class of 20XX, Department" />
              </div>
              <div className="form-group">
                <label>University</label>
                <input type="text" name="university" value={footer.university} onChange={handleFooterChange} placeholder="University Name" />
              </div>
              <div className="form-group">
                <label>Mobile</label>
                <input type="text" name="mobile" value={footer.mobile} onChange={handleFooterChange} placeholder="+91-XXXXXXXXXX" />
              </div>
              <div className="form-group">
                <label>Reply-to Email</label>
                <input type="email" name="email" value={footer.email} onChange={handleFooterChange} placeholder="you@gmail.com" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>LinkedIn <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.8rem' }}>optional</span></label>
              <input type="url" name="linkedin" value={footer.linkedin} onChange={handleFooterChange} placeholder="https://linkedin.com/in/yourprofile" />
            </div>
          </div>

          {/* Sending Settings */}
          <div className="section">
            <div className="section-header"><h2>Sending Settings</h2></div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Batch Size</label>
                <input type="number" name="batchSize" value={formData.batchSize} onChange={handleChange} min="1" max="100" />
                <small>Emails per batch</small>
              </div>
              <div className="form-group">
                <label>Batch Delay &nbsp;<span style={{ color: '#374151', fontWeight: 600 }}>{(formData.batchDelay / 60000).toFixed(1)} min</span></label>
                <input type="number" name="batchDelay" value={formData.batchDelay} onChange={handleChange} min="0" step="1000" />
                <small>Between batches — ±50% randomized</small>
              </div>
              <div className="form-group">
                <label>Email Delay &nbsp;<span style={{ color: '#374151', fontWeight: 600 }}>{(formData.emailDelay / 1000).toFixed(1)} sec</span></label>
                <input type="number" name="emailDelay" value={formData.emailDelay} onChange={handleChange} min="0" step="100" />
                <small>Between emails — ±50% randomized</small>
              </div>
            </div>
          </div>

        </form>

        {/* Status */}
        {status.message && (
          <div className={`status status-${status.type}`}>{status.message}</div>
        )}

        {/* Submit */}
        <div className="submit-section">
          <button type="submit" className="btn btn-primary" disabled={loading} onClick={handleSubmit}>
            {loading ? <><span className="spinner" />Processing...</> : 'Send Campaign'}
          </button>
        </div>

        <footer className="footer">
          <p>Accounts rotate every 40 emails &nbsp;·&nbsp; Delays are randomized ±50% &nbsp;·&nbsp; Gmail limit ~500/day per account</p>
        </footer>

      </div>
    </div>
  );
}

export default App;
