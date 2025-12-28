const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory user store (for simplicity - in production use Redis or database)
const userSessions = new Map();

// Trust proxy for production (Render uses reverse proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Generate simple token
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Configure multer for file uploads (both email lists and attachments)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow email list files and any attachments
    if (file.fieldname === 'emailList') {
      const allowedTypes = ['.xlsx', '.xls', '.csv'];
      const fileExt = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(fileExt)) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel and CSV files are allowed for email lists'));
      }
    } else {
      // Allow any file type for attachments
      cb(null, true);
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit per file
  }
});

// Gmail API setup for sending emails with attachments
const sendEmailViaGmailAPI = async (tokens, userEmail, to, subject, htmlContent, attachments = []) => {
  try {
    // Create OAuth2 client
    const oauth2ClientForGmail = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2ClientForGmail.setCredentials(tokens);
    
    // Create Gmail API instance
    const gmail = google.gmail({ version: 'v1', auth: oauth2ClientForGmail });
    
    // Create multipart email with attachments
    const boundary = 'boundary_' + Date.now();
    let emailContent = '';
    
    // Email headers
    emailContent += `From: ${userEmail}\r\n`;
    emailContent += `To: ${to}\r\n`;
    emailContent += `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=\r\n`;
    emailContent += 'MIME-Version: 1.0\r\n';
    emailContent += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    
    // HTML body part
    emailContent += `--${boundary}\r\n`;
    emailContent += 'Content-Type: text/html; charset=UTF-8\r\n';
    emailContent += 'Content-Transfer-Encoding: base64\r\n\r\n';
    emailContent += Buffer.from(htmlContent, 'utf8').toString('base64') + '\r\n\r\n';
    
    // Add attachments
    for (const attachment of attachments) {
      const fileContent = fs.readFileSync(attachment.path);
      const mimeType = getMimeType(attachment.originalname);
      
      emailContent += `--${boundary}\r\n`;
      emailContent += `Content-Type: ${mimeType}\r\n`;
      emailContent += `Content-Disposition: attachment; filename="${attachment.originalname}"\r\n`;
      emailContent += 'Content-Transfer-Encoding: base64\r\n\r\n';
      emailContent += fileContent.toString('base64') + '\r\n\r\n';
    }
    
    emailContent += `--${boundary}--\r\n`;
    
    // Encode email in base64url format (Gmail API requirement)
    const encodedEmail = Buffer.from(emailContent, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Send email using Gmail API
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });
    
    return result;
  } catch (error) {
    console.error('Gmail API send error:', error);
    throw error;
  }
};

// Helper function to get MIME type
const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !userSessions.has(token)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  req.user = userSessions.get(token);
  next();
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

// Google OAuth2 login
app.get('/auth/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    include_granted_scopes: true
  });
  
  res.redirect(url);
});

// Google OAuth2 callback
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('Received tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type,
      scope: tokens.scope
    });
    
    oauth2Client.setCredentials(tokens);
    
    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    console.log('User info:', userInfo.data.email);
    
    // Generate token and store user session
    const sessionToken = generateToken();
    userSessions.set(sessionToken, {
      email: userInfo.data.email,
      name: userInfo.data.name,
      tokens: tokens
    });
    
    // Clean up old sessions (keep only last 100)
    if (userSessions.size > 100) {
      const firstKey = userSessions.keys().next().value;
      userSessions.delete(firstKey);
    }
    
    // Redirect with token in URL (will be stored in localStorage by frontend)
    res.redirect(`/?token=${sessionToken}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/?login=error');
  }
});

// Get user info
app.get('/api/user', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  console.log('Checking token:', token ? 'provided' : 'not provided');
  
  if (token && userSessions.has(token)) {
    const user = userSessions.get(token);
    res.json({
      authenticated: true,
      email: user.email,
      name: user.name
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    userSessions.delete(token);
  }
  
  res.json({ success: true });
});

app.post('/upload-and-send', requireAuth, upload.any(), async (req, res) => {
  try {
    const { subject, message, emailMethod, manualEmails } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    let emails = [];
    let emailListFile = null;
    let attachments = [];

    // Process uploaded files
    if (req.files) {
      req.files.forEach(file => {
        if (file.fieldname === 'emailList') {
          emailListFile = file;
        } else if (file.fieldname.startsWith('attachment_')) {
          attachments.push(file);
        }
      });
    }

    // Get emails based on method
    if (emailMethod === 'file') {
      if (!emailListFile) {
        return res.status(400).json({ error: 'No email list file uploaded' });
      }

      // Read Excel/CSV file
      const workbook = XLSX.readFile(emailListFile.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Extract emails (assuming first column contains emails)
      emails = data.map(row => {
        const firstKey = Object.keys(row)[0];
        return row[firstKey];
      }).filter(email => email && email.includes('@'));

      // Clean up email list file
      fs.unlinkSync(emailListFile.path);
    } else if (emailMethod === 'manual') {
      if (!manualEmails) {
        return res.status(400).json({ error: 'No manual emails provided' });
      }
      
      try {
        emails = JSON.parse(manualEmails);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    if (emails.length === 0) {
      return res.status(400).json({ error: 'No valid emails found' });
    }

    console.log('User tokens available:', {
      hasTokens: !!req.user.tokens,
      userEmail: req.user.email,
      totalEmails: emails.length,
      attachmentCount: attachments.length
    });

    // Send emails individually using Gmail API
    const results = [];
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      try {
        console.log(`Sending email ${i + 1}/${emails.length} to: ${email}`);
        
        await sendEmailViaGmailAPI(
          req.user.tokens,
          req.user.email,
          email,
          subject,
          message,
          attachments
        );
        
        results.push({ email, status: 'sent' });
        console.log(`✓ Email sent successfully to: ${email}`);
        
        // Add delay between emails to avoid rate limiting
        if (i < emails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`✗ Failed to send email to ${email}:`, error.message);
        results.push({ email, status: 'failed', error: error.message });
      }
    }

    // Clean up attachment files
    attachments.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error('Error cleaning up attachment:', error);
      }
    });

    res.json({
      success: true,
      totalEmails: emails.length,
      results: results,
      attachmentCount: attachments.length
    });

  } catch (error) {
    console.error('Error:', error);
    
    // Clean up any uploaded files in case of error
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      });
    }
    
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});