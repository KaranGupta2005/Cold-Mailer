import { useState } from 'react';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    senderName: '',
    subject: '',
    message: '',
    emailList: '',
    logoUrl: '',
    batchSize: 50,
    batchDelay: 120000,
    emailDelay: 1000
  });

  const [attachments, setAttachments] = useState([]);
  const [headerImage, setHeaderImage] = useState(null);
  const [headerPreview, setHeaderPreview] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [emailCount, setEmailCount] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'emailList') {
      const emails = value.split(/[\n,]/).filter(e => e.trim());
      setEmailCount(emails.length);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(files);
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

  const uploadFiles = async () => {
    if (attachments.length === 0) return [];

    const formData = new FormData();
    attachments.forEach(file => {
      formData.append('attachments', file);
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
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

    if (!formData.emailList.trim()) {
      setStatus({ type: 'error', message: 'Please enter at least one email address' });
      return;
    }

    if (!formData.senderName.trim()) {
      setStatus({ type: 'error', message: 'Please enter sender name' });
      return;
    }

    if (!formData.subject.trim()) {
      setStatus({ type: 'error', message: 'Please enter email subject' });
      return;
    }

    if (!formData.message.trim()) {
      setStatus({ type: 'error', message: 'Please enter email message' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Uploading attachments...' });

    try {
      // Upload header image first if provided
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
        body: JSON.stringify({
          ...formData,
          logoUrl,
          attachmentPaths
        })
      });

      const data = await response.json();

      if (data.success) {
        setStatus({ 
          type: 'success', 
          message: `Campaign started successfully! Sending to ${data.totalEmails} recipients. Check server console for progress.` 
        });
        
        setTimeout(() => {
          setFormData({
            senderName: '',
            subject: '',
            message: '',
            emailList: '',
            logoUrl: '',
            batchSize: 50,
            batchDelay: 120000,
            emailDelay: 1000
          });
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
                <input
                  type="text"
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleChange}
                  placeholder="Your Name or Organization"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Subject <span className="required">*</span></label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Your email subject line"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Header Image <span style={{color:'#718096', fontWeight:400}}>(optional)</span></label>
              {headerPreview ? (
                <div className="header-preview">
                  <img src={headerPreview} alt="Header preview" />
                  <button type="button" className="remove-btn" onClick={removeHeaderImage}>Remove</button>
                </div>
              ) : (
                <>
                  <label htmlFor="header-upload" className="file-upload-label">
                    Upload Header Image
                    <input
                      id="header-upload"
                      type="file"
                      onChange={handleHeaderImageChange}
                      accept=".jpg,.jpeg,.png,.gif,.webp"
                      style={{ display: 'none' }}
                    />
                  </label>
                  <small>PNG, JPG, GIF — will appear full-width at the top of every email</small>
                </>
              )}
            </div>

            <div className="form-group">
              <label>Message <span className="required">*</span></label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Write your email message here...&#10;&#10;You can use multiple paragraphs.&#10;&#10;Best regards,&#10;Your Name"
                rows="10"
                required
              />
              <small>Separate paragraphs with blank lines for better formatting</small>
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
              <textarea
                name="emailList"
                value={formData.emailList}
                onChange={handleChange}
                placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                rows="8"
                required
              />
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
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  style={{ display: 'none' }}
                />
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
                      <button 
                        type="button" 
                        className="remove-btn"
                        onClick={() => removeAttachment(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="section">
            <div className="section-header">
              <h2>Sending Settings</h2>
              <p>Configure batch processing to avoid rate limits</p>
            </div>
            
            <div className="form-grid-3">
              <div className="form-group">
                <label>Batch Size</label>
                <input
                  type="number"
                  name="batchSize"
                  value={formData.batchSize}
                  onChange={handleChange}
                  min="1"
                  max="100"
                />
                <small>Emails per batch</small>
              </div>
              
              <div className="form-group">
                <label>Batch Delay (ms)</label>
                <input
                  type="number"
                  name="batchDelay"
                  value={formData.batchDelay}
                  onChange={handleChange}
                  min="0"
                  step="1000"
                />
                <small>Wait between batches</small>
              </div>
              
              <div className="form-group">
                <label>Email Delay (ms)</label>
                <input
                  type="number"
                  name="emailDelay"
                  value={formData.emailDelay}
                  onChange={handleChange}
                  min="0"
                  step="100"
                />
                <small>Wait between emails</small>
              </div>
            </div>
          </div>

          {/* Status */}
          {status.message && (
            <div className={`status status-${status.type}`}>
              {status.message}
            </div>
          )}

          {/* Submit */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              'Send Campaign'
            )}
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
