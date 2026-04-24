// resources/js/pages/accounts/index.tsx
import * as React from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  role: "admin" | "health_worker" | null;
  email_verified_at?: string | null;
  created_at?: string | null;
};

type LinkItem = { url: string | null; label: string; active: boolean };
type Pagination<T> = {
  data: T[];
  links: LinkItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};
type PageProps = {
  users?: Pagination<UserRow>;
  filters?: { q?: string; role?: string };
  flash?: { success?: string; error?: string };
  can?: { manageUsers?: boolean };
};

const EMPTY_PAGINATION: Pagination<UserRow> = {
  data: [],
  links: [],
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
};

const ROLES = [
  { v: "admin", label: "Admin" },
  { v: "health_worker", label: "Health Worker" },
] as const;

export default function AccountsIndex() {
  const { users = EMPTY_PAGINATION, filters = { q: "", role: "" }, flash, can } =
    usePage<PageProps>().props;

  const [q, setQ] = React.useState<string>(filters.q ?? "");
  const [role, setRole] = React.useState<string>(filters.role ?? "");
  React.useEffect(() => {
    setQ(filters.q ?? "");
    setRole(filters.role ?? "");
  }, [filters.q, filters.role]);

  const submit = React.useCallback(() => {
    router.get(
      "/accounts",
      { q, role },
      { preserveState: true, replace: true, preserveScroll: true }
    );
  }, [q, role]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const formatRole = (value: string | null) =>
    !value ? "—" : value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  /* -------------------- CRUD State -------------------- */
  const [open, setOpen] = React.useState(false);
  const [isEdit, setIsEdit] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [confirm, setConfirm] = React.useState<{ id: number; name?: string | null } | null>(
    null
  );

  const createDefaults = {
    name: "",
    email: "",
    role: "health_worker",
    password: "",
    password_confirmation: "",
  };
  const editDefaults = {
    name: "",
    email: "",
    role: "health_worker",
    password: "",
    password_confirmation: "",
  };

  const form = useForm({ ...createDefaults });

  const openCreate = () => {
    setIsEdit(false);
    setEditingId(null);
    form.setData({ ...createDefaults });
    form.clearErrors();
    setOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setIsEdit(true);
    setEditingId(u.id);
    form.setData({
      ...editDefaults,
      name: u.name ?? "",
      email: u.email ?? "",
      role: (u.role as any) ?? "health_worker",
      password: "",
      password_confirmation: "",
    });
    form.clearErrors();
    setOpen(true);
  };

  const closeModal = () => setOpen(false);

  const submitCreate = () => {
    form.post("/accounts", {
      preserveScroll: true,
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  const submitUpdate = () => {
    if (!editingId) return;
    form.put(`/accounts/${editingId}`, {
      preserveScroll: true,
      onSuccess: () => {
        setOpen(false);
      },
    });
  };

  const submitDelete = (id: number) => {
    router.delete(`/accounts/${id}`, {
      preserveScroll: true,
      onSuccess: () => setConfirm(null),
    });
  };

  /* -------------------- UI -------------------- */
  return (
    <div
      className="relative min-h-dvh bg-white text-slate-900"
      style={{
        fontFamily:
          "'Poppins', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
      }}
    >
      <Head title="Accounts">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Main content – full-width (no max-w container) */}
      <main className="relative z-10">
        <div className="px-4 md:px-6 lg:px-8 py-8">
          {/* Title row */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#203D7A]">
                Accounts
              </h1>
              <p className="mt-1 text-sm text-slate-600">View user accounts and roles</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs md:text-sm text-teal-800">
                <span className="inline-block size-2 rounded-full bg-teal-400" />
                Total: {users.total}
              </div>

              {can?.manageUsers !== false && (
                <button
                  onClick={openCreate}
                  className="inline-flex items-center justify-center rounded-lg bg-[#0F8A99] px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]"
                >
                  + Add Account
                </button>
              )}
            </div>
          </div>

          {/* Flash */}
          {(flash?.success || flash?.error) && (
            <div className="mt-4">
              {flash?.success && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {flash.success}
                </div>
              )}
              {flash?.error && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {flash.error}
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-6">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Search
                </label>
                <div className="relative">
                  <input
                    type="search"
                    className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                    placeholder="Search name or email…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={onKeyDown}
                  />
                  <SearchGlyph className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="">All roles</option>
                  {ROLES.map((r) => (
                    <option key={r.v} value={r.v}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex items-end">
                <button
                  onClick={submit}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[#0F8A99] px-4 py-2.5 text-[15px] font-medium text-white shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99] md:w-auto"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </section>

          {/* Users table */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm relative overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[880px] w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="w-16 px-4 py-3">#</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="w-40 px-4 py-3">Role</th>
                    <th className="w-36 px-4 py-3">Verified</th>
                    <th className="w-56 px-4 py-3">Created</th>
                    <th className="w-44 px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-[15px]">
                  {users.data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.data.map((u, idx) => (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          {(users.current_page - 1) * users.per_page + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {u.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {u.email ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium " +
                              (u.role === "admin"
                                ? "bg-red-100 text-red-700"
                                : "bg-teal-50 text-teal-800 border border-teal-200")
                            }
                          >
                            {formatRole(u.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.email_verified_at ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800">
                              Unverified
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {u.created_at ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(u)}
                              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirm({ id: u.id, name: u.name })}
                              className="inline-flex items-center rounded-md bg-rose-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-slate-200 bg-slate-50/50 px-3 py-3">
              <nav
                aria-label="Accounts pagination"
                className="flex justify-center"
              >
                <ul className="flex flex-wrap gap-2">
                  {(users.links ?? []).map((l, i) => {
                    const disabled = l.url === null;
                    const className =
                      "inline-flex items-center rounded-md px-3 py-1.5 text-sm " +
                      (l.active
                        ? "bg-[#0F8A99] text-white"
                        : disabled
                        ? "cursor-not-allowed border border-slate-200 bg-white text-slate-400"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50");

                    return (
                      <li key={i}>
                        {disabled ? (
                          <span
                            className={className}
                            dangerouslySetInnerHTML={{ __html: l.label }}
                          />
                        ) : (
                          <Link
                            href={l.url ?? "#"}
                            preserveScroll
                            className={className}
                            dangerouslySetInnerHTML={{ __html: l.label }}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </section>
        </div>
      </main>

      {/* Create/Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-[18px] font-semibold text-slate-900">
                {isEdit ? "Edit Account" : "Add Account"}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  value={form.data.name}
                  onChange={(e) => form.setData("name", e.target.value)}
                />
                {form.errors.name && (
                  <p className="mt-1 text-sm text-rose-600">
                    {form.errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  value={form.data.email}
                  onChange={(e) => form.setData("email", e.target.value)}
                />
                {form.errors.email && (
                  <p className="mt-1 text-sm text-rose-600">
                    {form.errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  value={form.data.role}
                  onChange={(e) => form.setData("role", e.target.value as any)}
                >
                  {ROLES.map((r) => (
                    <option key={r.v} value={r.v}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {form.errors.role && (
                  <p className="mt-1 text-sm text-rose-600">
                    {form.errors.role}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    {isEdit ? "New Password (optional)" : "Password"}
                  </label>
                  <input
                    type="password"
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                    value={form.data.password}
                    onChange={(e) => form.setData("password", e.target.value)}
                    placeholder={isEdit ? "Leave blank to keep current" : ""}
                  />
                  {form.errors.password && (
                    <p className="mt-1 text-sm text-rose-600">
                      {form.errors.password}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                    value={form.data.password_confirmation}
                    onChange={(e) =>
                      form.setData("password_confirmation", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={isEdit ? submitUpdate : submitCreate}
                disabled={form.processing}
                className="rounded-lg bg-[#0F8A99] px-4 py-2.5 text-[14px] font-medium text-white hover:opacity-95 disabled:opacity-60"
              >
                {form.processing
                  ? "Saving…"
                  : isEdit
                  ? "Save Changes"
                  : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            <div className="px-5 py-4">
              <h3 className="text-[18px] font-semibold text-slate-900">
                Delete account?
              </h3>
              <p className="mt-2 text-[14px] text-slate-600">
                This will permanently remove{" "}
                <b>{confirm.name || `#${confirm.id}`}</b>. You can’t undo this
                action.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => submitDelete(confirm.id)}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-[14px] font-medium text-white hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Icons ------------------------------ */
function SearchGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5a6.5 6.5 0 1 0-6.5 6.5 6.47 6.47 0 0 0 4.21-1.57l.27.28h.79L20 21.5 21.5 20zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" />
    </svg>
  );
}
