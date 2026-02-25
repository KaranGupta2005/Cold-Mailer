# 📧 Mass Mailer Pro

A professional full-stack email campaign manager with React frontend and Express backend. Send bulk emails with attachments, batch processing, and beautiful HTML templates.

![Mass Mailer Pro](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🎨 Modern, professional UI with gradient design
- 📧 Bulk email sending with Gmail integration
- 📎 Multiple file attachments support (PDF, DOC, images)
- 🔄 Batch processing with customizable delays
- ✅ Email validation and parsing
- 📊 Real-time progress tracking
- 🎯 Professional HTML email templates
- 🚀 Ready for production deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Gmail account with 2FA enabled
- Gmail App Password (not regular password)

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/mass-mailer-pro.git
cd mass-mailer-pro
```

2. **Install dependencies:**

```bash
npm install
```

3. **Configure Gmail credentials:**

Create `server/.env` file:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```

Generate App Password: https://myaccount.google.com/apppasswords

4. **Run the application:**

```bash
npm run dev
```

This starts:
- Backend server: http://localhost:5000
- Frontend dev server: http://localhost:5173

## 📖 Usage

1. Open http://localhost:5173
2. Fill in campaign details (sender name, subject, message)
3. Add recipient emails (one per line or comma-separated)
4. Upload attachments (optional)
5. Configure batch settings
6. Click "Send Campaign"
7. Monitor progress in server console

## 🎯 Gmail Limits

- **Daily limit:** ~500 emails
- **Recommended batch size:** 50 emails
- **Recommended batch delay:** 2 minutes (120000ms)
- **Recommended email delay:** 1 second (1000ms)

## 🏗️ Project Structure

```
mass-mailer-pro/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main component
│   │   ├── App.css        # Styles
│   │   └── index.css      # Global styles
│   └── package.json
├── server/                 # Express backend
│   ├── index.js           # Server code
│   └── .env               # Credentials (create this)
├── package.json           # Root dependencies
└── README.md
```

## 🔧 Configuration

### Email Credentials

Edit `server/.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Batch Settings

Adjust in the UI or modify defaults in `client/src/App.jsx`:

```javascript
batchSize: 50,        // Emails per batch
batchDelay: 120000,   // 2 minutes between batches
emailDelay: 1000      // 1 second between emails
```

## 🚀 Deployment

### Build for Production

```bash
# Build frontend
cd client
npm run build
cd ..

# Start production server
npm start
```

### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

### Deploy to Render

1. Create new Web Service
2. Connect GitHub repo
3. Build command: `npm install && cd client && npm install && npm run build`
4. Start command: `npm start`

### Deploy to Railway

1. Connect GitHub repository
2. Railway auto-detects and deploys
3. Set environment variable: `PORT=5000`

## 📊 API Endpoints

- `POST /api/send-emails` - Start email campaign
- `POST /api/upload` - Upload attachments
- `POST /api/validate-credentials` - Validate Gmail credentials
- `GET /api/health` - Health check

## 🔒 Security

- Credentials stored in environment variables
- File upload size limits (25MB)
- Email validation and sanitization
- CORS enabled for frontend
- `.env` files excluded from git

## 🐛 Troubleshooting

### Emails not sending

- Check Gmail App Password is correct
- Verify 2FA is enabled on Gmail
- Check server console for errors
- Ensure batch delays are sufficient

### Port already in use

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### Frontend not loading

```bash
cd client
npm run build
cd ..
npm start
```

## 📝 Tips

- Test with a small list first (2-3 emails)
- Monitor server console for real-time progress
- Keep batch size at 50 or lower
- Use 2-minute delays between batches
- Check spam folders if emails don't arrive

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite
- **Backend:** Express.js, Node.js
- **Email:** Nodemailer
- **File Upload:** Multer
- **Styling:** Custom CSS

## 📄 License

MIT License - feel free to use for personal or commercial projects

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Made with ❤️ for efficient email campaigns
