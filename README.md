# MultiPoster

En web-app (fungerer som nettside og kan installeres som app på iOS/Android via PWA) for å
skrive én bildetekst og publisere — eller planlegge — innlegg til **Instagram**, **X (Twitter)**
og **TikTok** samtidig, fra samme sted.

## Funksjonalitet

- E-post/passord-innlogging (NextAuth)
- Koble til kontoer på Instagram, X (Twitter) og TikTok via hver plattforms offisielle OAuth-flyt
- Skriv én bildetekst, last opp bilde(r)/video, og velg hvilke tilkoblede kontoer innlegget skal ut på
- Publiser umiddelbart, eller planlegg til et fremtidig tidspunkt
- Oversikt over utkast/planlagte/publiserte innlegg med status per plattform (inkl. feilmeldinger)
- Installerbar som app på iPhone (Legg til på Hjem-skjerm) via `manifest.json` + Apple-metatags

## 🚂 Deploy til Railway (steg for steg)

Denne guiden er skrevet slik at **hvem som helst** kan starte sin egen kjørende kopi av appen —
du trenger **ikke** tilgang til GitHub-kontoen som eier dette repoet, siden repoet er offentlig.
Du trenger bare din egen (gratis) GitHub-konto og en Railway-konto.

### 1. Lag din egen kopi av koden (fork)

1. Gå til repoets side på GitHub (den offentlige URL-en du fikk delt).
2. Øverst til høyre, trykk **Fork**.
3. La navnet stå som foreslått og trykk **Create fork**.
4. Du har nå din egen kopi på `github.com/DITT-BRUKERNAVN/multiplatformposter` som du eier fullt
   ut og kan koble Railway til — helt uavhengig av den opprinnelige kontoen.

*(Vil du heller slippe å forke? Se "Alternativ: uten fork" helt nederst i denne seksjonen.)*

### 2. Opprett en Railway-konto

