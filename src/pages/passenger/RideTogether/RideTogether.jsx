import { useState, useMemo } from "react";
import {
    FaMapMarkerAlt,
    FaLocationArrow,
    FaCalendarAlt,
    FaClock,
    FaCrosshairs,
    FaUserFriends,
} from "react-icons/fa";
import {
    Popover,
    Listbox,
    ListboxButton,
    ListboxOptions,
    ListboxOption,
} from "@headlessui/react";
import {
    addMonths,
    subMonths,
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    isSameDay,
    isBefore,
} from "date-fns";

const RideTogether = () => {
    const [pickup, setPickup] = useState("");
    const [dropoff, setDropoff] = useState("");
    const [pickupDate, setPickupDate] = useState(new Date());
    const [pickupTime, setPickupTime] = useState("now");
    const [month, setMonth] = useState(new Date());
    const [seats, setSeats] = useState("");


    // Mock rides
    const rides = [
        {
            id: 1,
            driver: "Ali Khan",
            car: "Toyota Corolla",
            seatsLeft: 2,
            pickupTime: "10:30 AM",
            price: "Rs. 250 / seat",
        },
        {
            id: 2,
            driver: "Sara Ahmed",
            car: "Suzuki Alto",
            seatsLeft: 1,
            pickupTime: "11:00 AM",
            price: "Rs. 200 / seat",
        },
    ];

    // Time slots (15 min interval, next 12 hours)
    const timeSlots = useMemo(() => {
        const slots = [];
        const now = new Date();
        const start = new Date(now);
        const m = start.getMinutes();
        const add = (15 - (m % 15)) % 15;
        start.setMinutes(m + (add || 15), 0, 0);
        const end = new Date(now);
        end.setHours(now.getHours() + 12, 0, 0, 0);

        for (let t = new Date(start); t <= end; t.setMinutes(t.getMinutes() + 15)) {
            const value = t.toTimeString().slice(0, 5);
            const label = t.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
            });
            slots.push({ value, label });
        }
        return slots;
    }, []);

    // Calendar days
    const generateCalendar = (month) => {
        const startDate = startOfWeek(startOfMonth(month));
        const endDate = endOfWeek(endOfMonth(month));
        const days = [];
        let day = startDate;
        while (day <= endDate) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-10 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Title */}
                <h1 className="text-3xl font-extrabold mb-6 text-center">
                    RideTogether
                </h1>

                {/* Form */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4 shadow-none">
                    {/* Pickup + Dropoff */}
                    <div className="relative space-y-2">
                        {/* Connector */}
                        <span className="absolute left-[11px] top-[30px] bottom-[22px] w-px bg-black z-20 dark:bg-gray-400"></span>

                        {/* Pickup */}
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-700 dark:bg-gray-200 z-20"></span>
                            <input
                                type="text"
                                placeholder="Pickup location"
                                value={pickup}
                                onChange={(e) => setPickup(e.target.value)}
                                className="w-full pl-8 pr-10 py-3 rounded-md bg-gray-100 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none border border-gray-200 dark:border-gray-700"
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 dark:text-gray-300"
                                title="Use current location"
                            >
                                <FaCrosshairs />
                            </button>
                        </div>

                        {/* Dropoff */}
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-700 dark:bg-gray-200 z-20"></span>
                            <input
                                type="text"
                                placeholder="Dropoff location"
                                value={dropoff}
                                onChange={(e) => setDropoff(e.target.value)}
                                className="w-full pl-8 pr-3 py-3 rounded-md bg-gray-100 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none border border-gray-200 dark:border-gray-700"
                            />
                        </div>
                    </div>

                    {/* Date + Time + Seats */}
                    <div className="grid md:grid-cols-3 gap-3">
                        {/* Date */}
                        <Popover className="relative w-full">
                            <Popover.Button className="flex items-center px-4 py-3 rounded-md bg-gray-100 dark:bg-gray-900 w-full text-sm text-gray-900 dark:text-white cursor-pointer border border-gray-200 dark:border-gray-700">
                                <FaCalendarAlt className="text-gray-600 dark:text-gray-300 text-base mr-3" />
                                {format(pickupDate, "MMM d, yyyy")}
                            </Popover.Button>

                            <Popover.Panel className="absolute z-10 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setMonth(subMonths(month, 1))}
                                        className="px-2 text-gray-700 dark:text-gray-300"
                                    >
                                        ‹
                                    </button>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                        {format(month, "MMMM yyyy")}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setMonth(addMonths(month, 1))}
                                        className="px-2 text-gray-700 dark:text-gray-300"
                                    >
                                        ›
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center">
                                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                                        <div
                                            key={d}
                                            className="text-xs font-medium text-gray-500 dark:text-gray-400"
                                        >
                                            {d}
                                        </div>
                                    ))}
                                    {generateCalendar(month).map((day, i) => {
                                        const disabled = isBefore(
                                            day,
                                            new Date().setHours(0, 0, 0, 0)
                                        );
                                        const selected = isSameDay(day, pickupDate);
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => setPickupDate(day)}
                                                className={`
                          w-9 h-9 rounded-full text-sm flex items-center justify-center
                          ${disabled
                                                        ? "text-gray-400 cursor-not-allowed"
                                                        : selected
                                                            ? "bg-gray-700 text-white dark:bg-gray-200 dark:text-gray-900"
                                                            : "hover:bg-gray-200 dark:hover:bg-gray-700"
                                                    }
                        `}
                                            >
                                                {format(day, "d")}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Popover.Panel>
                        </Popover>

                        {/* Time */}
                        <Listbox value={pickupTime} onChange={setPickupTime}>
                            <div className="relative w-full">
                                <ListboxButton className="flex items-center px-4 py-3 rounded-md bg-gray-100 dark:bg-gray-900 w-full text-sm text-gray-900 dark:text-white cursor-pointer border border-gray-200 dark:border-gray-700">
                                    <FaClock className="text-gray-600 dark:text-gray-300 text-base mr-3" />
                                    {timeSlots.find((s) => s.value === pickupTime)?.label || "Now"}
                                </ListboxButton>

                                <ListboxOptions className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-sm">
                                    {timeSlots.map((s) => (
                                        <ListboxOption
                                            key={s.value}
                                            value={s.value}
                                            className={({ active, selected }) =>
                                                `cursor-pointer select-none relative py-2 pl-10 pr-4
                        ${active
                                                    ? "bg-gray-100 dark:bg-gray-700"
                                                    : "text-gray-900 dark:text-white"
                                                }
                        ${selected ? "font-semibold" : "font-normal"}`
                                            }
                                        >
                                            {s.label}
                                        </ListboxOption>
                                    ))}
                                </ListboxOptions>
                            </div>
                        </Listbox>

                        {/* Seats */}
                        <div>
                            <Listbox value={seats} onChange={setSeats}>
                                <div className="relative w-full">
                                    <ListboxButton className="flex items-center px-4 py-3 rounded-md bg-gray-100 dark:bg-gray-900 w-full text-sm text-gray-900 dark:text-white cursor-pointer border border-gray-200 dark:border-gray-700">
                                        <FaUserFriends className="text-gray-600 dark:text-gray-300 text-base mr-3" />
                                        {seats
                                            ? `${seats} Seat${seats > 1 ? "s" : ""}`
                                            : "Select seats"}
                                    </ListboxButton>
                                    <ListboxOptions className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-sm">
                                        {[1, 2, 3, 4].map((n) => (
                                            <ListboxOption
                                                key={n}
                                                value={n}
                                                className={({ active, selected }) =>
                                                    `cursor-pointer select-none relative py-2 pl-10 pr-4
            ${active ? "bg-gray-100 dark:bg-gray-700" : "text-gray-900 dark:text-white"}
            ${selected ? "font-semibold" : "font-normal"}`
                                                }
                                            >
                                                {n} Seat{n > 1 ? "s" : ""}
                                            </ListboxOption>
                                        ))}
                                    </ListboxOptions>
                                </div>
                            </Listbox>
                        </div>
                    </div>

                    {/* CTA */}
                    <button className="w-full py-3 rounded-md font-semibold btn-primary mt-4">
                        Search Rides
                    </button>
                </div>

                {/* Available Rides */}
                <div className="mt-10">
                    <h2 className="text-2xl font-bold mb-4">Available Rides</h2>
                    <div className="space-y-4">
                        {rides.map((ride) => (
                            <div
                                key={ride.id}
                                className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-none flex justify-between items-center"
                            >
                                <div>
                                    <p className="font-semibold">
                                        {ride.driver} — {ride.car}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Pickup: {ride.pickupTime} · Seats left: {ride.seatsLeft}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-gray-900 dark:text-gray-200">
                                        {ride.price}
                                    </span>
                                    <button className="px-4 py-2 rounded-md font-medium btn-primary">
                                        Join Ride
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RideTogether;
