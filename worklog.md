# Worklog

---
Task ID: 1
Agent: main (Super Z)
Task: Build «نگهبان آب» — 3D isometric water-management game (Next.js + R3F + Zustand)

Work Log:
- Initialized fullstack environment (Next.js 16 + Tailwind 4 + shadcn/ui)
- Installed three, @types/three, @react-three/fiber@9, @react-three/drei@10
- Wrote modular game code:
  * src/lib/city-config.ts — types, economy constants, 6 infrastructures, 6 random events, grading & Persian formatters
  * src/lib/city-store.ts — Zustand engine: yearly turn loop (2020→2036), supply/demand math, leakage, depreciation, taxes/maintenance, population dynamics, game-over rules
  * src/components/city/CityCanvas.tsx — orthographic iso camera rig (pan / wheel+pinch zoom / limited rotate Q-E-buttons), shadow rig
  * Weather.tsx — day/night cycle (75s), dynamic sky/fog/sun, event weather tints, rain InstancedMesh; exports dayState/dayDebug
  * Terrain.tsx — 6×3 build grid with hover green/red highlight + ghost preview, shader-wave river, dam wall (upgrades visually), roads
  * Buildings.tsx — 6 procedural low-poly infra meshes (rain tank w/ reserve-driven wave water, pipe station w/ flow rings + valve, treatment w/ rotating clarifier arms, dam station, recycling w/ spinning fan, desal w/ sphere tank + solar panels), pop-in animation, weathering tint
  * CityProps.tsx — houses w/ night windows, dynamic trees (lush↔withered), bushes, street lamps
  * NPCs.tsx — 6 cars (headlights at night) + 5 pedestrians with gait
  * Effects.tsx — chimney steam particle columns + construction dust burst
  * CityHUD.tsx — RTL Persian HUD: top bar (year/pop/budget/gauge/end-year), build side panel, supply-vs-demand bar, event log, camera buttons, mobile build sheet
  * Modals.tsx — yearly report statement + game-over report card (A–F) with history table
  * StartScreen.tsx, Game.tsx shell, page.tsx (dynamic ssr:false), layout.tsx (Vazirmatn, fa-IR RTL), globals.css (scrollbar, font)
- Fixed bugs found during browser testing:
  * eslint react-hooks/immutability false-positives → rule off
  * GhostPreview ref-during-render → material ref
  * INFRA_ICONS style prop type; redundant phase comparison
  * Ground top plane buried river/roads/platform → lowered ground top to −0.01
  * treatmentMult gate bug (rainTank count → treatment count)
- Browser-verified via agent-browser: start flow, hover/ghost/build, budget math (50→48), end-year report, full 16-year simulation (grade D), game-over modal + history, restart, flood rain + dark sky, drought withered trees, night darkness (pixel-verified 2.5×) + lamp glow, steam columns, mobile 390px layout
- Debug handles exposed on window for automated testing: __city, __dayDebug, __dayState, __scene

