OneHealth Design Pack (Landing + Logins + Worker Dashboard)

How to install (non-destructive):
1) Unzip this pack into your Laravel project ROOT. It will create/overwrite only the files shown below.
2) In routes/web.php, add this single line at the very bottom:
   require __DIR__.'/oh_routes.php';

3) Install frontend deps and run dev:
   npm install
   npm run dev

4) Start Laravel:
   php artisan serve
   Visit: http://127.0.0.1:8000/

Included files (relative to project root):
- routes/oh_routes.php
- resources/views/layouts/app.blade.php
- resources/views/landing.blade.php
- resources/views/auth/patient-login.blade.php
- resources/views/auth/worker-login.blade.php
- resources/views/worker/dashboard.blade.php
- resources/css/app.css  (Tailwind entry)
- tailwind.config.js
- postcss.config.js
- resources/js/app.js (ensures Vite boots)

Notes:
• Mobile-first Tailwind UI with soft card hover animations.
• Colors are under theme.extend.colors.oh in tailwind.config.js
• Replace placeholder form actions with your own auth routes/controllers.
