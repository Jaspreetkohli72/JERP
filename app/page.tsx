import TopBar from "@/components/TopBar";
import BalanceCard from "@/components/Dashboard/BalanceCard";
import BudgetCard from "@/components/Dashboard/BudgetCard";
import Analytics from "@/components/Dashboard/Analytics";

export default function Home() {
  return (
    <>
      <TopBar />
      <section className="px-3.5 pb-24 mt-2 md:mt-0 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-3.5 items-start max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-3.5">
          <BalanceCard />
          <div className="md:hidden">
            {/* Mobile Budget Card View */}
            <BudgetCard />
          </div>
          <Analytics part="left" />
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="hidden md:block">
            <BudgetCard />
          </div>
          <Analytics part="right" />
        </div>
      </section>
    </>
  );
}
