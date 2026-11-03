import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { RegisterSW } from "@/components/RegisterSW";
import { TabBar, TopLinks } from "@/components/NavLinks";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-col">
      <RegisterSW />
      <header
        className="sticky top-0 z-[1100] border-b border-stone-200 bg-white/95 backdrop-blur"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div className="mx-auto flex h-[var(--topbar-h)] max-w-7xl items-center gap-2 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">B</span>
            <span>Boxyland</span>
          </Link>
          <TopLinks />
          <div className="ml-auto hidden items-center gap-2 text-sm md:flex">
            <span className="text-stone-500">{user?.email}</span>
            <form action={signOut}>
              <button className="btn-ghost">Esci</button>
            </form>
          </div>
        </div>
      </header>
      <main
        className="mx-auto w-full max-w-7xl flex-1 px-3 pt-3 md:p-4"
        style={{ paddingBottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 16px)" }}
      >
        {children}
      </main>
      <TabBar />
    </div>
  );
}
