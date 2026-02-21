/**
 * Test suite for water-hardness.js duplicate key fixes
 * Tests that 3-digit ZIP disambiguation works correctly
 */

const WaterHardness = require('../js/data/water-hardness-db.js');

// Color codes for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

const testCases = [
    // Berlin (140-143) - should get Berlin
    { zip: '14050', expectedRegion: 'Berlin', expectedValue: 15, description: 'Berlin 140xx' },
    { zip: '14199', expectedRegion: 'Berlin', expectedValue: 15, description: 'Berlin 141xx-143xx' },
    
    // Potsdam (144-149) - should get Potsdam, NOT Berlin
    { zip: '14467', expectedRegion: 'Potsdam', expectedValue: 15, description: 'Potsdam 144xx' },
    { zip: '14990', expectedRegion: 'Potsdam', expectedValue: 15, description: 'Potsdam 149xx' },
    
    // Aachen (520-521) - should get Aachen
    { zip: '52062', expectedRegion: 'Aachen', expectedValue: 14, description: 'Aachen 520xx' },
    { zip: '52134', expectedRegion: 'Aachen', expectedValue: 14, description: 'Aachen 521xx' },
    
    // Köln Umland (522-529) - should get Köln Umland, NOT Aachen
    { zip: '52249', expectedRegion: 'Köln Umland', expectedValue: 15, description: 'Köln Umland 522xx' },
    { zip: '52999', expectedRegion: 'Köln Umland', expectedValue: 15, description: 'Köln Umland 529xx' },
    
    // Ingolstadt (850-851) - should get Ingolstadt
    { zip: '85049', expectedRegion: 'Ingolstadt', expectedValue: 21, description: 'Ingolstadt 850xx' },
    { zip: '85122', expectedRegion: 'Ingolstadt', expectedValue: 21, description: 'Ingolstadt 851xx' },
    
    // München Umland (852-859) - should get München Umland, NOT Ingolstadt
    { zip: '85232', expectedRegion: 'München Umland', expectedValue: 22, description: 'München Umland 852xx' },
    { zip: '85599', expectedRegion: 'München Umland', expectedValue: 22, description: 'München Umland 859xx' },
    
    // Fallback tests - 2-digit lookup should work
    { zip: '10115', expectedRegion: 'Berlin', expectedValue: 16, description: 'Berlin 10xx (2-digit)' },
    { zip: '80331', expectedRegion: 'München', expectedValue: 19, description: 'München 80xx (2-digit)' },
    { zip: '50667', expectedRegion: 'Köln', expectedValue: 16, description: 'Köln 50xx (2-digit)' },
    
    // German average fallback - for ZIP codes with no data
    { zip: '03042', expectedRegion: 'Deutschland (Schätzwert)', expectedValue: 16, description: 'Unknown region (German average)', isEstimate: true },
    { zip: '98765', expectedRegion: 'Deutschland (Schätzwert)', expectedValue: 16, description: 'Unknown region (German average)', isEstimate: true },
];

async function runTests() {
    console.log('=== Water Hardness ZIP Code Disambiguation Tests ===\n');
    
    let passed = 0;
    let failed = 0;
    const failures = [];
    
    for (const test of testCases) {
        try {
            const result = await WaterHardness.getHardness(test.zip);
            
            const regionMatch = result.region === test.expectedRegion;
            const valueMatch = result.value === test.expectedValue;
            const estimateMatch = test.isEstimate ? result.isEstimate === true : true;
            
            if (regionMatch && valueMatch && estimateMatch) {
                const estimateTag = test.isEstimate ? ' [estimate]' : '';
                console.log(`${GREEN}✓${RESET} ${test.description}: ${test.zip} → ${result.region} (${result.value}°dH)${estimateTag}`);
                passed++;
            } else {
                let error = `Expected ${test.expectedRegion} (${test.expectedValue}°dH)`;
                if (test.isEstimate) error += ' [estimate]';
                error += `, got ${result.region} (${result.value}°dH)`;
                if (result.isEstimate) error += ' [estimate]';
                console.log(`${RED}✗${RESET} ${test.description}: ${test.zip} - ${error}`);
                failures.push({ test, error });
                failed++;
            }
        } catch (err) {
            const error = err.message;
            console.log(`${RED}✗${RESET} ${test.description}: ${test.zip} - ERROR: ${error}`);
            failures.push({ test, error });
            failed++;
        }
    }
    
    console.log('\n=== Test Results ===');
    console.log(`Total: ${testCases.length}`);
    console.log(`${GREEN}Passed: ${passed}${RESET}`);
    if (failed > 0) {
        console.log(`${RED}Failed: ${failed}${RESET}`);
        console.log('\nFailures:');
        failures.forEach(f => {
            console.log(`  - ${f.test.description}: ${f.error}`);
        });
        process.exit(1);
    } else {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    }
}

// Run tests
runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
