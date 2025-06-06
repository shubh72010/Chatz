// Replace 'YOUR_SDK_KEY' with your actual GIPHY SDK key
class GiphyIntegration {
    constructor() {
        this.initializeGiphySDK();
    }

    initializeGiphySDK() {
        window.giphySDK = new window.GiphySDK();
        window.giphySDK.configure({ sdk_key: 'JDYaLkWja1iraKwxqsUsHJOQesqcdDyk' });
    }

    createGifPickerUI(container, onGifSelect) {
        // Create a container for the GIPHY SDK grid
        const gridContainer = document.createElement('div');
        gridContainer.className = 'gif-picker';
        gridContainer.style.display = 'none';
        container.appendChild(gridContainer);

        // Initialize the GIPHY Grid
        const grid = window.giphySDK.Grid({
            container: gridContainer,
            width: 320,
            columns: 2,
            gutter: 8,
            noLink: true,
            hideAttribution: true,
            rating: 'pg-13',
            theme: document.body.classList.contains('theme-dark') ? 'dark' : 'light'
        });

        // Create search bar
        const searchContainer = document.createElement('div');
        searchContainer.className = 'gif-search-container';
        searchContainer.innerHTML = `
            <input type="text" class="gif-search-input" placeholder="Search GIFs...">
            <button class="gif-search-button">Search</button>
        `;
        gridContainer.insertBefore(searchContainer, gridContainer.firstChild);

        // Handle search
        const searchInput = searchContainer.querySelector('.gif-search-input');
        const searchButton = searchContainer.querySelector('.gif-search-button');

        const performSearch = (query) => {
            if (query) {
                grid.search(query);
            } else {
                grid.trending();
            }
        };

        searchButton.addEventListener('click', () => {
            performSearch(searchInput.value);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });

        // Handle GIF selection
        grid.on('click', (gif) => {
            onGifSelect({
                url: gif.images.original.url,
                width: gif.images.original.width,
                height: gif.images.original.height,
                title: gif.title
            });
        });

        // Load trending GIFs initially
        grid.trending();

        return {
            show: () => {
                gridContainer.style.display = 'block';
                // Refresh grid when showing to fix layout issues
                grid.refresh();
            },
            hide: () => {
                gridContainer.style.display = 'none';
            }
        };
    }
} 
