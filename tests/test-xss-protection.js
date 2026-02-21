/**
 * Test suite for XSS protection in app.js
 * Tests that the sanitizeHTML function properly escapes malicious content
 */

// Import the sanitizeHTML function by extracting it from js/state.js
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const stateCode = fs.readFileSync(path.join(rootDir, 'js/state.js'), 'utf8');

// Extract sanitizeHTML function
const sanitizeMatch = stateCode.match(/export function sanitizeHTML\(str\) \{[\s\S]*?\n\}/);
if (!sanitizeMatch) {
    console.error('❌ Could not find sanitizeHTML function in js/state.js');
    process.exit(1);
}

// Evaluate the function in our scope (remove export keyword)
eval(sanitizeMatch[0].replace('export ', ''));

// Color codes for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const testCases = [
    {
        name: 'Basic XSS script tag',
        input: '<script>alert("xss")</script>',
        expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
        description: 'Should escape script tags'
    },
    {
        name: 'Image tag with onerror',
        input: '<img src=x onerror=alert(1)>',
        expected: '&lt;img src=x onerror=alert(1)&gt;',
        description: 'Should escape img tags with event handlers'
    },
    {
        name: 'SVG with script',
        input: '<svg/onload=alert("xss")>',
        expected: '&lt;svg/onload=alert(&quot;xss&quot;)&gt;',
        description: 'Should escape SVG tags with event handlers'
    },
    {
        name: 'Anchor tag with javascript',
        input: '<a href="javascript:alert(1)">click</a>',
        expected: '&lt;a href=&quot;javascript:alert(1)&quot;&gt;click&lt;/a&gt;',
        description: 'Should escape anchor tags with javascript protocol'
    },
    {
        name: 'Iframe injection',
        input: '<iframe src="evil.com"></iframe>',
        expected: '&lt;iframe src=&quot;evil.com&quot;&gt;&lt;/iframe&gt;',
        description: 'Should escape iframe tags'
    },
    {
        name: 'HTML entities in coffee name',
        input: 'Coffee & More',
        expected: 'Coffee &amp; More',
        description: 'Should escape ampersands in normal text'
    },
    {
        name: 'Quotes in coffee name',
        input: 'Coffee "Premium" Blend',
        expected: 'Coffee &quot;Premium&quot; Blend',
        description: 'Should escape double quotes'
    },
    {
        name: 'Single quotes in tasting notes',
        input: "It's amazing",
        expected: "It&#039;s amazing",
        description: 'Should escape single quotes'
    },
    {
        name: 'Multiple special characters',
        input: '<div class="test" onclick=\'alert("xss")\'>',
        expected: '&lt;div class=&quot;test&quot; onclick=&#039;alert(&quot;xss&quot;)&#039;&gt;',
        description: 'Should escape all special characters together'
    },
    {
        name: 'Null value',
        input: null,
        expected: '',
        description: 'Should handle null values gracefully'
    },
    {
        name: 'Undefined value',
        input: undefined,
        expected: '',
        description: 'Should handle undefined values gracefully'
    },
    {
        name: 'Empty string',
        input: '',
        expected: '',
        description: 'Should handle empty strings'
    },
    {
        name: 'Normal coffee name',
        input: 'Ethiopian Yirgacheffe',
        expected: 'Ethiopian Yirgacheffe',
        description: 'Should not modify normal text'
    },
    {
        name: 'Normal tasting notes',
        input: 'Blueberry, chocolate, citrus',
        expected: 'Blueberry, chocolate, citrus',
        description: 'Should not modify normal tasting notes'
    }
];

function runTests() {
    console.log('=== XSS Protection Tests for sanitizeHTML() ===\n');
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach((test, index) => {
        const result = sanitizeHTML(test.input);
        const success = result === test.expected;
        
        if (success) {
            console.log(`${GREEN}✓${RESET} Test ${index + 1}: ${test.name}`);
            passed++;
        } else {
            console.log(`${RED}✗${RESET} Test ${index + 1}: ${test.name}`);
            console.log(`  ${YELLOW}Description:${RESET} ${test.description}`);
            console.log(`  ${YELLOW}Input:${RESET} ${JSON.stringify(test.input)}`);
            console.log(`  ${YELLOW}Expected:${RESET} ${test.expected}`);
            console.log(`  ${YELLOW}Got:${RESET} ${result}`);
            failed++;
        }
    });
    
    console.log(`\n=== Test Results ===`);
    console.log(`${GREEN}Passed: ${passed}${RESET}`);
    if (failed > 0) {
        console.log(`${RED}Failed: ${failed}${RESET}`);
        process.exit(1);
    } else {
        console.log(`${GREEN}All tests passed!${RESET}`);
    }
}

// Verify that sanitization is applied in renderCoffeeCard
function verifySanitizationInCode() {
    console.log('\n=== Verifying Sanitization in renderCoffeeCard ===\n');
    
    // Read the coffee-cards.js module
    const coffeeCardsCode = fs.readFileSync(path.join(rootDir, 'js/coffee-cards.js'), 'utf8');
    
    const requiredSanitizations = [
        { field: 'coffee.name', pattern: /sanitizeHTML\(coffee\.name\)/ },
        { field: 'coffee.origin', pattern: /sanitizeHTML\(coffee\.origin\)/ },
        { field: 'coffee.process', pattern: /sanitizeHTML\(coffee\.process\)/ },
        { field: 'coffee.cultivar', pattern: /sanitizeHTML\(coffee\.cultivar\)/ },
        { field: 'coffee.altitude', pattern: /sanitizeHTML\(coffee\.altitude\)/ },
        { field: 'coffee.tastingNotes', pattern: /sanitizeHTML\(coffee\.tastingNotes\)/ }
    ];
    
    let allFound = true;
    
    requiredSanitizations.forEach(item => {
        if (item.pattern.test(coffeeCardsCode)) {
            console.log(`${GREEN}✓${RESET} ${item.field} is sanitized`);
        } else {
            console.log(`${RED}✗${RESET} ${item.field} is NOT sanitized`);
            allFound = false;
        }
    });
    
    if (allFound) {
        console.log(`\n${GREEN}All required fields are sanitized!${RESET}`);
    } else {
        console.log(`\n${RED}Some fields are missing sanitization!${RESET}`);
        process.exit(1);
    }
}

// Run all tests
runTests();
verifySanitizationInCode();
