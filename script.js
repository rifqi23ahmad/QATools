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
    initJsonFormatter(); 
    initJsonValueExtractor();
    initJsonCompare(); 
    initDataCompare();
    initFileSplitter();
    initImageCompare();
    initSqlFormatter();
    initSqlScriptGenerator();
    initAdvancedCompare();
    initDummyImageGenerator();

    // Activate the first tool by default
    document.querySelector('.sidebar-nav .nav-item').click();

    // --- Sidebar Toggle Logic ---
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            sidebar.classList.toggle('minimized');

            const icon = sidebarToggle.querySelector('i');
            const label = sidebarToggle.querySelector('span');

            if (sidebar.classList.contains('minimized')) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
                label.textContent = "Maximize";
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
                label.textContent = "Minimize";
            }
        });
    }
});