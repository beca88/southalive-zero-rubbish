// src/pages/EmbedAdopt.jsx
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { DrawControl, MapFlyTo, StreetSearch, LocateControl } from "../components/LeafletDrawTools";
import { registerVolunteer } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";
import southAliveLogo from "../assets/South-Alive-Logo-Letina.png";

const SOUTH_INVERCARGILL_CENTER = [-46.4273, 168.3602];

// Same icon artwork as the actual Leaflet.draw toolbar buttons (from leaflet-draw's own
// spritesheet), shown inline in the instructions so they match what's on the map.
function DrawLineIcon({ className = "" }) {
    return (
        <svg viewBox="18 18 24 24" width="16" height="16" fill="currentColor" className={className} aria-hidden="true">
            <path d="m 18,36 0,6 6,0 0,-6 -6,0 z m 4,4 -2,0 0,-2 2,0 0,2 z" />
            <path d="m 36,18 0,6 6,0 0,-6 -6,0 z m 4,4 -2,0 0,-2 2,0 0,2 z" />
            <path d="m 23.142,39.145 -2.285,-2.29 16,-15.998 2.285,2.285 z" />
        </svg>
    );
}

function DrawZoneIcon({ className = "" }) {
    return (
        <svg viewBox="76 18 24 24" width="16" height="16" fill="currentColor" className={className} aria-hidden="true">
            <path d="M 100,24.565 97.904,39.395 83.07,42 76,28.773 86.463,18 Z" />
        </svg>
    );
}

function EditToolIcon({ className = "" }) {
    return (
        <svg viewBox="310 10 40 40" width="16" height="16" fill="currentColor" className={className} aria-hidden="true">
            <path d="m 337,30.156 0,0.407 0,5.604 c 0,1.658 -1.344,3 -3,3 l -10,0 c -1.655,0 -3,-1.342 -3,-3 l 0,-10 c 0,-1.657 1.345,-3 3,-3 l 6.345,0 3.19,-3.17 -9.535,0 c -3.313,0 -6,2.687 -6,6 l 0,10 c 0,3.313 2.687,6 6,6 l 10,0 c 3.314,0 6,-2.687 6,-6 l 0,-8.809 -3,2.968" />
            <path d="m 338.72,24.637 -8.892,8.892 -2.828,0 0,-2.829 8.89,-8.89 z" />
            <path
                d="m 338.697,17.826 4,0 0,4 -4,0 z"
                transform="matrix(-0.70698336,-0.70723018,0.70723018,-0.70698336,567.55917,274.78273)"
            />
        </svg>
    );
}

function DeleteToolIcon({ className = "" }) {
    return (
        <svg viewBox="373 10 30 36" width="16" height="16" fill="currentColor" className={className} aria-hidden="true">
            <path d="m 381,42 18,0 0,-18 -18,0 0,18 z m 14,-16 2,0 0,14 -2,0 0,-14 z m -4,0 2,0 0,14 -2,0 0,-14 z m -4,0 2,0 0,14 -2,0 0,-14 z m -4,0 2,0 0,14 -2,0 0,-14 z" />
            <path d="m 395,20 0,-4 -10,0 0,4 -6,0 0,2 22,0 0,-2 -6,0 z m -2,0 -6,0 0,-2 6,0 0,2 z" />
        </svg>
    );
}

// Mimics the look of Leaflet's actual zoom control buttons (a plain bold glyph in a
// small bordered box), rather than a sprite icon — Leaflet renders zoom in/out as text too.
function ZoomButtonIcon({ children }) {
    return (
        <span
            className="inline-flex items-center justify-center border border-gray-400 bg-white rounded-sm shrink-0"
            style={{ width: 16, height: 16, fontSize: 12, fontWeight: 700, lineHeight: 1, fontFamily: "'Lucida Console', Monaco, monospace" }}
            aria-hidden="true"
        >
            {children}
        </span>
    );
}

