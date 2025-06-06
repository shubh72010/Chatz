// Replace 'YOUR_GIPHY_API_KEY' with your actual GIPHY API key
const GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY';
const GIPHY_ENDPOINT = 'https://api.giphy.com/v1/gifs';

class GiphyIntegration {
    constructor() {
        this.searchEndpoint = `${GIPHY_ENDPOINT}/search`;
        this.trendingEndpoint = `${GIPHY_ENDPOINT}/trending`;
    }

    async searchGifs(query, limit = 20, offset = 0) {
        try {
            const response = await fetch(
                `${this.searchEndpoint}?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
            );
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error searching GIFs:', error);
            return [];
        }
    }

    async getTrendingGifs(limit = 20) {
        try {
            const response = await fetch(
                `${this.trendingEndpoint}?api_key=${GIPHY_API_KEY}&limit=${limit}`
            );
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching trending GIFs:', error);
            return [];
        }
    }

    createGifPickerUI(container, onGifSelect) {
        const gifPickerHTML = `
            <div class="gif-picker" style="display: none;">
                <div class="gif-search-container">
                    <input type="text" class="gif-search-input" placeholder="Search GIFs...">
                    <button class="gif-search-button">Search</button>
                </div>
                <div class="gif-results"></div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', gifPickerHTML);
        
        const gifPicker = container.querySelector('.gif-picker');
        const searchInput = gifPicker.querySelector('.gif-search-input');
        const searchButton = gifPicker.querySelector('.gif-search-button');
        const resultsContainer = gifPicker.querySelector('.gif-results');

        // Load trending GIFs initially
        this.loadTrendingGifs(resultsContainer, onGifSelect);

        searchButton.addEventListener('click', () => {
            this.handleGifSearch(searchInput.value, resultsContainer, onGifSelect);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleGifSearch(searchInput.value, resultsContainer, onGifSelect);
            }
        });

        return {
            show: () => gifPicker.style.display = 'block',
            hide: () => gifPicker.style.display = 'none'
        };
    }

    async handleGifSearch(query, container, onGifSelect) {
        container.innerHTML = '<div class="loading">Searching...</div>';
        const gifs = await this.searchGifs(query);
        this.displayGifs(gifs, container, onGifSelect);
    }

    async loadTrendingGifs(container, onGifSelect) {
        container.innerHTML = '<div class="loading">Loading trending GIFs...</div>';
        const gifs = await this.getTrendingGifs();
        this.displayGifs(gifs, container, onGifSelect);
    }

    displayGifs(gifs, container, onGifSelect) {
        container.innerHTML = '';
        gifs.forEach(gif => {
            const gifElement = document.createElement('div');
            gifElement.className = 'gif-item';
            gifElement.innerHTML = `
                <img src="${gif.images.fixed_height_small.url}" 
                     alt="${gif.title}"
                     loading="lazy">
            `;
            gifElement.addEventListener('click', () => {
                onGifSelect({
                    url: gif.images.original.url,
                    width: gif.images.original.width,
                    height: gif.images.original.height,
                    title: gif.title
                });
            });
            container.appendChild(gifElement);
        });
    }
} 
