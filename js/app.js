let currentFilter = 'all';
let currentTasks = [];
let categories = [];

async function loadInitialData() {
    await loadUserProfile();
    await loadCategories();
    await loadTasks();
    await loadStatistics();
}

// Load Tasks
async function loadTasks(params = {}) {
    try {
        let queryParams = { ...params };
        
        if (currentFilter === 'today') {
            queryParams.status_filter = 'today';
        } else if (currentFilter === 'overdue') {
            queryParams.status_filter = 'overdue';
        } else if (currentFilter !== 'all') {
            queryParams.status = currentFilter;
        }
        
        const data = await API.getTasks(queryParams);
        currentTasks = data.results || data;
        renderTasks();
    } catch (error) {
        showToast('Error al cargar tareas', 'error');
    }
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    
    if (currentTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-check"></i>
                <h3>No hay tareas</h3>
                <p>Crea tu primera tarea para comenzar</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentTasks.map(task => `
        <div class="task-card priority-${task.priority} ${task.status === 'completed' ? 'completed' : ''}">
            <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" onclick="toggleTask(${task.id})">
                ${task.status === 'completed' ? '<i class="fas fa-check"></i>' : ''}
            </div>
            
            <div class="task-content">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-meta">
                    ${task.category_name ? `
                        <span class="task-category" style="background: ${task.category_color}20; color: ${task.category_color}">
                            ${escapeHtml(task.category_name)}
                        </span>
                    ` : ''}
                    <span class="task-priority priority-${task.priority}">
                        ${getPriorityLabel(task.priority)}
                    </span>
                    ${task.due_date ? `
                        <span style="${isOverdue(task) ? 'color: var(--danger); font-weight: 600;' : ''}">
                            <i class="far fa-calendar"></i> ${formatDate(task.due_date)}
                        </span>
                    ` : ''}
                    <span><i class="far fa-clock"></i> ${formatDate(task.created_at)}</span>
                </div>
                ${task.description ? `<div style="margin-top: 8px; color: var(--gray); font-size: 14px;">${escapeHtml(task.description)}</div>` : ''}
            </div>
            
            <div class="task-actions">
                <button class="btn-icon" onclick="editTask(${task.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteTask(${task.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Categories
async function loadCategories() {
    try {
        const data = await API.getCategories();
        categories = data.results; 
        renderCategories();
        updateCategorySelect();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategories() {
    const container = document.getElementById('categories-list');
    container.innerHTML = categories.map(cat => `
        <div class="category-item" onclick="filterByCategory(${cat.id})">
            <div class="category-color" style="background: ${cat.color}"></div>
            <span>${escapeHtml(cat.name)}</span>
            <span class="category-count">${cat.task_count}</span>
            <button onclick="editCategory(event, ${cat.id})">✏️</button>
            <button onclick="deleteCategory(event, ${cat.id})">🗑️</button>
        </div>
    `).join('');
}

function updateCategorySelect() {
    const select = document.getElementById('task-category');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Sin categoría</option>' + 
        categories.map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('');
    select.value = currentValue;
}

async function deleteCategory(event, id) {
    event.stopPropagation();

    const confirmDelete = confirm("¿Estás seguro de que quieres borrar esta categoría?");
    if (!confirmDelete) return;

    try {
        await API.deleteCategory(id); // llamamos al backend
        await loadCategories();        // refrescamos dropdown y lista
        console.log("Categoría borrada");
    } catch (error) {
        console.error("Error borrando categoría:", error);
    }
}


// Statistics
async function loadStatistics() {
    try {
        const stats = await API.getStatistics();
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-pending').textContent = stats.pending;
        document.getElementById('stat-completed').textContent = stats.completed;
        document.getElementById('stat-overdue').textContent = stats.overdue;
        
        // Update sidebar badges
        document.getElementById('count-all').textContent = stats.total;
        document.getElementById('count-pending').textContent = stats.pending;
        document.getElementById('count-today').textContent = stats.pending; // Simplified
        document.getElementById('count-overdue').textContent = stats.overdue;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Actions
function filterTasks(filter) {
    currentFilter = filter;
    
    // Update UI
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    // Update title
    const titles = {
        'all': 'Todas las Tareas',
        'today': 'Tareas de Hoy',
        'pending': 'Tareas Pendientes',
        'completed': 'Tareas Completadas',
        'overdue': 'Tareas Vencidas'
    };
    document.getElementById('page-title').textContent = titles[filter] || 'Tareas';
    
    loadTasks();
}

async function toggleTask(id) {
    try {
        await API.toggleTaskStatus(id);
        await loadTasks();
        await loadStatistics();
        await loadCategories();
        showToast('Estado actualizado', 'success');
    } catch (error) {
        showToast('Error al actualizar', 'error');
    }
}

async function deleteTask(id) {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    try {
        await API.deleteTask(id);
        await loadTasks();
        await loadStatistics();
        await loadCategories();
        showToast('Tarea eliminada', 'success');
    } catch (error) {
        showToast('Error no al eliminar', 'error', error);
    }
}

// Modals
function showTaskModal(task = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const title = document.getElementById('modal-title');
    
    if (task) {
        title.textContent = 'Editar Tarea';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-category').value = task.category || '';
        document.getElementById('task-due-date').value = task.due_date ? task.due_date.slice(0, 16) : '';
    } else {
        title.textContent = 'Nueva Tarea';
        form.reset();
        document.getElementById('task-id').value = '';
    }
    
    modal.classList.remove('hidden');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
}

async function saveTask(e) {
    e.preventDefault();
    
    const id = document.getElementById('task-id').value;
    const data = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        priority: document.getElementById('task-priority').value,
        category: document.getElementById('task-category').value || null,
        due_date: document.getElementById('task-due-date').value || null
    };
    
    try {
        if (id) {
            await API.updateTask(id, data);
            showToast('Tarea actualizada', 'success');
        } else {
            await API.createTask(data);
            showToast('Tarea creada', 'success');
        }
        
        closeTaskModal();
        await loadTasks();
        await loadStatistics();
        await loadCategories();
    } catch (error) {
        showToast(error.message || 'Error al guardar', 'error');
    }
}

function editTask(id) {
    const task = currentTasks.find(t => t.id === id);
    if (task) showTaskModal(task);
}

// Category Modal
function showCategoryModal() {
    document.getElementById('category-modal').classList.remove('hidden');
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.add('hidden');
    document.getElementById('category-form').reset();
}

async function saveCategory(e) {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('category-name').value,
        color: document.getElementById('category-color').value
    };
    
    try {
        await API.createCategory(data);
        showToast('Categoría creada', 'success');
        closeCategoryModal();
        await loadCategories();
    } catch (error) {
        showToast(error.message || 'Error al crear categoría', 'error');
    }
}

// Search and Filters
function searchTasks(query) {
    loadTasks({ search: query });
}

function applyFilters() {
    const priority = document.getElementById('priority-filter').value;
    const ordering = document.getElementById('sort-by').value;
    const search = document.getElementById('search-input').value;
    
    const params = {};
    if (priority) params.priority = priority;
    if (ordering) params.ordering = ordering;
    if (search) params.search = search;
    
    loadTasks(params);
}

// Utilities
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getPriorityLabel(priority) {
    const labels = {
        'low': 'Baja',
        'medium': 'Media',
        'high': 'Alta'
    };
    return labels[priority] || priority;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function isOverdue(task) {
    if (!task.due_date || task.status === 'completed') return false;
    return new Date(task.due_date) < new Date();
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.add('hidden');
    }
}