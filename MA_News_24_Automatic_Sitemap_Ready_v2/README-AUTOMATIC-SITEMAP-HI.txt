MA NEWS 24 - AUTOMATIC SITEMAP

Is ZIP mein poori website ki files aur Automatic Sitemap ka Netlify Function shamil hai.

DEPLOY:
1. ZIP ko extract karein.
2. Extract hone ke baad jo files/folders dikhte hain (index.html, news.html, about.html, contact.html, admin.html, netlify folder, netlify.toml, etc.), un sab ko ek saath Netlify par deploy karein.
3. Sirf netlify folder ya sirf function ZIP upload na karein.
4. Deploy complete hone ke baad browser mein ye URL kholein:
   https://inspiring-platypus-ac362f.netlify.app/sitemap.xml
5. Sitemap mein homepage, About, Contact aur Supabase mein status='published' wali sabhi news stories ke URLs aane chahiye.
6. Uske baad Google Search Console mein sitemap.xml ko dobara submit karein.

NOTE:
- Supabase ka sirf public publishable key istemal hua hai. Koi service-role/secret key nahi.
- Netlify deploy ke baad hi automatic sitemap active hoga.
- Is ZIP ko extract karke website ke root files ke roop mein deploy karein.
