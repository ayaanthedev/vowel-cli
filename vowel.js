#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk').default;
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const csv = require('csv-parser');
const PDFDocument = require('pdfkit');

class VowelCLI {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Smart patterns for better accuracy
        this.patterns = {
            vowels: /[aeiou]/gi,
            consonants: /[bcdfghjklmnpqrstvwxyz]/gi,
            words: /\b\w+\b/g
        };
    }

    analyzeText(text) {
        // Clean and normalize text
        const cleanText = text.toLowerCase().replace(/[^a-z\s]/g, '');
        const words = text.match(this.patterns.words) || [];

        // Count characters
        const vowels = cleanText.match(this.patterns.vowels) || [];
        const consonants = cleanText.match(this.patterns.consonants) || [];

        // Find interesting patterns
        const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '');
        const mostVowels = words.reduce((a, b) => {
            const aCount = (a.match(this.patterns.vowels) || []).length;
            const bCount = (b.match(this.patterns.vowels) || []).length;
            return aCount > bCount ? a : b;
        }, '');

        return {
            stats: {
                vowels: this.countLetters(vowels),
                consonants: this.countLetters(consonants),
                totalVowels: vowels.length,
                totalConsonants: consonants.length,
                totalWords: words.length,
                averageWordLength: (cleanText.length / words.length).toFixed(2)
            },
            interesting: {
                longestWord,
                mostVowels,
                vowelPercentage: ((vowels.length / cleanText.length) * 100).toFixed(2)
            }
        };
    }

    countLetters(letters) {
        return letters.reduce((acc, letter) => {
            acc[letter] = (acc[letter] || 0) + 1;
            return acc;
        }, {});
    }

    displayResults(results) {
        console.log('\n' + chalk.bold.cyan('📊 Analysis Results'));
        console.log('─'.repeat(50));

        // Core stats
        console.log(chalk.yellow('\n📈 Basic Statistics'));
        console.log(`Total Words: ${results.stats.totalWords}`);
        console.log(`Total Vowels: ${results.stats.totalVowels}`);
        console.log(`Total Consonants: ${results.stats.totalConsonants}`);
        console.log(`Average Word Length: ${results.stats.averageWordLength} letters`);

        // Interesting findings
        console.log(chalk.yellow('\n🌟 Interesting Findings'));
        console.log(`Longest Word: "${results.interesting.longestWord}"`);
        console.log(`Word with Most Vowels: "${results.interesting.mostVowels}"`);
        console.log(`Text is ${results.interesting.vowelPercentage}% vowels`);

        // Detailed counts
        console.log(chalk.yellow('\n📝 Letter Breakdown'));
        console.log('Vowels:', this.formatCounts(results.stats.vowels));
        console.log('Consonants:', this.formatCounts(results.stats.consonants));
    }

    formatCounts(counts) {
        return Object.entries(counts)
            .map(([letter, count]) => `${letter}: ${count}`)
            .join(', ');
    }

    async createPDF(results) {
        const doc = new PDFDocument();
        const filename = 'vowel-analysis.pdf';
        doc.pipe(fs.createWriteStream(filename));

        // Title
        doc.fontSize(24).text('Vowel Analysis Report', { align: 'center' });
        doc.moveDown();

        // Basic Stats
        doc.fontSize(16).text('Basic Statistics');
        doc.fontSize(12);
        doc.text(`Total Words: ${results.stats.totalWords}`);
        doc.text(`Total Vowels: ${results.stats.totalVowels}`);
        doc.text(`Total Consonants: ${results.stats.totalConsonants}`);
        doc.text(`Average Word Length: ${results.stats.averageWordLength} letters`);
        doc.moveDown();

        // Interesting Findings
        doc.fontSize(16).text('Interesting Findings');
        doc.fontSize(12);
        doc.text(`Longest Word: "${results.interesting.longestWord}"`);
        doc.text(`Word with Most Vowels: "${results.interesting.mostVowels}"`);
        doc.text(`Vowel Percentage: ${results.interesting.vowelPercentage}%`);
        doc.moveDown();

        // Letter Counts
        doc.fontSize(16).text('Letter Breakdown');
        doc.fontSize(12);
        doc.text('Vowels: ' + this.formatCounts(results.stats.vowels));
        doc.text('Consonants: ' + this.formatCounts(results.stats.consonants));

        doc.end();
        console.log(chalk.green(`\n✨ PDF report generated: ${filename}`));
    }

    async processFile(filePath) {
        const extension = filePath.split('.').pop().toLowerCase();
        
        try {
            let text;
            switch (extension) {
                case 'pdf':
                    const pdfData = await pdf(await fs.promises.readFile(filePath));
                    text = pdfData.text;
                    break;
                case 'docx':
                    const docxData = await mammoth.extractRawText({ path: filePath });
                    text = docxData.value;
                    break;
                case 'csv':
                    const rows = [];
                    await new Promise((resolve, reject) => {
                        fs.createReadStream(filePath)
                            .pipe(csv())
                            .on('data', row => rows.push(Object.values(row).join(' ')))
                            .on('end', resolve)
                            .on('error', reject);
                    });
                    text = rows.join('\n');
                    break;
                default:
                    text = await fs.promises.readFile(filePath, 'utf8');
            }
            return text;
        } catch (error) {
            throw new Error(`Could not read file: ${error.message}`);
        }
    }

    async start() {
        console.log(chalk.cyan.bold('\n🔤 Vowel Analysis Tool'));
        console.log(chalk.cyan('Enter text, or type "file" to analyze a file\n'));

        try {
            const input = await new Promise(resolve => {
                this.rl.question('> ', resolve);
            });

            let text;
            if (input.toLowerCase() === 'file') {
                const filePath = await new Promise(resolve => {
                    this.rl.question('Enter file path: ', resolve);
                });
                text = await this.processFile(filePath);
            } else {
                text = input;
            }

            const results = this.analyzeText(text);
            this.displayResults(results);

            const exportPDF = await new Promise(resolve => {
                this.rl.question('\nGenerate PDF report? (y/n): ', resolve);
            });

            if (exportPDF.toLowerCase() === 'y') {
                await this.createPDF(results);
            }

        } catch (error) {
            console.error(chalk.red('\n❌ Error:', error.message));
        }

        this.rl.close();
    }
}

// Run the CLI
new VowelCLI().start();