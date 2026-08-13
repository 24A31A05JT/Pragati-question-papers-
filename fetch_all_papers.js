const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const archives = [
    { name: '01-I-B.Tech-I-Semester', url: 'https://pragati.ac.in/wp-content/uploads/2024/10/01-I-B.Tech-I-Semester.tar', year: 1, sem: 1 },
    { name: '02-I-B.Tech-II-Semester', url: 'https://pragati.ac.in/wp-content/uploads/2024/10/02-I-B.Tech-II-Semester.tar', year: 1, sem: 2 },
    { name: '03-II-B.Tech-I-Semester', url: 'https://pragati.ac.in/wp-content/uploads/2024/10/03-II-B.Tech-I-Semester.tar', year: 2, sem: 1 },
    { name: '04-II-B.Tech-II-Semester', url: 'https://pragati.ac.in/wp-content/uploads/2024/10/04-II-B.Tech-II-Semester.tar', year: 2, sem: 2 },
    { name: '05-III-B.Tech-I-Semester', url: 'https://pragati.ac.in/wp-content/uploads/2024/10/05-III-B.Tech-I-Semester.tar', year: 3, sem: 1 },
    { name: '06-III-B.Tech-II-Semester', url: 'https://pragati.ac.in/wp-content/uploads/2024/10/06-III-B.Tech-II-Semester.tar', year: 3, sem: 2 },
    { name: '08-IV-B.Tech-II-Semester', url: 'https://pragati.ac.in/wp-content/uploads/2024/10/08-IV-B.Tech-II-Semester.tar', year: 4, sem: 2 },
    { name: '09-M.Tech_', url: 'https://pragati.ac.in/wp-content/uploads/2024/10/09-M.Tech_.tar', year: 1, sem: 1 }
];

const targetDir = path.join(__dirname, 'papers_pdf');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

console.log("Starting bulk download & extraction of all Pragati question paper archives...");

archives.forEach((item, index) => {
    const tarFile = path.join(__dirname, `temp_${index}.tar`);
    console.log(`[${index + 1}/${archives.length}] Downloading ${item.name}...`);
    try {
        execSync(`curl -s -L "${item.url}" -o "${tarFile}"`, { stdio: 'inherit' });
        console.log(`Extracting PDFs from ${item.name}...`);
        execSync(`tar -xvf "${tarFile}" --strip-components=3 -C "${targetDir}"`, { stdio: 'ignore' });
        fs.unlinkSync(tarFile);
    } catch (e) {
        console.warn(`Note extracting ${item.name}: ${e.message}`);
        if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);
    }
});

console.log("Normalizing PDF file names...");
const pdfFiles = fs.readdirSync(targetDir);
pdfFiles.forEach(file => {
    if (!file.endsWith('.pdf')) return;
    const cleanName = file.replace(/\s+/g, '_').replace(/[\(\)]/g, '').replace(/[^a-zA-Z0-9_.-]/g, '');
    if (cleanName !== file) {
        try {
            fs.renameSync(path.join(targetDir, file), path.join(targetDir, cleanName));
        } catch(err){}
    }
});

console.log(`Extraction completed! Total PDFs in papers_pdf: ${fs.readdirSync(targetDir).length}`);
