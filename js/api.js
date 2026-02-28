const API_URL_LOCAL = 'http://localhost:8000/api';
const API_URL = 'https://taskflow-backend-9n9s.onrender.com/';

class API {
    static async request(endpoint, options = {}) {
        const url = `${API_URL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);

            if (response.status === 401) {
                // Token expirado, intentar refresh
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    return this.request(endpoint, options);
                } else {
                    throw new Error('Sesión expirada');
                }
            }

            if (response.status === 204) {
                // No Content → todo OK, no hay JSON que parsear
                return null;
            }

            if (!response.ok) {
                // Si falla, intenta parsear JSON, si no hay nada → {}
                const error = await response.json().catch(() => ({}));
                throw new Error(error.detail || error.message || 'Error en la petición');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    static async refreshToken() {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) return false;

        try {
            const response = await fetch(`${API_URL}/api/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access);
                return true;
            }
        } catch (e) {
            console.error('Error refreshing token:', e);
        }
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return false;
    }

    // Auth
    static login(credentials) {
        return this.request('/api/token/', {
            method: 'POST',
            body: credentials
        });
    }

    static register(data) {
        return this.request('/api/register/', {
            method: 'POST',
            body: data
        });
    }

    static getProfile() {
        return this.request('/api/profile/');
    }

    // Tasks
    static getTasks(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/api/tasks/?${queryString}`);
    }

    static getTask(id) {
        return this.request(`/api/tasks/${id}/`);
    }

    static createTask(data) {
        return this.request('/api/tasks/', {
            method: 'POST',
            body: data
        });
    }

    static updateTask(id, data) {
        return this.request(`/api/tasks/${id}/`, {
            method: 'PUT',
            body: data
        });
    }

    static deleteTask(id) {
        return this.request(`/api/tasks/${id}/`, {
            method: 'DELETE'
        });
    }

    static toggleTaskStatus(id) {
        return this.request(`/api/tasks/${id}/toggle_status/`, {
            method: 'POST'
        });
    }

    static getStatistics() {
        return this.request('/api/tasks/statistics/');
    }

    // Categories
    static getCategories() {
        return this.request('/api/categories/');
    }

    static createCategory(data) {
        return this.request('/api/categories/', {
            method: 'POST',
            body: data
        });
    }

    static async deleteCategory(id) {
        return this.request(`/api/categories/${id}/`, { method: 'DELETE' });
    }

}
