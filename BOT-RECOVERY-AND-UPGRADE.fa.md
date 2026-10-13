# راهنمای بازیابی و مقاوم‌سازی ArzPulse

این بسته بر پایهٔ پروژهٔ فعلی ArzPulse ساخته شده است. ظاهر سایت، `docs/index.html`، `docs/assets/app.js`، `docs/assets/app.css`، تنظیمات Page Insights و فایل‌های قیمت موجود عمداً بازطراحی یا جایگزین نشده‌اند. اصلاح‌ها روی Worker ربات، Worker زمان‌بندی بازار، نویسنده‌های GitHub و نگه‌داری تاریخچه متمرکزند.

## 1) تشخیص درست خطا

خطای زیر:

```text
! [rejected] main -> main (fetch first)
error: failed to push some refs
```

خطای Git non-fast-forward است. یعنی پس از checkout شدن Runner، شاخهٔ `main` در Remote جلوتر رفته و Commit محلی دیگر مستقیماً قابل Push نیست. این خطا به‌خودی‌خود هیچ نشانه‌ای از پر شدن Cloudflare KV یا خراب شدن توکن تلگرام نیست.

در پروژه سه فرایند می‌توانند نزدیک به هم اجرا شوند:

- GitHub Actions برای جمع‌آوری قیمت‌ها (زمان‌بندی جایگزین هر ۱۰ دقیقه)
- Worker بازار در Cloudflare که هر ۵ دقیقه `update-prices.yml` را dispatch می‌کند
- Workflow هفتگی `keep-alive.yml` که نیز روی `main` Commit می‌کند

اصلاح حاضر یک گروه `concurrency` مشترک به دو Workflow نویسنده می‌دهد و Push را با `fetch + rebase + retry` مقاوم می‌کند. اگر دو اجرا دقیقاً یک فایل JSON را تغییر داده باشند، به‌جای Force Push، Collector دوباره روی آخرین `main` اجرا می‌شود. هیچ `git push --force` یا بازنویسی تاریخچه انجام نمی‌شود.

اگر یک ریپوی **دیگر** هم مستقیماً به `mehrdadmb2/ArzPulse/main` Push کند، `concurrency` ریپوی ArzPulse نمی‌تواند آن ریپوی خارجی را قفل کند؛ حلقهٔ Retry تغییر Remote را مدیریت می‌کند، اما بهتر است تنظیمات `GITHUB_OWNER` و `GITHUB_REPO` پروژهٔ دیگر هم بررسی شود.

## 2) دو Worker متفاوت را اشتباه جایگزین نکن

| پوشه در این پروژه | وظیفه | Worker مقصد |
|---|---|---|
| `telegram-bot/` | Webhook تلگرام، فرمان‌ها، نمودار و گزارش کانال | Worker فعلی ربات: `arzpulse-bot` با URL `https://arzpulse-bot.game-developer-mb.workers.dev/` |
| `worker/` | فقط زمان‌بندی و Dispatch کردن Workflow قیمت‌ها هر ۵ دقیقه | Worker بازار فعلی با نام `arzpulse-market-updater` |

**کد `telegram-bot/index.js` را روی `arzpulse-market-updater` نگذار** و برعکس. این دو سرویس مستقل هستند.

## 3) وضعیت ذخیره‌سازی و پاک‌سازی خودکار

### داده‌های بازار

Snapshotهای بازار در GitHub Pages و مسیر `docs/data/` ذخیره می‌شوند، نه در KV ربات. Collector جدید:

- فایل‌های تاریخچهٔ قدیمی‌تر از پنجرهٔ نگه‌داری را خودکار حذف می‌کند؛ مقدار پیش‌فرض `HISTORY_KEEP_DAYS=30` است.
- برای هر روز حداکثر ۳۵۰ Snapshot نگه می‌دارد (`MAX_SNAPSHOTS_PER_DAY=350`).
- Snapshotهای یک دقیقه را ادغام می‌کند و اگر به سقف روزانه برسد داده‌ها را یکنواخت در طول روز نمونه‌گیری می‌کند.
- برای فایل JSON از نوشتن موقت و سپس Rename استفاده می‌کند تا فایل نیمه‌نوشته باقی نماند.
- Workflow با `git add -A docs/data/` حذف فایل‌های منقضی‌شده را نیز Commit می‌کند.
- حتی وقتی همهٔ upstreamها شکست بخورند، Workflow ابتدا تلاش می‌کند `meta.json` و پاک‌سازی امن را منتشر کند، سپس وضعیت نهایی Action را Failed نگه می‌دارد تا قطعی منبع پنهان نماند.

