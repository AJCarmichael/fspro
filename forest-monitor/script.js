let drawnLayer = null;
const map = L.map('map').setView([-3.4653, -62.2159], 9); // Amazon default view

// Initialize base map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Drawing control
const drawControl = new L.Control.Draw({
    draw: {
        polygon: {
            shapeOptions: { color: '#ff0000' }
        },
        circle: false,
        rectangle: false,
        marker: false
    },
    edit: false
});
map.addControl(drawControl);

// Handle drawn areas
map.on('draw:created', (e) => {
    if (drawnLayer) map.removeLayer(drawnLayer);
    drawnLayer = e.layer;
    drawnLayer.addTo(map);
});

async function runAnalysis() {
    if (!drawnLayer) return alert('Please draw an area first');
    
    const loading = document.getElementById('loading');
    loading.classList.remove('hidden');
    
    try {
        // Get coordinates
        const bounds = drawnLayer.getBounds();
        const coords = [
            [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
            [bounds.getNorthEast().lat, bounds.getNorthEast().lng]
        ];

        // Get NDVI data (Earth Engine proxy)
        const response = await axios.post('https://earthengine.googleapis.com/v1beta/projects/earthengine-legacy/value:compute', {
            expression: `
                var dataset = ee.ImageCollection('COPERNICUS/S2_SR')
                    .filterBounds(ee.Geometry.Rectangle(${JSON.stringify(coords)}))
                    .filterDate('2018-01-01', '2023-12-31');
                
                var ndvi = dataset.map(function(img) {
                    return img.normalizedDifference(['B8', 'B4'])
                        .rename('NDVI')
                        .set('system:time_start', img.get('system:time_start'));
                });
                
                return ndvi;
            `,
            fileFormat: 'JSON'
        }, {
            params: { key: 'AIzaSyDPnQ65c9fZeBpNUHufKfKyu10ev_2mdZw' }
        });

        // Process timeline data
        const timelineData = processEarthEngineData(response.data);
        renderTimeline(timelineData);
        
    } catch (error) {
        console.error('Analysis failed:', error);
        alert('Analysis failed - using demo data');
        renderTimeline(getMockData());
    } finally {
        loading.classList.add('hidden');
    }
}

function processEarthEngineData(data) {
    // Implementation needed for Earth Engine response parsing
    // Temporary mock return
    return getMockData();
}

function getMockData() {
    return {
        years: [2018, 2019, 2020, 2021, 2022, 2023],
        ndvi: [0.85, 0.82, 0.78, 0.72, 0.68, 0.65],
        forestLoss: [0, 3, 7, 12, 17, 22] // Percentage
    };
}

function renderTimeline(data) {
    Plotly.newPlot('timeline', [{
        x: data.years,
        y: data.ndvi,
        name: 'Vegetation Index (NDVI)',
        line: { color: '#2ca02c' }
    }, {
        x: data.years,
        y: data.forestLoss,
        name: 'Forest Loss %',
        yaxis: 'y2',
        line: { color: '#d62728' }
    }], {
        title: 'Deforestation Timeline Analysis',
        yaxis: { title: 'NDVI' },
        yaxis2: {
            title: 'Forest Loss (%)',
            overlaying: 'y',
            side: 'right'
        }
    });
}