import { Link } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";

const links = [
    {
        title: "Public Map",
        description: "View adopted streets and zones across South Invercargill.",
        to: "/embed/map",
        color: "#07C160",
    },
    
    {
        title: "Administrator Login",
        description: "Admin dashboard for reviewing and managing registrations.",
        to: "/admin/login",
        color: "#1C2B26",
    },
];

export default function HomeView() {
    usePageTitle("Zero Rubbish Street Adoption System");

    return (
        <div className="min-h-screen bg-paper px-6 py-12">
            <div className="max-w-3xl mx-auto">
                <p className="text-xs text-ink/50 uppercase tracking-widest mb-2">South Alive</p>
                <h1 className="text-3xl font-display font-semibold text-ink mb-2">
                    Zero Rubbish Street Adoption System
                </h1>
                <p className="text-ink/70 mb-10">
                    A civic technology platform helping South Invercargill residents adopt
                    and care for local streets and public spaces.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                    {links.map((link) => (
                        <a
                            key={link.to}
                            href={link.to}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white border border-line rounded-md p-5 hover:shadow-md transition-shadow"
                        >
                            <div
                                className="w-8 h-1.5 rounded mb-3"
                                style={{ backgroundColor: link.color }}
                            />
                            <h2 className="font-display font-semibold text-ink mb-1">
                                {link.title}
                            </h2>
                            <p className="text-sm text-ink/60">{link.description}</p>
                        </a>
                    ))}
                </div>

                <p className="text-xs text-ink/40 mt-10">
                    Built for South Alive – Zero Rubbish Initiative · BIT 701 Capstone Project
                </p>
            </div>
        </div>
    );
}