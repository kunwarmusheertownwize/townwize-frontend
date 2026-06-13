import { useState } from "react";
import ProfileTabs from "../../../components/common/ProfileTabs";
import StatusBadge from "../../components/common/StatusBadge";

export default function DriverDetailPanel({ driver }) {
    const [tab, setTab] = useState("overview");

    const tabs = [
        { key: "overview", label: "Overview" },
        { key: "residency", label: "Residency" },
        { key: "vehicle", label: "Vehicle & License" },
        { key: "identity", label: "Identity" },
        { key: "face", label: "Face" },
        { key: "notes", label: "Notes" },
    ];

    return (
        <div className="text-sm space-y-4">
            <ProfileTabs tabs={tabs} activeTab={tab} onChange={setTab} />

            {tab === "overview" && (
                <>
                    <div>Name: {driver.name}</div>
                    <div>Status: <StatusBadge status={driver.status} /></div>
                    <div>Registration: {driver.regPercent}</div>
                    <button className="mt-3 px-3 py-2 text-xs bg-red-100 text-red-700 rounded-md">
                        Suspend Driver
                    </button>
                </>
            )}

            {tab === "residency" && (
                <>
                    <div>BTK Residency Documents</div>
                    <button className="mt-2 px-3 py-2 text-xs bg-green-100 text-green-700 rounded-md">
                        Verify
                    </button>
                    <button className="ml-2 px-3 py-2 text-xs bg-red-100 text-red-700 rounded-md">
                        Reject
                    </button>
                </>
            )}

            {tab === "vehicle" && <div>Vehicle & License documents (read-only)</div>}
            {tab === "identity" && <div>CNIC documents (read-only)</div>}
            {tab === "face" && <div>Face verification result (view-only)</div>}
            {tab === "notes" && <div>Internal admin notes & audit log</div>}
        </div>
    );
}
