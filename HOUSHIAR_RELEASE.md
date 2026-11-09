# هوشیار ۲.۲.۱۴

- فعال‌سازی خودکار و پیش‌دستانهٔ زیرعامل‌ها (Automatic & proactive subagents)؛ مدل‌ها اکنون بدون نیاز به دستور صریح کاربر در هر پرامپت، در صورت نیاز به بررسی یا جستجوی گسترده در کد یا اجرای کارهای موازی، زیرعامل‌های تخصصی (`explore` و `general`) را به صورت خودکار فراخوانی می‌کنند.
- به‌روزرسانی پرامپت‌های سیستمی هسته و رفع محدودیت‌های قبلی که مانع از اجرای خودکار زیرعامل‌ها می‌شدند.

# هوشیار ۲.۲.۱۴

# هوشیار ۲.۲.۱۳

- برآورد دقیق‌تر توکن‌های غیر ASCII و متون فارسی در فشرده‌سازی خودکار و جلوگیری از سرریز کانتکست (Token.estimate).
- پشتیبانی کامل از خطاهای سرریز کانتکست پلن هوشیار با کدهای ۴۰۰ و ۴۲۹ و بازیابی خودکار بدون خرابی نشست (Automatic compaction & overflow recovery).
- اعمال سقف کانتکست پلن هوشیار (۲۰۰٬۰۰۰ توکن) از فیلدهای limits.max_context_tokens و context_limit و context.limit.
- امکان افزودن دستی آدرس مهارت‌ها (Skill Sources) در بخش تنظیمات افزونه‌ها (Project Extensions).
- راهنمای هماهنگی و تفکیک وظایف زیرعامل‌ها (Subagent orchestration) جهت انجام کارهای موازی و بازگشت به عامل اصلی.

# هوشیار ۲.۲.۱۲

- The built-in browser skill now guides frontend implementation through screenshots, real interactions, console/network inspection and source fixes followed by verification.
- Automatic compaction now uses the smaller of the model window and the account's plan context limit, including after model switches.
- Reply token limits also respect the account's plan limits.
- Structured gateway context-limit errors and Persian plan-context messages trigger compaction recovery without deleting the original chat history.

- Added a welcome title to the initial API-key connection dialog.
- Added persistent API connection and model reload buttons to the new-session screen.
- Model discovery retries every 30 seconds; manual reload uses the saved key and bypasses the model cache.

**این انتشار امضای معتبر ناشر ندارد. به‌دلیل محدودیت‌های ناشی از تحریم و هزینهٔ گواهی، نسخهٔ ویندوز بدون امضای معتبر و نسخهٔ مک با امضای محلی (ad-hoc)، بدون گواهی Developer ID و بدون notarization منتشر می‌شوند. ممکن است سیستم‌عامل هنگام نصب یا اجرا هشدار امنیتی نشان دهد.**

- هنگام پیوست عکس، محتوای فایل در حافظه کپی می‌شود تا ارسال پیام به دسترسی بعدی به فایل اصلی وابسته نباشد؛ این تغییر برای رفع خطای خواندن پیوست در مک اعمال شده است.
- هویت نصب دسکتاپ با نام Houshiar و شناسهٔ `ir.houshiar.desktop` از OpenCode جدا شد.
- تنظیمات دسکتاپ، هویت بسته‌های لینوکس و طرح پیوند `houshiar://` مستقل شدند.
- بستهٔ مک پیش از ساخت فایل‌های دانلودی، همراه با فایل‌های اجرایی داخلی امضای محلی می‌شود و صحت ساختار امضا بررسی می‌شود. این امضا اعتماد Gatekeeper را فراهم نمی‌کند و رفع همهٔ خطاهای اجرا را تضمین نمی‌کند.
- فایل راهنمای اصلی کاملاً فارسی شد و هشدار نبود امضای معتبر در ابتدای آن قرار گرفت.
- انتشار بدون گواهی Apple یا Azure امکان‌پذیر است؛ هیچ ادعایی مبنی بر تأیید برنامه توسط اپل یا مایکروسافت نداریم.

## دریافت و نصب

بسته‌های ویندوز ۶۴ بیتی، لینوکس ۶۴ بیتی و مک با تراشهٔ اپل یا پردازندهٔ اینتل از صفحهٔ انتشار همین مخزن قابل دریافت خواهند بود. ابزار خط فرمان همراه نسخهٔ دسکتاپ است و نصب جداگانهٔ OpenCode لازم نیست.

فایل `SHA256SUMS.txt` شامل مقدار درهم‌سازی فایل‌های انتشار است. بررسی آن خرابی یا تغییر فایل نسبت به نسخهٔ منتشرشده را مشخص می‌کند و جای امضای معتبر ناشر را نمی‌گیرد. توضیح کامل محدودیت‌ها در [راهنمای پروژه](./README.md) آمده است.

## محدودیت‌های فعلی

- ذخیره‌سازی و کشف سرویس ابزار خط فرمان و سرور هنوز از پیاده‌سازی مشترک با OpenCode استفاده می‌کنند؛ جداسازی نصب دسکتاپ به معنی جداسازی کامل همهٔ داده‌ها نیست.
- تنظیمات و داده‌های نصب قبلی به‌صورت خودکار منتقل نمی‌شوند.
- فایل‌های لازم برای به‌روزرسانی خودکار هنوز منتشر نمی‌شوند؛ نسخهٔ جدید را از صفحهٔ انتشارها دریافت کنید.
- نتیجهٔ اجرای واقعی بسته‌ها روی هر سیستم‌عامل باید پس از ساخت بررسی شود.

## مسیر ساخت نسخهٔ مک

گردش‌کار `houshiar-release` از مسیر امضای محلی اسکریپت `sign-desktop-macos.sh` با `OPENCODE_DRY_RUN=true` استفاده می‌کند. در این حالت گواهی انتشار، hardened runtime و notarization اعمال نمی‌شوند؛ ساختار امضا با `codesign --verify --deep --strict` بررسی می‌شود و سپس فایل‌های DMG و ZIP ساخته می‌شوند. مسیر امضای معتبر برای انتشارهای آینده در اسکریپت باقی است، اما این انتشار از آن استفاده نمی‌کند.
