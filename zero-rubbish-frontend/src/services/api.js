import axios from "axios";
import { mockAreas } from "./mockData";
import { API_BASE_URL } from "./config";

const USE_MOCK = false; // backend is live — flip back to true if the API is down

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Attach the JWT to every request automatically, if one exists
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("zr_admin_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// If a request comes back 401 (expired/invalid token), clear it and bounce to login.
// Skip this for the login request itself — a wrong username/password is an expected
// 401 there, not an expired session, and should be handled inline by the login form
// instead of hard-reloading the page out from under it.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes("/auth/login");
        if (error.response?.status === 401 && !isLoginRequest) {
            localStorage.removeItem("zr_admin_token");
            window.location.href = "/admin/login";
        }
        return Promise.reject(error);
    }
);

// ---------- Public ----------

export async function getAreas() {
    if (USE_MOCK) {
        await new Promise((res) => setTimeout(res, 400));
        return mockAreas;
    }
    const res = await api.get("/public/areas");
    return res.data;
}

export async function registerVolunteer(volunteerData) {
    if (USE_MOCK) {
        await new Promise((res) => setTimeout(res, 400));
        console.log("MOCK register:", volunteerData);
        return { message: "Registration submitted (mock)." };
    }
    const res = await api.post("/public/volunteers/register", volunteerData);
    return res.data;
}

// ---------- Auth ----------

export async function login(username, password) {
    const res = await api.post("/auth/login", { username, password });
    return res.data; // { token, username, role }
}

// ---------- Admin: Volunteers ----------

export async function getVolunteers(status) {
    const res = await api.get("/admin/volunteeradmin", {
        params: status ? { status } : {},
    });
    return res.data;
}

export async function updateVolunteer(id, updates) {
    const res = await api.patch(`/admin/volunteeradmin/${id}`, updates);
    return res.data;
}

export async function approveVolunteer(id, approvalData) {
    // approvalData: { areaName, areaType, geometryGeoJson }
    const res = await api.patch(`/admin/volunteeradmin/${id}/approve`, approvalData);
    return res.data;
}

export async function rejectVolunteer(id) {
    const res = await api.patch(`/admin/volunteeradmin/${id}/reject`);
    return res.data;
}

export async function deleteVolunteer(id) {
    const res = await api.delete(`/admin/volunteeradmin/${id}`);
    return res.data;
}

// Permanently deletes a volunteer along with their adoption history. Only allowed once
// every adoption they had has ended — use for cleaning up test data / mistakes.
export async function forceDeleteVolunteer(id) {
    const res = await api.delete(`/admin/volunteeradmin/${id}/force`);
    return res.data;
}

// ---------- Admin: Areas ----------

export async function getAdminAreas() {
    const res = await api.get("/admin/areas");
    return res.data;
}

// ---------- Admin: Adoption Updates ----------
export async function getAdoptionUpdates(areaId) {
    const res = await api.get(`/admin/areas/${areaId}/updates`);
    return res.data;
}

// Add a new adoption update for a specific area
export async function addAdoptionUpdate(areaId, updateData) {
    const res = await api.post(`/admin/areas/${areaId}/updates`, updateData);
    return res.data;
}

export async function endAdoption(areaId) {
    const res = await api.patch(`/admin/areas/${areaId}/end-adoption`);
    return res.data;
}

export async function getEndedAdoptions() {
    const res = await api.get("/admin/areas/ended");
    return res.data;
}