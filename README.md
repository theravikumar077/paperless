# PaperlessDoc 🗄️✨
## Premium Personal Digital Document Locker – Android & iOS

> **"Your Documents. One Place. Always Accessible."**  
> *"Stop searching. Start storing."*

---

## 🌟 Executive Product Overview

**PaperlessDoc** is a production-ready, enterprise-grade personal digital document locker engineered for **Android & iOS** with native performance, biometric security, edge document scanning, intelligent organization, and authenticated cloud storage.

Inspired by the design aesthetics of **Apple Files, Google Drive, DigiLocker, Notion, and Linear**, PaperlessDoc delivers a minimalist, modern, and uncluttered personal document management ecosystem.

---

## 🏗️ Technical Architecture

```text
paperless/
│
├── mobile/                           # React Native Expo Native Application
│   ├── app/                          # File-based navigation (Expo Router)
│   │   ├── _layout.jsx               # Root provider stack (Theme, Auth, Biometrics)
│   │   ├── index.jsx                 # Dynamic auth redirection
│   │   ├── (auth)/                   # Authentication flows
│   │   │   ├── _layout.jsx
│   │   │   ├── onboarding.jsx        # 3-step personalized visual onboarding
│   │   │   ├── login.jsx             # Secure login with biometrics
│   │   │   ├── register.jsx          # Registration with password hashing
│   │   │   └── forgot-password.jsx   # Recovery tokens
│   │   ├── (tabs)/                   # Primary tab navigation
│   │   │   ├── _layout.jsx           # Floating navigation with elevated action button
│   │   │   ├── index.jsx             # Home Dashboard with live storage & stats
│   │   │   ├── documents.jsx         # Global smart search & category explorer
│   │   │   ├── upload.jsx            # Quick upload drawer launcher
│   │   │   ├── favorites.jsx         # Starred priority documents
│   │   │   └── profile.jsx           # Profile & settings hub
│   │   ├── documents/
│   │   │   ├── [id].jsx              # Full-screen preview, metadata & actions
│   │   │   └── category/[name].jsx   # Filtered category documents
│   │   ├── folders/
│   │   │   └── [id].jsx              # Folder explorer & subfolder manager
│   │   ├── scanner/
│   │   │   └── index.jsx             # Camera document scanner with PDF compiler
│   │   └── settings/
│   │       ├── security.jsx          # Biometric app lock & password manager
│   │       ├── storage.jsx           # Live category storage breakdown
│   │       ├── shared.jsx            # Active share links manager
│   │       └── trash.jsx             # Recycle bin with restore & purge
│   │
│   ├── src/
│   │   ├── components/               # Reusable UI component design system
│   │   │   ├── common/               # Button, Input, Card, Badge, EmptyState, Skeleton
│   │   │   ├── dashboard/            # DashboardHeader, StorageCard, StatCards, QuickActions, CategoryGrid
│   │   │   └── documents/            # DocumentCard, UploadModal, ShareModal, MoveFolderModal, RenameModal
│   │   ├── context/                  # ThemeContext, AuthContext, NotificationContext
│   │   ├── services/                 # api.js, authService, documentService, folderService, shareService, storageService
│   │   ├── utils/                    # formatters, fileValidation, scannerUtils
│   │   └── constants/                # colors, categories
│   │
│   ├── app.json                      # Android/iOS native configuration & permissions
│   ├── eas.json                      # EAS Build configuration for Android APK
│   ├── package.json
│   └── .env.example
│
├── server/                           # Node.js Express REST Backend API
│   ├── config/                       # Reusable MongoDB Atlas connection (db.js)
│   ├── controllers/                  # Auth, Document, Category, Folder, Share, Notification
│   ├── middleware/                   # JWT verification, Multer upload, error handling
│   ├── models/                       # User, Document, Category, Folder, ShareLink, Activity, Notification
│   ├── routes/                       # Express route definitions
│   ├── uploads/                      # Physical document storage
│   ├── test/                         # Automated test suite (test-runner.js)
│   ├── server.js                     # Main HTTP server entry
│   ├── app.js                        # Express application instance
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md
```

---

## 🎨 Design System & Color Palette

PaperlessDoc adheres to strict UI/UX design tokens for both **Light Mode** and **Dark Mode**:

| Element | Light Mode | Dark Mode |
|---|---|---|
| **Background** | `#F8FAFC` (Slate 50) | `#0B1120` (Deep Space Navy) |
| **Primary** | `#4F46E5` (Indigo 600) | `#818CF8` (Indigo 400) |
| **Secondary** | `#6366F1` (Indigo 500) | `#6366F1` (Indigo 500) |
| **Card Surface** | `#FFFFFF` (Pure White) | `#111827` (Rich Graphite) |
| **Secondary Card** | `#F1F5F9` (Slate 100) | `#1E293B` (Slate 800) |
| **Primary Text** | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) |
| **Muted Text** | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) |
| **Border** | `#E2E8F0` (Slate 200) | `#334155` (Slate 700) |
| **Success** | `#10B981` (Emerald) | `#34D399` (Emerald 400) |
| **Warning** | `#F59E0B` (Amber) | `#FBBF24` (Amber 400) |
| **Danger** | `#EF4444` (Rose) | `#F87171` (Rose 400) |

