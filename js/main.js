// ===== Navigation Menu Toggle =====
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
            navMenu.style.flexDirection = 'column';
            navMenu.style.position = 'absolute';
            navMenu.style.top = '100%';
            navMenu.style.left = '0';
            navMenu.style.right = '0';
            navMenu.style.background = 'white';
            navMenu.style.padding = '1rem';
            navMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        });
    }
    
    // ===== Smooth Scrolling =====
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 70;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ===== Navbar Background on Scroll =====
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255,255,255,0.98)';
            navbar.style.backdropFilter = 'blur(10px)';
        } else {
            navbar.style.background = 'white';
        }
    });
    
    // ===== Contact Form Handler =====
    const contactForm = document.querySelector('.contact-form form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });
            
            // Here you would typically send the data to a server
            console.log('Form submitted:', data);
            
            // Show success message
            alert('Thank you for your message! We will get back to you soon.');
            this.reset();
        });
    }
    
    // ===== Animate Elements on Scroll =====
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe service cards
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
    
    // Observe gallery items
    const galleryItems = document.querySelectorAll('.gallery-item');
    galleryItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(item);
    });
    
    // ===== Parallax Effect for Hero Section =====
    const heroSection = document.querySelector('.hero');
    const heroContent = document.querySelector('.hero-content');
    
    if (heroSection && heroContent) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const parallaxSpeed = 0.5;
            
            heroContent.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
            heroContent.style.opacity = 1 - (scrolled / 600);
        });
    }
    
    // ===== Counter Animation for Stats =====
    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        
        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                element.textContent = target + '+';
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(start) + '+';
            }
        }, 16);
    }
    
    // Animate stats when they come into view
    const statNumbers = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.animated) {
                const target = parseInt(entry.target.textContent);
                animateCounter(entry.target, target);
                entry.target.animated = true;
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => {
        statsObserver.observe(stat);
    });
    
    // ===== Add Loading Animation =====
    window.addEventListener('load', function() {
        document.body.style.opacity = '1';
    });
});

// ===== Gallery Lightbox (Basic Implementation) =====
function initGalleryLightbox() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach(item => {
        item.addEventListener('click', function() {
            // Create lightbox overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                cursor: pointer;
            `;
            
            // Add close functionality
            overlay.addEventListener('click', function() {
                this.remove();
            });
            
            // Add the image or placeholder
            const content = this.querySelector('.image-placeholder').cloneNode(true);
            content.style.transform = 'scale(1.5)';
            overlay.appendChild(content);
            
            document.body.appendChild(overlay);
        });
    });
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', initGalleryLightbox);