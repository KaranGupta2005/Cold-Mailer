import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Hardcoded credentials
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client/dist")));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Create email transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    // Force IPv4
    family: 4
  });
}

// Parse email list
function parseEmailList(emailText) {
  let emails = [];
  
  if (emailText.includes("\n")) {
    emails = emailText.split("\n").map(e => e.trim()).filter(e => e);
  } else if (emailText.includes(",")) {
    emails = emailText.split(",").map(e => e.trim()).filter(e => e);
  } else {
    const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
    emails = emailText.match(emailRegex) || [];
  }

  emails = [...new Set(emails)];
  return emails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

// Generate HTML email template
function getEmailHTML(messageContent, senderName, logoUrl, footer, dtuLogoCid) {
  // Convert markdown-style links [text](url) to HTML links
  let htmlContent = messageContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #0066cc; text-decoration: none; font-weight: 500;">$1</a>');
  
  // Convert **bold** to <strong>
  htmlContent = htmlContent.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #333;">$1</strong>');
  
  // Convert *italic* to <em>
  htmlContent = htmlContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  const sections = htmlContent.split('\n\n');
  let formattedContent = '';
  
  sections.forEach(section => {
    const trimmedSection = section.trim();
    if (!trimmedSection) return;
    
    const lines = trimmedSection.split('\n');
    if (lines.length > 2 && lines[0].includes('|') && lines[1].includes('|')) {
      formattedContent += '<table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border: 1px solid #ddd;">';
      lines.forEach((line, index) => {
        if (line.includes('---')) return;
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (index === 0) {
          formattedContent += '<tr style="background-color: #0066cc; color: white;">';
          cells.forEach(cell => {
            formattedContent += `<th style="padding: 14px 16px; text-align: left; border: 1px solid #0066cc; font-weight: 600; font-size: 14px;">${cell}</th>`;
          });
          formattedContent += '</tr>';
        } else {
          formattedContent += '<tr style="background-color: ' + (index % 2 === 0 ? '#f9f9f9' : 'white') + ';">';
          cells.forEach(cell => {
            formattedContent += `<td style="padding: 12px 16px; border: 1px solid #e0e0e0; color: #555; font-size: 14px; line-height: 1.6;">${cell}</td>`;
          });
          formattedContent += '</tr>';
        }
      });
      formattedContent += '</table>';
    } else if (trimmedSection.match(/^\d+\./)) {
      formattedContent += `<h3 style="color: #0066cc; margin: 25px 0 15px 0; font-size: 18px; font-weight: 700;">${trimmedSection}</h3>`;
    } else if (trimmedSection.endsWith(':') && trimmedSection.length < 100) {
      formattedContent += `<h4 style="color: #333; margin: 20px 0 10px 0; font-size: 16px; font-weight: 600;">${trimmedSection}</h4>`;
    } else {
      const paragraphLines = trimmedSection.split('\n').map(line => line.trim()).join('<br>');
      formattedContent += `<p style="margin: 0 0 15px 0; color: #555; line-height: 1.8; font-size: 14px;">${paragraphLines}</p>`;
    }
  });

  // Build header: logo image if provided, else colored bar with sender name
  const headerHTML = logoUrl
    ? `<div style="background-color: #f9a800; text-align: center; padding: 0; line-height: 0;">
        <img src="${logoUrl}" alt="${senderName}" style="width: 100%; max-width: 700px; height: auto; display: block; margin: 0 auto;" />
       </div>`
    : `<div style="background-color: #0066cc; color: white; padding: 30px 25px; text-align: center;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">${senderName}</h2>
       </div>`;

  // Build footer HTML
  let footerHTML = '';
  if (footer && (footer.name || footer.title || footer.mobile || footer.email)) {
    const dtuImg = dtuLogoCid
      ? `<img src="${dtuLogoCid}" alt="DTU" style="width: 160px; height: auto; display: block;" />`
      : '';

    footerHTML = `
    <div style="border-top: 2px solid #e2e8f0; margin-top: 30px; padding: 20px 25px;">
      <table style="width: 100%; border: none; border-collapse: collapse; margin: 0;">
        <tr>
          <td style="width: 180px; vertical-align: middle; padding: 0 20px 0 0; border: none; text-align: center;">
            ${dtuImg}
          </td>
          <td style="vertical-align: middle; border-left: 2px solid #e2e8f0; padding-left: 20px; border-top: none; border-right: none; border-bottom: none;">
            <div style="font-size: 15px; font-weight: 700; color: #1a202c; margin-bottom: 3px;">${footer.name || ''}</div>
            <div style="font-size: 13px; font-weight: 600; color: #333; margin-bottom: 2px;">${footer.title || ''}</div>
            <div style="font-size: 12px; color: #718096; margin-bottom: 2px;">${footer.batch || ''}</div>
            <div style="font-size: 12px; color: #718096; margin-bottom: 8px;">${footer.university || ''}</div>
            ${footer.mobile ? `<div style="font-size: 13px; color: #333; margin-bottom: 3px;"><strong>Mobile:</strong> <a href="tel:${footer.mobile}" style="color: #0066cc; text-decoration: none;">${footer.mobile}</a></div>` : ''}
            ${footer.email ? `<div style="font-size: 13px; color: #333; margin-bottom: 10px;"><strong>Email:</strong> <a href="mailto:${footer.email}" style="color: #0066cc; text-decoration: none;">${footer.email}</a></div>` : ''}
            ${footer.linkedin ? `<a href="${footer.linkedin}" style="display: inline-block; width: 28px; height: 28px; background-color: #0077b5; border-radius: 50%; text-align: center; line-height: 28px; color: white; font-size: 14px; font-weight: 700; text-decoration: none;">in</a>` : ''}
          </td>
        </tr>
      </table>
    </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 700px; margin: 20px auto; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .content { padding: 30px 25px; background-color: #ffffff; }
    .content p { margin: 0 0 15px 0; color: #555; line-height: 1.8; font-size: 14px; }
    .content a { color: #0066cc; text-decoration: none; font-weight: 500; }
    .content a:hover { text-decoration: underline; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border: 1px solid #ddd; }
    th { background-color: #0066cc; color: white; padding: 14px 16px; text-align: left; border: 1px solid #0066cc; font-weight: 600; font-size: 14px; }
    td { padding: 12px 16px; border: 1px solid #e0e0e0; color: #555; font-size: 14px; line-height: 1.6; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    tr:hover { background-color: #f0f7ff; }
    h3 { color: #0066cc; margin: 25px 0 15px 0; font-size: 18px; font-weight: 700; }
    h4 { color: #333; margin: 20px 0 10px 0; font-size: 16px; font-weight: 600; }
    strong { color: #333; font-weight: 700; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; margin: 0 !important; }
      .content { padding: 20px 15px !important; }
      table { font-size: 12px; }
      th, td { padding: 10px 8px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${headerHTML}
    <div class="content">
      ${formattedContent}
    </div>
    ${footerHTML}
  </div>
</body>
</html>`;
}

// Send single email
async function sendEmail(transporter, recipientEmail, subject, message, senderName, attachments, logoUrl, footer) {

  // Inline header image
  let inlineAttachments = [];
  let headerCid = null;

  if (logoUrl && logoUrl.startsWith('/uploads/')) {
    const logoPath = path.join(__dirname, logoUrl.replace('/uploads/', 'uploads/'));
    if (fs.existsSync(logoPath)) {
      inlineAttachments.push({ filename: path.basename(logoPath), path: logoPath, cid: "header-image" });
      headerCid = "cid:header-image";
    }
  }

  // Inline DTU footer logo
  const dtuLogoPath = path.join(__dirname, "uploads", "dtu-logo.png");
  let dtuLogoCid = null;
  if (fs.existsSync(dtuLogoPath)) {
    inlineAttachments.push({ filename: "dtu-logo.png", path: dtuLogoPath, cid: "dtu-logo" });
    dtuLogoCid = "cid:dtu-logo";
  }

  const mailOptions = {
    from: `"${senderName}" <${EMAIL_USER}>`,
    to: recipientEmail,
    subject: subject,
    text: message,
    html: getEmailHTML(message, senderName, headerCid || logoUrl || null, footer, dtuLogoCid),
    attachments: [...inlineAttachments, ...attachments]
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, email: recipientEmail };
  } catch (error) {
    return { success: false, email: recipientEmail, error: error.message };
  }
}

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API Routes
app.post("/api/upload", upload.array("attachments", 10), (req, res) => {
  try {
    const files = req.files.map(file => ({
      filename: file.originalname,
      path: file.path,
      serverPath: `/uploads/${file.filename}`,
      size: file.size
    }));
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload header image
app.post("/api/upload-header", upload.single("headerImage"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });
    res.json({ 
      success: true, 
      serverPath: `/uploads/${req.file.filename}`,
      filename: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/send-emails", async (req, res) => {
  const { 
    emailList, 
    subject, 
    message, 
    senderName,
    batchSize, 
    batchDelay, 
    emailDelay,
    attachmentPaths,
    logoUrl,
    footer
  } = req.body;

  console.log('\n📧 New campaign request received');
  console.log(`   Sender: ${senderName}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Email User: ${EMAIL_USER}`);
  console.log(`   Email Pass Set: ${EMAIL_PASS ? 'Yes' : 'No'}`);

  try {
    const transporter = createTransporter();
    
    // Verify transporter before sending
    try {
      await transporter.verify();
      console.log('✅ Transporter verified successfully');
    } catch (verifyError) {
      console.error('❌ Transporter verification failed:', verifyError);
      return res.status(500).json({ 
        success: false, 
        error: `Email configuration error: ${verifyError.message}` 
      });
    }
    
    const emails = parseEmailList(emailList);

    if (emails.length === 0) {
      return res.status(400).json({ success: false, error: "No valid emails found" });
    }

    // Prepare attachments
    const attachments = attachmentPaths ? attachmentPaths.map(filePath => ({
      filename: path.basename(filePath),
      path: filePath
    })) : [];

    const results = {
      total: emails.length,
      sent: 0,
      failed: 0,
      failedEmails: []
    };

    // Send initial response
    res.json({ 
      success: true, 
      message: "Campaign started", 
      totalEmails: emails.length 
    });

    // Send emails in background
    (async () => {
      console.log(`\n📧 Starting campaign: ${emails.length} emails`);
      
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(emails.length / batchSize);

        console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} emails)`);

        for (const email of batch) {
          const result = await sendEmail(
            transporter, 
            email, 
            subject, 
            message, 
            senderName,
            attachments,
            logoUrl,
            footer
          );

          if (result.success) {
            results.sent++;
            console.log(`  ✅ ${email} (${results.sent}/${emails.length})`);
          } else {
            results.failed++;
            results.failedEmails.push({ email, error: result.error });
            console.log(`  ❌ ${email}: ${result.error}`);
          }

          if (emailDelay > 0) {
            await delay(emailDelay);
          }
        }

        if (i + batchSize < emails.length && batchDelay > 0) {
          console.log(`⏳ Waiting ${batchDelay / 1000}s before next batch...`);
          await delay(batchDelay);
        }
      }

      console.log("\n✅ Campaign completed!");
      console.log(`   Sent: ${results.sent}/${results.total}`);
      console.log(`   Failed: ${results.failed}/${results.total}`);
      
      if (results.failedEmails.length > 0) {
        console.log("\n❌ Failed emails:");
        results.failedEmails.forEach(({ email, error }) => {
          console.log(`   - ${email}: ${error}`);
        });
      }
    })().catch(error => {
      console.error('❌ Campaign error:', error);
    });

  } catch (error) {
    console.error('❌ Send emails error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/validate-credentials", async (req, res) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    res.json({ success: true, message: "Credentials valid" });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", email: EMAIL_USER });
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, "uploads")));

// Serve React app
app.get("*", (req, res) => {
  const indexPath = path.join(__dirname, "../client/dist/index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend not built. Run 'npm run build' in client directory.");
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Mass Mailer Pro Server`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Email: ${EMAIL_USER}`);
  console.log(`   Email Pass Length: ${EMAIL_PASS ? EMAIL_PASS.length : 0}`);
  console.log(`   Status: Ready\n`);
  
  // Test email configuration on startup
  const transporter = createTransporter();
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email configuration error:', error);
    } else {
      console.log('✅ Email server is ready to send messages');
    }
  });
});