**محدودیت مهم:** حذف فایل از پوشهٔ فعلی ریپو، نسخه‌های قدیمی همان فایل را از Commitهای قدیمی Git پاک نمی‌کند؛ این روش اندازهٔ درخت فعلی را کنترل می‌کند اما کل تاریخچهٔ `.git` را کوچک نمی‌کند. برای حذف دائمی Blobهای قدیمی باید تاریخچه با ابزارهایی مثل `git filter-repo` بازنویسی و Force Push شود؛ این عملیات عمداً خودکار نشده چون خطر از دست رفتن Commitها، شاخه‌ها و لینک‌ها دارد.

### Cloudflare Workers KV

ربات از `SETTINGS_KV` برای یک مقدار کوچک به نام `channels` (فهرست مقصدهای گزارش خودکار) و یک Lock کوتاه‌عمر به نام `bot:refresh-lock:v1` استفاده می‌کند. Lock با `expirationTtl` منقضی می‌شود؛ تاریخچهٔ قیمت در KV ذخیره نمی‌شود. ربات عمداً تنظیمات کانال را موقع رسیدن سهمیه پاک نمی‌کند، چون این کار دادهٔ تنظیماتی واقعی کاربر را از بین می‌برد.

در پلن رایگان فعلی KV سهمیه‌های عملیاتی روزانه دارد: ۱۰۰٬۰۰۰ Read، و ۱٬۰۰۰ Write، Delete و List در روز، با ۱ گیگابایت فضای ذخیره‌سازی. وقتی یک سهمیه مصرف شود، همان نوع عملیات تا Reset روزانه ممکن است خطا بدهد. پاک کردن خودکار کلیدهای نامرتبط راه مطمئنی برای حل محدودیت Write نیست و حتی می‌تواند سهمیهٔ Delete را هم مصرف کند. منبع رسمی: [Cloudflare KV pricing](https://developers.cloudflare.com/kv/platform/pricing/) و [KV limits](https://developers.cloudflare.com/kv/platform/limits/).

## 4) فایل‌های تغییرکرده

### برای خطای GitHub Actions و نگه‌داری داده

- `.github/workflows/update-prices.yml`
- `.github/workflows/keep-alive.yml`
- `scripts/fetch-and-save.js`

### برای ربات و محافظت از endpointها

- `telegram-bot/index.js`
- `telegram-bot/wrangler.toml.example`
- `telegram-bot/package.json`
- `telegram-bot/tests/smoke.test.mjs`
- `telegram-bot/README.md`
- `worker/index.js`
- `worker/README.md`

فایل‌های اصلی UI و تنظیمات Page Insights در این نسخه دست نخورده باقی مانده‌اند.

## 5) مرحله‌به‌مرحله: اصلاح GitHub

1. از `main` یک Backup بگیر: در GitHub یک Tag یا Branch پشتیبان بساز.
2. فایل‌های سه‌گانهٔ بخش «نگه‌داری داده» بالا را از این پکیج در ریپو جایگزین کن.
3. پوشهٔ `telegram-bot/` و فایل‌های Worker را نیز اضافه/جایگزین کن.
4. Commit و Push کن. بهتر است ابتدا روی شاخه‌ای مانند `fix/arzpulse-recovery` تست کنی و بعد Merge کنی.
5. در GitHub برو به **Actions → Update Crypto Prices → Run workflow**.
6. در Log بررسی کن مراحل Collector، Commit/Push و گزارش نهایی دیده شوند. خطای Push در صورت جلو رفتن Remote تا پنج بار Retry می‌شود و Force Push اجرا نمی‌شود.
7. پس از اجرای موفق، بررسی کن `docs/data/latest.json` جدید باشد و پوشهٔ `docs/data/history/` حدود ۳۰ روز فایل تاریخچه داشته باشد.

Workflow هنوز زمان‌بندی ۱۰ دقیقه‌ای را به‌عنوان Fallback حفظ می‌کند و Worker بازار به اجرای هر پنج دقیقه ادامه می‌دهد. گروه مشترک و Retry اجازه می‌دهند دو زمان‌بندی با Push هم‌زمان مقابله کنند.

## 6) مرحله‌به‌مرحله: بازیابی Worker ربات

### Secrets در Cloudflare Worker با نام `arzpulse-bot`

در **Workers & Pages → arzpulse-bot → Settings → Variables and Secrets** این Secrets را بررسی کن:

- `TELEGRAM_BOT_TOKEN`
- `GITHUB_TOKEN`
- `ADMIN_SECRET`
- `TELEGRAM_WEBHOOK_SECRET` (توصیه‌شده)

`GITHUB_TOKEN` باید به همین ریپوی `mehrdadmb2/ArzPulse` دسترسی داشته و مجوز **Actions: write** داشته باشد تا دستور `workflow_dispatch` را فراخوانی کند. خود توکن را داخل فایل‌های GitHub یا `wrangler.toml` قرار نده.

### Variables

```text
GITHUB_OWNER=mehrdadmb2
GITHUB_REPO=ArzPulse
GITHUB_WORKFLOW=update-prices.yml
GITHUB_REF=main
DATA_STALE_MINUTES=15
BOT_ADMIN_IDS=123456789
```

`BOT_ADMIN_IDS` یک یا چند شناسهٔ **عددی** کاربر تلگرام است که با کاما جدا می‌شوند؛ username قبول نمی‌شود. پس از Deploy در ربات `/id` را بفرست و مقدار User ID را در این Variable قرار بده. این برای `/refresh` لازم است. دستورات `/setchannel` و `/stopchannel` داخل گروه/کانال فقط برای ادمین چت مجازند.

### Binding مهم

`SETTINGS_KV` را به **همان Namespace فعلی** متصل نگه دار. Namespace جدید نساز، مگر اینکه عمداً می‌خواهی فهرست کانال‌های قبلی از دسترس خارج شود. `telegram-bot/wrangler.toml.example` فقط نمونه است؛ اگر با Wrangler Deploy می‌کنی آن را به `telegram-bot/wrangler.toml` کپی کن و Namespace ID موجود را وارد کن.

### Deploy با Wrangler

از ریشهٔ ریپو در PowerShell:

```powershell
Copy-Item telegram-bot/wrangler.toml.example telegram-bot/wrangler.toml
# فایل telegram-bot/wrangler.toml را باز کن و SETTINGS_KV id را با ID همان Namespace موجود جایگزین کن.
npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN --config telegram-bot/wrangler.toml
npx wrangler secret put GITHUB_TOKEN --config telegram-bot/wrangler.toml
npx wrangler secret put ADMIN_SECRET --config telegram-bot/wrangler.toml
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET --config telegram-bot/wrangler.toml
npx wrangler deploy --config telegram-bot/wrangler.toml
```

اگر از Cloudflare Dashboard کد را جایگزین می‌کنی، همین Secrets/Variables و KV binding را در تنظیمات Worker موجود بررسی کن. Secretهای از قبل تنظیم‌شده معمولاً نیازی به تغییر ندارند، مگر اینکه مقدارشان اشتباه یا لغو شده باشد.

## 7) Webhook تلگرام را بررسی و دوباره ثبت کن

اگر `TELEGRAM_WEBHOOK_SECRET` را تازه اضافه کردی، باید Webhook تلگرام را نیز با همان مقدار ثبت کنی؛ وگرنه تلگرام درخواست بدون Header درست می‌فرستد و Worker پاسخ 401 می‌دهد.

در PowerShell:

```powershell
$token = Read-Host "Telegram bot token"
$secret = Read-Host "Telegram webhook secret"
$body = @{
  url = "https://arzpulse-bot.game-developer-mb.workers.dev/webhook"
  secret_token = $secret
  allowed_updates = '["message","channel_post"]'
}
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -ContentType "application/x-www-form-urlencoded" -Body $body
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo"
```

در نتیجهٔ `getWebhookInfo` این موارد را بررسی کن: `url` باید دقیقاً به `/webhook` همین Worker اشاره کند؛ `last_error_message` نباید خطای 401/404 بدهد؛ `pending_update_count` نباید مداوم افزایش یابد. برای شروع، `/start`، `/status` و `/prices` را در چت خصوصی بفرست.

## 8) Deploy کردن Worker زمان‌بندی بازار

این مرحله جدا از ربات است. فایل `worker/index.js` را فقط روی Worker موجود `arzpulse-market-updater` Deploy کن. Secret زیر را در همین Worker هم تنظیم کن تا endpoint دستی `/trigger` عمومی نباشد:

```powershell
npx wrangler secret put GITHUB_TOKEN --config worker/wrangler.toml
npx wrangler secret put ADMIN_SECRET --config worker/wrangler.toml
npx wrangler deploy --config worker/wrangler.toml
```

Cron از `worker/wrangler.toml` همان `*/5 * * * *` باقی می‌ماند و برای اجرای زمان‌بندی‌شده نیازی به `ADMIN_SECRET` ندارد. برای اجرای دستی `/trigger` باید درخواست `POST` و Header `Authorization: Bearer <ADMIN_SECRET>` ارسال شود؛ باز کردن URL در مرورگر با GET عمداً رد می‌شود.

## 9) تشخیص سریع

### Workerهای ArzPulse

- ربات: `https://arzpulse-bot.game-developer-mb.workers.dev/health`
- وضعیت کامل‌تر (با `ADMIN_SECRET`): `GET https://arzpulse-bot.game-developer-mb.workers.dev/diagnostics` و Header `Authorization: Bearer <ADMIN_SECRET>`
- این پاسخ‌ها Secret را نمایش نمی‌دهند؛ فقط نشان می‌دهند کدام Variable/Binding تنظیم شده است.

در PowerShell:

```powershell
$admin = Read-Host "ADMIN_SECRET"
Invoke-RestMethod -Headers @{ Authorization = "Bearer $admin" } -Uri "https://arzpulse-bot.game-developer-mb.workers.dev/diagnostics"
```

### تست‌های محلی

```powershell
cd telegram-bot
npm run check
npm test
cd ..
node --check scripts/fetch-and-save.js
node --check worker/index.js
```

تست‌ها بدون ارسال پیام واقعی به تلگرام، پاسخ Health، متد Webhook، اعتبارسنجی secret و قالب HTML پیام `/start` را شبیه‌سازی می‌کنند.

## 10) اگر ربات همچنان پاسخ نداد

1. آدرس `/health` را باز کن؛ اگر `telegramTokenConfigured` برابر `false` است، Secret با نام دقیق `TELEGRAM_BOT_TOKEN` در محیط Production وجود ندارد.
2. `/diagnostics` را با `ADMIN_SECRET` بخوان و `telegramWebhook.configured` و `lastErrorMessage` را بررسی کن.
3. `getWebhookInfo` را مستقیم از Telegram Bot API بررسی کن.
4. Cloudflare → `arzpulse-bot` → Logs را باز کن و دنبال `[telegram:...]`, `[webhook]`, `[market-data]`, `[chart]` بگرد.
5. اگر `/status` می‌گوید داده قدیمی است، در GitHub → Actions آخرین اجرای `Update Crypto Prices` را بررسی کن. باز بودن صفحهٔ Worker فقط به معنی زنده بودن Worker است و موفقیت تلگرام یا Collector را تضمین نمی‌کند.
6. اگر GitHub API خطای 401/403 داد، Token و مجوز `Actions: write` را بررسی کن. اگر Push با وجود Retry شکست خورد، branch rules/permissions و هر Writer دیگری که مستقیم روی `ArzPulse/main` می‌نویسد بررسی شود.

## 11) قالب پیام‌های تلگرام

- `<b>` برای تیترها و نمادها
- `<pre><code>...</code></pre>` برای جدول‌های Monospace با ستون‌های ثابت
- `<blockquote>` برای وضعیت تازگی، توضیح منبع و هشدارهای کوتاه
- نمودارها با QuickChart از طریق POST ساخته و به‌شکل فایل PNG به تلگرام ارسال می‌شوند؛ به URL طولانی تصویر متکی نیستند.

Telegram فرمت‌های HTML را پشتیبانی می‌کند؛ در صورت تشخیص خطای Parse مربوط به HTML، ربات یک بار به متن ساده برمی‌گردد. مرجع: [Telegram Bot API formatting options](https://core.telegram.org/bots/api#formatting-options).
