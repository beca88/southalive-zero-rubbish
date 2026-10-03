import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getVolunteers, updateVolunteer, rejectVolunteer, deleteVolunteer, forceDeleteVolunteer, exportVolunteersSpreadsheet } from "../services/api";
import ApproveVolunteerModal from "../components/ApproveVolunteerModal";
import usePageTitle from "../hooks/usePageTitle";

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected"];

const STATUS_COLORS = {
    Pending: "#F2994A",
    Approved: "#07C160",
    Rejected: "#94A3B8",
    Active: "#07C160",
    Ended: "#64748B",
};

// Approved volunteers show as "Active" or "Ended" depending on whether their
// street adoption is still ongoing, rather than the static "Approved" status.
function displayStatus(volunteer) {
    if (volunteer.status !== "Approved") return volunteer.status;
    return volunteer.hasActiveAdoption ? "Active" : "Ended";
}

function StatusBadge({ status }) {
    return (
        <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status] }}
        >
            {status}
        </span>
    );
}

function EditModal({ volunteer, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: volunteer.name,
        phoneNo: volunteer.phoneNo,
        emailAddress: volunteer.emailAddress,
        address: volunteer.address || "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await updateVolunteer(volunteer.volunteerId, form);
            onSaved();
        } catch {
            setError("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-md p-6 w-full max-w-sm">
                <h3 className="text-lg font-display font-semibold mb-4">Edit volunteer</h3>

                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium mb-1">Name</label>
                        <input
                            className="w-full border border-line rounded-sm px-2 py-1.5 text-sm"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1">Phone</label>
                        <input
                            className="w-full border border-line rounded-sm px-2 py-1.5 text-sm"
                            value={form.phoneNo}
                            onChange={(e) => setForm((f) => ({ ...f, phoneNo: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1">Email</label>
                        <input
                            className="w-full border border-line rounded-sm px-2 py-1.5 text-sm"
                            value={form.emailAddress}
                            onChange={(e) => setForm((f) => ({ ...f, emailAddress: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1">Address</label>
                        <input
                            className="w-full border border-line rounded-sm px-2 py-1.5 text-sm"
                            value={form.address}
                            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-5">
                    <button
                        onClick={onClose}
                        className="text-sm px-3 py-1.5 rounded-sm border border-line"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-sm px-3 py-1.5 rounded-sm font-medium disabled:opacity-50"
                        style={{ backgroundColor: "#FFD401", color: "#1C2B26" }}
                    >
                        {saving ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function VolunteersView() {
    usePageTitle("Volunteers | Zero Rubbish Admin");

    const [searchParams, setSearchParams] = useSearchParams();
    const statusFilter = searchParams.get("status") || "All";
    const volunteerIdFilter = searchParams.get("volunteerId");

    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingVolunteer, setEditingVolunteer] = useState(null);
    const [approvingVolunteer, setApprovingVolunteer] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [exporting, setExporting] = useState(false);

    const loadVolunteers = useCallback(() => {
        setLoading(true);
        setError(null);
        const apiStatus = statusFilter === "All" ? undefined : statusFilter;
        getVolunteers(apiStatus)
            .then(setVolunteers)
            .catch(() => setError("Unable to load volunteers."))
            .finally(() => setLoading(false));
    }, [statusFilter]);

    useEffect(() => {
        loadVolunteers();
    }, [loadVolunteers]);

    const handleFilterChange = (status) => {
        if (status === "All") {
            setSearchParams({});
        } else {
            setSearchParams({ status });
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Reject this registration?")) return;
        setActionError(null);
        try {
            await rejectVolunteer(id);
            loadVolunteers();
        } catch {
            setActionError("Failed to reject volunteer.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this volunteer record? This cannot be undone.")) return;
        setActionError(null);
        try {
            await deleteVolunteer(id);
            loadVolunteers();
        } catch (err) {
            const message =
                err.response?.data?.message ||
                "Failed to delete volunteer. They may have adoption history.";
            setActionError(message);
        }
    };

    const handleForceDelete = async (id, name) => {
        if (
            !window.confirm(
                `Permanently delete ${name}'s record and their ended adoption history? This cannot be undone — use it for test data or mistaken registrations, not adoptions you want a record of.`
            )
        )
            return;
        setActionError(null);
        try {
            await forceDeleteVolunteer(id);
            loadVolunteers();
        } catch (err) {
            const message = err.response?.data?.message || "Failed to delete volunteer.";
            setActionError(message);
        }
    };

    const handleExport = async () => {
        setActionError(null);
        setExporting(true);
        try {
            await exportVolunteersSpreadsheet();
        } catch {
            setActionError("Failed to export the spreadsheet.");
        } finally {
            setExporting(false);
        }
    };

    const visibleVolunteers = volunteerIdFilter
        ? volunteers.filter((v) => String(v.volunteerId) === volunteerIdFilter)
        : volunteers;

    return (
        <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h1 className="text-2xl font-display font-semibold text-ink">Volunteers Registration</h1>
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    title="Download every volunteer with an adopted street/area, with their yearly updates"
                    className="text-sm px-3 py-1.5 rounded border border-ink text-ink hover:bg-paper disabled:opacity-50"
                >
                    {exporting ? "Exporting…" : "Export spreadsheet"}
                </button>
            </div>

            <div className="flex gap-2 mb-4">
                {STATUS_OPTIONS.map((s) => (
                    <button
                        key={s}
                        onClick={() => handleFilterChange(s)}
                        className={`text-sm px-3 py-1.5 rounded-full border ${statusFilter === s
                                ? "bg-ink text-white border-ink"
                                : "border-line text-ink/60 hover:bg-paper"
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {volunteerIdFilter && (
                <p className="text-sm text-ink/60 mb-4">
                    Showing only volunteer #{volunteerIdFilter}.{" "}
                    <button
                        className="underline hover:text-ink"
                        onClick={() => {
                            const next = new URLSearchParams(searchParams);
                            next.delete("volunteerId");
                            setSearchParams(next);
                        }}
                    >
                        Clear filter
                    </button>
                </p>
            )}

            {actionError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
                    {actionError}
                </p>
            )}

            {loading && <p className="text-ink/60">Loading…</p>}
            {error && <p className="text-red-600">{error}</p>}

            {!loading && !error && (
                <div className="bg-white border border-line rounded-md overflow-hidden">
                    {visibleVolunteers.length === 0 ? (
                        <p className="p-6 text-sm text-ink/50">No volunteers match this filter.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-ink/50 border-b border-line bg-paper">
                                    <th className="px-4 py-2 font-medium">#</th>
                                    <th className="px-4 py-2 font-medium">Name</th>
                                    <th className="px-4 py-2 font-medium">Contact</th>
                                    <th className="px-4 py-2 font-medium">Requested area</th>
                                    <th className="px-4 py-2 font-medium">Status</th>
                                    <th className="px-4 py-2 font-medium">Registered</th>
                                    <th className="px-4 py-2 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleVolunteers.map((v, i) => (
                                    <tr key={v.volunteerId} className="border-b border-line last:border-0">
                                        <td className="px-4 py-3 text-ink/50">{i + 1}</td>
                                        <td className="px-4 py-3">{v.name}</td>
                                        <td className="px-4 py-3 text-ink/70">
                                            <div>{v.emailAddress}</div>
                                            <div className="text-xs text-ink/50">{v.phoneNo}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>{v.requestedAreaName}</div>
                                            {v.requestedGeometryGeoJson && (
                                                <div className="text-xs text-green-700">✓ Location provided</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={displayStatus(v)} />
                                        </td>
                                        <td className="px-4 py-3 text-ink/60">
                                            {new Date(v.registrationDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2 flex-wrap">
                                                {v.status === "Pending" && (
                                                    <>
                                                        <button
                                                            className="text-xs px-2 py-1 rounded-sm font-medium"
                                                            style={{ backgroundColor: "#07C160", color: "white" }}
                                                            onClick={() => setApprovingVolunteer(v)}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            className="text-xs px-2 py-1 rounded-sm border border-line"
                                                            onClick={() => handleReject(v.volunteerId)}
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    className="text-xs px-2 py-1 rounded-sm border border-line"
                                                    onClick={() => setEditingVolunteer(v)}
                                                >
                                                    Edit
                                                </button>
                                                {v.status !== "Approved" && (
                                                <button
                                                    className="text-xs px-2 py-1 rounded-sm border border-red-200 text-red-600"
                                                    onClick={() => handleDelete(v.volunteerId)}
                                                >
                                                    Delete
                                                </button>
                                                )}
                                                {v.status === "Approved" && !v.hasActiveAdoption && (
                                                <button
                                                    className="text-xs px-2 py-1 rounded-sm border border-red-300 text-red-700 font-medium"
                                                    onClick={() => handleForceDelete(v.volunteerId, v.name)}
                                                    title="Permanently deletes this volunteer and their ended adoption history"
                                                >
                                                    Force delete
                                                </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {editingVolunteer && (
                <EditModal
                    volunteer={editingVolunteer}
                    onClose={() => setEditingVolunteer(null)}
                    onSaved={() => {
                        setEditingVolunteer(null);
                        loadVolunteers();
                    }}
                />
            )}

            {approvingVolunteer && (
                <ApproveVolunteerModal
                    volunteer={approvingVolunteer}
                    onClose={() => setApprovingVolunteer(null)}
                    onApproved={() => {
                        setApprovingVolunteer(null);
                        loadVolunteers();
                    }}
                />
            )}
        </div>
    );
}