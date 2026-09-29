const fs = require('fs');
const path = require('path');

const OWsDir = path.join(__dirname, '../OWs');

function parseDateFromName(filename, filepath) {
    // Check for standard format: M-D-YY or M.D.YY
    let match = filename.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{2,4})/);
    if (match) {
        let month = parseInt(match[1], 10);
        let day = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);
        if (year > 1000) year = year % 100;

        let timeMatch = filename.match(/(\d{1,2})\s*(am|pm)/i);
        let timeStr = "";
        let displayTime = "";
        if (timeMatch) {
            timeStr = `-${timeMatch[1]}${timeMatch[2].toLowerCase()}`;
            displayTime = ` ${timeMatch[1]}${timeMatch[2].toLowerCase()}`;
        }

        return {
            key: `${month}-${day}-${year}${timeStr}`,
            display_date: `${month}/${day}/${year}${displayTime}`,
            is_xmas: false
        };
    }

    // Check for XMAS format: XMAS 8pm
    let xmasMatch = filename.match(/xmas/i);
    if (xmasMatch) {
        let yearStrMatch = filename.match(/\b(20\d{2})\b/);
        let year;
        if (yearStrMatch) {
            year = parseInt(yearStrMatch[1], 10) % 100;
        } else {
            // infer year from git history to avoid issues in CI
            try {
                const { execSync } = require('child_process');
                let output = execSync(`git log --diff-filter=A --format=%aI -1 -- "${filepath}"`, { encoding: 'utf8' }).trim();
                if (output) {
                    year = new Date(output).getFullYear() % 100;
                } else {
                    let stats = fs.statSync(filepath);
                    year = new Date(stats.birthtimeMs || stats.mtimeMs).getFullYear() % 100;
                }
            } catch (e) {
                year = new Date().getFullYear() % 100;
            }
        }

        let month = 12;
        let day = 24;

        let timeMatch = filename.match(/(\d{1,2})\s*(am|pm)/i);
        let timeStr = "";
        let displayTime = "";
        if (timeMatch) {
            timeStr = `-${timeMatch[1]}${timeMatch[2].toLowerCase()}`;
            displayTime = ` ${timeMatch[1]}${timeMatch[2].toLowerCase()}`;
        }

        return {
            key: `${month}-${day}-${year}${timeStr}`,
            display_date: `${month}/${day}/${year}${displayTime}`,
            is_xmas: true
        };
    }

    return null;
}

function generateIndex() {
    console.log("Scanning files inside the /OWs directory...");

    let index = {};
    let files = fs.readdirSync(OWsDir);
    let groupedFiles = {};

    for (let filename of files) {
        if (!filename.toLowerCase().endsWith('.pdf')) continue;

        let filepath = path.join(OWsDir, filename);
        let parsed = parseDateFromName(filename, filepath);

        if (parsed) {
            if (!groupedFiles[parsed.key]) {
                groupedFiles[parsed.key] = [];
            }
            groupedFiles[parsed.key].push({
                filename: filename,
                filepath: filepath,
                parsed: parsed
            });
        }
    }

    for (let key in groupedFiles) {
        let group = groupedFiles[key];

        if (group.length > 1) {
            group.forEach(item => {
                item.timestamp = 0;
                try {
                    const { execSync } = require('child_process');
                    let output = execSync(`git log -1 --format=%ct -- "${item.filepath}"`, { encoding: 'utf8', stdio: 'pipe' }).trim();
                    if (output) {
                        item.timestamp = parseInt(output, 10) * 1000;
                    }
                } catch (e) {}

                // If git log fails (e.g. shallow clone for older files), we leave timestamp as 0
                // so newly added files will correctly beat older files.

                item.score = item.timestamp;

                // Huge bonus for final, huge penalty for draft, making it primary sort criteria essentially
                const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
                let nameLower = item.filename.toLowerCase();
                if (nameLower.includes('final')) {
                    item.score += ONE_YEAR_MS;
                } else if (nameLower.includes('draft')) {
                    item.score -= ONE_YEAR_MS;
                }
            });

            group.sort((a, b) => b.score - a.score);

            for (let i = 1; i < group.length; i++) {
                console.log(`Deleting older duplicate OW: ${group[i].filename}`);
                try {
                    fs.unlinkSync(group[i].filepath);
                } catch (e) {
                    console.error(`Failed to delete ${group[i].filepath}:`, e);
                }
            }
        }

        let winner = group[0];
        index[key] = {
            filename: winner.filename,
            url: `https://cju-media.github.io/OW/OWs/${encodeURIComponent(winner.filename)}`,
            display_date: winner.parsed.display_date
        };
    }

    let outputPath = path.join(OWsDir, 'index.json');
    fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));

    console.log("Master dynamic database map compiled successfully:");
    console.log(JSON.stringify(index, null, 2));
}

generateIndex();
