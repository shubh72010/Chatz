// Replace 'YOUR_SDK_KEY' with your actual GIPHY SDK key
class GiphyIntegration {
    constructor() {
        this.initializeGiphySDK();
    }

    initializeGiphySDK() {
        // The new SDK uses GiphyFetch from @giphy/js-fetch-api
        this.gf = new window.GiphyFetch('JDYaLkWja1iraKwxqsUsHJOQesqcdDyk');
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
        try {
            const { data: gifs } = await this.gf.search(query, { limit: 20 });
            this.displayGifs(gifs, container, onGifSelect);
        } catch (error) {
            console.error('Error searching GIFs:', error);
            container.innerHTML = '<div class="error">Error loading GIFs</div>';
        }
    }

    async loadTrendingGifs(container, onGifSelect) {
        container.innerHTML = '<div class="loading">Loading trending GIFs...</div>';
        try {
            const { data: gifs } = await this.gf.trending({ limit: 20 });
            this.displayGifs(gifs, container, onGifSelect);
        } catch (error) {
            console.error('Error loading trending GIFs:', error);
            container.innerHTML = '<div class="error">Error loading GIFs</div>';
        }
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
