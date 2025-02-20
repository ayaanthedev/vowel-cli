#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk').default;
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const csv = require('csv-parser');
const PDFDocument = require('pdfkit');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to extract vowels and consonants from input text
function analyzeText(text) {
    // Remove non-alphabetic characters
    const cleanedText = text.replace(/[^a-zA-Z]/g, '');
    console.log(chalk.cyan('Cleaned Text:'), cleanedText); // Log the cleaned text
    const vowels = cleanedText.match(/[aeiou]/gi) || [];
    const consonants = cleanedText.match(/[bcdfghjklmnpqrstvwxyz]/gi) || [];
    const vowelCounts = countOccurrences(vowels.map(v => v.toLowerCase()));
    const consonantCounts = countOccurrences(consonants.map(c => c.toLowerCase()));
    return {
        vowels,
        consonants,
        vowelCounts,
        consonantCounts,
        vowelCount: vowels.length,
        consonantCount: consonants.length,
        totalCharacters: cleanedText.length
    };
}

// Function to count occurrences of each character
function countOccurrences(arr) {
    return arr.reduce((acc, char) => {
        acc[char] = (acc[char] || 0) + 1;
        return acc;
    }, {});
}

// Function to display statistics
function displayStatistics(stats) {
    console.log(chalk.green('Vowels found:'), chalk.blue(JSON.stringify(stats.vowelCounts, null, 2)));
    console.log(chalk.green('Consonants found:'), chalk.blue(JSON.stringify(stats.consonantCounts, null, 2)));
    console.log(chalk.yellow(`Total vowels: ${stats.vowelCount}`));
    console.log(chalk.yellow(`Total consonants: ${stats.consonantCount}`));
    console.log(chalk.yellow(`Total characters: ${stats.totalCharacters}`));
}

// Function to export statistics to a PDF
function exportToPDF(stats) {
    const doc = new PDFDocument();
    const filePath = 'vowel_statistics.pdf';
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(16).text('Vowel and Consonant Analysis', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Vowels:', { underline: true });
    doc.fontSize(12).text(JSON.stringify(stats.vowelCounts, null, 2));
    doc.moveDown();

    doc.fontSize(14).text('Consonants:', { underline: true });
    doc.fontSize(12).text(JSON.stringify(stats.consonantCounts, null, 2));
    doc.moveDown();

    doc.fontSize(14).text('Statistics:', { underline: true });
    doc.fontSize(12).text(`Total vowels: ${stats.vowelCount}`);
    doc.text(`Total consonants: ${stats.consonantCount}`);
    doc.text(`Total characters: ${stats.totalCharacters}`);

    doc.end();
    console.log(chalk.green(`Results exported to ${filePath}`));
}

// Function to read input from a file
function readFileInput(filePath) {
    const fileExtension = filePath.split('.').pop().toLowerCase();
    if (fileExtension === 'json') {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error(chalk.red('Error reading file:'), err);
                rl.close();
                return;
            }
            const jsonData = JSON.parse(data);
            const text = JSON.stringify(jsonData);
            const stats = analyzeText(text);
            displayStatistics(stats);
            askToExport(stats);
        });
    } else if (fileExtension === 'csv') {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                const text = JSON.stringify(results);
                const stats = analyzeText(text);
                displayStatistics(stats);
                askToExport(stats);
            })
            .on('error', (err) => {
                console.error(chalk.red('Error reading file:'), err);
                rl.close();
            });
    } else if (fileExtension === 'pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        pdf(dataBuffer).then((data) => {
            const text = data.text;
            const stats = analyzeText(text);
            displayStatistics(stats);
            askToExport(stats);
        }).catch((err) => {
            console.error(chalk.red('Error reading file:'), err);
            rl.close();
        });
    } else if (fileExtension === 'docx' || fileExtension === 'odt') {
        mammoth.extractRawText({ path: filePath })
            .then((result) => {
                const text = result.value;
                const stats = analyzeText(text);
                displayStatistics(stats);
                askToExport(stats);
            })
            .catch((err) => {
                console.error(chalk.red('Error reading file:'), err);
                rl.close();
            });
    } else {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error(chalk.red('Error reading file:'), err);
                rl.close();
                return;
            }
            const stats = analyzeText(data);
            displayStatistics(stats);
            askToExport(stats);
        });
    }
}

// Function to ask user if they want to export results to a PDF
function askToExport(stats) {
    rl.question(chalk.cyan('Do you want to export the results to a PDF? (yes/no): '), (answer) => {
        if (answer.toLowerCase() === 'yes') {
            exportToPDF(stats);
        }
        rl.close();
    });
}

// Prompt user for input
rl.question(chalk.cyan('Enter a paragraph or text (or type "file" to read from a file): '), (input) => {
    if (input.toLowerCase() === 'file') {
        rl.question(chalk.cyan('Enter the file path: '), (filePath) => {
            readFileInput(filePath);
        });
    } else {
        const stats = analyzeText(input);
        displayStatistics(stats);
        askToExport(stats);
    }
});

// To run this script as a CLI command, add the following to package.json:
// "bin": {
//   "vowel": "vowel.js"
// }
// Then run: npm link (to create a global command)
// Use: vowel