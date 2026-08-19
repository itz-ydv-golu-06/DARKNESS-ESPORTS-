# DARKNESS ESPORTS — Phase 1 + 2 + 3

**Phase 1 (Foundation):**
- Landing page (hero, lineup/tournament/recruitment/results section shells)
- Real account creation, login, logout via Firebase Authentication
- Session persistence ("remember me"), forgot-password email flow
- Mobile-responsive layout, nav-aware login state

**Phase 2 (Player registration & profiles):**
- Full registration form: IGN, Free Fire UID (validated, unique), age, region, preferred role, contact/Discord/Instagram, photo URL, bio
- Public player profile pages at `profile.html?u=username` — avatar, stats, bio, UID with copy button, join date
- Player status system (Available / In Match / Busy / Offline / Looking For Team / Substitute) — changeable from the dashboard, shown as a colored pill on the profile and dashboard
- Editable dashboard: change status, edit IGN/region/role/contact/bio/photo, save straight to Firestore

**Phase 3 (Teams & lineup):**
- Create a team (`create-team.html`) — name, tag, logo, description, contact; creator becomes captain automatically
- Browse all teams (`teams.html`)
- Team page (`team.html?id=teamId`) — roster split into Main / Substitutes, public to everyone
- Captain controls (visible only to the captain, on their own team's page): invite a player by username, change a member's role, move a member between Main/Sub, remove a member
- Invitations: a player can't self-join — the captain invites, and the invited player accepts or declines from their dashboard ("Team Invitations" section)
- A player can only be on one team at a time (`users/{uid}.teamId`); joining, leaving, or being removed keeps that field in sync
- Official roster page (`team-lineup.html`) mirrors the spec's dedicated "Current Lineup" page — it shows whichever team has `isOfficialRoster: true`. Since the admin panel is Phase 5, set that flag manually on the intended team's document in the Firestore console for now.

**Note on photos:** profile and team logos are pasted image URLs for now, not file uploads. Real uploads need Firebase Storage, which we can add in a later pass if you want it.

## 1. Create your Firebase project

1. Go to https://console.firebase.google.com and create a project (the free Spark plan works).
2. On the project overview page, click the **`</>`** (Web) icon to register a web app.
3. Copy the `firebaseConfig` object it gives you.
4. Paste those values into `js/firebase-config.js` (replace the `PASTE_YOUR_...` placeholders).

## 2. Turn on Authentication

In the Firebase console: **Build → Authentication → Sign-in method → Email/Password → Enable**.

## 3. Turn on Firestore

**Build → Firestore Database → Create database** (choose *production mode*, pick a region close to your players).

Then publish the included rules: **Firestore → Rules**, paste the contents of `firestore.rules`, and click Publish. These rules let anyone read player profiles but only let a user create/edit their own document — every later phase will extend this file with rules for teams, tournaments, etc.

## 4. Run it locally

No build step — just open `index.html` in a browser, or serve the folder with any static server, e.g.:

```
npx serve .
```

## 5. Deploy to GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo **Settings → Pages → Source**, pick your branch and `/ (root)`.
3. Your site will be live at `https://<username>.github.io/<repo>/`.

## What's next

- **Phase 4**: tournaments — listings, registration flow, admin management
- **Phase 5**: admin panel (users, players, tournaments, teams, announcements) — including flagging the official roster
- **Phase 6**: leaderboard, match results, scrims, notifications, search, PWA

## File structure

```
darkness-esports/
├── index.html          landing page
├── register.html        create account (full player profile fields)
├── login.html            login
├── dashboard.html        protected dashboard — status, edit profile, my team, invites
├── profile.html           public player profile (profile.html?u=username)
├── teams.html            browse all teams
├── create-team.html      create a team (becomes captain)
├── team.html              team roster + captain controls (team.html?id=teamId)
├── team-lineup.html      official DARKNESS ESPORTS roster page
├── firestore.rules       Firestore security rules
├── css/style.css        full design system
└── js/
    ├── firebase-config.js   your Firebase project keys go here
    ├── auth.js              register/login/logout + dashboard guard
    ├── profile.js            status metadata + public profile rendering
    ├── dashboard.js          status changer, edit-profile, my team, invites
    ├── teams.js              create/browse/manage teams, invites, official lineup
    └── main.js              nav, toasts, auth-aware navbar
```
