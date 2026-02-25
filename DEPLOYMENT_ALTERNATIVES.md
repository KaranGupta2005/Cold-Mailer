# 🚨 Render SMTP Issue - Alternative Solutions

## Problem
Render's free tier blocks outbound SMTP connections (ports 25, 465, 587) for security reasons.

## ✅ Solution Options

---

## Option 1: Use SendGrid (Recommended - FREE)

SendGrid offers 100 emails/day for free and works on Render.

### Step 1: Create SendGrid Account
1. Go to https://signup.sendgrid.com
2. Sign up (free account)
3. Verify your email
4. Complete the setup wizard

### Step 2: Create API Key
1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name: "Mass Mailer Pro"
4. Permissions: "Full Access"
5. Copy the API key (save it!)

### Step 3: Update Code
I'll update the code to use SendGrid instead of Gmail.

### Step 4: Update Render Environment Variables
Replace in Render dashboard:
- Remove: `EMAIL_USER`, `EMAIL_PASS`
- Add: `SENDGRID_API_KEY` = your-api-key
- Add: `FROM_EMAIL` = guptakaran.port@gmail.com
- Add: `FROM_NAME` = Karan Gupta

---

## Option 2: Deploy to Railway (FREE + SMTP Works)

Railway's free tier allows SMTP connections.

### Steps:
1. Go to https://railway.app
2. Sign up with GitHub
3. New Project → Deploy from GitHub
4. Select "Cold-Mailer" repo
5. Add environment variables:
   - `EMAIL_USER` = guptakaran.port@gmail.com
   - `EMAIL_PASS` = lrzezfqowhfshsuv
   - `PORT` = 5000
6. Deploy!

Railway allows SMTP and your current code will work.

---

## Option 3: Deploy to Vercel + Serverless

Use Vercel with serverless functions (no SMTP restrictions).

---

## Option 4: Upgrade Render to Paid ($7/month)

Render's paid tier allows SMTP connections.

---

## 🎯 Recommended: SendGrid

**Pros:**
- Free 100 emails/day
- Works on Render free tier
- More reliable than Gmail
- Better deliverability
- No SMTP port issues

**Cons:**
- Need to verify sender email
- API-based (not SMTP)

---

## Which option do you prefer?

1. **SendGrid** (I'll update the code now)
2. **Railway** (redeploy there)
3. **Vercel** (serverless approach)
4. **Paid Render** ($7/month)

Let me know and I'll help you set it up!
