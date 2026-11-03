import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { RegisterSW } from "@/components/RegisterSW";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-col">
      <RegisterSW />
      <header className="sticky top-0 z-[1000] border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">B</span>
            <span className="hidden sm:inline">Boxyland Manager</span>
          </Link>
          <nav className="ml-4 flex gap-1 text-sm">
            <Link href="/" className="btn-ghost">Mappa</Link>
            <Link href="/tasks" className="btn-ghost">Cose da fare</Link>
            <Link href="/settings" className="btn-ghost">Notifiche</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden text-stone-500 md:inline">{user?.email}</span>
            <form action={signOut}>
              <button className="btn-ghost">Esci</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 p-4">{children}</main>
    </div>
  );
}
