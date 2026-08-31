import { PillNav } from "@/components/reactbits/PillNav";
import { HomeVersionSelector } from "@/features/home/HomeVersionSelector";

type AppHeaderProps = { current?: "home" | "records" | "tools" };

export function AppHeader({ current }: AppHeaderProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="academy-navigation">
        <HomeVersionSelector />
      </header>
      <PillNav current={current} />
    </>
  );
}