function MethodOption({ value, label, selected, onSelect }) {
    return (
        <button
            type="button"
            onClick={() => onSelect(value)}
            className={`flex-1 text-left border rounded px-4 py-3 text-sm flex items-center gap-2 ${selected ? "border-2" : "border-gray-300"
                }`}
            style={selected ? { borderColor: "#1F6FEB", backgroundColor: "#EFF6FF" } : {}}
        >
            <span
                className="w-4 h-4 rounded-full border shrink-0 flex items-center justify-center"
                style={selected ? { borderColor: "#1F6FEB" } : { borderColor: "#9CA3AF" }}
            >
                {selected && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#1F6FEB" }} />}
            </span>
            {label}
        </button>
    );
}

export default function EmbedAdopt() {
    const [searchParams] = useSearchParams();
    const prefilledStreet = searchParams.get("street") || "";

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        street: prefilledStreet,
    });
    // South Alive Volunteer Terms of Agreement acknowledgements — replaces the old
    // single "I consent" checkbox. See https://volunteer.southalive.org.nz/
    const [agreements, setAgreements] = useState({
        codeOfConduct: false,
        healthSafetyPolicy: false,
        healthSafetyAct: false,
        confidentiality: false,
        harassment: false,
        digitalMedia: "", // "permit" | "deny"
    });
    const [method, setMethod] = useState(prefilledStreet ? "text" : null);
    const [areaType, setAreaType] = useState("street"); // "street" (line) or "zone" (polygon) — only relevant to the Map method
    const [geometry, setGeometry] = useState(null);
    const [pickedLocation, setPickedLocation] = useState(null); // { position, label } - used by both methods
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    usePageTitle(submitted ? "Registration Submitted | Zero Rubbish" : "Street Adoption Form | Zero Rubbish");

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handleAgreementChange = (e) => {
        const { name, checked } = e.target;
        setAgreements((prev) => ({ ...prev, [name]: checked }));
    };

    const handleDigitalMediaChange = (value) => {
        setAgreements((prev) => ({ ...prev, digitalMedia: value }));
    };

    const allAgreementsAccepted =
        agreements.codeOfConduct &&
        agreements.healthSafetyPolicy &&
        agreements.healthSafetyAct &&
        agreements.confidentiality &&
        agreements.harassment &&
        agreements.digitalMedia !== "";

    const handleMethodChange = (value) => {
        setMethod(value);
        setAreaType("street");
        setGeometry(null);
        setPickedLocation(null);
        setForm((prev) => ({ ...prev, street: "" }));
    };

    const handleAreaTypeChange = (value) => {
        setAreaType(value);
        setGeometry(null);
    };

    const handleTextSelect = (result) => {
        setForm((prev) => ({ ...prev, street: result.label }));
        setGeometry(result.geometry || null);
        setPickedLocation({ position: result.position, label: result.label });
    };

    const handleMapLocationFound = (result) => {
        setForm((prev) => ({ ...prev, street: result.label }));
        setPickedLocation({ position: result.position, label: result.label });
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError("Your browser doesn't support location services.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                setError(null);
                const { latitude, longitude, accuracy } = pos.coords;

                let label = "Your location";
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=17&addressdetails=1`
                    );
                    const data = await response.json();
                    label = data?.address?.road || data?.display_name?.split(",")[0] || label;
                } catch {
                    // Reverse geocoding failed — fall back to the generic label.
                }

                setForm((prev) => ({ ...prev, street: label }));
                setPickedLocation({ position: [latitude, longitude], label, accuracy });
            },
            () => setError("Unable to access your location. Please check your browser's location permissions."),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // When someone draws their street or zone without ever searching/naming it, derive a
    // name from the drawn shape itself so they aren't forced to type anything to submit.
    const deriveStreetNameFromGeometry = async (geoJson) => {
        try {
            const ring = geoJson?.type === "Polygon" ? geoJson.coordinates?.[0] : geoJson?.coordinates;
            if (!ring?.length) return "";
            const [lon, lat] = ring[Math.floor(ring.length / 2)];
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=17&addressdetails=1`
            );
            const data = await response.json();
            return data?.address?.road || data?.display_name?.split(",")[0] || "";
        } catch {
            return "";
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!allAgreementsAccepted) return;
        if (!method) {
            setError("Please choose how you'd like to select your street.");
            return;
        }
        if (method === "map" && !geometry) {
            setError(`Please draw the ${areaType === "zone" ? "zone" : "street"} on the map before submitting.`);
            return;
        }
        if (method === "text" && !form.street.trim()) {
            setError("Please provide the street you'd like to adopt.");
            return;
        }

        setSubmitting(true);
        setError(null);

        let streetName = form.street.trim();
        if (!streetName && method === "map") {
            const fallbackLabel = areaType === "zone" ? "Unnamed zone (drawn on map)" : "Unnamed street (drawn on map)";
            streetName = (await deriveStreetNameFromGeometry(geometry)) || fallbackLabel;
            setForm((prev) => ({ ...prev, street: streetName }));
        }

        try {
            await registerVolunteer({
                name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
                phoneNo: form.phone,
                emailAddress: form.email,
                address: form.address,
                requestedAreaName: streetName,
                areaType: method === "map" ? areaType : "street",
                geometryGeoJson: geometry ? JSON.stringify(geometry) : undefined,
            });
            setSubmitted(true);
        } catch (err) {
            setError(
                err.response?.data || "Something went wrong submitting your request. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="max-w-sm mx-auto mt-10 text-center px-4">
                <h2 className="text-lg font-semibold mb-1">Thanks, {form.firstName}!</h2>
                <p className="text-sm text-gray-600">
                    Your request to adopt <strong>{form.street}</strong> has been submitted.
                    A coordinator will review it shortly.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto mt-6 mb-14 space-y-3 px-6 text-sm border-2 rounded-md p-4 shadow-lg" style={{ borderColor: "#FFD401" }}>
            <a
                href="https://www.southalive.org.nz/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-fit mx-auto mb-4"
            >
                <img
                    src={southAliveLogo}
                    alt="South Alive"
                    className="h-16 w-auto mx-auto my-2"
                />
            </a>
            <form onSubmit={handleSubmit} className=" space-y-3 px-6 text-sm"  >
                <h2 className="text-lg font-semibold text-center my-2">Zero Rubbish Street Adoption Registration Form</h2>

                {error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                        {error}
                    </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium mb-1">First name<span className="text-red-500">*</span></label>
                        <input type="text" name="firstName" required value={form.firstName} onChange={handleChange} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1">Last name<span className="text-red-500">*</span></label>
                        <input type="text" name="lastName" required value={form.lastName} onChange={handleChange} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1">Email<span className="text-red-500">*</span></label>
                    <input type="email" name="email" required value={form.email} onChange={handleChange} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1">Phone<span className="text-red-500">*</span></label>
                    <input type="tel" name="phone" required value={form.phone} onChange={handleChange} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1">Home address<span className="text-red-500">*</span></label>
                    <input type="text" name="address" required value={form.address} onChange={handleChange} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>

                <div className="pt-2">
                    <p className="font-semibold mb-1">Select the location you would like to adopt:<span className="text-red-500">*</span></p>
                    <p className="text-xs text-gray-600 mb-1 font-bold">
                        You can adopt either a street or an area (zone).
                    </p>
                    <p className="text-xs text-gray-600 mb-1">
                        Please use the map or text box below to select the location you would like to adopt.
                    </p>
                    <a
                        href="/embed/map"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline"
                        style={{ color: "#1F6FEB" }}
                    >
                        Check out our Adopt-A-Street map to see which streets have already been adopted
                    </a>
                </div>

                <div className="flex gap-3">
                    <MethodOption
                        value="map"
                        label="Map (preferred method)"
                        selected={method === "map"}
                        onSelect={handleMethodChange}
                    />
                    <MethodOption
                        value="text"
                        label="Text"
                        selected={method === "text"}
                        onSelect={handleMethodChange}
                    />
                </div>
                {method === "text" && (
                    <p className="text-xs text-gray-500 -mt-1">
                        "Text" adopts a whole street. To adopt a <strong>zone</strong>, or just <strong>part</strong> of
                        a street, choose "Map" and draw it yourself.
                    </p>
                )}

                {method === "map" && (
                    <div className="space-y-2 pt-1">
                        <div className="flex gap-3">
                            <label className="flex items-center gap-1.5 text-xs">
                                <input
                                    type="radio"
                                    name="mapAreaType"
                                    checked={areaType === "street"}
                                    onChange={() => handleAreaTypeChange("street")}
                                />
                                Street (draw a line)
                            </label>
                            <label className="flex items-center gap-1.5 text-xs">
                                <input
                                    type="radio"
                                    name="mapAreaType"
                                    checked={areaType === "zone"}
                                    onChange={() => handleAreaTypeChange("zone")}
                                />
                                Zone (draw an area)
                            </label>
                        </div>

                        <div className="border rounded-md p-3 bg-gray-50 space-y-1.5">
                            <p className="text-xs font-semibold">Instructions:</p>
                            <p className="text-xs text-gray-600">Step 1. Zoom to the location you are adopting by:</p>
                            <ul className="text-xs text-gray-600 list-disc pl-8 space-y-0.5">
                                <li className="flex items-center gap-1">
                                    Using <ZoomButtonIcon>+</ZoomButtonIcon> or <ZoomButtonIcon>&minus;</ZoomButtonIcon>
                                </li>
                                <li>Holding down ctrl while scrolling</li>
                                <li>Typing a nearby address in the search field on the map</li>
                            </ul>
                            <p className="text-xs text-gray-600 flex items-center gap-1 flex-wrap">
                                Step 2. Click once on the draw button
                                {areaType === "zone" ? <DrawZoneIcon /> : <DrawLineIcon />}.

                            </p>
                            {areaType === "zone" ? (
                                <p className="text-xs text-gray-600">
                                    Step 3. Mark your zone by drawing its outline: click once on each corner of the
                                    area, then click the first point again (or double-click the last point) to close
                                    the shape.
                                </p>
                            ) : (
                                <p className="text-xs text-gray-600">
                                    Step 3. Mark your street by drawing a line: click once on your starting point, move
                                    your cursor along the street to the end point, then double-click on the end point.
                                </p>
                            )}
                            <p className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                                Made a mistake? Use the edit <EditToolIcon /> or delete <DeleteToolIcon /> tool and
                                redraw — only your final {areaType === "zone" ? "shape" : "line"} is submitted.
                            </p>
                        </div>

                        <div className="rounded-md border overflow-visible">
                            <div className="p-2 border-b bg-white space-y-1">
                                <StreetSearch onSelect={handleMapLocationFound} placeholder="Find address or place" />
                                <button
                                    type="button"
                                    onClick={handleUseCurrentLocation}
                                    className="text-xs underline"
                                    style={{ color: "#1F6FEB" }}
                                >
                                    📍 Find my location
                                </button>
                            </div>

                            <div className="rounded-b-md overflow-hidden" style={{ height: "300px" }}>
                                <MapContainer
                                    center={SOUTH_INVERCARGILL_CENTER}
                                    zoom={15}
                                    style={{ width: "100%", height: "100%" }}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <DrawControl areaType={areaType} onGeometryChange={setGeometry} />
                                    <LocateControl position="topright" />
                                    <MapFlyTo position={pickedLocation?.position} radius={pickedLocation?.accuracy} />
                                    {pickedLocation && (
                                        <>
                                            {pickedLocation.accuracy && (
                                                <Circle
                                                    center={pickedLocation.position}
                                                    radius={pickedLocation.accuracy}
                                                    color="#1F6FEB"
                                                    weight={1}
                                                    fillColor="#1F6FEB"
                                                    fillOpacity={0.08}
                                                />
                                            )}
                                            <Marker position={pickedLocation.position}>
                                                <Popup>
                                                    {pickedLocation.accuracy
                                                        ? `${pickedLocation.label} (accurate to ~${Math.round(pickedLocation.accuracy)}m)`
                                                        : pickedLocation.label}
                                                </Popup>
                                            </Marker>
                                        </>
                                    )}
                                </MapContainer>
                            </div>
                        </div>

                        {form.street && (
                            <p className="text-xs text-gray-600">
                                Current location: <strong>{form.street}</strong>
                            </p>
                        )}

                        {pickedLocation?.accuracy > 150 && (
                            <p className="text-xs text-amber-600">
                                ⚠ This location may not be exact (accurate to ~{Math.round(pickedLocation.accuracy)}m).
                            </p>
                        )}

                        {geometry && (
                            <p className="text-xs text-green-700">
                                ✓ {areaType === "zone" ? "Zone" : "Street"} drawn — ready to submit.
                            </p>
                        )}
                    </div>
                )}

                {method === "text" && (
                    <div className="space-y-2 pt-1">
                        <label className="block text-sm font-medium">Search and select your street</label>
                        <StreetSearch onSelect={handleTextSelect} includeGeometry />

                        {form.street ? (
                            <div className="flex items-center justify-between border rounded px-2 py-1.5 bg-gray-50">
                                <span>
                                    <span className="text-gray-500">Adopting: </span>
                                    <strong>{form.street}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForm((prev) => ({ ...prev, street: "" }));
                                        setGeometry(null);
                                        setPickedLocation(null);
                                    }}
                                    className="text-xs underline text-gray-500"
                                >
                                    Clear
                                </button>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500">Search above and select your street from the results.</p>
                        )}

                        {pickedLocation && (
                            <div className="rounded-md overflow-hidden border" style={{ height: "200px" }}>
                                <MapContainer
                                    center={pickedLocation.position}
                                    zoom={16}
                                    style={{ width: "100%", height: "100%" }}
                                    dragging={false}
                                    scrollWheelZoom={false}
                                    doubleClickZoom={false}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Marker position={pickedLocation.position}>
                                        <Popup>{pickedLocation.label}</Popup>
                                    </Marker>
                                </MapContainer>
                            </div>
                        )}

                        {geometry && (
                            <p className="text-xs text-green-700">✓ Location found, ready to submit.</p>
                        )}
                    </div>
                )}

                <div className="border rounded-md p-3 bg-gray-50 space-y-3 mt-1">
                    <p className="font-semibold text-sm">South Alive Volunteer Terms of Agreement</p>

                    <div className="space-y-1">
                        <p className="text-xs font-semibold">Code of Conduct</p>
                        <p className="text-xs text-gray-600">
                            Volunteers should conduct themselves in a manner that creates and maintains a positive
                            impression of South Alive. Volunteers should avoid any action which might adversely
                            affect public perception of South Alive.
                        </p>
                        <label className="flex items-start gap-2 text-xs">
                            <input type="checkbox" name="codeOfConduct" checked={agreements.codeOfConduct} onChange={handleAgreementChange} required className="mt-0.5" />
                            <span>
                                I have read and understood the{" "}
                                <a href="https://www.southalive.org.nz/wp-content/uploads/2025/07/HR-Pol-06-Code-of-conduct-June-2024.pdf" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#1F6FEB" }}>
                                    South Alive Code of Conduct policy
                                </a>.
                            </span>
                        </label>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs font-semibold">Health and Safety</p>
                        <p className="text-xs text-gray-600">
                            Volunteers are required to observe all health and safety rules and act in a manner
                            which does not expose themselves to unnecessary health and safety risk.
                        </p>
                        <label className="flex items-start gap-2 text-xs">
                            <input type="checkbox" name="healthSafetyPolicy" checked={agreements.healthSafetyPolicy} onChange={handleAgreementChange} required className="mt-0.5" />
                            <span>
                                I have read and understand the{" "}
                                <a href="https://www.southalive.org.nz/wp-content/uploads/2024/07/HR-Pol-04-Health-and-Safety-Policy-June-2024.pdf" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#1F6FEB" }}>
                                    South Alive Health and Safety policy
                                </a>.
                            </span>
                        </label>
                        <label className="flex items-start gap-2 text-xs">
                            <input type="checkbox" name="healthSafetyAct" checked={agreements.healthSafetyAct} onChange={handleAgreementChange} required className="mt-0.5" />
                            I have read and understand my obligations under the Health and Safety at Work Act 2015.
                        </label>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs font-semibold">Confidentiality</p>
                        <p className="text-xs text-gray-600">
                            I understand that all information I become aware of, while working in a volunteer
                            capacity at South Alive, is completely confidential. This includes all contact details
                            for participants, volunteers and staff. I understand that my contact details will be
                            recorded by South Alive and that these details will be kept secure and confidential.
                        </p>
                        <label className="flex items-start gap-2 text-xs">
                            <input type="checkbox" name="confidentiality" checked={agreements.confidentiality} onChange={handleAgreementChange} required className="mt-0.5" />
                            <span>
                                I have read and understood the{" "}
                                <a href="https://www.southalive.org.nz/wp-content/uploads/2024/07/HR-Pol-01-Privacy-and-Confidentiality-Policy-June-2024.pdf" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#1F6FEB" }}>
                                    South Alive Privacy and Confidentiality Policy
                                </a>.
                            </span>
                        </label>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs font-semibold">Workplace Harassment</p>
                        <p className="text-xs text-gray-600">
                            I understand that South Alive is committed to providing an environment free from all
                            forms of discrimination and harassment. I have read and understand the South Alive
                            Harassment policy.
                        </p>
                        <label className="flex items-start gap-2 text-xs">
                            <input type="checkbox" name="harassment" checked={agreements.harassment} onChange={handleAgreementChange} required className="mt-0.5" />
                            <span>
                                I have read and understood the{" "}
                                <a href="https://www.southalive.org.nz/wp-content/uploads/2024/07/HR-Pol-07-Harassment-policy-June-2024.pdf" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#1F6FEB" }}>
                                    South Alive Harassment Policy
                                </a>.
                            </span>
                        </label>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs font-semibold">Digital Media</p>
                        <p className="text-xs text-gray-600">
                            I understand that occasionally digital media (photos and videos) will be taken of me in
                            a volunteering capacity. These photographs/videos/images may be used for promotional
                            purposes such as websites, posters, and leaflets but not for commercial gain.
                        </p>
                        <label className="flex items-start gap-2 text-xs">
                            <input
                                type="radio"
                                name="digitalMedia"
                                checked={agreements.digitalMedia === "permit"}
                                onChange={() => handleDigitalMediaChange("permit")}
                                required
                                className="mt-0.5"
                            />
                            I give permission to South Alive to use these images for promotional purposes.
                        </label>
                        <label className="flex items-start gap-2 text-xs">
                            <input
                                type="radio"
                                name="digitalMedia"
                                checked={agreements.digitalMedia === "deny"}
                                onChange={() => handleDigitalMediaChange("deny")}
                                required
                                className="mt-0.5"
                            />
                            I do not give permission to South Alive to use these images for promotional purposes.
                        </label>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!allAgreementsAccepted || submitting}
                    className="w-full py-1.5 rounded font-medium text-sm disabled:opacity-50"
                    style={{ backgroundColor: "#FFD401", color: "#1F2937", marginBottom: "1rem" }}
                >
                    {submitting ? "Submitting…" : "SUBMIT"}
                </button>
            </form>
        </div>
    );
}
