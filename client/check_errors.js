import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
    page.on('requestfailed', req => console.error('REQUEST FAILED:', req.url(), req.failure().errorText));

    try {
        await page.goto('http://localhost:5174/booth/setup', { waitUntil: 'networkidle0' });
        console.log('Loaded setup successfully');
        
        // now go to /
        await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
        console.log('Loaded home successfully');
        
        // now go to /admin
        await page.goto('http://localhost:5174/admin', { waitUntil: 'networkidle0' });
        console.log('Loaded admin successfully');
    } catch(err) {
        console.error('Error navigating:', err);
    }

    await browser.close();
})();