Stage Summary:
- Game fully functional and verified end-to-end; lint & tsc clean; dev server 200 OK
- Architecture mirrors requested structure (src/lib/city-*.ts + src/components/city/*.tsx)

---
Task ID: 2
Agent: main (Super Z)
Task: زیباسازی و کاربرپسندسازی بورد بازی «نگهبان آب» (board polish + UX)

Work Log:
- Terrain.tsx بازطراحی کامل شد:
  * کاشی‌های ساخت دولایه (پلینت سنگی + رویه چمن شطرنجی دو‌رنگ) با فریم درونی
  * Hover: برجستگی نرم کاشی + حلقه پالس‌دار سبز/قرمز + emissive
  * حالت ساخت فعال: حلقه سفید تنفس‌دار روی همه کاشی‌های خالی
  * GhostPreview با رنگ اختصاصی هر زیرساخت (به‌جای سبز ثابت)
  * قاب سنگی بورد با سایه‌بان تیره، ستون‌های گوشه و گوی طلایی
  * پیاده‌رو + خط‌کشی عابر پیاده، پل چوبی روی رودخانه، نی‌های دو ساحل
  * چمن‌های پچ‌پچ (۱۲ لکه)، ۷۲ گل InstancedMesh رنگی، ۸ صخره
- CityProps.tsx: فواره میدان با ستون آب پالس‌دار + حلقه موج، ۴ نیمکت پارک، ۵ تپه دورافتاده برای عمق افق
- CityCanvas.tsx: رویداد ZOOM_EVENT برای دکمه‌های زوم HUD (clamped 14..95)
- CityHUD.tsx:
  * نشان «بودجه ناکافی» + هزینه قرمز + غیرفعال‌سازی کارت؛ «پر» برای سقف ظرفیت
  * دکمه‌های زوم +/- در قاب عمودی شیشه‌ای با جداکننده
  * لغو ساخت با ESC / راست‌کلیک (با تشخیص درگ برای تداخل نداشتن با چرخش دوربین)
  * نوار پیشرفت دوره داخل چیپ سال، حباب آیکون چیپ‌ها، تیک ۲۵/۵۰٪ روی گیج + چیپ وضعیت (پایدار/هشدار/بحران)
  * چیپ «پوشش تقاضا ٪» با رنگ‌بندی، نقطه رنگی لاگ‌ها + پررنگ‌بودن تازه‌ترین، عنوان بخش لاگ
- Modals.tsx: هدر گرادیانی چسبان با آیکون، آیکون اختصاصی هر ۶ رخداد، نشان درجه با هاله نور، انیمیشن pop-in
- globals.css: کی‌فریم‌های hudSlideDown / popIn / softPulse
- رفع خطای TS literal type در رنگ کاشی؛ eslint و tsc پاک
- تست مرورگر: شروع، حلقه‌های حالت ساخت، Hover+Ghost رنگی، نشان بودجه ناکافی (بودجه ۰٫۸ میلیارد)، ساخت مخزن باران، مودال گزارش با آیکون رخداد سیل، ESC cancel، دکمه زوم، باران سیل، موبایل ۳90px — همه سالم
- اسکرین‌شات‌ها: /home/z/my-project/download/board-*.png

Stage Summary:
- بورد سه‌بعدی کاملاً شکیل‌تر شد: کاشی‌های شطرنجی با قاب سنگی، پل، فواره، گل و تپه
- UX: بازخورد بودجه، زوم دکمه‌ای، لغو با ESC/راست‌کلیک، پوشش تقاضا، وضعیت ذخیره
- منطق بازی دست‌نخورده؛ فایل‌های تغییر یافته: Terrain, CityProps, CityCanvas, CityHUD, Modals, globals.css

---
Task ID: 3
Agent: main (Super Z)
Task: تغییر «کارخانه بازیافت آب» به «سایت بازچرخانی آب» + حلقه بسته جاده‌ها (خروج نکردن ماشین‌ها از نقشه)

Work Log:
- تغییر نام زیرساخت recycling در کل بازی:
  * city-config.ts: name «سایت بازچرخانی آب»، short «بازچرخانی آب»، desc با حوضچه‌های تصفیه
  * layout.tsx (متادیتا) و StartScreen.tsx (متن داستان)
  * نام در کارت فروشگاه، لاگ رویداد و گزارش‌ها به‌صورت داینامیک از config می‌آید
- بازطراحی مدل سه‌بعدی (Buildings.tsx): RecyclingPlant → RecyclingSite
  * حذف فن اگزاست کارخانه‌ای؛ سالن فرآیند بنفش + دو حوضچه بازچرخانی دایره‌ای
    با آب بنفش موج‌دار (createWaterMaterial) و پل اسکراپر چرخان مخالف‌جهت
  * دودکش تهویه باریک دقیقاً در انکر بخار Effects (y=0.92) — ستون بخار بدون تغییر کار می‌کند
  * لوله انتقال بین حوضچه‌ها
- حلقه بسته جاده‌ها (Terrain.tsx):
  * طول دو جاده شرقی‌غربی ۲۶ → ۲۷٫۵ (لبه آسفالت x=±۱۳٫۷۵)
  * دو اتصال عمودی جدید در x=±۱۳ (همان بازه z اتصال میانی) → حلقه مستطیلی بسته
  * اصلاح دو لکه چمن که با جاده‌های جدید تداخل داشتند؛ ناحیه حذف گل‌ها برای اتصال‌ها گسترش یافت
- NPCها (NPCs.tsx بازنویسی کامل):
  * سیستم مسیر حلقه بسته: buildLoop (۴ خط مستقیم + ۴ قوس ۹۰°) و sampleAt (طول کمان + زاویه مماس)
  * ماشین‌ها: حلقه راست‌گرد (پیچ تنگ r=۰٫۳، لاین z=−۴٫۷۵/−۸٫۴۵، x=±۱۲٫۵۵) و چپ‌گرد
    (پیچ باز r=۰٫۸۸، لاین z=−۵٫۶۵/−۷٫۵۵، x=±۱۳٫۴۵) — ترافیک دوطرفه صحیح در دو لاین
  * عابران: حلقه پیاده‌رو بیرونی (z=−۴٫۲۵/−۸٫۹۵) و میانی (z=−۶٫۱۵/−۷٫۰۵) با چرخش در جهت حرکت
  * اسکریپت اعتبارسنجی scripts/validate-loop.ts: همه نقاط هر دو حلقه ماشین روی آسفالت (PASS)
- تست مرورگر: حلقه بسته در هر دو انتها، ماشین‌ها با لاین‌بندی درست، کارت و لاگ با نام جدید،
  ساخت سایت بازچرخانی و مدل جدید (حوضچه‌ها + دودکش)، بدون خطای کنسول
- اسکرین‌شات‌ها: /home/z/my-project/download/verify-*.png

Stage Summary:
- زیرساخت ششم حالا «سایت بازچرخانی آب» است — هم نام و هم ظاهر (سایت حوضچه‌ای به‌جای کارخانه)
- شبکه جاده حلقه بسته شد؛ ماشین‌ها و عابران در مسیر بسته می‌مانند و دیگر از نقشه خارج نمی‌شوند
- منطق بازی دست‌نخورده؛ فایل‌های تغییر یافته: city-config, layout, StartScreen, Buildings, Terrain, NPCs
- tsc و eslint پاک
