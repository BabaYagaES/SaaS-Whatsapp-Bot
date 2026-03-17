const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('token');
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = this.getToken();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: { message: 'Network error' } }));
            throw new Error(error.error?.message || `HTTP ${res.status}`);
        }

        return res.json();
    }

    async getLeads() {
        return this.request<{ leads: any[] }>('/api/leads');
    }

    async deleteLead(id: string) {
        return this.request<{ message: string }>(`/api/leads/${id}`, {
            method: 'DELETE',
        });
    }

    // Auth
    async register(email: string, password: string, name?: string) {
        return this.request<{ user: any; token: string }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name }),
        });
    }

    async login(email: string, password: string) {
        return this.request<{ user: any; token: string }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async getMe() {
        return this.request<{ user: any }>('/api/auth/me');
    }

    async changePassword(currentPassword: string, newPassword: string) {
        return this.request<{ message: string }>('/api/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    }

    // Users
    async getProfile() {
        return this.request<{ user: any }>('/api/users/profile');
    }

    async getStats() {
        return this.request<{ stats: any }>('/api/users/stats');
    }

    async updateProfile(data: { 
        name?: string; 
        avatar?: string;
        businessType?: string;
        businessName?: string;
        businessDescription?: string;
    }) {
        return this.request<{ user: any }>('/api/users/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // AI
    async generateTemplates(data: { businessType: string; businessName: string; businessDescription: string; save?: boolean }) {
        return this.request<{ templates: { name: string; content: string }[] }>('/api/ai/generate-templates', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async aiChat(message: string) {
        return this.request<{ response: string }>('/api/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    }

    // WhatsApp Sessions
    async createSession(sessionName: string) {
        return this.request<{ session: any }>('/api/whatsapp/sessions', {
            method: 'POST',
            body: JSON.stringify({ sessionName }),
        });
    }

    async getSessions() {
        return this.request<{ sessions: any[] }>('/api/whatsapp/sessions');
    }

    async getSession(id: string) {
        return this.request<{ session: any }>(`/api/whatsapp/sessions/${id}`);
    }

    async deleteSession(id: string) {
        return this.request<{ message: string }>(`/api/whatsapp/sessions/${id}`, {
            method: 'DELETE',
        });
    }

    async sendMessage(sessionId: string, to: string, message: string, file?: { name: string, type: string, base64: string } | null) {
        const body: any = { to, message };
        if (file) {
            body.mediaBase64 = file.base64;
            body.mediaMimeType = file.type;
            body.mediaName = file.name;
        }
        return this.request<{ data: any }>(`/api/whatsapp/sessions/${sessionId}/send`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    // Contacts
    async getContacts(params?: { search?: string; tag?: string; page?: number }) {
        const query = new URLSearchParams();
        if (params?.search) query.set('search', params.search);
        if (params?.tag) query.set('tag', params.tag);
        if (params?.page) query.set('page', String(params.page));
        return this.request<{ contacts: any[]; pagination: any }>(`/api/contacts?${query}`);
    }

    async createContact(data: { phone: string; name?: string; address?: string; tags?: string[] }) {
        return this.request<{ contact: any }>('/api/contacts', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateContact(id: string, data: { name?: string; address?: string; tags?: string[]; notes?: string }) {
        return this.request<{ contact: any }>(`/api/contacts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteContact(id: string) {
        return this.request<{ message: string }>(`/api/contacts/${id}`, {
            method: 'DELETE',
        });
    }

    // Messages
    async getConversations() {
        return this.request<{ conversations: any[] }>('/api/messages/conversations');
    }

    async getChat(contactId: string, page?: number) {
        const query = page ? `?page=${page}` : '';
        return this.request<{ contact: any; messages: any[] }>(`/api/messages/chat/${contactId}${query}`);
    }

    // Automations
    async getAutomations() {
        return this.request<{ automations: any[] }>('/api/automations');
    }

    async createAutomation(data: {
        name: string;
        trigger: string;
        response: string;
        matchType?: string;
        priority?: number;
    }) {
        return this.request<{ automation: any }>('/api/automations', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateAutomation(id: string, data: any) {
        return this.request<{ automation: any }>(`/api/automations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async toggleAutomation(id: string) {
        return this.request<{ automation: any }>(`/api/automations/${id}/toggle`, {
            method: 'PATCH',
        });
    }

    async deleteAutomation(id: string) {
        return this.request<{ message: string }>(`/api/automations/${id}`, {
            method: 'DELETE',
        });
    }

    // Reports
    async getReportsOverview() {
        return this.request<{ overview: any }>('/api/reports/overview');
    }

    async getMessagesByDay(days?: number) {
        const query = days ? `?days=${days}` : '';
        return this.request<{ messagesByDay: any[] }>(`/api/reports/messages-by-day${query}`);
    }

    async getTopContacts(limit?: number) {
        const query = limit ? `?limit=${limit}` : '';
        return this.request<{ topContacts: any[] }>(`/api/reports/top-contacts${query}`);
    }

    async getMessagesByHour() {
        return this.request<{ messagesByHour: any[] }>('/api/reports/messages-by-hour');
    }

    // Media Gallery
    async getMedia() {
        return this.request<{ media: any[] }>('/api/media');
    }

    async uploadMedia(data: { name: string; mediaBase64: string; mediaMimeType: string; tags?: string }) {
        return this.request<{ item: any }>('/api/media', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteMedia(id: string) {
        return this.request<{ message: string }>(`/api/media/${id}`, {
            method: 'DELETE',
        });
    }
}

export const api = new ApiClient(API_URL);