1. Gå til [railway.app](https://railway.app) → **Login**.
2. Velg **Login with GitHub** (enklest — da kan Railway lese repoene dine i neste steg).
3. Første gang du kobler til, blir du bedt om å gi Railway sin GitHub-app tilgang. Velg
   **"Only select repositories"** og huk av kun for din nye fork — du trenger ikke gi Railway
   tilgang til alt du eier på GitHub.

### 3. Opprett prosjektet fra forken din

1. Fra Railway-dashbordet: **New Project** → **Deploy from GitHub repo**.
2. Velg `DITT-BRUKERNAVN/multiplatformposter` fra listen. Dukker den ikke opp, trykk
   **Configure GitHub App** og gi Railway tilgang til det repoet spesifikt.
3. Railway starter automatisk en første bygg/deploy. Det er helt normalt at denne feiler nå —
   vi mangler database og miljøvariabler ennå. Fortsett til neste steg.
4. Ingen egen build-konfigurasjon trengs: Railway sin bygger (Nixpacks) gjenkjenner
   `package.json` automatisk og kjører `npm install`, `npm run build` og `npm start`.

### 4. Legg til en Postgres-database

1. Inne i prosjektet: **+ Create** (eller **New**) → **Database** → **Add PostgreSQL**.
2. Railway oppretter en egen boks kalt noe sånt som **Postgres** i prosjektet ditt, med sin
   egen `DATABASE_URL`.

### 5. Sett miljøvariabler på web-tjenesten

1. Klikk på tjenesten som heter noe med `multiplatformposter` (ikke Postgres-boksen).
2. Gå til fanen **Variables**.
3. Koble databasen til: trykk **+ New Variable**, kall den `DATABASE_URL`, og sett verdien til
   `${{Postgres.DATABASE_URL}}` (Railway sin syntaks for å peke til en annen tjeneste i samme
   prosjekt — bytt `Postgres` ut med det faktiske navnet Railway ga databasen, hvis det er
   annerledes). Noen Railway-versjoner viser i stedet en **"Add Reference"**-knapp der du kan
   velge databasen fra en liste — bruk den hvis du ser den, resultatet blir det samme.
4. Legg så til disse variablene (bruk gjerne **Raw Editor**-knappen i Variables-fanen for å lime
   inn alt på én gang):

   ```
   NEXTAUTH_URL=
   NEXTAUTH_SECRET=
   CRON_SECRET=
   TWITTER_CLIENT_ID=
   TWITTER_CLIENT_SECRET=
   INSTAGRAM_APP_ID=
   INSTAGRAM_APP_SECRET=
   TIKTOK_CLIENT_KEY=
   TIKTOK_CLIENT_SECRET=
   ```

   - `NEXTAUTH_URL` fyller du inn i **steg 6** under (du trenger domenet først).
   - For `NEXTAUTH_SECRET` og `CRON_SECRET`: åpne en terminal og kjør kommandoen under to
     ganger, og lim inn hvert resultat i sin egen variabel:
     ```bash
     openssl rand -base64 32
     ```
   - `TWITTER_...`, `INSTAGRAM_...` og `TIKTOK_...` kan stå tomme foreløpig — appen fungerer
     fint uten dem, men publisering til den aktuelle plattformen feiler med en tydelig
     feilmelding helt til du fyller dem inn. Se **[docs/SETUP.md](docs/SETUP.md)** for nøyaktig
     hvordan du får tak i disse nøklene.

### 6. Generer et offentlig domene

1. Fortsatt på web-tjenesten: fanen **Settings** → **Networking** → **Public Networking**.
2. Trykk **Generate Domain**.
3. Kopier domenet (noe sånt som `multiplatformposter-production.up.railway.app`).
4. Gå tilbake til **Variables** og sett `NEXTAUTH_URL` til `https://` + dette domenet
   (uten skråstrek på slutten). Dette trigger automatisk en ny deploy.

### 7. Legg til lagringsplass for opplastede bilder/videoer

Appen lagrer opplastede filer i `public/uploads/` på disk. Uten et eget volum forsvinner disse
hver gang du deployer på nytt.

1. Web-tjenesten → **Settings** → **Volumes** → **+ New Volume**.
2. **Mount path**: `/app/public/uploads`
3. Trykk **Add**. Dette trigger nok en ny deploy automatisk.

### 8. Sett opp automatisk publisering av planlagte innlegg

Railway kaller ikke `/api/cron/publish` av seg selv. Enkleste løsning: bruk en gratis ekstern
tjeneste som [cron-job.org](https://cron-job.org):

1. Opprett en konto og en ny cron-jobb.
2. URL: `https://DITT-DOMENE.up.railway.app/api/cron/publish?secret=DIN_CRON_SECRET`
   (bruk den samme verdien du satte som `CRON_SECRET` i steg 5).
3. Intervall: hvert minutt.

### 9. Ferdig — test appen

1. Besøk `https://DITT-DOMENE.up.railway.app` — du bør se forsiden.
2. Trykk **Kom i gang** og registrer en bruker.
3. Gå til **Kontoer** og koble til de plattformene du har API-nøkler for.
4. Lag et innlegg på **Nytt innlegg**.

For å installere appen på en iPhone: åpne domenet i Safari → **Del** → **Legg til på
Hjem-skjerm**.

### Fremtidige oppdateringer

Fordi Railway er koblet til forken din, vil enhver `git push` til `main` i din fork automatisk
trigge en ny deploy. Vil du hente inn nye endringer fra det opprinnelige repoet, gå til GitHub-
siden til forken din og trykk **Sync fork** → **Update branch**.

### Alternativ: uten fork (Railway CLI)

Vil du unngå å opprette en fork på GitHub, kan du deploye direkte fra en lokal kopi av koden:

```bash
git clone <URL-en til det offentlige repoet>
cd multiplatformposter
npm install -g @railway/cli
railway login
railway init
railway up
```

Du må fortsatt gjøre steg 4–7 over manuelt (database, variabler, domene, volum) i Railway sitt
dashbord, men slipper steg 1–3. Ulempen: ingen automatisk deploy ved nye endringer — du må kjøre
`railway up` på nytt selv hver gang.

## Teknologi

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Prisma** + PostgreSQL (samme database lokalt og i produksjon — kjør lokalt via `docker compose`)
- **NextAuth** (credentials-provider) for autentisering
- Plattform-integrasjoner i `src/lib/platforms/`:
  - `twitter.ts` — OAuth 2.0 (PKCE) + `twitter-api-v2` for tweet + media-opplasting
  - `instagram.ts` — Meta Graph API (Facebook-side → tilkoblet Instagram-forretningskonto)
  - `tiktok.ts` — TikTok Content Posting API (Direct Post via `PULL_FROM_URL`)
- Planlagte innlegg publiseres av `/api/cron/publish`, ment til å trigges av en ekstern cron
  (Vercel Cron, GitHub Actions, `cron-job.org` e.l.) hvert minutt

## Kom i gang lokalt

*(Vil du bare deploye appen til Railway uten å kjøre noe lokalt, se "Deploy til Railway"
øverst i denne filen i stedet.)*

Krever [Docker](https://www.docker.com/) for en lokal Postgres-database (samme database som i
produksjon — ingen SQLite/Postgres-forskjeller å bekymre seg for).

```bash
npm install
cp .env.example .env    # fyll inn NEXTAUTH_SECRET, CRON_SECRET og evt. API-nøkler
docker compose up -d    # starter en lokal Postgres på localhost:5432
npx prisma migrate deploy
npm run dev
```

Har du ikke Docker installert, kan du i stedet peke `DATABASE_URL` i `.env` mot en hvilken som
helst annen Postgres-database (f.eks. en gratis Neon/Supabase-database) og kjøre samme
`npx prisma migrate deploy` mot den.

Appen kjører på http://localhost:3000. For at planlagte innlegg skal publiseres automatisk
lokalt, kjør i et eget terminalvindu:

```bash
npm run cron:local
```

(Dette poller `/api/cron/publish` hvert minutt — i produksjon bruker du en ekte cron-jobb, se under.)

## Sette opp API-tilgang per plattform

Uten API-nøkler kan du fortsatt logge inn, lage innlegg og se dem i UI-et — selve
publiseringen mot plattformen vil feile med en tydelig feilmelding til den er koblet til
ekte nøkler. Callback-URL-ene under forutsetter `NEXTAUTH_URL=http://localhost:3000` lokalt.

For en detaljert, klikk-for-klikk-guide til hver plattform (hvor du finner nøklene, hvilke
scopes du trenger, og når App Review faktisk kreves), se **[docs/SETUP.md](docs/SETUP.md)**.

### X (Twitter)
1. Opprett en app på [developer.twitter.com](https://developer.twitter.com) med **OAuth 2.0** aktivert (User authentication settings).
2. Legg til callback-URL: `{NEXTAUTH_URL}/api/accounts/twitter/callback`
3. Sett `TWITTER_CLIENT_ID` og `TWITTER_CLIENT_SECRET` i `.env`.
4. Kontoen som kobles til må ha skriverettigheter (`tweet.write`) — appen ber om `offline.access`
   for refresh-token, men selve token-refresh er ikke koblet til automatisk ennå.

### Instagram
1. Opprett en app på [developers.facebook.com](https://developers.facebook.com) og legg til
   produktet **Instagram Graph API**.
2. Instagram-kontoen må være en **forretnings- eller skaperkonto**, koblet til en Facebook-side.
3. Legg til redirect-URI: `{NEXTAUTH_URL}/api/accounts/instagram/callback`
4. Sett `INSTAGRAM_APP_ID` og `INSTAGRAM_APP_SECRET` i `.env`.
5. Scopes som `instagram_content_publish` krever App Review fra Meta før appen kan brukes av
   andre enn testbrukere lagt til i appens dashboard.

### TikTok
1. Opprett en app på [developers.tiktok.com](https://developers.tiktok.com) med **Login Kit**
   og **Content Posting API** (scope `video.publish`).
2. Legg til redirect-URI: `{NEXTAUTH_URL}/api/accounts/tiktok/callback`
3. Sett `TIKTOK_CLIENT_KEY` og `TIKTOK_CLIENT_SECRET` i `.env`.
4. `video.publish` og `PULL_FROM_URL` (henting av video fra en URL) krever at appen er
   godkjent av TikTok og at domenet som serverer videoene er domeneverifisert i appens
   dashboard. Frem til godkjenning kan videoer kun sendes som utkast til appens egne
   testbrukere.

## Medielagring

Opplastede filer lagres i `public/uploads/` på disk. På Railway løses dette med et **volum**
montert på `/app/public/uploads` (se steg 7 i Railway-guiden over) — filene overlever da
omstart og nye deploys. Dette fungerer **ikke** på rene serverless-plattformer (Vercel, Netlify)
siden filsystemet der er skrivebeskyttet/midlertidig; vil du dit i stedet, må
`src/app/api/upload/route.ts` byttes ut til å laste opp til S3/Cloudinary/Vercel Blob og
returnere den offentlige URL-en derfra — alle plattform-adapterne forventer bare en offentlig
tilgjengelig media-URL, så resten av appen trenger ingen endring.

## Planlagt publisering i produksjon

`/api/cron/publish` er beskyttet med `CRON_SECRET` (send som `Authorization: Bearer <secret>`
eller `?secret=`). På Railway, se steg 8 i guiden over (cron-job.org). Deployer du et annet
sted, fungerer [Vercel Cron](https://vercel.com/docs/cron-jobs) (se `vercel.json`, husk å bytte
ut `CRON_SECRET_PLACEHOLDER` med den ekte hemmeligheten) eller en GitHub Actions scheduled
workflow like bra.

## Prosjektstruktur

```
src/
  app/                 App Router-sider og API-ruter
    api/accounts/[platform]/connect|callback   OAuth-start og -callback per plattform
    api/social-accounts/[id]                   Koble fra en konto
    api/posts, api/posts/[id]                  Opprette/liste/slette/publiser-nå
    api/upload                                 Medieopplasting
    api/cron/publish                           Publiserer forfalte planlagte innlegg
  components/          Klientkomponenter (skjemaer, knapper, navbar)
  lib/
    platforms/         Én adapter per plattform + felles typer
    scheduler.ts        Kjernelogikk for å publisere en post til alle mål
    auth.ts, session.ts NextAuth-oppsett og hjelpefunksjoner
prisma/schema.prisma   Datamodell (User, SocialAccount, Post, PostTarget)
```
