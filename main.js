const API_KEY = '50a7aa80fa492fa92e874d23ad061374';
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const searchInput = document.querySelector('.search-input');
const searchButton = document.querySelector('.search-button');
const locationButton = document.querySelector('.location-button');
const unitToggleButtons = document.querySelectorAll('.temp-unit');
const loader = document.querySelector('.loader');
const errorContainer = document.querySelector('.error-container');
const weatherInfo = document.querySelector('.weather-info');
const forecastContainer = document.querySelector('.forecast-container');
const citySelectModal = document.querySelector('.city-select-modal');
const cityList = document.querySelector('.city-list');
const closeModalBtn = document.querySelector('.close-modal');

// State
let currentUnit = 'celsius';

// Event Listeners
searchButton.addEventListener('click', () => {
    const city = searchInput.value.trim();
    if (city) {
        getWeatherData(city);
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = searchInput.value.trim();
        if (city) {
            getWeatherData(city);
        }
    }
});

locationButton.addEventListener('click', () => {
    if (navigator.geolocation) {
        showLoader();
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                getWeatherDataByCoords(latitude, longitude);
            },
            error => {
                hideLoader();
                showError('Unable to get your location. Please try searching for a city instead.');
            }
        );
    } else {
        showError('Geolocation is not supported by your browser.');
    }
});

unitToggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        const unit = button.dataset.unit;
        if (unit !== currentUnit) {
            currentUnit = unit;
            updateUnitButtons();
            // Update displayed temperatures
            const weatherData = JSON.parse(weatherInfo.dataset.weatherData || '{}');
            if (Object.keys(weatherData).length) {
                updateWeatherUI(weatherData);
            }
        }
    });
});

// Add event listener for closing modal
closeModalBtn.addEventListener('click', () => {
    hideCitySelectionModal();
});

// Helper Functions
function showLoader() {
    loader.classList.remove('hidden');
    weatherInfo.classList.add('hidden');
    errorContainer.classList.add('hidden');
}

function hideLoader() {
    loader.classList.add('hidden');
}

function showError(message) {
    errorContainer.querySelector('.error-message').textContent = message;
    errorContainer.classList.remove('hidden');
    weatherInfo.classList.add('hidden');
}

function showWeatherInfo() {
    weatherInfo.classList.remove('hidden');
    errorContainer.classList.add('hidden');
}

