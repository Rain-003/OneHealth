// resources/js/pages/admin/AccountsTab.tsx
import * as React from "react";
import { Link, router, useForm } from "@inertiajs/react";
import { createPortal } from "react-dom";

const csrfToken =
  (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)
    ?.content ?? "";

/* ───────── Types ───────── */
type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  role: "admin" | "health_worker" | null;
  email_verified_at?: string | null;
  created_at?: string | null;
  barangay?: string | null;
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

const ROLES = [
  { v: "admin", label: "Admin" },
  { v: "health_worker", label: "Health Worker" },
] as const;

type ResultKind = "success" | "error";
type AccountsSort = "name_asc" | "name_desc" | "newest" | "oldest" | "role";

/* Same barangay list as reports page */
type HealthCenter = {
  id: string | number;
  name: string;
};

const BAYANI_CLUSTER_HEALTH_CENTERS: HealthCenter[] = [
  { id: "Acacia", name: "Acacia" },
  { id: "Adlas", name: "Adlas" },
  { id: "Anahaw I", name: "Anahaw I" },
  { id: "Anahaw II", name: "Anahaw II" },
  { id: "Balite I", name: "Balite I" },
  { id: "Balite II", name: "Balite II" },
  { id: "Balubad", name: "Balubad" },
  { id: "Banaba", name: "Banaba" },
  { id: "Batas", name: "Batas" },
  { id: "Biga I", name: "Biga I" },
  { id: "Biga II", name: "Biga II" },
  { id: "Biluso", name: "Biluso" },
  { id: "Bucal", name: "Bucal" },
  { id: "Buho", name: "Buho" },
  { id: "Bulihan", name: "Bulihan" },
  { id: "Cabangaan", name: "Cabangaan" },
  { id: "Carmen", name: "Carmen" },
  { id: "Hoyo", name: "Hoyo" },
  { id: "Hukay", name: "Hukay" },
  { id: "Iba", name: "Iba" },
  { id: "Inchican", name: "Inchican" },
  { id: "Ipil I", name: "Ipil I" },
  { id: "Ipil II", name: "Ipil II" },
  { id: "Kalubkob", name: "Kalubkob" },
  { id: "Kaong", name: "Kaong" },
  { id: "Lalaan I", name: "Lalaan I" },
  { id: "Lalaan II", name: "Lalaan II" },
  { id: "Litlit", name: "Litlit" },
  { id: "Lucsuhin", name: "Lucsuhin" },
  { id: "Lumil", name: "Lumil" },
  { id: "Maguyam", name: "Maguyam" },
  { id: "Malabag", name: "Malabag" },
  { id: "Mataas na Burol", name: "Mataas na Burol" },
  { id: "Malaking Tatiao", name: "Malaking Tatiao" },
  { id: "Munting Ilog", name: "Munting Ilog" },
  { id: "Narra I", name: "Narra I" },
  { id: "Narra II", name: "Narra II" },
  { id: "Narra III", name: "Narra III" },
  { id: "Paligawan", name: "Paligawan" },
  { id: "Pasong Langka", name: "Pasong Langka" },
  { id: "Poblacion I", name: "Poblacion I" },
  { id: "Poblacion II", name: "Poblacion II" },
  { id: "Poblacion III", name: "Poblacion III" },
  { id: "Poblacion IV", name: "Poblacion IV" },
  { id: "Poblacion V", name: "Poblacion V" },
  { id: "Pooc I", name: "Pooc I" },
  { id: "Pooc II", name: "Pooc II" },
  { id: "Pulong Bunga", name: "Pulong Bunga" },
  { id: "Pulong Saging", name: "Pulong Saging" },
  { id: "Puting Kahoy", name: "Puting Kahoy" },
  { id: "Sabutan", name: "Sabutan" },
  { id: "San Miguel I", name: "San Miguel I" },
  { id: "San Miguel II", name: "San Miguel II" },
  { id: "San Vicente I", name: "San Vicente I" },
  { id: "San Vicente II", name: "San Vicente II" },
  { id: "Santol", name: "Santol" },
  { id: "Tartaria", name: "Tartaria" },
  { id: "Tibig", name: "Tibig" },
  { id: "Toledo", name: "Toledo" },
  { id: "Tubuan I", name: "Tubuan I" },
  { id: "Tubuan II", name: "Tubuan II" },
  { id: "Tubuan III", name: "Tubuan III" },
  { id: "Ulat", name: "Ulat" },
  { id: "Yakal", name: "Yakal" },
];

