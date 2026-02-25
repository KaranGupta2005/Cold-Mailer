import dotenv from "dotenv";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

dotenv.config();

// Load configuration
const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Parse email list from file
function parseEmailList(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    let emails = [];

    if (content.includes("\n")) {
      emails = content.split("\n").map(e => e.trim()).filter(e => e);
    } else if (content.includes(",")) {
      emails = content.split(",").map(e => e.trim()).filter(e => e);
    } else {
      const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
      emails = content.match(emailRegex) || [];
    }

    emails = [...new Set(emails)];
    const validEmails = emails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

    console.log(`📧 Parsed ${validEmails.length} valid emails from ${filePath}`);
    console.log(`❌ Filtered out ${emails.length - validEmails.length} invalid emails`);

    return validEmails;
  } catch (error) {
    console.error(`❌ Error reading email list: ${error.message}`);
    process.exit(1);
  }
}

// Load message content
function loadMessage() {
  try {
    return fs.readFileSync("message.txt", "utf-8");
  } catch (error) {
    console.error(`❌ Error reading message.txt: ${error.message}`);
    process.exit(1);
  }
}

// Generate HTML email template
function getEmailHTML(messageContent) {
  const paragraphs = messageContent.split("\n\n").map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
      background-color: #ffffff;
    }
    .content p {
      margin: 0 0 15px 0;
      color: #555;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 5px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: 600;
    }
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #ddd, transparent);
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 Message for You</h1>
    </div>
    <div class="content">
      ${paragraphs}
    </div>
    <div class="footer">
      <p>This email was sent to you as part of our communication.</p>
      <p>If you wish to unsubscribe, please reply with "UNSUBSCRIBE" in the subject line.</p>
    </div>
  </div>
</body>
</html>`;
}

// Prepare attachments
function prepareAttachments() {
  if (!config.attachments || config.attachments.length === 0) {
    return [];
  }

  return config.attachments.map(filePath => {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Attachment not found: ${filePath}`);
      return null;
    }
    return {
      filename: path.basename(filePath),
      path: filePath
    };
  }).filter(a => a !== null);
}

// Send email to a single recipient
async function sendEmail(recipientEmail, subject, messageContent, attachments) {
  const mailOptions = {
    from: `"${process.env.EMAIL_USER.split('@')[0]}" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: subject,
    text: messageContent,
    html: getEmailHTML(messageContent),
    attachments: attachments
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, email: recipientEmail };
  } catch (error) {
    return { success: false, email: recipientEmail, error: error.message };
  }
}

// Delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function sendMassEmails() {
  console.log("🚀 Starting Mass Email Campaign...\n");

  // Verify credentials
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ Email credentials not found in .env file");
    process.exit(1);
  }

  // Load data
  const emailList = parseEmailList(config.emailListFile);
  const messageContent = loadMessage();
  const attachments = prepareAttachments();

  if (emailList.length === 0) {
    console.error("❌ No valid emails found");
    process.exit(1);
  }

  console.log(`\n📊 Campaign Summary:`);
  console.log(`   Total Emails: ${emailList.length}`);
  console.log(`   Batch Size: ${config.batchSize}`);
  console.log(`   Total Batches: ${Math.ceil(emailList.length / config.batchSize)}`);
  console.log(`   Subject: ${config.subject}`);
  console.log(`   Attachments: ${attachments.length}`);
  if (attachments.length > 0) {
    attachments.forEach(att => console.log(`      - ${att.filename}`));
  }
  console.log("\n⚠️  WARNING: This will send emails to all addresses!");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");
  
  await delay(5000);

  const results = {
    total: emailList.length,
    sent: 0,
    failed: 0,
    failedEmails: []
  };

  const startTime = Date.now();

  // Send emails in batches
  for (let i = 0; i < emailList.length; i += config.batchSize) {
    const batch = emailList.slice(i, i + config.batchSize);
    const batchNumber = Math.floor(i / config.batchSize) + 1;
    const totalBatches = Math.ceil(emailList.length / config.batchSize);

    console.log(`\n📦 Processing Batch ${batchNumber}/${totalBatches} (${batch.length} emails)...`);

    for (const email of batch) {
      const result = await sendEmail(email, config.subject, messageContent, attachments);

      if (result.success) {
        results.sent++;
        console.log(`  ✅ Sent to: ${email} (${results.sent}/${emailList.length})`);
      } else {
        results.failed++;
        results.failedEmails.push({ email, error: result.error });
        console.log(`  ❌ Failed: ${email} - ${result.error}`);
      }

      if (config.emailDelay > 0) {
        await delay(config.emailDelay);
      }
    }

    if (i + config.batchSize < emailList.length) {
      console.log(`\n⏳ Waiting ${config.batchDelay / 1000} seconds before next batch...`);
      await delay(config.batchDelay);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);

  console.log("\n" + "=".repeat(60));
  console.log("📊 CAMPAIGN COMPLETED");
  console.log("=".repeat(60));
  console.log(`✅ Successfully sent: ${results.sent}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log(`⏱️  Total time: ${duration} minutes`);

  if (results.failedEmails.length > 0) {
    console.log("\n❌ Failed Emails:");
    results.failedEmails.forEach(({ email, error }) => {
      console.log(`   - ${email}: ${error}`);
    });

    const failedEmailsFile = "failed_emails.txt";
    fs.writeFileSync(
      failedEmailsFile,
      results.failedEmails.map(f => `${f.email} - ${f.error}`).join("\n")
    );
    console.log(`\n💾 Failed emails saved to: ${failedEmailsFile}`);
  }

  console.log("\n🎉 All done!");
}

// Run the script
sendMassEmails().catch(error => {
  console.error("\n❌ Fatal Error:", error);
  process.exit(1);
});
