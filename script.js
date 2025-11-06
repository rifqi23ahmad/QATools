document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const toolPages = document.querySelectorAll('.tool-page');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    // --- Sidebar Toggle Logic ---
    if (sidebarToggle && sidebar) {
        // Check localStorage for saved state
        if (localStorage.getItem('sidebarMinimized') === 'true') {
            sidebar.classList.add('minimized');
        }

        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('minimized');
            // Save state to localStorage
            const isMinimized = sidebar.classList.contains('minimized');
            localStorage.setItem('sidebarMinimized', isMinimized);
        });
    }

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
    if (typeof initJsonFormatter === 'function') initJsonFormatter();
    if (typeof initJsonCompare === 'function') initJsonCompare();
    if (typeof initJsonValueExtractor === 'function') initJsonValueExtractor();
    if (typeof initDataCompare === 'function') initDataCompare();
    if (typeof initFileSplitter === 'function') initFileSplitter();
    if (typeof initImageCompare === 'function') initImageCompare();
    if (typeof initSqlFormatter === 'function') initSqlFormatter();
    if (typeof initSqlInjector === 'function') initSqlInjector();
    if (typeof initArchiveFileFinder === 'function') initArchiveFileFinder();
    if (typeof initBranchDataProcessor === 'function') initBranchDataProcessor(); // New tool initialized
    if (typeof initAdvancedCompare === 'function') initAdvancedCompare();
    if (typeof initDummyImageGenerator === 'function') initDummyImageGenerator();
    if (typeof initSqlScriptGeneratorOtomatis === 'function') initSqlScriptGeneratorOtomatis();
 

    // Activate the first tool by default
    if (document.querySelector('.sidebar-nav .nav-item')) {
        document.querySelector('.sidebar-nav .nav-item').click();
    }
});