type AccountsTabProps = {
  users: Pagination<UserRow>;
  filters?: { q?: string; role?: string };
  flash?: { success?: string; error?: string };
  can?: { manageUsers?: boolean };
};

/* ───────── Client-side security helpers ───────── */

const EMAIL_REGEX =
  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(com|net|org|gov|edu|ph|mil|info|io|co|biz)$/i;

function validateEmail(value: string | undefined | null): string | null {
  const email = (value ?? "").trim();
  if (!email) return "Email is required.";

  const basic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!basic) {
    return "Enter a valid email address (e.g. name@example.com).";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Use a real email domain (e.g. gmail.com, yahoo.com, outlook.com).";
  }

  return null;
}

function validatePassword(
  value: string | undefined | null,
  options: { required: boolean }
): string | null {
  const pw = (value ?? "").trim();

  if (!pw) {
    return options.required ? "Password is required." : null;
  }

  const problems: string[] = [];

  if (pw.length < 8) problems.push("at least 8 characters");
  if (!/[a-z]/.test(pw)) problems.push("one lowercase letter");
  if (!/[A-Z]/.test(pw)) problems.push("one uppercase letter");
  if (!/[0-9]/.test(pw)) problems.push("one number");
  if (!/[^\w\s]/.test(pw)) problems.push("one symbol (e.g. !, @, #)");
  if (/\s/.test(pw)) problems.push("no spaces");

  if (problems.length) {
    return `Password must have ${problems.join(", ")}.`;
  }

  return null;
}

