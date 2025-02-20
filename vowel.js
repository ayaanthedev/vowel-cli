#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk').default;
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const csv = require('csv-parser');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to extract vowels and consonants from input text
function analyzeText(text) {
    const vowels = text.match(/[aeiouAEIOU]/g) || [];
    const consonants = text.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || [];
    return {
        vowels,
        consonants,
        vowelCount: vowels.length,
        consonantCount: consonants.length,
        totalCharacters: text.length
    };
}

// Function to display statistics
function displayStatistics(stats) {
    console.log(chalk.green('Vowels found:'), chalk.blue(stats.vowels.join(' ')));
    console.log(chalk.green('Consonants found:'), chalk.blue(stats.consonants.join(' ')));
    console.log(chalk.yellow(`Total vowels: ${stats.vowelCount}`));
    console.log(chalk.yellow(`Total consonants: ${stats.consonantCount}`));
    console.log(chalk.yellow(`Total characters: ${stats.totalCharacters}`));
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
            rl.close();
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
                rl.close();
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
            rl.close();
        }).catch((err) => {
            console.error(chalk.red('Error reading file:'), err);
            rl.close();
        });
    } else if (fileExtension === 'docx') {
        mammoth.extractRawText({ path: filePath })
            .then((result) => {
                const text = result.value;
                const stats = analyzeText(text);
                displayStatistics(stats);
                rl.close();
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
            rl.close();
        });
    }
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
        rl.close();
    }
});

// To run this script as a CLI command, add the following to package.json:
// "bin": {
//   "vowel": "vowel.js"
// }
// Then run: npm link (to create a global command)
// Use: vowel