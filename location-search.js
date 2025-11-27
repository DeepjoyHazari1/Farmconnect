// location-search.js - Shared location functionality
class LocationSearch {
    constructor(options) {
        this.container = options.container;
        this.items = options.items;
        this.locationAttribute = options.locationAttribute || 'data-location';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Location option clicks
        this.container.querySelectorAll('.location-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectLocation(option.getAttribute('data-location'));
            });
        });

        // Current location button
        const currentLocationBtn = this.container.querySelector('#currentLocationBtn');
        if (currentLocationBtn) {
            currentLocationBtn.addEventListener('click', () => {
                this.getCurrentLocation();
            });
        }
    }

    selectLocation(location) {
        // Remove active class from all options
        this.container.querySelectorAll('.location-option').forEach(opt => {
            opt.classList.remove('active');
        });

        // Add active class to selected option
        const selectedOption = this.container.querySelector(`[data-location="${location}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }

        this.selectedLocation = location;
        this.filterItems();
        this.showResults();
    }

    filterItems() {
        this.items.forEach(item => {
            const itemLocation = item.getAttribute(this.locationAttribute);
            if (!this.selectedLocation || itemLocation === this.selectedLocation) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    showResults() {
        const resultsContainer = this.container.querySelector('#locationSearchResults');
        if (!resultsContainer) return;

        const count = this.container.querySelectorAll(`${this.items.selector}[${this.locationAttribute}="${this.selectedLocation}"]`).length;
        
        resultsContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: between;">
                <div>
                    <strong>Location: ${this.formatLocationName(this.selectedLocation)}</strong>
                    <span class="distance-badge">${count} items found</span>
                </div>
                <button class="clear-location-filter" onclick="locationSearch.clearFilter()">
                    <i class="fas fa-times"></i> Clear
                </button>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }

    clearFilter() {
        this.container.querySelectorAll('.location-option').forEach(opt => {
            opt.classList.remove('active');
        });

        const resultsContainer = this.container.querySelector('#locationSearchResults');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }

        this.selectedLocation = null;
        this.items.forEach(item => {
            item.style.display = 'block';
        });
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        const currentLocationBtn = this.container.querySelector('#currentLocationBtn');
        if (currentLocationBtn) {
            currentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
            currentLocationBtn.disabled = true;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                this.findNearbyLocations();
                
                if (currentLocationBtn) {
                    currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Use My Current Location';
                    currentLocationBtn.disabled = false;
                }
            },
            (error) => {
                alert('Unable to get your location. Please enable location services or select a location manually.');
                if (currentLocationBtn) {
                    currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Use My Current Location';
                    currentLocationBtn.disabled = false;
                }
            }
        );
    }

    findNearbyLocations() {
        // This would typically call your backend API
        // For demo, we'll use a simple simulation
        const simulatedNearby = ['kalyani', 'nadia'];
        
        if (simulatedNearby.length > 0) {
            this.selectLocation(simulatedNearby[0]);
            
            const resultsContainer = this.container.querySelector('#locationSearchResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: between;">
                        <div>
                            <strong>Nearby Locations Found</strong>
                            <span class="distance-badge">Based on your location</span>
                        </div>
                        <div>
                            ${simulatedNearby.map(loc => `
                                <span class="location-option" style="display: inline-block; margin: 5px; padding: 5px 10px;" 
                                      onclick="locationSearch.selectLocation('${loc}')">
                                    ${this.formatLocationName(loc)}
                                </span>
                            `).join('')}
                        </div>
                        <button class="clear-location-filter" onclick="locationSearch.clearFilter()">
                            <i class="fas fa-times"></i> Clear
                        </button>
                    </div>
                `;
                resultsContainer.style.display = 'block';
            }
        }
    }

    formatLocationName(location) {
        const locationNames = {
            'kalyani': 'Kalyani',
            'nadia': 'Nadia',
            'krishnanagar': 'Krishnanagar',
            'ranaghat': 'Ranaghat',
            'shantipur': 'Shantipur'
        };
        return locationNames[location] || location;
    }
}

// Initialize location search for labour page
if (document.querySelector('.labour-gallery')) {
    const labourLocationSearch = new LocationSearch({
        container: document.querySelector('.location-search-container'),
        items: document.querySelectorAll('.labour-card'),
        locationAttribute: 'data-location'
    });
    window.labourLocationSearch = labourLocationSearch;
}

// Initialize location search for machinery page
if (document.querySelector('.machinery-gallery')) {
    const machineryLocationSearch = new LocationSearch({
        container: document.querySelector('.location-search-container'),
        items: document.querySelectorAll('.machinery-item'),
        locationAttribute: 'data-location'
    });
    window.machineryLocationSearch = machineryLocationSearch;
}