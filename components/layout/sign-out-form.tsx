import { signOut } from "@/lib/auth/config";

export function SignOutForm() {
  async function action() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }
  return (
    <form action={action} className="inline">
      <button
        type="submit"
        className="text-slate-400 hover:text-rose-600 transition"
        title="Sair"
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </form>
  );
}