function updateUnitButtons() {
    unitToggleButtons.forEach(button => {
        if (button.dataset.unit === currentUnit) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function convertTemp(kelvin) {
    if (currentUnit === 'celsius') {
        return Math.round(kelvin - 273.15) + '°C';
    }
    return Math.round((kelvin - 273.15) * 1.8 + 32) + '°F';
}

function convertWindSpeed(mps) {
    return Math.round(mps * 3.6) + ' km/h';
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    }).format(date);
}

function formatDay(timestamp) {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

// API Calls
async function getWeatherData(city) {
    showLoader();
    try {
        // First, get geocoding data
        const geocodingResponse = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=5&appid=${API_KEY}`);
        const locations = await geocodingResponse.json();

        if (!locations || locations.length === 0) {
            throw new Error('City not found');
        }

        // If multiple cities found, show selection modal
        if (locations.length > 1) {
            showCitySelectionModal(locations);
            hideLoader();
            return;
        }

        // If only one city found, proceed with weather data
        await fetchWeatherForLocation(locations[0]);

    } catch (error) {
        showError(error.message === 'City not found' ? 'City not found. Please try again.' : 'An error occurred. Please try again.');
        hideLoader();
    }
}

// Function to show city selection modal
function showCitySelectionModal(cities) {
    // Clear previous content
    cityList.innerHTML = '';
    
    // Add new city options
    cityList.innerHTML = cities.map(city => `
        <div class="city-option" data-lat="${city.lat}" data-lon="${city.lon}">
            <div class="city-name-main">${city.name}</div>
            <div class="city-details">${city.state || ''} ${city.country}</div>
        </div>
    `).join('');

    // Add click event listeners to city options
    cityList.querySelectorAll('.city-option').forEach(option => {
        option.addEventListener('click', async () => {
            const lat = option.dataset.lat;
            const lon = option.dataset.lon;
            hideCitySelectionModal();
            showLoader();
            await getWeatherDataByCoords(lat, lon);
        });
    });

    // Show the modal
    citySelectModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Function to hide city selection modal
function hideCitySelectionModal() {
    citySelectModal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scrolling
}

// Function to fetch weather data for a specific location
async function fetchWeatherForLocation(location) {
    try {
        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(`${WEATHER_API_BASE}/weather?lat=${location.lat}&lon=${location.lon}&appid=${API_KEY}`),
            fetch(`${WEATHER_API_BASE}/forecast?lat=${location.lat}&lon=${location.lon}&appid=${API_KEY}`)
        ]);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error('Unable to fetch weather data');
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();

        updateWeatherUI({ current: weatherData, forecast: forecastData });
        showWeatherInfo();
    } catch (error) {
        showError('Unable to fetch weather data. Please try again.');
    } finally {
        hideLoader();
    }
}

// Update existing getWeatherDataByCoords function
async function getWeatherDataByCoords(lat, lon) {
    try {
        await fetchWeatherForLocation({ lat, lon });
    } catch (error) {
        showError('Unable to fetch weather data. Please try again.');
    }
}

// UI Updates
function updateWeatherUI(data) {
    const { current, forecast } = data;
    weatherInfo.dataset.weatherData = JSON.stringify(data);

    // Update current weather
    document.querySelector('.city-name').textContent = `${current.name}, ${current.sys.country}`;
    document.querySelector('.current-date').textContent = formatDate(current.dt);
    document.querySelector('.temperature').textContent = convertTemp(current.main.temp);
    document.querySelector('.weather-description').textContent = current.weather[0].description;
    document.querySelector('.weather-icon').src = `https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`;
    
    // Update weather details
    document.querySelector('.feels-like').textContent = convertTemp(current.main.feels_like);
    document.querySelector('.humidity').textContent = `${current.main.humidity}%`;
    document.querySelector('.wind-speed').textContent = convertWindSpeed(current.wind.speed);
    document.querySelector('.pressure').textContent = `${current.main.pressure} hPa`;

    // Update forecast
    updateForecastUI(forecast);

    // Update background based on weather
    updateBackground(current.weather[0].main);
}

function updateForecastUI(forecastData) {
    // Group forecast by day and get the middle of day forecast
    const dailyForecasts = forecastData.list.reduce((acc, forecast) => {
        const date = new Date(forecast.dt * 1000).toDateString();
        if (!acc[date] && Object.keys(acc).length < 5) {
            acc[date] = forecast;
        }
        return acc;
    }, {});

    // Create forecast cards
    forecastContainer.innerHTML = Object.values(dailyForecasts)
        .map(forecast => `
            <div class="forecast-card">
                <div class="forecast-date">${formatDay(forecast.dt)}</div>
                <img class="forecast-icon" src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="${forecast.weather[0].description}">
                <div class="forecast-temp">${convertTemp(forecast.main.temp)}</div>
                <div class="forecast-description">${forecast.weather[0].description}</div>
            </div>
        `)
        .join('');
}

function updateBackground(weatherCondition) {
    const body = document.body;
    const conditions = {
        Clear: 'linear-gradient(135deg, #00B4DB, #0083B0)',
        Clouds: 'linear-gradient(135deg, #606c88, #3f4c6b)',
        Rain: 'linear-gradient(135deg, #4B79A1, #283E51)',
        Snow: 'linear-gradient(135deg, #E6DADA, #274046)',
        Thunderstorm: 'linear-gradient(135deg, #414345, #232526)',
        Drizzle: 'linear-gradient(135deg, #757F9A, #D7DDE8)',
        Mist: 'linear-gradient(135deg, #757F9A, #D7DDE8)',
        Smoke: 'linear-gradient(135deg, #757F9A, #D7DDE8)',
        Haze: 'linear-gradient(135deg, #757F9A, #D7DDE8)',
        Dust: 'linear-gradient(135deg, #c79081, #dfa579)',
        Fog: 'linear-gradient(135deg, #757F9A, #D7DDE8)',
        Sand: 'linear-gradient(135deg, #c79081, #dfa579)',
        Ash: 'linear-gradient(135deg, #606c88, #3f4c6b)',
        Squall: 'linear-gradient(135deg, #4B79A1, #283E51)',
        Tornado: 'linear-gradient(135deg, #414345, #232526)'
    };

    body.style.background = conditions[weatherCondition] || conditions.Clear;
}