# Sette opp X (Twitter), Instagram og TikTok

Denne guiden viser steg-for-steg hvordan du oppretter en app hos hver plattform og henter ut
nøklene appen trenger i `.env`. Gjør dette lokalt først med `NEXTAUTH_URL=http://localhost:3000` —
bytt til den ekte domene-URL-en når du deployer.

Uansett plattform kobler du kontoen til inne i appen på siden **Kontoer** (`/accounts`), som
sender deg videre til plattformens innloggingsside og tilbake igjen.

---

## X (Twitter)

1. Gå til [developer.twitter.com/en/portal/dashboard](https://developer.twitter.com/en/portal/dashboard)
   og logg inn med kontoen du vil poste fra. Har du ikke søkt om utviklertilgang før, må du
   gjøre det først (Free-nivået er nok til å komme i gang).
2. Opprett et **Project**, og en **App** inni prosjektet.
3. Åpne appen → fanen **"User authentication settings"** → **Set up** / **Edit**.
   - **App permissions**: velg **Read and write** (kreves for å publisere og laste opp media).
   - **Type of App**: **Web App, Automated App or Bot**.
   - **Callback URI / Redirect URL**: `http://localhost:3000/api/accounts/twitter/callback`
     (legg til den ekte domene-varianten i tillegg når du deployer, du kan ha flere).
   - **Website URL**: nettsiden din (kan være placeholder lokalt).
   - Lagre.
4. Gå til fanen **"Keys and tokens"** → under **"OAuth 2.0 Client ID and Client Secret"**,
   trykk **Generate** (hvis ikke allerede gjort) og kopier begge verdiene med én gang —
   secret vises kun én gang.
5. Legg dem inn i `.env`:
   ```
   TWITTER_CLIENT_ID="..."
   TWITTER_CLIENT_SECRET="..."
   ```
6. Ferdig — koble til kontoen fra `/accounts` i appen. Ingen App Review kreves for å bruke
   `tweet.write`/`media.write` med din egen konto.

---

## Instagram (via Meta Graph API)

Instagram-publisering går gjennom Meta, og krever at Instagram-kontoen er en
**forretnings- eller skaperkonto** koblet til en **Facebook-side** du administrerer.

### A. Gjør Instagram-kontoen klar
1. Åpne Instagram-appen → **Innstillinger** → **Kontotype** → sørg for at den er
   **Forretning** eller **Skaper** (ikke privat/vanlig konto).
2. Koble den til en Facebook-side: **Innstillinger** → **Konto** → **Koblede kontoer** → **Facebook**,
   og velg (eller opprett) siden du administrerer. Uten dette finner appen ingen Instagram-konto
   å publisere til.

### B. Opprett Meta-appen
3. Gå til [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App**
   → velg type **Business**.
4. Inne i appen, gå til **"Add Product"** og legg til:
   - **Instagram Graph API**
   - **Facebook Login** (brukes til selve OAuth-dialogen)
5. Under **Facebook Login → Settings**, legg til under **Valid OAuth Redirect URIs**:
   `http://localhost:3000/api/accounts/instagram/callback`
6. Gå til **App settings → Basic** og kopier **App ID** og **App Secret**:
   ```
   INSTAGRAM_APP_ID="..."
   INSTAGRAM_APP_SECRET="..."
   ```
7. Gå til **App roles → Roles** og legg til din egen Facebook-konto som **Administrator**
   eller **Tester** — uten dette får du ikke lov til å koble til noe før appen er godkjent.

### C. App Review (kreves før andre enn testere kan bruke den)
8. Så lenge appen er i **Development mode**, virker den kun for kontoer lagt til under
   **Roles**. For å la andre brukere koble til sine egne Instagram-kontoer, må du sende inn
   **App Review** og be om disse tillatelsene:
   `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`,
   `business_management`. Meta krever en skjermopptak/demo av flyten og en personvernerklæring-URL.
   Dette kan ta fra noen dager til et par uker.
9. Vil du kun poste til din egen konto (typisk for et privat/internt verktøy), holder det å
   legge deg selv til som Tester — da trenger du ikke vente på App Review i det hele tatt.

---

## TikTok

TikToks **Content Posting API** (det som lar appen faktisk legge ut videoer) krever godkjenning
fra TikTok før den kan brukes av andre enn testbrukere du selv legger til.

1. Gå til [developers.tiktok.com](https://developers.tiktok.com/) → logg inn/registrer deg som
   utvikler → **Manage apps** → **Create an app**.
2. Under **"Add products"** i appen, legg til:
   - **Login Kit**
   - **Content Posting API**
3. Under **Login Kit → Redirect URI**, legg til:
   `http://localhost:3000/api/accounts/tiktok/callback`
4. På appens forside finner du **Client key** og **Client secret**:
   ```
   TIKTOK_CLIENT_KEY="..."
   TIKTOK_CLIENT_SECRET="..."
   ```
5. Under **Content Posting API**-siden i appen:
   - Legg til scope **`video.publish`**.
   - Under **"Target users"** (sandbox-modus), legg til TikTok-brukernavnene til de kontoene
     som skal kunne teste posting før appen er godkjent.
   - Under **domeneverifisering**, legg til og verifiser domenet som video-filene serveres fra
     (det domenet appen din kjører på i produksjon — samme domene som `NEXTAUTH_URL`). Dette
     kreves fordi appen sender ferdige videoer til TikTok som en URL (`PULL_FROM_URL`), ikke som
     en opplastet fil, og TikTok stoler kun på verifiserte domener for det.
6. Send inn **App Review** når du vil at appen skal virke for andre enn testbrukerne dine.
   Godkjenning for `video.publish` kan ta fra noen dager til et par uker, og TikTok kan be om
   en skjermopptak av posting-flyten.

**Viktig:** frem til appen er godkjent, kan videoer kun publiseres til kontoer som står
oppført under "Target users" i sandbox-innstillingene — ellers feiler publiseringen med en
tillatelsesfeil, selv om OAuth-tilkoblingen i seg selv gikk fint.

---

## Rask sjekkliste

| Plattform | Krever App Review for å bruke selv | Krever App Review for andre brukere |
|---|---|---|
| X (Twitter) | Nei | Nei (avhengig av API-nivå/volum) |
| Instagram | Nei (legg deg til som Tester) | Ja |
| TikTok | Nei (legg deg til som Target user) | Ja |

Så lenge du bare skal poste til dine egne kontoer, kan du hoppe over App Review helt — bare
sørg for å legge din egen konto til som tester/target user der det trengs (Instagram og TikTok).
