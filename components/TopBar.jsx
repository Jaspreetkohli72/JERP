import DateTimeDisplay from "./DateTimeDisplay";

export default function TopBar() {
    return (
        <header className="flex items-center justify-between px-3 pt-0 pb-2">
            <div className="flex flex-col gap-0.5">
                <DateTimeDisplay />
                <span className="text-[1.2rem] font-semibold text-text">Your money, at a glance</span>
            </div>

        </header>
    );
}
