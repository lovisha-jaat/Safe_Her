# 🛡️ Safe Her

> **A women's safety companion app — empowering safety through technology.**

Safe Her is a modern, AI-powered personal safety application designed to protect women in real-time. With one-tap SOS alerts, live location tracking, AI safety assistance, and community-driven incident reporting, Safe Her transforms your phone into a powerful safety companion.

---

## 🌟 Features

### 🚨 Emergency SOS
- One-tap SOS button to instantly alert trusted contacts
- Sends real-time GPS location to emergency contacts
- Works even in low-network conditions

### 📞 Fake Call
- Trigger a realistic incoming call to escape uncomfortable situations
- Customizable caller name and ringtone
- Discreet and instant activation

### 🗺️ Live Map & Safety Score
- Interactive Leaflet-based map showing your current location
- Area safety score based on crowd-sourced incident data
- Visualize nearby reported incidents

### 🤖 AI Safety Assistant
- Powered by Google Gemini via Lovable AI Gateway
- Get instant safety advice, route guidance, and emergency tips
- Conversational, context-aware responses

### 📝 Incident Reporting
- Report incidents anonymously or publicly
- Geo-tagged reports help build a community safety map
- Admin dashboard for moderation and analytics

### 👥 Emergency Contacts
- Manage trusted contacts who receive your SOS alerts
- Quick-call functionality
- Verified contact system

### 🔐 Secure Authentication
- Email/password authentication via Lovable Cloud
- Row-Level Security (RLS) protecting user data
- Role-based access (user, moderator, admin)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui, Radix UI |
| **Animations** | Framer Motion |
| **Maps** | Leaflet, React-Leaflet |
| **Backend** | Lovable Cloud (Supabase) |
| **Database** | PostgreSQL with Row-Level Security |
| **Auth** | Supabase Auth |
| **Edge Functions** | Deno-based serverless functions |
| **AI** | Google Gemini |
| **Routing** | React Router v6 |
| **State** | TanStack Query |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- A Lovable account (for Cloud features)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd safe-her

# Install dependencies
npm install
# or
bun install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Environment Variables
Environment variables are auto-managed by Lovable Cloud. The `.env` file includes:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

> ⚠️ Do not edit `.env` manually — it is managed by Lovable Cloud.

---

## 🚨 Automatic SOS SMS (Supabase + Twilio)

The app includes a Supabase Edge Function at `supabase/functions/sos-alert/index.ts` that sends SOS SMS alerts automatically to registered emergency contacts.

### 1) One-time prerequisites

- Twilio account with:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - A valid SMS sender number (`TWILIO_FROM_NUMBER`)
- Supabase CLI login

```bash
npx supabase login
```

### 2) Apply SOS database migration

This creates:
- `emergency_contacts`
- `sos_alert_logs`

```bash
npx supabase db push --project-ref zivrfqepgytsvuvandun
```

### 3) Configure function secrets

Set required secrets on Supabase project:

```bash
npx supabase secrets set --project-ref zivrfqepgytsvuvandun TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
npx supabase secrets set --project-ref zivrfqepgytsvuvandun TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
npx supabase secrets set --project-ref zivrfqepgytsvuvandun TWILIO_FROM_NUMBER=+1XXXXXXXXXX
npx supabase secrets set --project-ref zivrfqepgytsvuvandun SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

### 4) Deploy the SOS edge function

```bash
npx supabase functions deploy sos-alert --project-ref zivrfqepgytsvuvandun
```

### 5) Verify

- Add emergency contacts in the app.
- Tap SOS.
- SMS should be sent automatically from backend (without opening SMS app).

---

## 📂 Project Structure

```
safe-her/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui primitives
│   │   └── settings/     # Settings panels
│   ├── pages/            # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── MapView.tsx
│   │   ├── AiAssistant.tsx
│   │   ├── ReportIncident.tsx
│   │   └── ...
│   ├── contexts/         # React contexts (Auth)
│   ├── hooks/            # Custom hooks
│   ├── integrations/     # Supabase client
│   └── lib/              # Utilities
├── supabase/
│   ├── functions/        # Edge functions (ai-chat)
│   ├── migrations/       # Database migrations
│   └── config.toml
└── public/               # Static assets
```

---

## 🗄️ Database Schema

- **`profiles`** — User profile data (name, phone, avatar, verification status)
- **`user_roles`** — Role-based access control (admin, moderator, user)
- **`incident_reports`** — Geo-tagged incident reports with anonymity support

All tables use **Row-Level Security (RLS)** to protect user data.

---

## 🎯 Unique Features

- ✅ **AI-Powered Assistance** — Real-time safety advice via Google Gemini
- ✅ **Anonymous Reporting** — Report incidents without revealing identity
- ✅ **Community Safety Score** — Crowd-sourced area safety metrics
- ✅ **Discreet Fake Call** — Escape hatch for uncomfortable situations
- ✅ **Mobile-First Design** — Optimized for on-the-go usage
- ✅ **Dark Mode Support** — Easy on the eyes, day or night

---

## 🔮 Future Scope

- 📱 Native mobile apps (iOS & Android via Capacitor)
- 🚓 Direct integration with local law enforcement APIs
- 🎙️ Voice-activated SOS triggering
- ⌚ Wearable device integration (smartwatches)
- 🌐 Multi-language support
- 📊 Advanced analytics dashboard for authorities
- 🛰️ Offline-first SOS via SMS fallback

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- **Supabase** — For the robust backend infrastructure
- **shadcn/ui** — For the beautiful UI component library
- **OpenStreetMap & Leaflet** — For the open-source mapping solution
- **Google Gemini** — For powering our AI safety assistant

---

## 📬 Contact & Support

Built with ❤️ for women's safety everywhere.

---

> *"Safety is not a privilege. It's a right."* — Safe Her Team
