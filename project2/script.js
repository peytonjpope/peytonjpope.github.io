const images = document.querySelector('.carousel-images');
const totalImages = document.querySelectorAll('.carousel-item').length;
let index = 0;

document.getElementById('next').addEventListener('click', () => {
    index = (index + 1) % totalImages;
    updateCarousel();
});

document.getElementById('prev').addEventListener('click', () => {
    index = (index - 1 + totalImages) % totalImages;
    updateCarousel();
});

function updateCarousel() {
    images.style.transform = `translateX(-${index * 100}%)`;
}

// Auto-slide every 3 seconds
setInterval(() => {
    index = (index + 1) % totalImages;
    updateCarousel();
}, 3000);
