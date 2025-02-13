let currentDenomination = 'All';
let currentView = 'dot';

const image = document.querySelector('.map-image');
const denominationItems = document.querySelectorAll('.denomination-item');
const viewButtons = document.querySelectorAll('.view-button');

function updateImage() {
    const newImage = `/ChurchesDS/graphs/${currentView}map${currentDenomination}.png`;
    image.src = newImage;
}

denominationItems.forEach(item => {
    item.addEventListener('click', () => {
        // Remove previous selection
        denominationItems.forEach(i => i.classList.remove('selected'));
        
        // Add new selection
        item.classList.add('selected');
        
        // Update current denomination and image
        currentDenomination = item.dataset.name;
        updateImage();
    });
});

viewButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove previous active state
        viewButtons.forEach(b => b.classList.remove('active'));
        
        // Add new active state
        button.classList.add('active');
        
        // Update current view and image
        currentView = button.dataset.view;
        updateImage();
    });
});