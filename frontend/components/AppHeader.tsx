import { PillNav } from "@/components/reactbits/PillNav";

type AppHeaderProps = { current?: "home" | "records" | "tools" };

export function AppHeader({ current }: AppHeaderProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="academy-navigation">
        <PillNav current={current} />
      </header>
    </>
  );
}