export default function AccountsTab({
  users,
  filters,
  flash,
  can,
}: AccountsTabProps) {
  /* ───────── Local filters state ───────── */
  const [qUsers, setQUsers] = React.useState<string>(filters?.q ?? "");
  const [roleUsers, setRoleUsers] = React.useState<string>(filters?.role ?? "");
  const [sortUsers, setSortUsers] = React.useState<AccountsSort>("role");

  React.useEffect(() => {
    setQUsers(filters?.q ?? "");
    setRoleUsers(filters?.role ?? "");
  }, [filters?.q, filters?.role]);

  /* ───────── Toast for account actions ───────── */
  const [accountToast, setAccountToast] = React.useState<{
    kind: ResultKind;
    message: string;
  } | null>(null);

  const toastTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const successMessage = flash?.success?.trim();
    const errorMessage = flash?.error?.trim();

    if (successMessage) {
      const key = `accounts-flash-success:${successMessage}`;
      const alreadyShown = sessionStorage.getItem(key);

      if (!alreadyShown) {
        sessionStorage.setItem(key, "1");
        setAccountToast({ kind: "success", message: successMessage });
      }
    } else if (errorMessage) {
      const key = `accounts-flash-error:${errorMessage}`;
      const alreadyShown = sessionStorage.getItem(key);

      if (!alreadyShown) {
        sessionStorage.setItem(key, "1");
        setAccountToast({ kind: "error", message: errorMessage });
      }
    }
  }, [flash?.success, flash?.error]);

  React.useEffect(() => {
    if (!accountToast) return;

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setAccountToast(null);
    }, 3000);

    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [accountToast]);

  /* ───────── Helpers ───────── */
  const fmtMDY = React.useCallback((v?: string | null): string => {
    if (!v) return "";
    const s = String(v).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[2]}/${m[3]}/${m[1]}`;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
  }, []);

  const formatRole = (value: string | null) =>
    !value ? "—" : value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const getRoleTone = React.useCallback((role: UserRow["role"]) => {
    if (role === "admin") {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }
    if (role === "health_worker") {
      return "border-teal-200 bg-teal-50 text-teal-800";
    }
    return "border-slate-200 bg-slate-100 text-slate-700";
  }, []);

  /* ───────── Accounts CRUD state ───────── */
  const [openAccountModal, setOpenAccountModal] = React.useState(false);
  const [isEditAccount, setIsEditAccount] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<{
    id: number;
    name?: string | null;
    email?: string | null;
    role?: UserRow["role"];
  } | null>(null);
  const [viewTarget, setViewTarget] = React.useState<UserRow | null>(null);

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const createDefaults = {
    name: "",
    email: "",
    role: "health_worker",
    password: "",
    password_confirmation: "",
    barangay: "",
  };
  const editDefaults = {
    name: "",
    email: "",
    role: "health_worker",
    password: "",
    password_confirmation: "",
    barangay: "",
  };

  const form = useForm({ ...createDefaults });

  const resetPasswordVisibility = () => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const openCreate = () => {
    setIsEditAccount(false);
    setEditingId(null);
    resetPasswordVisibility();
    form.setData({ ...createDefaults });
    form.clearErrors();
    setOpenAccountModal(true);
  };

  const openEdit = (u: UserRow) => {
    setIsEditAccount(true);
    setEditingId(u.id);
    resetPasswordVisibility();
    form.setData({
      ...editDefaults,
      name: u.name ?? "",
      email: u.email ?? "",
      role: (u.role as any) ?? "health_worker",
      password: "",
      password_confirmation: "",
      barangay: u.barangay ?? "",
    });
    form.clearErrors();
    setOpenAccountModal(true);
  };

  const closeModal = () => {
    setOpenAccountModal(false);
    resetPasswordVisibility();
  };

  /* ───────── Client-side validation before submit ───────── */
  const runAccountValidation = (mode: "create" | "edit"): boolean => {
    form.clearErrors();

    const name = (form.data.name as string | undefined)?.trim() ?? "";
    if (!name) {
      form.setError("name", "Name is required.");
      return false;
    }

    const emailError = validateEmail(form.data.email as string | undefined);
    if (emailError) {
      form.setError("email", emailError);
      return false;
    }

    const password = form.data.password as string | undefined;
    const confirm = form.data.password_confirmation as string | undefined;

    if (mode === "create") {
      const pwErr = validatePassword(password, { required: true });
      if (pwErr) {
        form.setError("password", pwErr);
        return false;
      }
      if (!confirm) {
        form.setError("password_confirmation", "Please confirm the password.");
        return false;
      }
      if ((password ?? "").trim() !== (confirm ?? "").trim()) {
        form.setError("password_confirmation", "Passwords do not match.");
        return false;
      }
    } else {
      const anyFilled = (password ?? "").trim() || (confirm ?? "").trim();
      if (anyFilled) {
        const pwErr = validatePassword(password, { required: true });
        if (pwErr) {
          form.setError("password", pwErr);
          return false;
        }
        if (!confirm) {
          form.setError(
            "password_confirmation",
            "Please confirm the new password."
          );
          return false;
        }
        if ((password ?? "").trim() !== (confirm ?? "").trim()) {
          form.setError("password_confirmation", "Passwords do not match.");
          return false;
        }
      }
    }

    return true;
  };

  const submitCreate = () => {
    if (!runAccountValidation("create")) return;

    form.post("/accounts", {
      preserveScroll: true,
      onSuccess: () => {
        setOpenAccountModal(false);
        form.reset();
        resetPasswordVisibility();
      },
    });
  };

  const submitUpdate = () => {
    if (!editingId) return;
    if (!runAccountValidation("edit")) return;

    form.put(`/accounts/${editingId}`, {
      preserveScroll: true,
      onSuccess: () => {
        setOpenAccountModal(false);
        resetPasswordVisibility();
      },
    });
  };

  const submitDelete = (id: number) => {
    router.delete(`/accounts/${id}`, {
      data: { _token: csrfToken },
      preserveScroll: true,
      onSuccess: () => setConfirmDelete(null),
    });
  };

  const applyAccountsFilter = React.useCallback((nextQ: string, nextRole: string) => {
    router.get(
      "/admin",
      {
        tab: "accounts",
        q: nextQ,
        role: nextRole,
      },
      {
        preserveState: true,
        replace: true,
        preserveScroll: true,
      }
    );
  }, []);

  const lastAppliedFilters = React.useRef({
    q: filters?.q ?? "",
    role: filters?.role ?? "",
  });

  React.useEffect(() => {
    lastAppliedFilters.current = {
      q: filters?.q ?? "",
      role: filters?.role ?? "",
    };
  }, [filters?.q, filters?.role]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      const currentQ = qUsers.trim();
      const currentRole = roleUsers;

      if (
        currentQ === lastAppliedFilters.current.q &&
        currentRole === lastAppliedFilters.current.role
      ) {
        return;
      }

      applyAccountsFilter(currentQ, currentRole);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [qUsers, roleUsers, applyAccountsFilter]);

  const clearAccountsFilter = React.useCallback(() => {
    setQUsers("");
    setRoleUsers("");
    router.get(
      "/admin",
      { tab: "accounts" },
      { preserveState: true, replace: true, preserveScroll: true }
    );
  }, []);

  const handleRoleChange = (value: string) => {
    setRoleUsers(value);
  };

  const sortedUsers = React.useMemo(() => {
    const list = [...users.data];

    list.sort((a, b) => {
      if (sortUsers === "role") {
        const rank = (role: UserRow["role"]) =>
          role === "admin" ? 0 : role === "health_worker" ? 1 : 2;

        const byRole = rank(a.role) - rank(b.role);
        if (byRole !== 0) return byRole;

        return (a.name || "").localeCompare(b.name || "");
      }

      if (sortUsers === "name_asc") {
        return (a.name || "").localeCompare(b.name || "");
      }

      if (sortUsers === "name_desc") {
        return (b.name || "").localeCompare(a.name || "");
      }

      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;

      if (sortUsers === "newest") return db - da;
      if (sortUsers === "oldest") return da - db;

      return 0;
    });

    return list;
  }, [users.data, sortUsers]);

  const stats = React.useMemo(() => {
    const total = users.total;
    const admins = users.data.filter((u) => u.role === "admin").length;
    const workers = users.data.filter((u) => u.role === "health_worker").length;
    const verified = users.data.filter((u) => !!u.email_verified_at).length;

    return { total, admins, workers, verified };
  }, [users]);

  const hasUsers = sortedUsers.length > 0;

  return (
    <>
      <div className="w-full space-y-4 pb-8 pt-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-0.5">
            <h2 className="text-[18px] sm:text-[21px] md:text-[22px] font-semibold tracking-tight text-[#203D7A]">
              Accounts
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              View user accounts and manage access
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] sm:text-xs text-teal-800 whitespace-nowrap">
              <span className="inline-block h-2 w-2 rounded-full bg-teal-400" />
              Total accounts:{" "}
              <span className="font-semibold text-teal-900">{users.total}</span>
            </div>

            {can?.manageUsers !== false && (
              <button
                onClick={openCreate}
                className="inline-flex items-center justify-center rounded-lg bg-[#0F8A99] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-[14px] font-medium text-white shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]"
              >
                + Add Account
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard label="Total accounts" value={stats.total} />
          <SummaryCard label="Admins" value={stats.admins} />
          <SummaryCard label="Health workers" value={stats.workers} />
          <SummaryCard label="Verified emails" value={stats.verified} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            {!hasUsers && (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="px-4 sm:px-5 py-8 sm:py-10 text-center text-xs sm:text-sm text-slate-500">
                  No users found.
                </div>
              </section>
            )}

            {hasUsers && (
              <>
                <section className="sm:hidden space-y-3">
                  {sortedUsers.map((u, idx) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setViewTarget(u)}
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8A99]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-400">
                            #{(users.current_page - 1) * users.per_page + idx + 1}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {u.name ?? "—"}
                            </p>
                            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                              Click to view
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-600 break-all">
                            {u.email ?? "—"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Barangay:{" "}
                            <span className="font-medium">{u.barangay ?? "—"}</span>
                          </p>
                        </div>
                        <span
                          className={
                            "ml-2 inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-medium " +
                            getRoleTone(u.role)
                          }
                        >
                          {formatRole(u.role)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                        <span>Created: {fmtMDY(u.created_at) || "—"}</span>
                        <span className="inline-flex items-center gap-1">
                          {u.email_verified_at ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-800">
                              Unverified
                            </span>
                          )}
                        </span>
                      </div>

                      <div
                        className="mt-3 flex flex-wrap gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEdit(u)}
                          className="inline-flex flex-1 max-w-[110px] w-5 items-center justify-center rounded-md border border-teal-600 bg-[#0F8A99] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            setConfirmDelete({
                              id: u.id,
                              name: u.name,
                              email: u.email,
                              role: u.role,
                            })
                          }
                          className="inline-flex flex-1 min-w-[110px] w-[100px] items-center justify-center rounded-md bg-rose-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                        >
                          Delete
                        </button>
                      </div>
                    </button>
                  ))}
                </section>

                <section className="hidden sm:block rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#203D7A]">
                        Account list
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Sorted by{" "}
                        <span className="font-medium">
                          {sortUsers === "role"
                            ? "role grouping"
                            : sortUsers === "name_asc"
                            ? "name A–Z"
                            : sortUsers === "name_desc"
                            ? "name Z–A"
                            : sortUsers === "newest"
                            ? "newest created"
                            : "oldest created"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full table-auto divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-3 text-center w-12">#</th>
                          <th className="px-3 py-3">Name</th>
                          <th className="px-3 py-3">Email</th>
                          <th className="px-3 py-3">Role</th>
                          <th className="px-3 py-3">Barangay</th>
                          <th className="px-3 py-3 text-center">Verified</th>
                          <th className="px-3 py-3">Created</th>
                          <th className="px-3 py-3 text-right">Actions</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200 text-[13px]">
                        {sortedUsers.map((u, idx) => (
                          <tr
                            key={u.id}
                            className="cursor-pointer hover:bg-slate-50 transition-colors focus-within:bg-slate-50"
                            onClick={() => setViewTarget(u)}
                          >
                            <td className="px-3 py-3 text-center align-middle text-slate-500">
                              {(users.current_page - 1) * users.per_page + idx + 1}
                            </td>

                            <td className="px-3 py-3 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800 block truncate">
                                  {u.name ?? "—"}
                                </span>
                                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                                  View
                                </span>
                              </div>
                            </td>

                            <td className="px-3 py-3 align-middle">
                              <span className="text-slate-700 block break-all">
                                {u.email ?? "—"}
                              </span>
                            </td>

                            <td className="px-3 py-3 align-middle">
                              <span
                                className={
                                  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium " +
                                  getRoleTone(u.role)
                                }
                              >
                                {formatRole(u.role)}
                              </span>
                            </td>

                            <td className="px-3 py-3 align-middle">
                              <span className="text-slate-700 truncate block">
                                {u.barangay ?? "—"}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center align-middle">
                              {u.email_verified_at ? (
                                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-medium text-green-700">
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-[11px] font-medium text-yellow-800">
                                  Unverified
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-3 align-middle text-slate-500 whitespace-nowrap">
                              {fmtMDY(u.created_at) || "—"}
                            </td>

                            <td
                              className="px-3 py-3 align-middle text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  onClick={() => openEdit(u)}
                                  className="inline-flex w-20 items-center justify-center rounded-md border border-teal-600 bg-[#0F8A99] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    setConfirmDelete({
                                      id: u.id,
                                      name: u.name,
                                      email: u.email,
                                      role: u.role,
                                    })
                                  }
                                  className="inline-flex w-20 items-center justify-center rounded-md bg-rose-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50/70 px-3 py-3">
                    <nav aria-label="Accounts pagination" className="flex justify-center">
                      <ul className="flex flex-wrap gap-2">
                        {(users.links ?? []).map((l, i) => {
                          const disabled = l.url === null;
                          const className =
                            "inline-flex items-center rounded-md px-3 py-1.5 text-xs " +
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

                <section className="sm:hidden">
                  <nav
                    aria-label="Accounts pagination (mobile)"
                    className="flex justify-center"
                  >
                    <ul className="flex flex-wrap gap-2">
                      {(users.links ?? []).map((l, i) => {
                        const disabled = l.url === null;
                        const className =
                          "inline-flex items-center rounded-md px-3 py-1.5 text-xs " +
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
                </section>
              </>
            )}
          </div>

          <aside className="h-fit self-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
            <div className="mb-4">
              <h3 className="text-[14px] font-semibold text-[#203D7A]">Filters</h3>
              <p className="mt-1 text-[12px] text-slate-500">
                Refine the account list using the options below.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600">
                  Search accounts
                </label>
                <div className="relative">
                  <input
                    type="search"
                    className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                    placeholder="Search by name or email..."
                    value={qUsers}
                    onChange={(e) => setQUsers(e.target.value)}
                  />
                  <SearchGlyph className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div className="relative w-full">
                <label className="mb-1 block text-[12px] font-medium text-slate-600">
                  Role
                </label>
                <select
                  className="block w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-[13px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  value={roleUsers}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="">All roles</option>
                  {ROLES.map((r) => (
                    <option key={r.v} value={r.v}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <SelectCaret />
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-medium text-slate-600">
                  Quick role
                </label>
                <div className="flex flex-wrap gap-2">
                  <QuickRoleChip
                    label="All"
                    active={roleUsers === ""}
                    onClick={() => handleRoleChange("")}
                  />
                  <QuickRoleChip
                    label="Admins"
                    active={roleUsers === "admin"}
                    onClick={() => handleRoleChange("admin")}
                  />
                  <QuickRoleChip
                    label="Health Workers"
                    active={roleUsers === "health_worker"}
                    onClick={() => handleRoleChange("health_worker")}
                  />
                </div>
              </div>

              <div className="relative w-full">
                <label className="mb-1 block text-[12px] font-medium text-slate-600">
                  Sort
                </label>
                <select
                  className="block w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-[13px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                  value={sortUsers}
                  onChange={(e) => setSortUsers(e.target.value as AccountsSort)}
                >
                  <option value="role">Role grouping</option>
                  <option value="name_asc">Name A–Z</option>
                  <option value="name_desc">Name Z–A</option>
                  <option value="newest">Newest created</option>
                  <option value="oldest">Oldest created</option>
                </select>
                <SelectCaret />
              </div>

              <button
                onClick={clearAccountsFilter}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Reset filters
              </button>
            </div>
          </aside>
        </div>
      </div>

      {accountToast && (
        <ToastPortal>
          <div className="fixed inset-0 z-[140] flex items-center justify-center pointer-events-none p-4">
            <div
              className={
                "pointer-events-auto w-full max-w-md rounded-2xl border px-5 py-4 shadow-2xl " +
                (accountToast.kind === "success"
                  ? "border-emerald-200 bg-white text-emerald-800"
                  : "border-rose-200 bg-white text-rose-800")
              }
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <div
                  className={
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full " +
                    (accountToast.kind === "success"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700")
                  }
                >
                  {accountToast.kind === "success" ? "✓" : "!"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {accountToast.kind === "success" ? "Success" : "Error"}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-700">
                    {accountToast.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAccountToast(null)}
                  className="rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </ToastPortal>
      )}

      {viewTarget && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[118] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
            onClick={() => setViewTarget(null)}
          >
            <div
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-teal-50 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <AccountGlyph className="h-5 w-5" />
                      </span>

                      <span
                        className={
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold " +
                          getRoleTone(viewTarget.role)
                        }
                      >
                        {formatRole(viewTarget.role)}
                      </span>

                      {viewTarget.email_verified_at ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-medium text-green-700">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-[11px] font-medium text-yellow-800">
                          Unverified
                        </span>
                      )}
                    </div>

                    <h3 className="break-words text-[22px] font-semibold leading-tight text-slate-900">
                      {viewTarget.name || "Unnamed account"}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>ID: #{viewTarget.id}</span>
                      {viewTarget.created_at && (
                        <span>Created: {fmtMDY(viewTarget.created_at)}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewTarget(null)}
                    className="rounded-xl p-2 text-slate-500 transition hover:bg-white/80 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="max-h-[65vh] overflow-y-auto px-6 py-6 space-y-4">
                <InfoBlock label="Full name" value={viewTarget.name || "—"} />
                <InfoBlock label="Email address" value={viewTarget.email || "—"} />
                <InfoBlock label="Role" value={formatRole(viewTarget.role)} />
                <InfoBlock
                  label="Barangay / Health Center"
                  value={viewTarget.barangay || "Not assigned"}
                />
                <InfoBlock
                  label="Email verification"
                  value={
                    viewTarget.email_verified_at
                      ? "Verified"
                      : "Not yet verified"
                  }
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setViewTarget(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const current = viewTarget;
                    setViewTarget(null);
                    if (current) openEdit(current);
                  }}
                  className="rounded-xl border border-[#0F8A99]/20 bg-[#0F8A99] px-4 py-2.5 text-[14px] font-medium text-white shadow-sm transition hover:opacity-95 hover:shadow-md"
                >
                  Edit Account
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {openAccountModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3 sm:p-4">
            <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5 max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-teal-50 px-4 sm:px-5 py-3 sm:py-4">
                <h3 className="text-[15px] sm:text-[18px] font-semibold text-slate-900">
                  {isEditAccount ? "Edit Account" : "Add Account"}
                </h3>
                <button
                  onClick={closeModal}
                  className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Name
                  </label>
                  <input
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] sm:text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                    value={form.data.name}
                    onChange={(e) => form.setData("name", e.target.value)}
                  />
                  {form.errors.name && (
                    <p className="mt-1 text-xs sm:text-sm text-rose-600">
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
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] sm:text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                    value={form.data.email}
                    onChange={(e) => form.setData("email", e.target.value)}
                    placeholder="name@example.com"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Use a real email domain (e.g. gmail.com, yahoo.com, outlook.com).
                  </p>
                  {form.errors.email && (
                    <p className="mt-1 text-xs sm:text-sm text-rose-600">
                      {form.errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Role
                  </label>
                  <select
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] sm:text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
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
                    <p className="mt-1 text-xs sm:text-sm text-rose-600">
                      {form.errors.role}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Barangay / Health Center
                  </label>
                  <select
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] sm:text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                    value={form.data.barangay}
                    onChange={(e) => form.setData("barangay", e.target.value)}
                  >
                    <option value="">Select barangay…</option>
                    {BAYANI_CLUSTER_HEALTH_CENTERS.map((hc) => (
                      <option key={hc.id} value={hc.name}>
                        {hc.name}
                      </option>
                    ))}
                  </select>
                  {form.errors.barangay && (
                    <p className="mt-1 text-xs sm:text-sm text-rose-600">
                      {form.errors.barangay}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      {isEditAccount ? "New Password (optional)" : "Password"}
                    </label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 py-2 text-[14px] sm:text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                        value={form.data.password}
                        onChange={(e) => form.setData("password", e.target.value)}
                        placeholder={isEditAccount ? "Leave blank to keep current" : ""}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      At least 8 characters with uppercase, lowercase, number and symbol.
                    </p>
                    {form.errors.password && (
                      <p className="mt-1 text-xs sm:text-sm text-rose-600">
                        {form.errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Confirm Password
                    </label>
                    <div className="relative mt-1">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 py-2 text-[14px] sm:text-[15px] outline-none focus:ring-2 focus:ring-[#0F8A99]"
                        value={form.data.password_confirmation}
                        onChange={(e) =>
                          form.setData("password_confirmation", e.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {form.errors.password_confirmation && (
                      <p className="mt-1 text-xs sm:text-sm text-rose-600">
                        {form.errors.password_confirmation}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 sm:px-5 py-3 sm:py-4">
                <button
                  onClick={closeModal}
                  className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[13px] sm:text-[14px] font-medium text-slate-800 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={isEditAccount ? submitUpdate : submitCreate}
                  disabled={form.processing}
                  className="w-full sm:w-auto rounded-lg bg-[#0F8A99] px-4 py-2.5 text-[13px] sm:text-[14px] font-medium text-white hover:opacity-95 disabled:opacity-60"
                >
                  {form.processing
                    ? "Saving…"
                    : isEditAccount
                    ? "Save Changes"
                    : "Create Account"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {confirmDelete && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[121] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-[2px]"
            onClick={() => setConfirmDelete(null)}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 via-white to-red-50 px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-sm">
                    <TrashGlyph className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-[19px] font-semibold text-slate-900">
                      Delete account?
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      This will archive the account. You can restore it later from Archive.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Selected account
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {confirmDelete.name || `#${confirmDelete.id}`}
                  </p>
                  <p className="mt-1 break-all text-sm text-slate-600">
                    {confirmDelete.email || "No email"}
                  </p>
                  <div className="mt-2">
                    <span
                      className={
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium " +
                        getRoleTone(confirmDelete.role ?? null)
                      }
                    >
                      {formatRole(confirmDelete.role ?? null)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  The user will lose access until the account is restored.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-800 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitDelete(confirmDelete.id)}
                  className="w-full sm:w-auto rounded-xl bg-rose-600 px-4 py-2.5 text-[14px] font-medium text-white hover:bg-rose-700"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") return null;
  return createPortal(children, document.body);
}

