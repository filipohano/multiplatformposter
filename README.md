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

Opplastede filer lagres i `public/uploads/` lokalt. Dette fungerer for lokal utvikling og
enkle servere, men **overlever ikke** på serverless-plattformer (Vercel, Netlify) fordi
filsystemet der er skrivebeskyttet/midlertidig. For produksjon, bytt ut `src/app/api/upload/route.ts`
til å laste opp til S3, Cloudinary, Vercel Blob e.l. og returnere den offentlige URL-en derfra —
alle plattform-adapterne forventer bare en offentlig tilgjengelig media-URL, så resten av appen
trenger ingen endring.

## Planlagt publisering i produksjon

`/api/cron/publish` er beskyttet med `CRON_SECRET` (send som `Authorization: Bearer <secret>`
eller `?secret=`). Sett opp en ekte cron-jobb til å kalle dette endepunktet hvert minutt, f.eks.
med [Vercel Cron](https://vercel.com/docs/cron-jobs) (se `vercel.json`, husk å bytte ut
`CRON_SECRET_PLACEHOLDER` med den ekte hemmeligheten før du deployer) eller en GitHub Actions
scheduled workflow.

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
