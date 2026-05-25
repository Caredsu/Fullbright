/**
 * API Service - Shared API client for all admin pages
 * Updated to use Node.js backend at http://localhost:3001/api
 * Handles all API communication and error handling
 */

class APIService {
    constructor(baseUrl = 'http://localhost:3001') {
        this.baseUrl = baseUrl;
        this.apiPath = `${baseUrl}/api`;
    }

    /**
     * Make API request to Node.js backend
     */
    async request(method, endpoint, data = null) {
        try {
            const url = `${this.apiPath}${endpoint}`;
            
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'  // Send session cookies with request
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            
            // Handle non-JSON responses (errors) - log full response for debugging
            const contentType = response.headers.get('content-type') || 'unknown';
            if (!contentType.includes('application/json')) {
                const responseText = await response.text();
                console.error('🔴 API Non-JSON Response:', {
                    method: method,
                    endpoint: endpoint,
                    url: url,
                    status: response.status,
                    contentType: contentType,
                    responsePreview: responseText.substring(0, 500)
                });
                throw new Error(`Expected JSON but got ${contentType}. Status: ${response.status}`);
            }
            
            const result = await response.json();

            return {
                success: response.ok && result.success,
                status: response.status,
                message: result.message,
                data: result.data || null,
                errors: result.data?.errors || null
            };
        } catch (error) {
            console.error('API Request Error:', error);
            return {
                success: false,
                status: 0,
                message: error.message || 'Network error',
                data: null,
                errors: null
            };
        }
    }

    // User Management
    async getUsers(page = 1, limit = 10) {
        return this.request('GET', `/users?page=${page}&limit=${limit}`);
    }

    async getUser(id) {
        return this.request('GET', `/users/${id}`);
    }

    async createUser(data) {
        return this.request('POST', '/users', data);
    }

    async updateUser(id, data) {
        return this.request('PUT', `/users/${id}`, data);
    }

    async deleteUser(id) {
        return this.request('DELETE', `/users/${id}`);
    }

    // Teacher Management
    async getTeachers(page = 1, limit = 10) {
        return this.request('GET', `/teachers?page=${page}&limit=${limit}`);
    }

    async getTeacher(id) {
        return this.request('GET', `/teachers/${id}`);
    }

    async createTeacher(data) {
        return this.request('POST', '/teachers', data);
    }

    async updateTeacher(id, data) {
        return this.request('PUT', `/teachers/${id}`, data);
    }

    async deleteTeacher(id) {
        return this.request('DELETE', `/teachers/${id}`);
    }

    // Question Management
    async getQuestions() {
        return this.request('GET', '/questions?limit=1000&page=1');
    }

    async getQuestion(id) {
        return this.request('GET', `/questions/${id}`);
    }

    async createQuestion(data) {
        return this.request('POST', '/questions', data);
    }

    async updateQuestion(id, data) {
        return this.request('PUT', `/questions/${id}`, data);
    }

    async deleteQuestion(id) {
        return this.request('DELETE', `/questions/${id}`);
    }

    // Dashboard
    async getDashboardStats() {
        return this.request('GET', '/dashboard/stats');
    }

    async getDashboardTeachers() {
        return this.request('GET', '/dashboard/teachers');
    }

    /**
     * Handle API errors and show user-friendly messages
     */
    handleError(response) {
        if (response.errors) {
            // Validation errors
            const messages = [];
            for (const field in response.errors) {
                if (Array.isArray(response.errors[field])) {
                    messages.push(...response.errors[field]);
                }
            }
            return messages.join('\n');
        }
        return response.message || 'An error occurred';
    }

    /**
     * Format validation errors for display
     */
    getValidationErrors(response) {
        if (response.errors && typeof response.errors === 'object') {
            return response.errors;
        }
        return null;
    }
}

// Global API instance
const api = new APIService();
