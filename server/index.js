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
const EMAIL_USER = 'guptakaran.port@gmail.com';
const EMAIL_PASS = 'lrzezfqowhfshsuv';

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
function getEmailHTML(messageContent, senderName) {
  const paragraphs = messageContent
    .split("\n\n")
    .map(p => `<p style="margin: 0 0 15px 0; color: #555; line-height: 1.6;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    .header { 
      background-color: #0066cc; 
      color: white; 
      padding: 20px; 
      text-align: center; 
    }
    .content { 
      padding: 20px; 
      background-color: #f9f9f9; 
    }
    .content p {
      margin: 0 0 15px 0;
      color: #555;
      line-height: 1.6;
    }
    .button { 
      display: inline-block; 
      padding: 12px 24px; 
      background-color: #0066cc; 
      color: white; 
      text-decoration: none; 
      border-radius: 5px; 
      margin: 20px 0; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">${senderName}</h2>
    </div>
    <div class="content">
      ${paragraphs}
    </div>
  </div>
</body>
</html>`;
}

// Send single email
async function sendEmail(transporter, recipientEmail, subject, message, senderName, attachments) {
  const mailOptions = {
    from: `"${senderName}" <${EMAIL_USER}>`,
    to: recipientEmail,
    subject: subject,
    text: message,
    html: getEmailHTML(message, senderName),
    attachments: attachments
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
      size: file.size
    }));
    res.json({ success: true, files });
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
    attachmentPaths 
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
            attachments
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
