# Bulk Email Sender with Google OAuth2

A web application that allows users to login with their Gmail account and send individual emails in bulk. Each email is sent separately, ensuring recipients cannot see other email addresses.

## Features

- **Google OAuth2 Login**: Users login with their Gmail account directly on the webpage
- Upload Excel (.xlsx, .xls) or CSV files with email lists
- Send personalized emails individually to each recipient
- Gmail integration with OAuth2 authentication
- Real-time sending progress and results
- Clean, responsive web interface
- Rate limiting to avoid Gmail restrictions
- Secure session management

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Google OAuth2 Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth2 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
   - Copy the Client ID and Client Secret

### 3. Environment Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` file with your Google OAuth2 credentials:
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
SESSION_SECRET=your-random-session-secret-key
PORT=3000
```

### 4. Prepare Your Email List

Create an Excel or CSV file with email addresses in the first column:

**Example Excel/CSV format:**
```
Email
john@example.com
jane@example.com
bob@example.com
```

### 5. Run the Application

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

Visit `http://localhost:3000` in your browser.

## Usage

1. Open the web application at `http://localhost:3000`
2. Click "Sign in with Google" and authorize the application
3. Upload your Excel/CSV file with email addresses
4. Enter your email subject and message
5. Click "Send Emails"
6. Monitor the progress and results

## Important Notes

- **Privacy**: Each email is sent individually - recipients cannot see other email addresses
- **Authentication**: Users login with their own Gmail accounts via OAuth2
- **Rate Limiting**: There's a 1-second delay between emails to avoid Gmail rate limits
- **Gmail Limits**: Gmail has daily sending limits (500 emails/day for free accounts)
- **File Format**: Email addresses should be in the first column of your Excel/CSV file
- **Security**: OAuth2 tokens are stored in secure server sessions

## Security Features

- OAuth2 authentication (no passwords stored)
- Secure session management
- Automatic token refresh
- HTTPS recommended for production
- No sensitive data stored permanently

## Production Deployment

For production deployment:

1. Set up HTTPS (required for OAuth2 in production)
2. Update `GOOGLE_REDIRECT_URI` to your production domain
3. Add your production domain to Google OAuth2 authorized origins
4. Use a strong `SESSION_SECRET`
5. Consider using a database for session storage

## Troubleshooting

### "OAuth Error" or "Invalid Client"
- Verify your Google Client ID and Secret are correct
- Make sure the redirect URI matches exactly (including http/https)
- Check that Gmail API is enabled in Google Cloud Console

### "Daily sending quota exceeded"
- Gmail free accounts have a 500 emails/day limit
- Wait 24 hours or upgrade to Google Workspace

### File upload issues
- Ensure your file is in Excel (.xlsx, .xls) or CSV format
- Make sure email addresses are in the first column
- Check that email addresses are valid (contain @ symbol)

## File Structure

```
bulk-email-sender/
├── server.js              # Express server with OAuth2 and email logic
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── .env                  # Your actual environment variables (create this)
├── public/
│   └── index.html        # Web interface with login
├── uploads/              # Temporary file storage (auto-created)
└── README.md            # This file
```