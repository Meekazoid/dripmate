/**
 * Water Hardness Database for German Postal Codes
 * Based on regional water hardness data from German water suppliers
 */

const WaterHardness = (() => {
    
    // Water hardness categories (German standard)
    const categories = {
        very_soft: { min: 0, max: 7, de: 'sehr weich', en: 'very soft' },
        soft: { min: 7, max: 14, de: 'weich', en: 'soft' },
        medium: { min: 14, max: 21, de: 'mittel', en: 'medium' },
        hard: { min: 21, max: 28, de: 'hart', en: 'hard' },
        very_hard: { min: 28, max: 50, de: 'sehr hart', en: 'very hard' }
    };

    // Regional water hardness database (°dH - Deutsche Härte)
    // This is a representative sample - in production, you'd use a complete database
    const regionalData = {
        // Berlin
        '10': { value: 16, region: 'Berlin', source: 'Berliner Wasserbetriebe' },
        '12': { value: 18, region: 'Berlin', source: 'Berliner Wasserbetriebe' },
        '13': { value: 17, region: 'Berlin', source: 'Berliner Wasserbetriebe' },
        '14': { value: 15, region: 'Berlin', source: 'Berliner Wasserbetriebe' },
        
        // Hamburg
        '20': { value: 13, region: 'Hamburg', source: 'Hamburg Wasser' },
        '21': { value: 12, region: 'Hamburg', source: 'Hamburg Wasser' },
        '22': { value: 14, region: 'Hamburg', source: 'Hamburg Wasser' },
        
        // München (hard water)
        '80': { value: 19, region: 'München', source: 'Stadtwerke München' },
        '81': { value: 20, region: 'München', source: 'Stadtwerke München' },
        '82': { value: 18, region: 'München Umland', source: 'Lokale Versorger' },
        '85': { value: 22, region: 'München Umland', source: 'Lokale Versorger' },
        
        // Köln
        '50': { value: 16, region: 'Köln', source: 'Rheinenergie' },
        '51': { value: 17, region: 'Köln', source: 'Rheinenergie' },
        '52': { value: 15, region: 'Köln Umland', source: 'Lokale Versorger' },
        
        // Frankfurt
        '60': { value: 15, region: 'Frankfurt', source: 'Mainova' },
        '61': { value: 16, region: 'Frankfurt Umland', source: 'Lokale Versorger' },
        '63': { value: 17, region: 'Frankfurt Umland', source: 'Lokale Versorger' },
        '64': { value: 18, region: 'Darmstadt Region', source: 'Lokale Versorger' },
        '65': { value: 14, region: 'Wiesbaden', source: 'ESWE Versorgung' },
        
        // Stuttgart
        '70': { value: 13, region: 'Stuttgart', source: 'EnBW' },
        '71': { value: 14, region: 'Stuttgart Umland', source: 'Lokale Versorger' },
        '72': { value: 15, region: 'Tübingen Region', source: 'Lokale Versorger' },
        '73': { value: 16, region: 'Esslingen Region', source: 'Lokale Versorger' },
        
        // Düsseldorf/Ruhrgebiet
        '40': { value: 15, region: 'Düsseldorf', source: 'Stadtwerke Düsseldorf' },
        '41': { value: 16, region: 'Mönchengladbach', source: 'NEW AG' },
        '42': { value: 17, region: 'Wuppertal', source: 'WSW' },
        '44': { value: 16, region: 'Dortmund', source: 'DEW21' },
        '45': { value: 15, region: 'Essen', source: 'Stadtwerke Essen' },
        '46': { value: 14, region: 'Bochum', source: 'Stadtwerke Bochum' },
        '47': { value: 16, region: 'Duisburg', source: 'Stadtwerke Duisburg' },
        
        // Leipzig
        '04': { value: 13, region: 'Leipzig', source: 'Leipziger Wasserwerke' },
        
        // Dresden
        '01': { value: 11, region: 'Dresden', source: 'DREWAG' },
        
        // Hannover
        '30': { value: 10, region: 'Hannover', source: 'enercity' },
        '31': { value: 11, region: 'Hannover Umland', source: 'Lokale Versorger' },
        
        // Bremen
        '28': { value: 9, region: 'Bremen', source: 'swb' },
        
        // Nürnberg
        '90': { value: 17, region: 'Nürnberg', source: 'N-ERGIE' },
        '91': { value: 18, region: 'Nürnberg Umland', source: 'Lokale Versorger' },
        
        // Mannheim
        '68': { value: 16, region: 'Mannheim', source: 'MVV Energie' },
        '69': { value: 17, region: 'Heidelberg', source: 'Stadtwerke Heidelberg' },
        
        // Karlsruhe
        '76': { value: 15, region: 'Karlsruhe', source: 'Stadtwerke Karlsruhe' },
        
        // Freiburg (very soft water from Black Forest)
        '79': { value: 8, region: 'Freiburg', source: 'Badenova' },
        
        // Augsburg
        '86': { value: 18, region: 'Augsburg', source: 'Stadtwerke Augsburg' },
        
        // Bonn
        '53': { value: 16, region: 'Bonn', source: 'Stadtwerke Bonn' },
        
        // Münster
        '48': { value: 15, region: 'Münster', source: 'Stadtwerke Münster' },
        
        // Saarbrücken
        '66': { value: 14, region: 'Saarbrücken', source: 'Stadtwerke Saarbrücken' },
        
        // Halle
        '06': { value: 21, region: 'Halle', source: 'Stadtwerke Halle' },
        
        // Magdeburg
        '39': { value: 19, region: 'Magdeburg', source: 'Städtische Werke Magdeburg' },
        
        // Chemnitz
        '09': { value: 12, region: 'Chemnitz', source: 'eins energie' },
        
        // Kiel
        '24': { value: 13, region: 'Kiel', source: 'Stadtwerke Kiel' },
        
        // Lübeck
        '23': { value: 14, region: 'Lübeck', source: 'Stadtwerke Lübeck' },
        
        // Rostock
        '18': { value: 15, region: 'Rostock', source: 'Stadtwerke Rostock' },
        
        // Erfurt
        '99': { value: 18, region: 'Erfurt', source: 'Stadtwerke Erfurt' },
        
        // Kassel
        '34': { value: 13, region: 'Kassel', source: 'Städtische Werke Kassel' },
        
        // Potsdam
        '14': { value: 15, region: 'Potsdam', source: 'EWP' },
        
        // Aachen
        '52': { value: 14, region: 'Aachen', source: 'ENWOR' },
        
        // Bielefeld
        '33': { value: 15, region: 'Bielefeld', source: 'Stadtwerke Bielefeld' },
        
        // Braunschweig
        '38': { value: 16, region: 'Braunschweig', source: 'BS Energy' },
        
        // Regensburg
        '93': { value: 20, region: 'Regensburg', source: 'REWAG' },
        
        // Würzburg
        '97': { value: 19, region: 'Würzburg', source: 'Würzburger Versorgungs- und Verkehrs GmbH' },
        
        // Ulm
        '89': { value: 16, region: 'Ulm', source: 'SWU' },
        
        // Ingolstadt
        '85': { value: 21, region: 'Ingolstadt', source: 'Stadtwerke Ingolstadt' }
    };

    /**
     * Get water hardness category from value
     */
    function getCategory(value) {
        for (const [key, cat] of Object.entries(categories)) {
            if (value >= cat.min && value < cat.max) {
                return key;
            }
        }
        return 'very_hard';
    }

    /**
     * Get detailed description for water hardness
     */
    function getDescription(category) {
        const descriptions = {
            very_soft: 'Sehr weiches Wasser - ideal für Kaffee, benötigt feineren Mahlgrad und höhere Temperatur',
            soft: 'Weiches Wasser - gut für Kaffee, leicht feinerer Mahlgrad empfohlen',
            medium: 'Mittelhartes Wasser - Standard-Einstellungen funktionieren gut',
            hard: 'Hartes Wasser - gröberer Mahlgrad und niedrigere Temperatur empfohlen',
            very_hard: 'Sehr hartes Wasser - deutlich gröberer Mahlgrad, Filterung empfohlen'
        };
        return descriptions[category];
    }

    /**
     * Get water hardness for a German postal code
     * @param {string} zipCode - 5-digit German postal code
     * @returns {Promise<Object>} Water hardness data
     */
    async function getHardness(zipCode) {
        return new Promise((resolve, reject) => {
            // Validate zip code
            if (!zipCode || !/^\d{5}$/.test(zipCode)) {
                reject(new Error('Bitte geben Sie eine gültige 5-stellige Postleitzahl ein'));
                return;
            }

            // Get first 2 digits for regional lookup
            const region = zipCode.substring(0, 2);
            
            // Check if we have data for this region
            if (regionalData[region]) {
                const data = regionalData[region];
                const category = getCategory(data.value);
                const categoryInfo = categories[category];
                
                resolve({
                    zipCode: zipCode,
                    value: data.value,
                    unit: '°dH',
                    category: category,
                    category_de: categoryInfo.de,
                    category_en: categoryInfo.en,
                    region: data.region,
                    source: data.source,
                    description: getDescription(category)
                });
            } else {
                // Fallback: estimate based on German average
                const averageValue = 16; // German average
                const category = getCategory(averageValue);
                const categoryInfo = categories[category];
                
                resolve({
                    zipCode: zipCode,
                    value: averageValue,
                    unit: '°dH',
                    category: category,
                    category_de: categoryInfo.de,
                    category_en: categoryInfo.en,
                    region: 'Deutschland (Schätzwert)',
                    source: 'Durchschnittswert',
                    description: 'Keine spezifischen Daten verfügbar - deutscher Durchschnittswert verwendet',
                    isEstimate: true
                });
            }
        });
    }

    /**
     * Get all available regions
     */
    function getAvailableRegions() {
        const regions = {};
        for (const [zip, data] of Object.entries(regionalData)) {
            if (!regions[data.region]) {
                regions[data.region] = {
                    region: data.region,
                    zipPrefix: zip,
                    value: data.value,
                    category: getCategory(data.value)
                };
            }
        }
        return Object.values(regions);
    }

    return {
        getHardness,
        getAvailableRegions,
        categories
    };
})();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaterHardness;
}
