document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Typing animation with delay
document.fonts.ready.then(() => {
    const codeText = document.getElementById('code-text');
    const finalText = document.getElementById('final-text');
    
    // Set up the spans with empty content
    const spans = {
        print: document.createElement('span'),
        openParen: document.createElement('span'),
        name: document.createElement('span'),
        closeParen: document.createElement('span')
    };
    
    spans.print.className = 'print';
    spans.openParen.className = 'paren';
    spans.name.className = 'name';
    spans.closeParen.className = 'paren';
    
    // Clear and append empty spans
    codeText.innerHTML = '';
    codeText.appendChild(spans.print);
    codeText.appendChild(spans.openParen);
    codeText.appendChild(spans.name);
    codeText.appendChild(spans.closeParen);
    
    // Make container visible
    codeText.style.visibility = 'visible';
    
    // Text to type for each span
    const textParts = {
        print: 'print',
        openParen: '(',
        name: 'name',
        closeParen: ')'
    };
    
    // Type text in sequence
    let currentText = '';
    let currentSpan = 'print';
    const sequence = ['print', 'openParen', 'name', 'closeParen'];
    let sequenceIndex = 0;
    
    function typeNextChar() {
        const currentPart = sequence[sequenceIndex];
        const targetText = textParts[currentPart];
        const span = spans[currentPart];
        
        if (currentText.length < targetText.length) {
            currentText += targetText[currentText.length];
            span.textContent = currentText;
            setTimeout(typeNextChar, 100);
        } else {
            sequenceIndex++;
            if (sequenceIndex < sequence.length) {
                currentText = '';
                setTimeout(typeNextChar, 100);
            } else {
                // Typing complete, show highlight
                setTimeout(() => {
                    codeText.classList.add('highlight');
                    setTimeout(() => {
                        codeText.style.display = 'none';
                        finalText.style.display = 'block';
                    }, 600);
                }, 400);
            }
        }
    }
    
    // Delay before starting the typing animation (e.g., 2 seconds delay)
    setTimeout(() => {
        typeNextChar();
    }, 2000); // 2000ms = 2 seconds
});