function ToastPortal({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") return null;
  return createPortal(children, document.body);
}

function SearchGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5a6.5 6.5 0 1 0-6.5 6.5 6.47 6.47 0 0 0 4.21-1.57l.27.28h.79L20 21.5 21.5 20zM9.5 14A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" />
    </svg>
  );
}

function SelectCaret() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-900">
        {value || value === 0 ? value : "—"}
      </div>
    </div>
  );
}

function QuickRoleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
        (active
          ? "border-[#0F8A99] bg-[#0F8A99]/10 text-[#0F8A99]"
          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50")
      }
    >
      {label}
    </button>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-[15px] text-slate-700">
        {value}
      </p>
    </div>
  );
}

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" {...props}>
      <path
        d="M1.5 12C2.7 7.8 6.1 5 12 5s9.3 2.8 10.5 7c-1.2 4.2-4.6 7-10.5 7S2.7 16.2 1.5 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" {...props}>
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.6 5.1C11.06 5.03 11.53 5 12 5c5.9 0 9.3 2.8 10.5 7-.37 1.3-.98 2.48-1.8 3.5M6.2 6.2C3.9 7.5 2.4 9.4 1.5 12c1.2 4.2 4.6 7 10.5 7 1.6 0 3-.23 4.3-.68"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 9.9A3 3 0 0 0 14.1 14.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V4h3.25a.75.75 0 0 1 0 1.5h-.63l-.74 12.02A2.5 2.5 0 0 1 14.38 20H9.62a2.5 2.5 0 0 1-2.5-2.48L6.38 5.5h-.63a.75.75 0 0 1 0-1.5H9v-.25Zm1.5.25h3v-.25a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25V4Zm-1.88 1.5.72 11.93a1 1 0 0 0 1 .94h4.76a1 1 0 0 0 1-.94l.72-11.93H8.62ZM10 8.25a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0V9A.75.75 0 0 1 10 8.25Zm4 .75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0V9Z" />
    </svg>
  );
}

function AccountGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.01-8 4.5a.75.75 0 0 0 .75.75h14.5a.75.75 0 0 0 .75-.75C20 16.01 16.42 14 12 14Z" />
    </svg>
  );
}