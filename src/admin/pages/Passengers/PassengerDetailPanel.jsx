import { useState } from "react";
import ProfileTabs from "../../../components/common/ProfileTabs";
import StatusBadge from "../../components/common/StatusBadge";

export default function PassengerDetailPanel({ passenger }) {
    const [tab, setTab] = useState("overview");

    const tabs = [
        { key: "overview", label: "Overview" },
        { key: "rides", label: "Ride History" },
        { key: "support", label: "Support" },
        { key: "risk", label: "Risk & Notes" },
    ];

    return (
        <div className="text-sm space-y-4">
            <ProfileTabs tabs={tabs} activeTab={tab} onChange={setTab} />

            {tab === "overview" && (
                <>
                    <div>Name: {passenger.name}</div>
                    <div>Status: <StatusBadge status={passenger.status} /></div>
                    <div>Total Rides: {passenger.rides}</div>
                    <div>Cancellations: {passenger.cancellations}</div>
                    <div>Referral: {passenger.referral}</div>
                </>
            )}

            {tab === "rides" && (
                <div className="text-gray-500">
                    Ride history table (linked to Rides)
                </div>
            )}

            {tab === "support" && (
                <div className="text-gray-500">
                    Support tickets linked to passenger
                </div>
            )}

            {tab === "risk" && (
                <>
                    <div>Flags & internal notes</div>
                    <button className="mt-3 px-3 py-2 text-xs bg-red-100 text-red-700 rounded-md">
                        Restrict Account
                    </button>
                </>
            )}
        </div>
    );
}
