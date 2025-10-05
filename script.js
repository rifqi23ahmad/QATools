document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const toolPages = document.querySelectorAll('.tool-page');

    // --- Navigation Logic ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            toolPages.forEach(page => page.classList.remove('active'));
            item.classList.add('active');
            const toolId = item.dataset.tool;
            const targetPage = document.getElementById(toolId);
            if (targetPage) {
                targetPage.classList.add('active');
            }
        });
    });

    // --- Initialize All Tool Modules ---
    // Pastikan hanya fungsi yang file-nya ada yang dipanggil
    if (typeof initJsonFormatter === 'function') initJsonFormatter();
    if (typeof initJsonCompare === 'function') initJsonCompare();
    if (typeof initJsonValueExtractor === 'function') initJsonValueExtractor();
    if (typeof initDataCompare === 'function') initDataCompare();
    if (typeof initFileSplitter === 'function') initFileSplitter();
    if (typeof initImageCompare === 'function') initImageCompare();
    if (typeof initSqlFormatter === 'function') initSqlFormatter();
    if (typeof initSqlInjector === 'function') initSqlInjector();
    if (typeof initAdvancedCompare === 'function') initAdvancedCompare();
    if (typeof initDummyImageGenerator === 'function') initDummyImageGenerator();
 

    // Activate the first tool by default
    if (document.querySelector('.sidebar-nav .nav-item')) {
        document.querySelector('.sidebar-nav .nav-item').click();
    }
});