---

## 📂 Predefined Categories & Subcategories

1. **IDENTITY DOCUMENTS** (`#0284C7`)
   - Aadhaar Card, PAN Card, Voter ID, Passport, Driving Licence, Birth Certificate
2. **EDUCATIONAL DOCUMENTS** (`#4F46E5`)
   - 10th Marksheet, 12th Marksheet, Graduation Documents, Semester 1 to 8, Degree Certificate, Migration Certificate, Transfer Certificate, Character Certificate
3. **FINANCIAL DOCUMENTS** (`#059669`)
   - Bank Statements, Passbook, Cheque Documents, Insurance, Loan Documents, Tax Documents
4. **MEDICAL DOCUMENTS** (`#E11D48`)
   - Medical Reports, Prescriptions, Health Certificates, Blood Reports
5. **PERSONAL DOCUMENTS** (`#8B5CF6`)
   - Family Documents, Address Proof, Personal Certificates, Rental Agreements
6. **SCREENSHOTS AND IMAGES** (`#EC4899`)
   - Payment Screenshots, Transaction Receipts, Important Photos, Online Application Screenshots
7. **CERTIFICATES** (`#D97706`)
   - Internship Certificates, Experience Letters, Offer Letters, Completion Certificates, Achievement Certificates, Course Certificates
8. **OTHER DOCUMENTS** (`#64748B`)
   - General Notes, Miscellaneous Records, Custom User Folders

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (Node v24 supported)
- **npm** or **yarn**
- **Expo CLI** / **EAS CLI** (`npm install -g eas-cli`)

---

### 2. Backend Server Setup

```bash
# Navigate to the server folder
cd server

# Install dependencies
npm install

# Configure environment variables
# Copy template
cp .env.example .env

# Edit .env with your MongoDB Atlas credentials:
# PORT=5000
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/paperless?retryWrites=true&w=majority
# DB_NAME=paperless
# JWT_SECRET=your_super_secret_jwt_key

# Start the server
npm run dev
# Server will run on http://localhost:5000
```

---

### 3. Mobile App Setup

```bash
# Navigate to the mobile folder
cd ../mobile

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Edit mobile/.env:
# For physical Android device / emulator testing, set EXPO_PUBLIC_API_URL to your computer's LAN IP:
# EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api
# Or for local web/simulator:
# EXPO_PUBLIC_API_URL=http://localhost:5000/api

# Start Expo Development Server
npx expo start
```

---

## 🧪 Automated Testing

A complete automated end-to-end test runner is included in `server/test/test-runner.js`:

```bash
cd server
node test/test-runner.js
```

### Verified Test Cases:
- [x] Database Connectivity & Indexing
- [x] User Registration & bcrypt password hashing
- [x] User Login & JWT issuance
- [x] Protected route authentication (`GET /auth/me`)
- [x] Category listing with live document count & storage tallies
- [x] Folder creation, subfolders & document counts
- [x] Multipart file upload (PDF & Images with metadata)
- [x] Full-text search and category filtering
- [x] Favorite toggle & real-time dashboard statistics
- [x] Document rename & folder transfer
- [x] Secure password-protected share link generation & revocation
- [x] Recycle bin soft delete, restoration, and permanent purge

---

## 📱 Building the Android APK

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Log into your Expo Account
```bash
eas login
```

### Step 3: Configure Project
```bash
cd mobile
eas build:configure
```

### Step 4: Build Standalone Android APK (Preview Profile)
```bash
eas build --platform android --profile preview
```
*EAS Build will generate an installable `.apk` file ready to be sideloaded directly onto any physical Android device.*

### Step 5: Build Production Android App Bundle (AAB for Google Play Store)
```bash
eas build --platform android --profile production
```

---

## 🔐 Security Standards
- **Zero Raw Credentials in Mobile Code**: All database queries happen exclusively through the Express REST API.
- **Biometric App Lock**: Fingerprint and Face ID support via `expo-local-authentication`.
- **Encrypted Local Storage**: JWT tokens stored securely using `expo-secure-store`.
- **Unguessable 64-char Hex Share Links**: Temporary share links with optional password protection and configurable expiry (24h, 7d, 30d, Never).
- **Physical File Destruction**: Permanent deletion cleans both database records and physical disk files.

---

## 📄 License
This project is proprietary and confidential. Developed for the PaperlessDoc Ecosystem.
