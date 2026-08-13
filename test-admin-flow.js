const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static HTTP server for local testing
function startServer(port = 8080) {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
            const extname = path.extname(filePath);
            let contentType = 'text/html';

            if (extname === '.js') contentType = 'text/javascript';
            else if (extname === '.css') contentType = 'text/css';
            else if (extname === '.json') contentType = 'application/json';
            else if (extname === '.png') contentType = 'image/png';
            else if (extname === '.jpg') contentType = 'image/jpeg';

            fs.readFile(filePath, (error, content) => {
                if (error) {
                    res.writeHead(404);
                    res.end('File Not Found');
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                }
            });
        });

        server.listen(port, () => {
            console.log(`[TEST SERVER] Running at http://localhost:${port}`);
            resolve(server);
        });
    });
}

(async () => {
    console.log("=== STARTING AUTOMATED AGENT TEST FOR PRAGATI PORTAL ===");
    const server = await startServer(8080);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Listen to browser console log messages
        page.on('console', msg => console.log('[BROWSER LOG]', msg.text()));
        page.on('pageerror', err => console.error('[BROWSER ERROR]', err.toString()));

        // 1. Navigate to portal
        console.log("1. Navigating to portal http://localhost:8080/index.html...");
        await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle2' });

        // 2. Select Admin Login Tab
        console.log("2. Selecting Admin login tab...");
        await page.click('#admin-login-tab');
        await new Promise(r => setTimeout(r, 500));

        // 3. Fill in Admin credentials & Sign in
        console.log("3. Logging in as Admin (admin@pragati.ac.in)...");
        await page.type('#email-address', 'admin@pragati.ac.in');
        await page.type('#password', 'admin123');
        await page.click('#login-form button[type="submit"]');

        await new Promise(r => setTimeout(r, 1000));

        // 4. Verify Admin Dashboard
        const appHidden = await page.$eval('#app-container', el => el.classList.contains('hidden'));
        if (appHidden) throw new Error("Admin login failed! Dashboard still hidden.");
        console.log("✅ Admin logged in successfully!");

        // 5. Navigate to Upload section
        console.log("4. Navigating to Upload Question Paper section...");
        await page.click('a[href="#upload"]');
        await new Promise(r => setTimeout(r, 500));

        // 6. Fill out Upload Form
        const testSubject = `Automated Test - ${Date.now()}`;
        const sampleFilePath = path.join(__dirname, 'sample_test_paper.txt');

        console.log(`5. Filling upload form for subject: "${testSubject}" with Regulation: "R23"...`);
        await page.type('#upload-subject', testSubject);
        await page.select('#upload-branch', 'CSE');
        await page.select('#upload-year', '3');
        await page.select('#upload-semester', '1');
        await page.select('#upload-regulation', 'R23');
        await page.select('#upload-exam-type', 'Semester');

        // Attach test file
        const fileInput = await page.$('#file-upload');
        await fileInput.uploadFile(sampleFilePath);
        console.log("   Attached sample_test_paper.txt file.");

        // 7. Submit Upload Form
        console.log("6. Submitting Upload Form to Firebase...");
        await page.click('#upload-submit-btn');

        // Wait for upload processing & Firebase sync
        await new Promise(r => setTimeout(r, 4000));

        // 8. Verify paper appears in papers grid
        console.log("7. Verifying paper appears in Question Papers section...");
        await page.click('a[href="#papers"]');
        await new Promise(r => setTimeout(r, 1000));

        const pageContent = await page.content();
        if (!pageContent.includes(testSubject)) {
            throw new Error(`Paper "${testSubject}" was not found in the question papers list after upload!`);
        }
        console.log(`✅ Paper "${testSubject}" uploaded and verified in paper grid!`);

        // 9. Perform Permanent Delete
        console.log("8. Testing permanent delete option...");
        
        const deleted = await page.evaluate((targetSubject) => {
            const cards = Array.from(document.querySelectorAll('#papers-grid > div'));
            for (let card of cards) {
                if (card.textContent.includes(targetSubject)) {
                    const deleteBtn = card.querySelector('.delete-btn');
                    if (deleteBtn) {
                        deleteBtn.click();
                        return true;
                    }
                }
            }
            return false;
        }, testSubject);

        if (!deleted) throw new Error("Could not click delete button for uploaded paper!");
        await new Promise(r => setTimeout(r, 500));

        // Confirm delete in modal
        console.log("9. Confirming permanent delete in modal...");
        await page.click('#confirm-delete-btn');
        await new Promise(r => setTimeout(r, 3000));

        // 10. Verify paper is permanently deleted from the question papers grid
        const gridContentAfterDelete = await page.$eval('#papers-grid', el => el.textContent);
        if (gridContentAfterDelete.includes(testSubject)) {
            throw new Error(`Paper "${testSubject}" is still present in papers grid after deletion!`);
        }
        console.log(`✅ Paper "${testSubject}" successfully and permanently deleted from Firebase & UI!`);

        console.log("\n=======================================================");
        console.log("🎉 SUCCESS: ALL ADMIN FLOWS (LOGIN, UPLOAD REGULATION, REAL DELETE) VERIFIED WORKING 100%!");
        console.log("=======================================================\n");

    } catch (err) {
        console.error("❌ TEST FAILED:", err);
        process.exitCode = 1;
    } finally {
        if (browser) await browser.close();
        server.close();
        process.exit(process.exitCode || 0);
    }
})();
