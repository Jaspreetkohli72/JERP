import TopBar from "@/components/TopBar";
import BalanceCard from "@/components/Dashboard/BalanceCard";
import BudgetCard from "@/components/Dashboard/BudgetCard";
import AnalyticsWrapper from "@/components/Dashboard/AnalyticsWrapper";
import { getDashboardStats } from "@/app/actions/dashboard";

export const revalidate = 60; // Optional: Revalidate page every 60s

export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <>
      <TopBar />
      <section className="px-3.5 pb-24 mt-2 md:mt-0 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-3.5 items-start w-full">
        <div className="flex flex-col gap-3.5">
          <BalanceCard stats={stats} />
          <div className="md:hidden">
            {/* Mobile Budget Card View */}
            <BudgetCard />
          </div>
          <AnalyticsWrapper part="left" stats={stats} />
        </div>
        <div className="flex flex-col gap-3.5">
          <div className="hidden md:block">
            <BudgetCard />
          </div>
          <AnalyticsWrapper part="right" stats={stats} />
        </div>
      </section>
    </>
  );
}
