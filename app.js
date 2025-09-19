// Basic JavaScript for testing structure
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 OCR App loaded successfully!');

    // Test button to verify structure
    const testBtn = document.createElement('button');
    testBtn.textContent = 'TESTE: Structure Working!';
    testBtn.className = 'btn btn-success';
    testBtn.style.margin = '20px';

    testBtn.onclick = () => {
        alert('✅ Cloudflare Pages structure is working!\n\n📁 Files:\n- index.html ✓\n- style.css ✓\n- app.js ✓\n- functions/process.js ✓');
    };

    // Add test button to header
    const header = document.querySelector('.header');
    if (header) {
        header.appendChild(testBtn);
    }

    // Hide other sections for now
    const sections = ['uploadSection', 'processingSection', 'resultsSection', 'previewSection', 'errorSection'];
    sections.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });

    console.log('🎯 Ready for testing Cloudflare Pages deployment!');
});