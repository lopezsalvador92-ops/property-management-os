"use client";

import React, { useEffect, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

type Property = { id: string; name: string; owner: string; status: string; currency: string; pmFee: number };
type Expense = { id: string; receiptNo: string; date: string; category: string; supplier: string; house: string; houseId: string; total: number; currency: string; description: string; receiptUrl: string; owner: string };
type Deposit = { id: string; date: string; house: string; houseId: string; owner: string; currency: string; amount: number; notes: string; month: string };
type AppUser = { id: string; firstName: string; lastName: string; email: string; role: string; linkedProperty: string; createdAt: number; lastSignInAt: number | null; imageUrl: string };
type PropertyDetail = { id: string; name: string; owner: string; email: string; secondaryEmail: string; currency: string; status: string; pmFeeUSD: number; pmFeeMXN: number; landscapingFeeUSD: number; landscapingFeeMXN: number; poolFeeUSD: number; poolFeeMXN: number; hskCadence: string; includedCleans: number; hskFeeUSD: number; hskFeeMXN: number; housemanFeeUSD: number; housemanFeeMXN: number };
type HskLog = { id: string; housekeeper: string; weekStart: string; days: { mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string }; status: string; expensesCreated: boolean; comments: string; approvedAt: string };
type HskSummary = { property: string; totalCleans: number; includedPerWeek: number; includedMonthly: number; extraCleans: number; cadence: string; weeksInMonth: number; weeklyBreakdown: { weekStart: string; cleans: number; included: number; extra: number }[] };
type Report = { id: string; reportName: string; house: string; houseId: string; owner: string; month: string; status: string; chargeStatus: string; currency: string; exchangeRate: number; startingBalance: number; totalExpenses: number; totalDeposits: number; finalBalance: number; categories: { cleaningSupplies: number; groceries: number; maintenance: number; miscellaneous: number; utilities: number; villaStaff: number } };
type Balance = { house: string; houseId: string; month: string; status: string; currency: string; startingBalance: number; totalDeposits: number; totalExpenses: number; finalBalance: number };
type ReportStatus = { pending: number; reviewed: number; sent: number; total: number; month: string };
type MaintenanceTask = { id: string; title: string; type: string; status: string; priority: string; propertyId: string; propertyName: string; vendorId: string; vendorName: string; scheduledDate: string; completedDate: string; cost: number; notes: string; expenseCreated: boolean; attachments: { url: string; filename: string }[]; approvalStatus: string; approvedBy: string; approvalDate: string };
type MaintenanceConfig = { id: string; taskName: string; category: string; propertyIds: string[]; propertyNames: string[]; frequency: string; vendorId: string; vendorName: string; lastCompleted: string; nextDue: string; notes: string; active: boolean };
type Visit = { id: string; visitName: string; guestName: string; visitType: string; checkIn: string; checkOut: string; status: string; propertyId: string; propertyName: string; notes: string; checklist: string; adults: number; children: number; questionnaire: Record<string, any>; published: boolean };
type Vendor = { id: string; name: string; category: string; contact: string; location: string; tags: string; notes: string };
type ItineraryEvent = { id: string; eventName: string; visitId: string; vendorId: string; vendorName: string; date: string; time: string; details: string; status: string; eventType: string; extraDetails: Record<string, any>; showVendor: boolean; chargeable: boolean; estimatedCost: number; expenseCreated: boolean; total: number; currency: string };

const catColors: Record<string, { bg: string; text: string }> = {
  Utilities: { bg: "rgba(207,196,110,0.1)", text: "#CFC46E" },
  "Villa Staff": { bg: "var(--orange-s)", text: "var(--orange)" },
  "Cleaning Supplies": { bg: "var(--blue-s)", text: "var(--blue)" },
  Miscellaneous: { bg: "var(--green-s)", text: "var(--green)" },
  Groceries: { bg: "var(--teal-s)", text: "var(--teal-l)" },
  Maintenance: { bg: "var(--accent-s)", text: "var(--accent)" },
  "Rental Expenses": { bg: "var(--red-s)", text: "var(--red)" },
  Others: { bg: "rgba(155,142,196,0.12)", text: "#9B8EC4" },
};

const navItems = [
  { id: "dashboard", icon: "◈", label: "Dashboard" },
  { id: "expenses", icon: "⎙", label: "Expenses" },
  { id: "housekeeping", icon: "⌂", label: "Housekeeping", badge: "3" },
  { id: "deposits", icon: "↓", label: "Deposits" },
  { id: "reports", icon: "↗", label: "Reports" },
  { id: "concierge", icon: "✦", label: "Concierge" },
  { id: "maintenance", icon: "⟡", label: "Maintenance" },
  { id: "calendar", icon: "▦", label: "Calendar" },
  { id: "properties", icon: "◫", label: "Properties" },
  { id: "users", icon: "◌", label: "Users" },
];

function getMonthOptions(): { label: string; value: string }[] {
  const o: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); o.push({ label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }), value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` }); }
  return o;
}

function fmtCur(amount: number, currency: string) {
  return `${currency} $${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "";
  try { const d = new Date(dateStr + "T12:00:00"); return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return dateStr; }
}

const card: React.CSSProperties = { padding: 20, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14 };
const lbl: React.CSSProperties = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 8, fontWeight: 500, display: "block" };
const h1s: React.CSSProperties = { fontFamily: "'Georgia', serif", fontSize: 28, fontWeight: 400, marginBottom: 6 };
const h2s: React.CSSProperties = { fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 400, marginBottom: 16 };
const sel: React.CSSProperties = { padding: "9px 36px 9px 14px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)", fontFamily: "inherit", fontSize: 13, outline: "none", cursor: "pointer", appearance: "none", backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' fill=\'%23888\'%3E%3Cpath d=\'M1 3l4 4 4-4\'/%3E%3C/svg%3E")', backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" };
const inp: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "inherit", fontSize: 14, outline: "none" };

export default function AdminDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const userRole = (user?.publicMetadata as any)?.role || "admin";
  const userName = user?.firstName || "User";
  const allModuleIds = navItems.map(n => n.id);
  const [enabledModules, setEnabledModules] = useState<string[]>(allModuleIds);
  const [properties, setProperties] = useState<Property[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [reportStatus, setReportStatus] = useState<ReportStatus>({ pending: 0, reviewed: 0, sent: 0, total: 0, month: "" });
  const [loading, setLoading] = useState(true);
  const [expLoading, setExpLoading] = useState(false);
  const [depLoading, setDepLoading] = useState(false);
  const [expFilter, setExpFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [depProperty, setDepProperty] = useState("");
  const [depAmount, setDepAmount] = useState("");
  const [depDate, setDepDate] = useState(new Date().toISOString().split("T")[0]);
  const [depNotes, setDepNotes] = useState("");
  const [depSubmitting, setDepSubmitting] = useState(false);
  const [depSuccess, setDepSuccess] = useState(false);

  const [reports, setReports] = useState<Report[]>([]);
  const [repLoading, setRepLoading] = useState(false);
  const [repMonth, setRepMonth] = useState(new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }));
  const [repUpdating, setRepUpdating] = useState<string | null>(null);
  const [repView, setRepView] = useState<"status" | "preview">("status");
  const [previewProp, setPreviewProp] = useState("");

  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirst, setNewUserFirst] = useState("");
  const [newUserLast, setNewUserLast] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserRole, setNewUserRole] = useState("owner");
  const [newUserProp, setNewUserProp] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [expTab, setExpTab] = useState<"list" | "add">("list");
  const [newExpProp, setNewExpProp] = useState("");
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [newExpCat, setNewExpCat] = useState("Utilities");
  const [newExpAmt, setNewExpAmt] = useState("");
  const [newExpCur, setNewExpCur] = useState("MXN");
  const [newExpDesc, setNewExpDesc] = useState("");
  const [newExpSupplier, setNewExpSupplier] = useState("");
  const [addingExp, setAddingExp] = useState(false);
  const [expSuccess, setExpSuccess] = useState(false);
  const [expSort, setExpSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "date", dir: "desc" });
  const [editExpId, setEditExpId] = useState<string | null>(null);
  const [editExpForm, setEditExpForm] = useState<Record<string, any>>({});
  const [savingExp, setSavingExp] = useState(false);
  const [userError, setUserError] = useState("");
  const [propDetails, setPropDetails] = useState<PropertyDetail[]>([]);
  const [propLoading, setPropLoading] = useState(false);
  const [selectedProp, setSelectedProp] = useState<string | null>(null);
  const [propTab, setPropTab] = useState<"overview" | "fees" | "housekeeping" | "history" | "availability">("overview");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [propSaving, setPropSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPropName, setNewPropName] = useState("");
  const [newPropOwner, setNewPropOwner] = useState("");
  const [newPropEmail, setNewPropEmail] = useState("");
  const [newPropCurrency, setNewPropCurrency] = useState("MXN");
  const [addingProp, setAddingProp] = useState(false);
  const [propSaved, setPropSaved] = useState(false);
  const [hskLogs, setHskLogs] = useState<HskLog[]>([]);
  const [hskSummary, setHskSummary] = useState<HskSummary[]>([]);
  const [hskMonth, setHskMonth] = useState("");
  const [hskWeekStarts, setHskWeekStarts] = useState<string[]>([]);
  const [hskLoading, setHskLoading] = useState(false);
  const [hskUpdating, setHskUpdating] = useState<string | null>(null);
  const [hskView, setHskView] = useState<"individual" | "weekly" | "summary">("individual");
  const [hskSummaryMonth, setHskSummaryMonth] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`; });
  const [editHskId, setEditHskId] = useState<string | null>(null);
  const [editHskComment, setEditHskComment] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Concierge state
  const [visits, setVisits] = useState<Visit[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [itineraryEvents, setItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [concLoading, setConcLoading] = useState(false);
  const [concTab, setConcTab] = useState<"visits" | "builder" | "directory" | "charges">("visits");
  const [selectedVisitId, setSelectedVisitId] = useState<string>("");
  const [visitStatusFilter, setVisitStatusFilter] = useState<"all" | "Active" | "Upcoming" | "Completed">("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [vendorSearch, setVendorSearch] = useState("");
  const [editChargeId, setEditChargeId] = useState<string | null>(null);
  const [editChargeForm, setEditChargeForm] = useState<{ amount: string; description: string; currency: string }>({ amount: "", description: "", currency: "USD" });
  const [approvingCharge, setApprovingCharge] = useState<string | null>(null);
  const [editVendorId, setEditVendorId] = useState<string | null>(null);
  const [editVendorForm, setEditVendorForm] = useState<Record<string, any>>({});
  const [savingVendor, setSavingVendor] = useState(false);
  // Edit itinerary event
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editEventForm, setEditEventForm] = useState<Record<string, any>>({});
  const [savingEvent, setSavingEvent] = useState(false);
  // Add visit form
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [newVisitName, setNewVisitName] = useState("");
  const [newVisitGuest, setNewVisitGuest] = useState("");
  const [newVisitType, setNewVisitType] = useState("Owner");
  const [newVisitProp, setNewVisitProp] = useState("");
  const [newVisitCheckIn, setNewVisitCheckIn] = useState("");
  const [newVisitCheckOut, setNewVisitCheckOut] = useState("");
  const [newVisitNotes, setNewVisitNotes] = useState("");
  const [newVisitAdults, setNewVisitAdults] = useState(2);
  const [newVisitChildren, setNewVisitChildren] = useState(0);
  const [newVisitQ, setNewVisitQ] = useState<Record<string, any>>({});
  const [addingVisit, setAddingVisit] = useState(false);
  const [visitSuccess, setVisitSuccess] = useState(false);
  // Edit visit
  const [editVisitId, setEditVisitId] = useState<string | null>(null);
  const [editVisitForm, setEditVisitForm] = useState<Partial<Visit>>({});
  const [savingVisit, setSavingVisit] = useState(false);
  // Questionnaire panel
  const [questVisitId, setQuestVisitId] = useState<string | null>(null);
  const [questForm, setQuestForm] = useState<Record<string, any>>({});
  const [savingQuest, setSavingQuest] = useState(false);
  // CSV import
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  // Maintenance state
  const [maintTasks, setMaintTasks] = useState<MaintenanceTask[]>([]);
  const [maintConfigs, setMaintConfigs] = useState<MaintenanceConfig[]>([]);
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintTab, setMaintTab] = useState<"schedule" | "config" | "inbox" | "vendors">("schedule");
  const [maintTypeFilter, setMaintTypeFilter] = useState<"all" | "Reactive" | "Preventive">("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddConfig, setShowAddConfig] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState("Reactive");
  const [newTaskProp, setNewTaskProp] = useState("");
  const [newTaskVendor, setNewTaskVendor] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [newTaskCost, setNewTaskCost] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [newCfgName, setNewCfgName] = useState("");
  const [newCfgCat, setNewCfgCat] = useState("General");
  const [newCfgProps, setNewCfgProps] = useState<string[]>([]);
  const [newCfgFreq, setNewCfgFreq] = useState("Monthly");
  const [newCfgVendor, setNewCfgVendor] = useState("");
  const [newCfgNextDue, setNewCfgNextDue] = useState("");
  const [newCfgNotes, setNewCfgNotes] = useState("");
  const [addingConfig, setAddingConfig] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [taskUpdating, setTaskUpdating] = useState<string | null>(null);
  const [maintFilter, setMaintFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [editMaintId, setEditMaintId] = useState<string | null>(null);
  const [editMaintForm, setEditMaintForm] = useState<Record<string, any>>({});
  const [expenseReview, setExpenseReview] = useState<{ task: MaintenanceTask; amount: string; date: string; property: string; category: string; description: string; supplier: string } | null>(null);
  const [calView, setCalView] = useState<"monthly" | "weekly">("monthly");
  const [calWeekStart, setCalWeekStart] = useState(() => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split("T")[0]; });
  const [propAvailView, setPropAvailView] = useState<"weekly" | "list" | "monthly">("weekly");
  const [propCalMonth, setPropCalMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<{ firstName: string; lastName: string; role: string; linkedProperty: string }>({ firstName: "", lastName: "", role: "", linkedProperty: "" });
  // Add event form
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDetails, setNewEventDetails] = useState("");
  const [newEventVendor, setNewEventVendor] = useState("");
  const [newEventStatus, setNewEventStatus] = useState("Pending");
  const [newEventType, setNewEventType] = useState("");
  const [newEventExtraDetails, setNewEventExtraDetails] = useState<Record<string, string>>({});
  const [newEventShowVendor, setNewEventShowVendor] = useState(true);
  const [newEventChargeable, setNewEventChargeable] = useState(false);
  const [newEventEstCost, setNewEventEstCost] = useState("");
  const [newEventTotal, setNewEventTotal] = useState("");
  const [newEventCurrency, setNewEventCurrency] = useState("USD");
  const [addingEvent, setAddingEvent] = useState(false);
  const [publishingVisit, setPublishingVisit] = useState(false);
  // Add vendor form
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddMaintVendor, setShowAddMaintVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorCat, setNewVendorCat] = useState("Dining");
  const [newVendorContact, setNewVendorContact] = useState("");
  const [newVendorLocation, setNewVendorLocation] = useState("");
  const [newVendorTags, setNewVendorTags] = useState("");
  const [newVendorNotes, setNewVendorNotes] = useState("");
  const [addingVendor, setAddingVendor] = useState(false);

  function monthToFilterValue(monthStr: string): string {
    const parts = monthStr.split(" ");
    if (parts.length < 2) return "all";
    const months: Record<string, string> = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };
    return `${parts[1]}-${months[parts[0]] || "01"}`;
  }

  async function updateExchangeRate(recordId: string, rate: string) {
    try {
      await fetch("/api/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateExchangeRate", recordId, exchangeRate: rate }) });
    } catch (e) { console.error(e); }
  }

  const monthOptions = getMonthOptions();

  const repMonthOptions = (() => {
    const o: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      o.push(d.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
    }
    return o;
  })();

  useEffect(() => { fetch("/api/properties").then(r => r.json()).then(d => { setProperties(d.properties || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  // Fetch feature flags — system_admin sees everything
  useEffect(() => {
    if (userRole === "system_admin") return;
    fetch("/api/platform-config").then(r => r.json()).then(d => {
      const roles: { roleId: string; modules: string[]; active: boolean }[] = d.roles || [];
      const myRole = roles.find(r => r.roleId === userRole);
      if (myRole && myRole.active) {
        // Always include dashboard
        const mods = myRole.modules.includes("dashboard") ? myRole.modules : ["dashboard", ...myRole.modules];
        setEnabledModules(mods);
        // If current page is disabled, redirect to dashboard
        if (!mods.includes(activePage)) setActivePage("dashboard");
      }
    }).catch(() => {});
  }, [userRole]);

  useEffect(() => {
    if (activePage === "expenses") {
      setExpLoading(true);
      fetch(expFilter === "all" ? "/api/expenses" : `/api/expenses?house=${encodeURIComponent(expFilter)}`)
        .then(r => r.json()).then(d => { setExpenses(d.expenses || []); setExpLoading(false); }).catch(() => setExpLoading(false));
    }
    if (activePage === "reports" && expenses.length === 0) {
      fetch("/api/expenses").then(r => r.json()).then(d => setExpenses(d.expenses || [])).catch(() => {});
    }
  }, [activePage, expFilter]);

  useEffect(() => {
    if (activePage === "deposits" || activePage === "dashboard") {
      if (deposits.length === 0) { setDepLoading(true); fetch("/api/deposits").then(r => r.json()).then(d => { setDeposits(d.deposits || []); setDepLoading(false); }).catch(() => setDepLoading(false)); }
      fetch("/api/balances").then(r => r.json()).then(d => { setBalances(d.balances || []); if (d.reportStatus) setReportStatus(d.reportStatus); });
    }
  }, [activePage]);

  useEffect(() => {
    if (activePage === "reports") {
      setRepLoading(true);
      fetch(`/api/reports?month=${encodeURIComponent(repMonth)}`)
        .then(r => r.json())
        .then(d => { setReports(d.reports || []); setRepLoading(false); })
        .catch(() => setRepLoading(false));
    }
  }, [activePage, repMonth]);

  useEffect(() => {
    if (activePage === "users") {
      setUsersLoading(true);
      fetch("/api/users").then(r => r.json()).then(d => { setAppUsers(d.users || []); setUsersLoading(false); }).catch(() => setUsersLoading(false));
    }
  }, [activePage]);

  async function createUser() {
    if (!newUserEmail || !newUserPass || !newUserRole) return;
    setAddingUser(true);
    setUserError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newUserEmail, firstName: newUserFirst, lastName: newUserLast, password: newUserPass, role: newUserRole, linkedProperty: newUserProp }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddUser(false); setNewUserEmail(""); setNewUserFirst(""); setNewUserLast(""); setNewUserPass(""); setNewUserProp("");
        fetch("/api/users").then(r => r.json()).then(d => setAppUsers(d.users || []));
      } else {
        setUserError(data.error || "Failed to create user");
      }
    } catch (e) { setUserError("Failed to create user"); }
    setAddingUser(false);
  }

  async function resetUserPassword(userId: string) {
    const pw = prompt("Enter new password for this user (min 8 characters):");
    if (!pw || pw.length < 8) { alert("Password must be at least 8 characters"); return; }
    try {
      await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, password: pw }) });
      alert("Password updated successfully");
    } catch (e) { console.error(e); alert("Failed to reset password"); }
  }

  async function deactivateUser(userId: string) {
    if (!confirm("Are you sure you want to deactivate this user? They will lose access but their account remains.")) return;
    try {
      await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role: "inactive" }) });
      fetch("/api/users").then(r => r.json()).then(d => setAppUsers(d.users || []));
    } catch (e) { console.error(e); }
  }

  async function saveUserEdit(userId: string) {
    try {
      await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, firstName: editUserForm.firstName, lastName: editUserForm.lastName, role: editUserForm.role, linkedProperty: editUserForm.linkedProperty }) });
      fetch("/api/users").then(r => r.json()).then(d => setAppUsers(d.users || []));
      setEditUserId(null);
    } catch (e) { console.error(e); alert("Failed to update user"); }
  }

  async function updateUserRole(userId: string, role: string, linkedProperty?: string) {
    try {
      await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role, ...(linkedProperty !== undefined ? { linkedProperty } : {}) }) });
      fetch("/api/users").then(r => r.json()).then(d => setAppUsers(d.users || []));
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    if (activePage === "properties" || activePage === "users") {
      setPropLoading(true);
      fetch("/api/properties-detail").then(r => r.json()).then(d => { setPropDetails(d.properties || []); setPropLoading(false); }).catch(() => setPropLoading(false));
    }
  }, [activePage]);

  useEffect(() => {
    if (activePage === "maintenance" || activePage === "dashboard") {
      if (activePage === "maintenance") setMaintLoading(true);
      Promise.all([
        fetch("/api/maintenance").then(r => r.json()),
        fetch("/api/maintenance-config").then(r => r.json()),
        fetch("/api/vendors").then(r => r.json()),
      ]).then(([tData, cData, vData]) => {
        setMaintTasks(tData.tasks || []);
        setMaintConfigs(cData.configs || []);
        setVendors(vData.vendors || []);
        setMaintLoading(false);
      }).catch(() => setMaintLoading(false));
    }
  }, [activePage]);

  useEffect(() => {
    if ((activePage === "calendar" || activePage === "dashboard") && visits.length === 0) {
      fetch("/api/visits").then(r => r.json()).then(d => setVisits(d.visits || [])).catch(() => {});
    }
  }, [activePage]);

  useEffect(() => {
    if (activePage === "concierge") {
      setConcLoading(true);
      Promise.all([
        fetch("/api/visits").then(r => r.json()),
        fetch("/api/vendors").then(r => r.json()),
      ]).then(([vData, vendData]) => {
        setVisits(vData.visits || []);
        setVendors(vendData.vendors || []);
        setConcLoading(false);
      }).catch(() => setConcLoading(false));
    }
  }, [activePage]);

  useEffect(() => {
    if (activePage === "concierge" && (concTab === "builder" || concTab === "charges")) {
      // Fetch all events (client-side filters by visitId since Airtable's ARRAYJOIN on linked fields returns names not IDs)
      fetch(`/api/itinerary`).then(r => r.json()).then(d => setItineraryEvents(d.events || [])).catch(() => {});
    }
  }, [activePage, concTab]);

  async function createExpense() {
    if (!newExpProp || !newExpAmt || !newExpDate) return;
    setAddingExp(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: newExpProp, date: newExpDate, category: newExpCat, amount: newExpAmt, currency: newExpCur, description: newExpDesc, supplier: newExpSupplier }),
      });
      if (res.ok) {
        setExpSuccess(true);
        setNewExpAmt(""); setNewExpDesc(""); setNewExpSupplier("");
        setTimeout(() => setExpSuccess(false), 3000);
        fetch("/api/expenses").then(r => r.json()).then(d => setExpenses(d.expenses || []));
      }
    } catch (e) { console.error(e); }
    setAddingExp(false);
  }

  async function addProperty() {
    if (!newPropName || !newPropOwner) return;
    setAddingProp(true);
    try {
      const res = await fetch("/api/properties-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPropName, owner: newPropOwner, email: newPropEmail, currency: newPropCurrency }),
      });
      if (res.ok) {
        setShowAddForm(false); setNewPropName(""); setNewPropOwner(""); setNewPropEmail("");
        fetch("/api/properties-detail").then(r => r.json()).then(d => setPropDetails(d.properties || []));
      }
    } catch (e) { console.error(e); }
    setAddingProp(false);
  }

  async function saveProperty(recordId: string, fields: Record<string, any>) {
    setPropSaving(true);
    try {
      const res = await fetch("/api/properties-detail", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recordId, fields }) });
      if (res.ok) {
        setPropSaved(true);
        setTimeout(() => setPropSaved(false), 2000);
        fetch("/api/properties-detail").then(r => r.json()).then(d => setPropDetails(d.properties || []));
      }
    } catch (e) { console.error(e); }
    setPropSaving(false);
  }

  useEffect(() => {
    if (activePage === "housekeeping") {
      setHskLoading(true);
      fetch(`/api/housekeeping?month=${hskSummaryMonth}`).then(r => r.json()).then(d => { setHskLogs(d.logs || []); setHskSummary(d.monthlySummary || []); setHskMonth(d.currentMonth || ""); setHskWeekStarts(d.weekStarts || []); setHskLoading(false); }).catch(() => setHskLoading(false));
    }
  }, [activePage, hskSummaryMonth]);

  async function updateHsk(action: string, ids: string[]) {
    setHskUpdating(action);
    try {
      const res = await fetch("/api/housekeeping", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, recordIds: ids }) });
      if (res.ok) { fetch("/api/housekeeping").then(r => r.json()).then(d => { setHskLogs(d.logs || []); setHskSummary(d.monthlySummary || []); setHskWeekStarts(d.weekStarts || []); }); }
    } catch (e) { console.error(e); }
    setHskUpdating(null);
  }

  async function updateReports(action: string, ids: string[]) {
    setRepUpdating(action);
    try {
      const res = await fetch("/api/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, recordIds: ids }) });
      if (res.ok) {
        fetch(`/api/reports?month=${encodeURIComponent(repMonth)}`).then(r => r.json()).then(d => setReports(d.reports || []));
      }
    } catch (e) { console.error(e); }
    setRepUpdating(null);
  }

  async function refreshBalance(recordId: string, month: string) {
    setRepUpdating("refreshBalance-" + recordId);
    try {
      const res = await fetch("/api/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refreshBalance", recordId, month }) });
      if (res.ok) {
        fetch(`/api/reports?month=${encodeURIComponent(repMonth)}`).then(r => r.json()).then(d => setReports(d.reports || []));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to refresh balance");
      }
    } catch (e) { console.error(e); }
    setRepUpdating(null);
  }

  const active = properties.filter(p => p.status === "Active");
  const filteredExpenses = (() => {
    const base = monthFilter === "all" ? expenses : expenses.filter(e => e.date && e.date.startsWith(monthFilter));
    return [...base].sort((a, b) => {
      const col = expSort.col as keyof Expense;
      const av = col === "total" ? a.total : String((a as any)[col] || "").toLowerCase();
      const bv = col === "total" ? b.total : String((b as any)[col] || "").toLowerCase();
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return expSort.dir === "asc" ? cmp : -cmp;
    });
  })();
  const negativeBalances = balances.filter(b => b.finalBalance < 0);
  const sidebarWidth = sidebarOpen ? 260 : 72;

  // Properties with no deposit this month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const propertiesWithDeposit = new Set(deposits.filter(d => d.date && d.date.startsWith(currentMonth)).map(d => d.house));
  const propertiesNoDeposit = active.filter(p => !propertiesWithDeposit.has(p.name));

  // Recent activity: combine deposits and expenses
  const recentActivity = [
    ...deposits.slice(0, 8).map(d => ({ type: "deposit" as const, date: d.date, house: d.house, owner: d.owner, detail: `${d.currency} $${(d.amount || 0).toLocaleString()} deposit received`, notes: d.notes })),
    ...expenses.slice(0, 8).map(e => ({ type: "expense" as const, date: e.date, house: e.house, owner: e.owner, detail: `${e.currency} $${(e.total || 0).toLocaleString()} — ${e.supplier}`, notes: e.category })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 10);

  async function submitDeposit() {
    if (!depProperty || !depAmount || !depDate) return;
    setDepSubmitting(true);
    try {
      const res = await fetch("/api/deposits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ houseId: depProperty, amount: depAmount, date: depDate, notes: depNotes }) });
      if (res.ok) {
        setDepSuccess(true); setDepProperty(""); setDepAmount(""); setDepNotes("");
        setTimeout(() => setDepSuccess(false), 3000);
        fetch("/api/deposits").then(r => r.json()).then(d => setDeposits(d.deposits || []));
        fetch("/api/balances").then(r => r.json()).then(d => { setBalances(d.balances || []); if (d.reportStatus) setReportStatus(d.reportStatus); });
      }
    } catch (e) { console.error(e); }
    setDepSubmitting(false);
  }

  return (
    <>
    <style>{`
      .admin-mobile-bar{display:none}
      @media(max-width:900px){
        .admin-shell{grid-template-columns:0px 1fr !important;}
        .admin-sidebar-wrap{display:none !important;}
        .admin-mobile-bar{display:flex !important;padding:12px 16px;background:var(--bg2);border-bottom:1px solid var(--border);align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;}
      }
    `}</style>
    {theme === "light" && <style>{`
      :root {
        --bg: #F5F7FA !important; --bg2: #FFFFFF !important; --bg3: #FFFFFF !important; --bg4: #F0F2F5 !important;
        --text: #1A1A2E !important; --text2: #4A5568 !important; --text3: #8795A8 !important;
        --border: rgba(0,0,0,0.08) !important; --border2: rgba(0,0,0,0.12) !important;
        --accent: #B8942E !important; --accent-s: rgba(184,148,46,0.1) !important;
        --teal: #2A8B9A !important; --teal-l: #1A7A8A !important; --teal-s: rgba(42,139,154,0.08) !important;
        --green: #2D8B57 !important; --green-s: rgba(45,139,87,0.08) !important;
        --red: #C45555 !important; --red-s: rgba(196,85,85,0.08) !important;
        --blue: #4A8BC4 !important; --blue-s: rgba(74,139,196,0.08) !important;
        --orange: #C4804A !important; --orange-s: rgba(196,128,74,0.08) !important;
      }
    `}</style>}
    {theme === "light" && <style>{`
      :root {
        --bg: #F5F7FA !important; --bg2: #FFFFFF !important; --bg3: #FFFFFF !important; --bg4: #F0F2F5 !important;
        --text: #1A1A2E !important; --text2: #4A5568 !important; --text3: #8795A8 !important;
        --border: rgba(0,0,0,0.08) !important; --border2: rgba(0,0,0,0.12) !important;
        --accent: #B8942E !important; --accent-s: rgba(184,148,46,0.1) !important;
        --teal: #2A8B9A !important; --teal-l: #1A7A8A !important; --teal-s: rgba(42,139,154,0.08) !important;
        --green: #2D8B57 !important; --green-s: rgba(45,139,87,0.08) !important;
        --red: #C45555 !important; --red-s: rgba(196,85,85,0.08) !important;
        --blue: #4A8BC4 !important; --blue-s: rgba(74,139,196,0.08) !important;
        --orange: #C4804A !important; --orange-s: rgba(196,128,74,0.08) !important;
      }
    `}</style>}
    <div className="admin-shell" style={{ display: "grid", gridTemplateColumns: `${sidebarWidth}px 1fr`, minHeight: "100vh", transition: "grid-template-columns 0.2s ease" }}>

      
        {/* Mobile top bar */}
        <div className="admin-mobile-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/cape-logo.png" alt="Cape PM" style={{ height: 22 }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Cape PM</span>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
            {navItems.filter(item => enabledModules.includes(item.id)).map(item => (
              <button key={item.id + "-mob"} onClick={() => setActivePage(item.id)} style={{ padding: "4px 10px", borderRadius: 6, border: activePage === item.id ? "1px solid var(--accent)" : "1px solid var(--border)", background: activePage === item.id ? "var(--accent-s)" : "transparent", color: activePage === item.id ? "var(--accent)" : "var(--text3)", fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{item.label}</button>
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
      <div style={{ background: "var(--bg2)", borderRight: "1px solid var(--border)", height: "100vh", position: "sticky" as const, top: 0, display: "flex", flexDirection: "column" as const, overflow: "hidden", transition: "width 0.2s ease", width: sidebarWidth }}>
        <div style={{ padding: sidebarOpen ? "24px 20px 20px" : "24px 12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, minHeight: 78 }}>
          <img src="/cape-logo.png" alt="Cape PM" style={{ height: 28 }} />
          {sidebarOpen && <div><div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--text2)" }}>Cape PM</div><div style={{ fontSize: 10, color: "var(--text3)" }}>Admin Panel</div></div>}
        </div>
        <div style={{ padding: sidebarOpen ? "16px 12px 8px" : "16px 8px 8px", flex: 1, overflowY: "auto" as const, minHeight: 0 }}>
          {sidebarOpen && <div style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--text3)", padding: "0 12px 8px", fontWeight: 600 }}>Management</div>}
          {navItems.filter(item => enabledModules.includes(item.id)).map(item => (
            <div key={item.id} onClick={() => setActivePage(item.id)} title={sidebarOpen ? undefined : item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: sidebarOpen ? "10px 12px" : "10px 0", justifyContent: sidebarOpen ? "flex-start" : "center", borderRadius: 8, fontSize: 13, cursor: "pointer", position: "relative" as const, transition: "all 0.15s", userSelect: "none" as const, color: activePage === item.id ? "var(--accent)" : "var(--text2)", background: activePage === item.id ? "var(--accent-s)" : "transparent" }}>
              <span style={{ width: 18, textAlign: "center" as const, fontSize: 14, opacity: activePage === item.id ? 1 : 0.6, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && item.label}
              {item.badge && sidebarOpen && <span style={{ position: "absolute" as const, right: 12, minWidth: 18, height: 18, borderRadius: "50%", background: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{item.badge}</span>}
            </div>
          ))}
        </div>
        <div style={{ flexShrink: 0 }}>
          <div onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text3)", cursor: "pointer", textAlign: sidebarOpen ? "right" as const : "center" as const }}>{sidebarOpen ? "◀ Collapse" : "▶"}</div>
          {sidebarOpen && <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text3)", display: "flex", alignItems: "center", gap: 8 }}><UserButton appearance={{ elements: { avatarBox: { width: 24, height: 24 } } }} /><span>{userName} · {userRole === "system_admin" ? "System Admin" : userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span></div>}
          {sidebarOpen && userRole === "system_admin" && <div style={{ padding: "4px 20px 8px" }}><button onClick={() => router.push("/system")} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>⚙ System Settings</button></div>}
          {sidebarOpen && <div style={{ padding: "8px 20px", borderTop: "1px solid var(--border)" }}><button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>{theme === "dark" ? "Switch to Light" : "Switch to Dark"}</button></div>}
        </div>
      </div>

      {/* MAIN */}
      <main style={{ overflow: "auto", minWidth: 0 }}>

        {/* ====== DASHBOARD ====== */}
        {activePage === "dashboard" && (() => {
          const todayStr = new Date().toISOString().split("T")[0];
          const next30 = new Date(); next30.setDate(next30.getDate() + 30);
          const next30Str = next30.toISOString().split("T")[0];

          const activeVisits = visits.filter(v => v.status === "Active");
          const upcomingVisits = visits.filter(v => v.status === "Upcoming" && v.checkIn >= todayStr && v.checkIn <= next30Str).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
          const openMaint = maintTasks.filter(t => t.status === "Open" || t.status === "In Progress");
          const urgentMaint = openMaint.filter(t => t.priority === "High" || t.priority === "Urgent");
          const dueMaintConfigs = maintConfigs.filter(c => c.active && c.nextDue && c.nextDue <= todayStr);

          const greetingHour = new Date().getHours();
          const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

          return (
            <div style={{ padding: "32px 40px" }}>
              {/* Header */}
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ ...h1s, marginBottom: 4 }}>{greeting}, {userName} 👋</h1>
                <p style={{ fontSize: 14, color: "var(--text2)" }}>
                  {loading ? "Loading..." : `${active.length} active properties · ${reportStatus.month || "March 2026"}`}
                </p>
              </div>

              {/* STAT CARDS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
                <div onClick={() => setActivePage("properties")} style={{ ...card, padding: "18px 20px", cursor: "pointer" }}>
                  <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>Active Properties</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text1)", marginBottom: 4 }}>{active.length}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>of {properties.length} total</div>
                </div>
                {enabledModules.includes("concierge") && <div onClick={() => setActivePage("concierge")} style={{ ...card, padding: "18px 20px", cursor: "pointer" }}>
                  <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>Visits This Month</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "var(--teal)", marginBottom: 4 }}>{visits.filter(v => v.status !== "Cancelled").length}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{activeVisits.length} active · {upcomingVisits.length} upcoming</div>
                </div>}
                {enabledModules.includes("maintenance") && <div onClick={() => setActivePage("maintenance")} style={{ ...card, padding: "18px 20px", cursor: "pointer" }}>
                  <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>Open Maintenance</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: openMaint.length > 0 ? "var(--orange)" : "var(--green)", marginBottom: 4 }}>{openMaint.length}</div>
                  <div style={{ fontSize: 12, color: urgentMaint.length > 0 ? "var(--red)" : "var(--text3)" }}>{urgentMaint.length > 0 ? `${urgentMaint.length} high priority` : "No urgent items"}</div>
                </div>}
                <div onClick={() => setActivePage("reports")} style={{ ...card, padding: "18px 20px", cursor: "pointer" }}>
                  <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>Pending Reports</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: reportStatus.pending > 0 ? "var(--accent)" : "var(--green)", marginBottom: 4 }}>{loading ? "—" : reportStatus.pending}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{loading ? "" : `${reportStatus.sent} of ${reportStatus.total} sent`}</div>
                </div>
              </div>

              {/* ROW 1: ACTION REQUIRED + UPCOMING VISITS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                <div>
                  <h2 style={{ ...h2s, marginBottom: 12 }}>Action required</h2>
                  <div style={{ display: "grid", gap: 8 }}>
                    {reportStatus.pending > 0 && (
                      <div onClick={() => setActivePage("reports")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--accent-s)", border: "1px solid rgba(201,169,110,0.15)", borderRadius: 10, cursor: "pointer" }}>
                        <span style={{ fontSize: 16 }}>↗</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{reportStatus.pending} monthly {reportStatus.pending === 1 ? "report" : "reports"} pending</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{reportStatus.sent} of {reportStatus.total} sent for {reportStatus.month}</div>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>→</span>
                      </div>
                    )}
                    {negativeBalances.length > 0 && (
                      <div onClick={() => setActivePage("deposits")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--red-s)", border: "1px solid rgba(207,110,110,0.15)", borderRadius: 10, cursor: "pointer" }}>
                        <span style={{ fontSize: 16 }}>⚠</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--red)" }}>{negativeBalances.length} {negativeBalances.length === 1 ? "property" : "properties"} with negative balance</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{negativeBalances.map(b => b.house).join(", ")}</div>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>→</span>
                      </div>
                    )}
                    {propertiesNoDeposit.length > 0 && (
                      <div onClick={() => setActivePage("deposits")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--orange-s)", border: "1px solid rgba(207,149,110,0.12)", borderRadius: 10, cursor: "pointer" }}>
                        <span style={{ fontSize: 16 }}>↓</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{propertiesNoDeposit.length} {propertiesNoDeposit.length === 1 ? "property" : "properties"} missing deposit this month</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{propertiesNoDeposit.slice(0, 4).map(p => p.name).join(", ")}{propertiesNoDeposit.length > 4 ? ` +${propertiesNoDeposit.length - 4} more` : ""}</div>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>→</span>
                      </div>
                    )}
                    {urgentMaint.length > 0 && (
                      <div onClick={() => setActivePage("maintenance")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--red-s)", border: "1px solid rgba(207,110,110,0.15)", borderRadius: 10, cursor: "pointer" }}>
                        <span style={{ fontSize: 16 }}>🔧</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--red)" }}>{urgentMaint.length} high-priority maintenance {urgentMaint.length === 1 ? "item" : "items"} open</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{urgentMaint.slice(0, 2).map(t => t.title).join(" · ")}</div>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>→</span>
                      </div>
                    )}
                    {dueMaintConfigs.length > 0 && (
                      <div onClick={() => setActivePage("maintenance")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--orange-s)", border: "1px solid rgba(207,149,110,0.12)", borderRadius: 10, cursor: "pointer" }}>
                        <span style={{ fontSize: 16 }}>📅</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{dueMaintConfigs.length} preventive {dueMaintConfigs.length === 1 ? "schedule" : "schedules"} past due</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{dueMaintConfigs.slice(0, 2).map(c => c.taskName).join(" · ")}</div>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>→</span>
                      </div>
                    )}
                    {negativeBalances.length === 0 && reportStatus.pending === 0 && propertiesNoDeposit.length === 0 && urgentMaint.length === 0 && dueMaintConfigs.length === 0 && (
                      <div style={{ padding: "12px 16px", background: "var(--green-s)", border: "1px solid rgba(110,207,151,0.15)", borderRadius: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--green)" }}>✓ All clear — no action items right now</div>
                      </div>
                    )}
                  </div>
                </div>
                {enabledModules.includes("concierge") ? <div>
                  <h2 style={{ ...h2s, marginBottom: 12 }}>Upcoming visits</h2>
                  {visits.length === 0 ? (
                    <div style={{ ...card, padding: "20px 16px", fontSize: 13, color: "var(--text3)" }}>Loading visits...</div>
                  ) : [...activeVisits, ...upcomingVisits].length === 0 ? (
                    <div style={{ ...card, padding: "20px 16px", fontSize: 13, color: "var(--text3)" }}>No upcoming visits scheduled.</div>
                  ) : (
                    <div style={{ ...card, padding: 0 }}>
                      {[...activeVisits, ...upcomingVisits].slice(0, 5).map((v, i, arr) => {
                        const typeColor = v.visitType === "Owner" ? "var(--teal)" : v.visitType === "Rental" ? "var(--blue)" : "#9B8EC4";
                        const typeBg = v.visitType === "Owner" ? "var(--teal-s)" : v.visitType === "Rental" ? "rgba(100,160,255,0.12)" : "rgba(155,142,196,0.12)";
                        const nights = Math.round((new Date(v.checkOut).getTime() - new Date(v.checkIn).getTime()) / 86400000);
                        return (
                          <div key={v.id} onClick={() => { setActivePage("concierge"); setConcTab("visits"); setSelectedVisitId(v.id); }} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: typeBg, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: typeColor }}>{new Date(v.checkIn + "T12:00:00").toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: typeColor, lineHeight: 1 }}>{new Date(v.checkIn + "T12:00:00").getDate()}</div>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{v.guestName || "Owner"}</div>
                              <div style={{ fontSize: 11, color: "var(--text3)" }}>{v.propertyName} · {nights}n · {v.adults + v.children} guests</div>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "flex-start" }}>
                              {v.status === "Active" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "var(--green-s)", color: "var(--green)", fontWeight: 600 }}>IN HOUSE</span>}
                              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: typeBg, color: typeColor, fontWeight: 600 }}>{v.visitType}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div> : <div />}
              </div>

              {/* ROW 2: OPEN MAINTENANCE + RECENT ACTIVITY */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
                {enabledModules.includes("maintenance") ? <div>
                  <h2 style={{ ...h2s, marginBottom: 12 }}>Open maintenance</h2>
                  {openMaint.length === 0 ? (
                    <div style={{ ...card, padding: "20px 16px", fontSize: 13, color: "var(--text3)" }}>No open maintenance items.</div>
                  ) : (
                    <div style={{ ...card, padding: 0 }}>
                      {openMaint.slice(0, 4).map((t, i) => {
                        const pColor = t.priority === "Urgent" ? "var(--red)" : t.priority === "High" ? "var(--orange)" : t.priority === "Medium" ? "var(--accent)" : "var(--text3)";
                        return (
                          <div key={t.id} onClick={() => setActivePage("maintenance")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < Math.min(openMaint.length, 4) - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <span style={{ fontSize: 14 }}>🔧</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                              <div style={{ fontSize: 11, color: "var(--text3)" }}>{t.propertyName || "—"}{t.vendorName ? ` · ${t.vendorName}` : ""}</div>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: t.status === "In Progress" ? "rgba(100,160,255,0.12)" : "var(--orange-s)", color: t.status === "In Progress" ? "var(--blue)" : "var(--orange)", fontWeight: 600 }}>{t.status}</span>
                              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,0.05)", color: pColor, fontWeight: 600 }}>{t.priority}</span>
                            </div>
                          </div>
                        );
                      })}
                      {openMaint.length > 4 && (
                        <div onClick={() => setActivePage("maintenance")} style={{ padding: "10px 16px", textAlign: "center" as const, fontSize: 12, color: "var(--text3)", cursor: "pointer", borderTop: "1px solid var(--border)" }}>
                          +{openMaint.length - 4} more → View all
                        </div>
                      )}
                    </div>
                  )}
                </div> : <div />}
                <div>
                  <h2 style={{ ...h2s, marginBottom: 12 }}>Recent activity</h2>
                  <div style={{ ...card, padding: 0 }}>
                    {recentActivity.length === 0 && <div style={{ padding: 20, color: "var(--text3)", fontSize: 13 }}>Loading activity...</div>}
                    {recentActivity.slice(0, 8).map((a, i, arr) => (
                      <div key={`act-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <span style={{ fontSize: 13, width: 20, textAlign: "center" as const, color: a.type === "deposit" ? "var(--green)" : "var(--text3)" }}>{a.type === "deposit" ? "↓" : "⎙"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}><strong>{a.house}</strong> — {a.detail}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{fmtDate(a.date)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* FINANCIAL PULSE */}
              <h2 style={{ ...h2s, marginBottom: 12 }}>Financial pulse, by property</h2>
              <div style={{ ...card, padding: 0, marginBottom: 32 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 120px 120px 140px", padding: "10px 20px", borderBottom: "2px solid var(--border2)" }}>
                  {["Property", "Starting Bal.", "Expenses", "Deposits", "Final Bal."].map(h => (
                    <div key={h} style={{ fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600, textAlign: h === "Property" ? "left" as const : "right" as const }}>{h}</div>
                  ))}
                </div>
                {balances.map((b, i) => {
                  const isNeg = b.finalBalance < 0;
                  return (
                    <div key={`fp-${b.houseId}-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 130px 120px 120px 140px", padding: "12px 20px", borderBottom: i < balances.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}
                      onClick={() => { setExpFilter(b.house); setActivePage("expenses"); }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{b.house}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>{b.month}</div>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text2)", textAlign: "right" as const }}>{fmtCur(b.startingBalance, b.currency)}</div>
                      <div style={{ fontSize: 13, color: "var(--red)", textAlign: "right" as const }}>${b.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      <div style={{ fontSize: 13, color: "var(--green)", textAlign: "right" as const }}>${b.totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, textAlign: "right" as const, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(b.finalBalance, b.currency)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

                {/* ====== EXPENSES ====== */}
        {activePage === "expenses" && (
          <div style={{ padding: "32px 32px 32px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={h1s}>Expenses</h1>
                <p style={{ fontSize: 14, color: "var(--text2)" }}>
                  {expLoading ? "Loading..." : `${filteredExpenses.length} records`}
                  {expFilter !== "all" ? ` · ${expFilter}` : ""}
                  {monthFilter !== "all" ? ` · ${monthOptions.find(m => m.value === monthFilter)?.label}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", gap: 0 }}>
                <button onClick={() => setExpTab("list")} style={{ padding: "8px 20px", borderRadius: "8px 0 0 8px", border: "1px solid var(--border2)", background: expTab === "list" ? "var(--accent-s)" : "transparent", color: expTab === "list" ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>All Expenses</button>
                <button onClick={() => setExpTab("add")} style={{ padding: "8px 20px", borderRadius: "0 8px 8px 0", border: "1px solid var(--border2)", borderLeft: "none", background: expTab === "add" ? "var(--accent-s)" : "transparent", color: expTab === "add" ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Add Expense</button>
              </div>
            </div>
            {expSuccess && <div style={{ padding: "10px 16px", background: "var(--green-s)", border: "1px solid rgba(110,207,151,0.2)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "var(--green)" }}>✓ Expense created successfully</div>}

            {expTab === "add" && (
              <div style={{ ...card, maxWidth: 700 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Record a new expense</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div><label style={lbl}>Property</label><select value={newExpProp} onChange={e => setNewExpProp(e.target.value)} style={inp}><option value="">Select property...</option>{active.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div><label style={lbl}>Date</label><input type="date" value={newExpDate} onChange={e => setNewExpDate(e.target.value)} style={inp} /></div>
                  <div><label style={lbl}>Category</label><select value={newExpCat} onChange={e => setNewExpCat(e.target.value)} style={inp}><option value="Utilities">Utilities</option><option value="Villa Staff">Villa Staff</option><option value="Maintenance">Maintenance</option><option value="Cleaning Supplies">Cleaning Supplies</option><option value="Groceries">Groceries</option><option value="Miscellaneous">Miscellaneous</option><option value="Others">Others</option><option value="Rental Expenses">Rental Expenses</option></select></div>
                  <div><label style={lbl}>Amount</label><input type="number" value={newExpAmt} onChange={e => setNewExpAmt(e.target.value)} placeholder="0.00" style={inp} /></div>
                  <div><label style={lbl}>Currency</label><select value={newExpCur} onChange={e => setNewExpCur(e.target.value)} style={inp}><option value="MXN">MXN</option><option value="USD">USD</option></select></div>
                  <div><label style={lbl}>Supplier</label><input value={newExpSupplier} onChange={e => setNewExpSupplier(e.target.value)} placeholder="e.g. CFE, Telmex" style={inp} /></div>
                </div>
                <div style={{ marginBottom: 16 }}><label style={lbl}>Description</label><input value={newExpDesc} onChange={e => setNewExpDesc(e.target.value)} placeholder="Brief description of the expense" style={inp} /></div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setExpTab("list")} style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  <button onClick={createExpense} disabled={addingExp || !newExpProp || !newExpAmt || !newExpDate} style={{ padding: "8px 18px", borderRadius: 100, border: "none", background: (!newExpProp || !newExpAmt || !newExpDate) ? "var(--bg2)" : "linear-gradient(135deg, var(--teal), #2A6B7C)", color: (!newExpProp || !newExpAmt || !newExpDate) ? "var(--text3)" : "#fff", fontSize: 12, fontWeight: 600, cursor: (!newExpProp || !newExpAmt || !newExpDate) ? "default" : "pointer", fontFamily: "inherit" }}>{addingExp ? "Creating..." : "Create Expense"}</button>
                </div>
              </div>
            )}

            {expTab === "list" && (<>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" as const }}>
              <select value={expFilter} onChange={e => setExpFilter(e.target.value)} style={{ ...sel, minWidth: 200 }}><option value="all">All properties</option>{active.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select>
              <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ ...sel, minWidth: 180 }}><option value="all">All months</option>{monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
              {(expFilter !== "all" || monthFilter !== "all") && <span onClick={() => { setExpFilter("all"); setMonthFilter("all"); }} style={{ fontSize: 12, color: "var(--teal-l)", cursor: "pointer", padding: "9px 0" }}>Clear filters</span>}
            </div>
            <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" as const, overflowY: "auto" as const, maxHeight: "calc(100vh - 220px)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                  <thead><tr>{([
                    { label: "Date", key: "date" }, { label: "Property", key: "house" }, { label: "Category", key: "category" }, { label: "Supplier", key: "supplier" }, { label: "Description", key: "description" }, { label: "Amount", key: "total" }, { label: "Cur", key: "currency" }, { label: "Receipt", key: "" }, { label: "Rcpt #", key: "receiptNo" }, { label: "", key: "" },
                  ]).map((h, hi) => (<th key={hi} onClick={() => h.key ? setExpSort(s => ({ col: h.key, dir: s.col === h.key && s.dir === "asc" ? "desc" : "asc" })) : undefined} style={{ textAlign: h.key === "total" ? "right" as const : "left" as const, padding: "12px 14px", fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: expSort.col === h.key ? "var(--accent)" : "var(--text3)", fontWeight: 600, borderBottom: "2px solid var(--border2)", position: "sticky" as const, top: 0, background: "var(--bg3)", whiteSpace: "nowrap" as const, zIndex: 1, cursor: h.key ? "pointer" : "default", userSelect: "none" as const }}>{h.label}{expSort.col === h.key ? (expSort.dir === "asc" ? " ↑" : " ↓") : ""}</th>))}</tr></thead>
                  <tbody>
                    {filteredExpenses.length === 0 && !expLoading && <tr><td colSpan={10} style={{ padding: "40px 14px", textAlign: "center" as const, color: "var(--text3)", fontSize: 14 }}>No expenses found.</td></tr>}
                    {filteredExpenses.map(e => {
                      const cc = catColors[e.category] || { bg: "var(--bg2)", text: "var(--text2)" };
                      const isEditing = editExpId === e.id;
                      const tdS = { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid var(--border)" };
                      if (isEditing) {
                        const ef = editExpForm;
                        return (
                          <tr key={e.id} style={{ background: "var(--accent-s)" }}>
                            <td style={tdS}><input type="date" value={ef.date || ""} onChange={ev => setEditExpForm(f => ({ ...f, date: ev.target.value }))} style={{ ...inp, padding: "5px 8px", fontSize: 12 }} /></td>
                            <td style={tdS}><select value={ef.houseId || ""} onChange={ev => setEditExpForm(f => ({ ...f, houseId: ev.target.value }))} style={{ ...sel, padding: "5px 8px", fontSize: 12 }}>{active.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
                            <td style={tdS}><select value={ef.category || ""} onChange={ev => setEditExpForm(f => ({ ...f, category: ev.target.value }))} style={{ ...sel, padding: "5px 8px", fontSize: 12 }}>{["Utilities", "Villa Staff", "Maintenance", "Cleaning Supplies", "Groceries", "Miscellaneous", "Others", "Rental Expenses"].map(c => <option key={c}>{c}</option>)}</select></td>
                            <td style={tdS}><input value={ef.supplier || ""} onChange={ev => setEditExpForm(f => ({ ...f, supplier: ev.target.value }))} style={{ ...inp, padding: "5px 8px", fontSize: 12, width: 100 }} /></td>
                            <td style={tdS}><input value={ef.description || ""} onChange={ev => setEditExpForm(f => ({ ...f, description: ev.target.value }))} style={{ ...inp, padding: "5px 8px", fontSize: 12, width: 140 }} /></td>
                            <td style={{ ...tdS, textAlign: "right" as const }}><input type="number" value={ef.total ?? ""} onChange={ev => setEditExpForm(f => ({ ...f, total: ev.target.value }))} style={{ ...inp, padding: "5px 8px", fontSize: 12, width: 90, textAlign: "right" as const }} /></td>
                            <td style={tdS}><select value={ef.currency || ""} onChange={ev => setEditExpForm(f => ({ ...f, currency: ev.target.value }))} style={{ ...sel, padding: "5px 8px", fontSize: 12 }}><option>MXN</option><option>USD</option></select></td>
                            <td style={tdS}></td>
                            <td style={{ ...tdS, fontSize: 11, color: "var(--text3)", fontFamily: "monospace" }}>{e.receiptNo}</td>
                            <td style={{ ...tdS, whiteSpace: "nowrap" as const }}>
                              <button onClick={async () => { setSavingExp(true); await fetch("/api/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: e.id, date: ef.date, category: ef.category, amount: ef.total, currency: ef.currency, description: ef.description, supplier: ef.supplier, propertyId: ef.houseId }) }); const d = await fetch(expFilter === "all" ? "/api/expenses" : `/api/expenses?house=${encodeURIComponent(expFilter)}`).then(r => r.json()); setExpenses(d.expenses || []); setEditExpId(null); setSavingExp(false); }} disabled={savingExp} style={{ padding: "3px 10px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginRight: 4 }}>{savingExp ? "..." : "Save"}</button>
                              <button onClick={() => setEditExpId(null)} style={{ padding: "3px 10px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={e.id} onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(255,255,255,0.02)")} onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                          <td style={{ ...tdS, color: "var(--text2)", whiteSpace: "nowrap" as const }}>{e.date}</td>
                          <td style={{ ...tdS, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" as const }}>{e.house}</td>
                          <td style={tdS}><span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 100, fontSize: 11, fontWeight: 500, background: cc.bg, color: cc.text, whiteSpace: "nowrap" as const }}>{e.category}</span></td>
                          <td style={{ ...tdS, color: "var(--text2)", whiteSpace: "nowrap" as const }}>{e.supplier}</td>
                          <td style={{ ...tdS, color: "var(--text2)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }} title={e.description}>{e.description}</td>
                          <td style={{ ...tdS, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" as const, textAlign: "right" as const }}>${(e.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={tdS}><span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 100, background: e.currency === "USD" ? "var(--blue-s)" : "var(--teal-s)", color: e.currency === "USD" ? "var(--blue)" : "var(--teal-l)" }}>{e.currency}</span></td>
                          <td style={tdS}>{e.receiptUrl && <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-l)", textDecoration: "none", fontSize: 12, fontWeight: 500 }}>View</a>}</td>
                          <td style={{ ...tdS, fontSize: 11, color: "var(--text3)", fontFamily: "monospace" }}>{e.receiptNo}</td>
                          <td style={{ ...tdS, whiteSpace: "nowrap" as const }}><button onClick={() => { setEditExpId(e.id); setEditExpForm({ date: e.date, houseId: e.houseId, category: e.category, supplier: e.supplier, description: e.description, total: e.total, currency: e.currency }); }} style={{ padding: "3px 10px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✎ Edit</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </>)}
          </div>
        )}

        {/* ====== DEPOSITS ====== */}
        {activePage === "deposits" && (
          <div style={{ padding: "32px 40px", maxWidth: 900 }}>
            <h1 style={h1s}>Deposits</h1>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 28 }}>Log owner deposits and track account balances</p>

            <div style={{ ...card, marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 20 }}>Record a new deposit</div>
              {depSuccess && (<div style={{ padding: "10px 16px", background: "var(--green-s)", border: "1px solid rgba(110,207,151,0.2)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "var(--green)" }}>✓ Deposit recorded and synced to Airtable!</div>)}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><label style={lbl}>Property</label><select value={depProperty} onChange={e => setDepProperty(e.target.value)} style={{ ...inp, appearance: "none" as const }}><option value="">Select property...</option>{active.map(p => <option key={p.id} value={p.id}>{p.name} — {p.owner}</option>)}</select></div>
                <div><label style={lbl}>Amount</label><input type="number" value={depAmount} onChange={e => setDepAmount(e.target.value)} placeholder="$0.00" style={inp} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><label style={lbl}>Date received</label><input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Notes</label><input type="text" value={depNotes} onChange={e => setDepNotes(e.target.value)} placeholder="e.g. Wire transfer, check #..." style={inp} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={submitDeposit} disabled={depSubmitting || !depProperty || !depAmount} style={{ padding: "10px 24px", borderRadius: 100, border: "none", background: (!depProperty || !depAmount) ? "var(--bg2)" : "linear-gradient(135deg, var(--teal), #2A6B7C)", color: (!depProperty || !depAmount) ? "var(--text3)" : "#fff", fontSize: 13, fontWeight: 600, cursor: (!depProperty || !depAmount) ? "default" : "pointer", fontFamily: "inherit" }}>{depSubmitting ? "Recording..." : "Record Deposit"}</button>
              </div>
            </div>

            <h2 style={h2s}>Recent deposits</h2>
            <div style={{ ...card, marginBottom: 28, padding: 0 }}>
              {depLoading && <div style={{ padding: 20, color: "var(--text3)", fontSize: 13 }}>Loading...</div>}
              {deposits.slice(0, 15).map((d, i) => (
                <div key={`dep-${d.id}-${i}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: i < Math.min(deposits.length, 15) - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--green-s)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--green)", fontSize: 14, flexShrink: 0 }}>↓</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, marginBottom: 2 }}>{d.house} — {d.owner}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{d.notes || "Deposit"} · {fmtDate(d.date)}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--green)", whiteSpace: "nowrap" as const }}>+{d.currency} ${(d.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
              ))}
            </div>

            <h2 style={h2s}>Account balances</h2>
            <div style={{ ...card, padding: 0 }}>
              {balances.map((b, i) => { const isNeg = b.finalBalance < 0; return (
                <div key={`bal-${b.houseId}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < balances.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div><div style={{ fontSize: 14, marginBottom: 2 }}>{b.house}</div><div style={{ fontSize: 12, color: "var(--text3)" }}>{b.month}</div></div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(b.finalBalance, b.currency)}</div>
                </div>
              ); })}
            </div>
          </div>
        )}


        {/* ====== REPORTS ====== */}
        {activePage === "reports" && (
          <div style={{ padding: "32px 40px", maxWidth: 960 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={h1s}>Monthly Reports</h1>
                <p style={{ fontSize: 14, color: "var(--text2)" }}>{repLoading ? "Loading..." : `${repMonth} · Review, approve, and send to owners`}</p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 0 }}>
                  <button onClick={() => setRepView("status")}
                    style={{ padding: "7px 16px", borderRadius: "8px 0 0 8px", border: "1px solid var(--border2)", background: repView === "status" ? "var(--accent-s)" : "transparent", color: repView === "status" ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>By Status</button>
                  <button onClick={() => setRepView("preview")}
                    style={{ padding: "7px 16px", borderRadius: "0 8px 8px 0", border: "1px solid var(--border2)", borderLeft: "none", background: repView === "preview" ? "var(--accent-s)" : "transparent", color: repView === "preview" ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Owner Preview</button>
                </div>
                <select value={repMonth} onChange={e => setRepMonth(e.target.value)} style={{ ...sel, minWidth: 180 }}>
                  {repMonthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {repView === "status" && (<>
            {/* Stat cards */}
            {!repLoading && reports.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div style={card}><div style={lbl}>Sent</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--green)" }}>{reports.filter(r => r.status === "Sent").length}</div></div>
                <div style={card}><div style={lbl}>Reviewed</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--accent)" }}>{reports.filter(r => r.status === "Reviewed").length}</div></div>
                <div style={card}><div style={lbl}>Pending</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: reports.filter(r => r.status === "Pending").length > 0 ? "var(--red)" : "var(--text)" }}>{reports.filter(r => r.status === "Pending").length}</div></div>
              </div>
            )}

            {/* Bulk actions */}
            <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" as const }}>
              {reports.some(r => r.chargeStatus !== "Completed") && (
                <button onClick={() => updateReports("generateCharges", reports.filter(r => r.chargeStatus !== "Completed").map(r => r.id))} disabled={repUpdating !== null}
                  style={{ padding: "8px 18px", borderRadius: 100, border: "none", background: "linear-gradient(135deg, var(--teal), #2A6B7C)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {repUpdating === "generateCharges" ? "Running..." : `Generate all charges (${reports.filter(r => r.chargeStatus !== "Completed").length})`}
                </button>
              )}
              {reports.some(r => r.status === "Pending") && (
                <button onClick={() => updateReports("markReviewed", reports.filter(r => r.status === "Pending").map(r => r.id))} disabled={repUpdating !== null}
                  style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Mark all Reviewed</button>
              )}
              {reports.some(r => r.status === "Reviewed") && (
                <button onClick={() => updateReports("markSent", reports.filter(r => r.status === "Reviewed").map(r => r.id))} disabled={repUpdating !== null}
                  style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--green)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Mark all Sent</button>
              )}
              {reports.every(r => r.chargeStatus === "Completed") && reports.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--green)", padding: "8px 0", display: "flex", alignItems: "center", gap: 4 }}>✓ All recurring charges generated</span>
              )}
            </div>

            {/* PENDING */}
            {reports.filter(r => r.status === "Pending").length > 0 && (<>
              <h2 style={{ ...h2s, marginBottom: 12 }}>Pending</h2>
              <div style={{ ...card, padding: 0, marginBottom: 24 }}>
                {reports.filter(r => r.status === "Pending").map((r, i, arr) => {
                  const isNeg = r.finalBalance < 0;
                  const isOpen = previewId === r.id;
                  const cats = [
                    { name: "Villa Staff", val: r.categories.villaStaff },
                    { name: "Utilities", val: r.categories.utilities },
                    { name: "Maintenance", val: r.categories.maintenance },
                    { name: "Cleaning Supplies", val: r.categories.cleaningSupplies },
                    { name: "Groceries", val: r.categories.groceries },
                    { name: "Miscellaneous", val: r.categories.miscellaneous },
                  ].filter(c => c.val > 0);
                  return (<div key={r.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: (isOpen || i < arr.length - 1) ? "1px solid var(--border)" : "none" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{r.house} — {r.owner}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>
                          Expenses: {fmtCur(r.totalExpenses, r.currency)} · Deposits: {fmtCur(r.totalDeposits, r.currency)} · Balance: <span style={{ color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(r.finalBalance, r.currency)}</span>
                        </div>
                      </div>
                      {/* Exchange rate inline for USD properties */}
                      {r.currency === "USD" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>FX:</span>
                          <input type="number" step="0.01" defaultValue={r.exchangeRate || ""} onBlur={e => { if (e.target.value) updateExchangeRate(r.id, e.target.value); }}
                            style={{ width: 60, padding: "3px 6px", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none", textAlign: "center" as const }} placeholder="0.00" />
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => refreshBalance(r.id, r.month)} disabled={repUpdating !== null}
                          style={{ padding: "5px 10px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>{repUpdating === "refreshBalance-" + r.id ? "..." : "\u21BB Refresh"}</button>
                        {r.chargeStatus !== "Completed" && (
                          <button onClick={() => updateReports("generateCharges", [r.id])} disabled={repUpdating !== null}
                            style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--teal-l)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>Gen. charges</button>
                        )}
                        <button onClick={() => setPreviewId(isOpen ? null : r.id)}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: isOpen ? "var(--accent-s)" : "transparent", color: "var(--accent)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Preview</button>
                        <button onClick={() => updateReports("markReviewed", [r.id])} disabled={repUpdating !== null}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--accent)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>Mark Reviewed</button>
                        <button onClick={() => { setExpFilter(r.house); setMonthFilter(monthToFilterValue(r.month)); setActivePage("expenses"); }}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Expenses</button>
                      </div>
                    </div>
                    {/* Accordion preview */}
                    {isOpen && (
                      <div style={{ padding: "16px 20px", background: "var(--bg2)", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 12 }}>Report preview: {r.house}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 13, color: "var(--text2)" }}>Starting Balance</span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{fmtCur(r.startingBalance, r.currency)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>
                          <span style={{ fontSize: 13, color: "var(--text2)" }}>Total Expenses</span>
                          <span style={{ fontSize: 13, color: "var(--red)" }}>-{fmtCur(r.totalExpenses, r.currency)}</span>
                        </div>
                        {cats.map(c => (
                          <div key={c.name} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 5px 24px", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ fontSize: 12, color: "var(--text3)" }}>{c.name}</span>
                            <span style={{ fontSize: 12, color: "var(--text3)" }}>{fmtCur(c.val, r.currency)}</span>
                          </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 13, color: "var(--text2)" }}>Deposits</span>
                          <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>+{fmtCur(r.totalDeposits, r.currency)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 4px" }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>Final Balance</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(r.finalBalance, r.currency)}</span>
                        </div>
                      </div>
                    )}
                  </div>);
                })}
              </div>
            </>)}

            {/* REVIEWED */}
            {reports.filter(r => r.status === "Reviewed").length > 0 && (<>
              <h2 style={{ ...h2s, marginBottom: 12 }}>Ready to send</h2>
              <div style={{ ...card, padding: 0, marginBottom: 24 }}>
                {reports.filter(r => r.status === "Reviewed").map((r, i, arr) => {
                  const isNeg = r.finalBalance < 0;
                  const isOpen = previewId === r.id;
                  const cats = [
                    { name: "Villa Staff", val: r.categories.villaStaff },
                    { name: "Utilities", val: r.categories.utilities },
                    { name: "Maintenance", val: r.categories.maintenance },
                    { name: "Cleaning Supplies", val: r.categories.cleaningSupplies },
                    { name: "Groceries", val: r.categories.groceries },
                    { name: "Miscellaneous", val: r.categories.miscellaneous },
                  ].filter(c => c.val > 0);
                  return (<div key={r.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: (isOpen || i < arr.length - 1) ? "1px solid var(--border)" : "none" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{r.house} — {r.owner}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>Balance: <span style={{ color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(r.finalBalance, r.currency)}</span></div>
                      </div>
                      {r.currency === "USD" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>FX:</span>
                          <input type="number" step="0.01" defaultValue={r.exchangeRate || ""} onBlur={e => { if (e.target.value) updateExchangeRate(r.id, e.target.value); }}
                            style={{ width: 60, padding: "3px 6px", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 6, color: "var(--text)", fontSize: 12, outline: "none", textAlign: "center" as const }} placeholder="0.00" />
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => refreshBalance(r.id, r.month)} disabled={repUpdating !== null}
                          style={{ padding: "5px 10px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>{repUpdating === "refreshBalance-" + r.id ? "..." : "\u21BB Refresh"}</button>
                        <button onClick={() => updateReports("markPending", [r.id])} disabled={repUpdating !== null}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>{"\u2190"} Back to Pending</button>
                        <button onClick={() => setPreviewId(isOpen ? null : r.id)}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: isOpen ? "var(--accent-s)" : "transparent", color: "var(--accent)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Preview</button>
                        <button onClick={() => updateReports("markSent", [r.id])} disabled={repUpdating !== null}
                          style={{ padding: "6px 16px", borderRadius: 100, border: "none", background: "linear-gradient(135deg, var(--green), #4a9e6e)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>Mark Sent</button>
                        <button onClick={() => { setExpFilter(r.house); setMonthFilter(monthToFilterValue(r.month)); setActivePage("expenses"); }}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Expenses</button>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ padding: "16px 20px", background: "var(--bg2)", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 12 }}>Report preview: {r.house}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 13, color: "var(--text2)" }}>Starting Balance</span><span style={{ fontSize: 13, fontWeight: 500 }}>{fmtCur(r.startingBalance, r.currency)}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontWeight: 500 }}><span style={{ fontSize: 13, color: "var(--text2)" }}>Total Expenses</span><span style={{ fontSize: 13, color: "var(--red)" }}>-{fmtCur(r.totalExpenses, r.currency)}</span></div>
                        {cats.map(c => (<div key={c.name} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 5px 24px", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 12, color: "var(--text3)" }}>{c.name}</span><span style={{ fontSize: 12, color: "var(--text3)" }}>{fmtCur(c.val, r.currency)}</span></div>))}
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}><span style={{ fontSize: 13, color: "var(--text2)" }}>Deposits</span><span style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>+{fmtCur(r.totalDeposits, r.currency)}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 4px" }}><span style={{ fontSize: 14, fontWeight: 600 }}>Final Balance</span><span style={{ fontSize: 14, fontWeight: 600, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(r.finalBalance, r.currency)}</span></div>
                      </div>
                    )}
                  </div>);
                })}
              </div>
            </>)}

            {/* SENT */}
            {reports.filter(r => r.status === "Sent").length > 0 && (<>
              <h2 style={{ ...h2s, marginBottom: 12 }}>Sent</h2>
              <div style={{ ...card, padding: 0 }}>
                {reports.filter(r => r.status === "Sent").map((r, i, arr) => {
                  const isNeg = r.finalBalance < 0;
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--green-s)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--green)", fontSize: 12, flexShrink: 0 }}>✓</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{r.house} — {r.owner}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>Sent · Balance: <span style={{ color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(r.finalBalance, r.currency)}</span></div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => refreshBalance(r.id, r.month)} disabled={repUpdating !== null}
                          style={{ padding: "5px 10px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>{repUpdating === "refreshBalance-" + r.id ? "..." : "\u21BB Refresh"}</button>
                        <button onClick={() => updateReports("markPending", [r.id])} disabled={repUpdating !== null}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Reopen</button>
                        <button onClick={() => { setExpFilter(r.house); setMonthFilter(monthToFilterValue(r.month)); setActivePage("expenses"); }}
                          style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Expenses</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>)}
            </>)}

            {/* ====== OWNER PREVIEW ====== */}
            {repView === "preview" && (() => {
              const propReport = reports.find(r => r.house === previewProp);
              const propExpenses = expenses.filter(e => e.house === previewProp && e.date && e.date.startsWith(monthToFilterValue(repMonth)));
              const pmFee = propReport ? propReport.totalExpenses * 0.18 : 0;
              const catIcons: Record<string, string> = { "Villa Staff": "\u{1F464}", Utilities: "\u26A1", Maintenance: "\u{1F527}", "Cleaning Supplies": "\u{1F9F9}", Groceries: "\u{1F6D2}", Miscellaneous: "\u{1F4E6}", "Rental Expenses": "\u{1F3E0}", Others: "\u{1F4CB}" };

              return (
                <div>
                  <div style={{ marginBottom: 24 }}>
                    <select value={previewProp} onChange={e => setPreviewProp(e.target.value)} style={{ ...sel, minWidth: 260 }}>
                      <option value="">Select a property...</option>
                      {active.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>

                  {previewProp && !propReport && !repLoading && (
                    <div style={{ ...card, textAlign: "center" as const, padding: 40, color: "var(--text3)" }}>No report found for {previewProp} in {repMonth}</div>
                  )}

                  {previewProp && propReport && (<>
                    <div style={{ display: "grid", gridTemplateColumns: propReport.currency === "USD" ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                      <div style={card}>
                        <div style={lbl}>Deposits</div>
                        <div style={{ fontFamily: "'Georgia', serif", fontSize: 22, color: "var(--green)" }}>{fmtCur(propReport.totalDeposits, propReport.currency)}</div>
                      </div>
                      <div style={card}>
                        <div style={lbl}>Total Charges</div>
                        <div style={{ fontFamily: "'Georgia', serif", fontSize: 22, color: "var(--red)" }}>{fmtCur(propReport.totalExpenses, propReport.currency)}</div>
                      </div>
                      {propReport.currency === "USD" && (
                        <div style={card}>
                          <div style={lbl}>Exchange Rate</div>
                          <div style={{ fontFamily: "'Georgia', serif", fontSize: 22 }}>{propReport.exchangeRate ? propReport.exchangeRate.toFixed(2) : "\u2014"}</div>
                        </div>
                      )}
                      <div style={card}>
                        <div style={lbl}>Final Balance</div>
                        <div style={{ fontFamily: "'Georgia', serif", fontSize: 22, color: propReport.finalBalance < 0 ? "var(--red)" : "var(--green)" }}>{propReport.finalBalance < 0 ? "-" : ""}{fmtCur(propReport.finalBalance, propReport.currency)}</div>
                      </div>
                    </div>

                    <div style={{ ...card, marginBottom: 24 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 16 }}>Account Summary</div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 14, color: "var(--text2)" }}>Starting Balance</span>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{fmtCur(propReport.startingBalance, propReport.currency)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 14, color: "var(--text2)" }}>Deposits</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--green)" }}>+{fmtCur(propReport.totalDeposits, propReport.currency)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 14, color: "var(--text2)" }}>Operating Expenses</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--red)" }}>-{fmtCur(propReport.totalExpenses, propReport.currency)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 14, color: "var(--text2)" }}>PM Fee (18%)</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text3)" }}>{fmtCur(pmFee, propReport.currency)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 4px" }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>Ending Balance</span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: propReport.finalBalance < 0 ? "var(--red)" : "var(--green)" }}>{propReport.finalBalance < 0 ? "-" : ""}{fmtCur(propReport.finalBalance, propReport.currency)}</span>
                      </div>
                    </div>

                    <div style={{ ...card }}>
                      <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", marginBottom: 16 }}>Expense Breakdown</div>
                      {propExpenses.length === 0 && (
                        <div style={{ fontSize: 13, color: "var(--text3)", padding: "12px 0" }}>No individual expense records found for this month. Totals shown above come from report rollups.</div>
                      )}
                      {propExpenses.map((exp, i) => (
                        <div key={exp.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < propExpenses.length - 1 ? "1px solid var(--border)" : "none" }}>
                          <span style={{ fontSize: 16, width: 28, textAlign: "center" as const }}>{catIcons[exp.category] || "\u{1F4CB}"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{exp.description || exp.category}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>{fmtDate(exp.date)} {exp.category}{exp.supplier ? ` \u00B7 ${exp.supplier}` : ""}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 500, flexShrink: 0 }}>{fmtCur(exp.total, exp.currency)}</div>
                        </div>
                      ))}
                    </div>
                  </>)}
                </div>
              );
            })()}

          </div>
        )}


        {/* ====== HOUSEKEEPING ====== */}
        {activePage === "housekeeping" && (() => {
          const pending = hskLogs.filter(l => l.status === "Pending");
          const approved = hskLogs.filter(l => l.status === "Approved");
          const dayKeys: (keyof HskLog["days"])[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
          const dayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

          function formatWeek(dateStr: string) {
            if (!dateStr) return "";
            try { const d = new Date(dateStr + "T12:00:00"); return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`; } catch { return dateStr; }
          }

          function PropertyPill({ name }: { name: string }) {
            const colors = ["var(--teal)", "var(--accent)", "var(--green)", "var(--blue)", "var(--orange)", "#9B8EC4", "#CFC46E"];
            const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
            return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: `${colors[idx]}18`, color: colors[idx], whiteSpace: "nowrap" as const, margin: "1px 2px" }}>{name}</span>;
          }

          return (
            <div style={{ padding: "32px 40px" }}>
              <h1 style={h1s}>Housekeeping Logs</h1>
              <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 24 }}>Review and approve weekly cleaning schedules</p>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
                <button onClick={() => setHskView("individual")}
                  style={{ padding: "8px 20px", borderRadius: "8px 0 0 8px", border: "1px solid var(--border2)", background: hskView === "individual" ? "var(--accent-s)" : "transparent", color: hskView === "individual" ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Individual Logs</button>
                <button onClick={() => setHskView("weekly")}
                  style={{ padding: "8px 20px", borderRadius: "0 0 0 0", border: "1px solid var(--border2)", borderLeft: "none", background: hskView === "weekly" ? "var(--accent-s)" : "transparent", color: hskView === "weekly" ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Weekly Overview</button>
                <button onClick={() => setHskView("summary")}
                  style={{ padding: "8px 20px", borderRadius: "0 8px 8px 0", border: "1px solid var(--border2)", borderLeft: "none", background: hskView === "summary" ? "var(--accent-s)" : "transparent", color: hskView === "summary" ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Monthly Summary</button>
              </div>

              {/* Summary bar */}
              {pending.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 24 }}>
                  <span style={{ fontSize: 14 }}>{pending.length} {pending.length === 1 ? "log" : "logs"} pending your approval</span>
                  <button onClick={() => updateHsk("approve", pending.map(l => l.id))} disabled={hskUpdating !== null}
                    style={{ padding: "8px 20px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {hskUpdating === "approve" ? "Approving..." : "Approve All"}
                  </button>
                </div>
              )}

              {hskLoading && <div style={{ padding: 20, color: "var(--text3)" }}>Loading logs...</div>}

              {/* INDIVIDUAL VIEW */}
              {hskView === "individual" && (<>
                {/* Pending */}
                {pending.map(log => (
                  <div key={log.id} style={{ ...card, marginBottom: 16, padding: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 15, fontWeight: 500 }}>{formatWeek(log.weekStart)} — {log.housekeeper}</div>
                      <span style={{ fontSize: 11, padding: "3px 12px", borderRadius: 100, fontWeight: 500, background: "var(--accent-s)", color: "var(--accent)" }}>PENDING</span>
                    </div>
                    {/* Grid */}
                    <div style={{ overflowX: "auto" as const, padding: "16px 20px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "120px repeat(7, 1fr)", gap: 0, minWidth: 700 }}>
                        <div />
                        {dayLabels.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "center" as const, padding: "0 4px 8px" }}>{d}</div>)}
                        <div style={{ fontSize: 13, color: "var(--text2)", padding: "8px 0", display: "flex", alignItems: "center" }}>{log.housekeeper.split(" ")[0]}</div>
                        {dayKeys.map(dk => (
                          <div key={dk} style={{ padding: "4px", textAlign: "center" as const, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" as const, gap: 2 }}>
                            {log.days[dk] ? log.days[dk].split(", ").map((h, i) => <PropertyPill key={i} name={h.trim()} />) : <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Comments */}
                    {editHskId === log.id ? (
                      <div style={{ padding: "8px 20px 12px", display: "flex", gap: 8, alignItems: "center" }}>
                        <input value={editHskComment} onChange={ev => setEditHskComment(ev.target.value)} placeholder="Add a note before approving..." style={{ ...inp, flex: 1, padding: "7px 12px", fontSize: 12 }} />
                        <button onClick={async () => { await fetch("/api/housekeeping", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "editComment", recordId: log.id, comments: editHskComment }) }); const d = await fetch(`/api/housekeeping?month=${hskSummaryMonth}`).then(r => r.json()); setHskLogs(d.logs || []); setEditHskId(null); }} style={{ padding: "5px 14px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                        <button onClick={() => setEditHskId(null)} style={{ padding: "5px 14px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                      </div>
                    ) : log.comments ? (
                      <div style={{ padding: "0 20px 12px", fontSize: 12, color: "var(--text3)", fontStyle: "italic", cursor: "pointer" }} onClick={() => { setEditHskId(log.id); setEditHskComment(log.comments); }}>{log.comments} <span style={{ color: "var(--accent)", fontStyle: "normal" }}>✎</span></div>
                    ) : null}
                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderTop: "1px solid var(--border)", justifyContent: "flex-end" }}>
                      {editHskId !== log.id && <button onClick={() => { setEditHskId(log.id); setEditHskComment(log.comments || ""); }} style={{ padding: "7px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", marginRight: "auto" }}>✎ Edit Note</button>}
                      <button onClick={() => updateHsk("reject", [log.id])} disabled={hskUpdating !== null}
                        style={{ padding: "7px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Reject</button>
                      <button onClick={() => updateHsk("approve", [log.id])} disabled={hskUpdating !== null}
                        style={{ padding: "7px 18px", borderRadius: 100, border: "none", background: "linear-gradient(135deg, var(--teal), #2A6B7C)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Approve & Create Expenses</button>
                    </div>
                  </div>
                ))}

                {/* Approved */}
                {approved.length > 0 && (
                  <>
                    <h2 style={{ ...h2s, marginTop: 28, marginBottom: 12 }}>Approved</h2>
                    {approved.slice(0, 10).map(log => (
                      <div key={log.id} style={{ ...card, marginBottom: 12, padding: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 15, fontWeight: 500 }}>{formatWeek(log.weekStart)} — {log.housekeeper}</div>
                          <span style={{ fontSize: 11, padding: "3px 12px", borderRadius: 100, fontWeight: 500, background: "var(--green-s)", color: "var(--green)" }}>APPROVED</span>
                        </div>
                        <div style={{ overflowX: "auto" as const, padding: "16px 20px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "120px repeat(7, 1fr)", gap: 0, minWidth: 700 }}>
                            <div />
                            {dayLabels.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "center" as const, padding: "0 4px 8px" }}>{d}</div>)}
                            <div style={{ fontSize: 13, color: "var(--text2)", padding: "8px 0", display: "flex", alignItems: "center" }}>{log.housekeeper.split(" ")[0]}</div>
                            {dayKeys.map(dk => (
                              <div key={dk} style={{ padding: "4px", textAlign: "center" as const, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" as const, gap: 2 }}>
                                {log.days[dk] ? log.days[dk].split(", ").map((h, i) => <PropertyPill key={i} name={h.trim()} />) : <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--green)" }}>
                          {log.expensesCreated ? "✓ Expenses created" : "Expenses will be created on next Wednesday run"}
                          {log.comments && <span style={{ color: "var(--text3)", marginLeft: 12 }}>{log.comments}</span>}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>)}


              {/* MONTHLY SUMMARY */}
              {hskView === "summary" && (() => {
                const weekCols = hskWeekStarts.map((ws, wi) => {
                  const d = new Date(ws + "T12:00:00");
                  return { ws, label: "Wk " + (wi + 1), sub: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
                });
                const hd: React.CSSProperties = { padding: "6px 8px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", textAlign: "center", whiteSpace: "nowrap", borderBottom: "2px solid var(--border2)" };
                const td: React.CSSProperties = { padding: "10px 8px", textAlign: "center", fontSize: 13, borderBottom: "1px solid var(--border)" };
                const evenBg = "rgba(58,155,170,0.05)";
                return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <button onClick={() => { const [y, m] = hskSummaryMonth.split("-").map(Number); const d = new Date(y, m - 2, 1); setHskSummaryMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
                    <h2 style={{ ...h2s, margin: 0 }}>Clean count summary, {hskMonth}</h2>
                    <button onClick={() => { const [y, m] = hskSummaryMonth.split("-").map(Number); const d = new Date(y, m, 1); setHskSummaryMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>Week-by-week included vs extra cleans per property</p>
                  <div style={{ ...card, padding: 0, overflowX: "auto" as const }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" as const, minWidth: 750 }}>
                      <thead>
                        <tr>
                          <th style={{ ...hd, textAlign: "left", padding: "10px 16px", minWidth: 160 }}>Property</th>
                          {weekCols.map((wc, wi) => (<React.Fragment key={wc.ws}>
                            <th style={{ ...hd, background: wi % 2 === 0 ? evenBg : "transparent", minWidth: 50 }}><div style={{ marginBottom: 2 }}>{wc.label}</div><div style={{ fontWeight: 400, fontSize: 9, opacity: 0.6 }}>{wc.sub}</div><div style={{ marginTop: 3, color: "var(--text3)" }}>Incl</div></th>
                            <th style={{ ...hd, background: wi % 2 === 0 ? evenBg : "transparent", minWidth: 50, color: "var(--orange)" }}>Extra</th>
                          </React.Fragment>))}
                          <th style={{ ...hd, minWidth: 60, borderLeft: "2px solid var(--border2)" }}>Total</th>
                          <th style={{ ...hd, minWidth: 60 }}>Incl</th>
                          <th style={{ ...hd, minWidth: 60 }}>Extra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hskSummary.map(s => {
                          const hasExtra = s.extraCleans > 0;
                          return (
                            <tr key={s.property}>
                              <td style={{ ...td, textAlign: "left", padding: "10px 16px" }}><div style={{ fontSize: 13, fontWeight: 500 }}>{s.property}</div><div style={{ fontSize: 10, color: "var(--text3)" }}>{s.includedPerWeek}/wk</div></td>
                              {weekCols.map((wc, wi) => {
                                const wb = (s.weeklyBreakdown || []).find((w: any) => w.weekStart === wc.ws);
                                const incl = wb ? Math.min(wb.cleans, wb.included) : 0;
                                const extra = wb ? wb.extra : 0;
                                return (<React.Fragment key={wc.ws}>
                                  <td style={{ ...td, background: wi % 2 === 0 ? evenBg : "transparent", color: incl > 0 ? "var(--text)" : "var(--text3)" }}>{incl > 0 ? incl : "—"}</td>
                                  <td style={{ ...td, background: wi % 2 === 0 ? evenBg : "transparent", color: extra > 0 ? "var(--orange)" : "var(--text3)", fontWeight: extra > 0 ? 600 : 400 }}>{extra > 0 ? extra : "—"}</td>
                                </React.Fragment>);
                              })}
                              <td style={{ ...td, fontWeight: 600, fontSize: 14, borderLeft: "2px solid var(--border2)" }}>{s.totalCleans}</td>
                              <td style={{ ...td, color: "var(--text2)" }}>{s.includedMonthly}</td>
                              <td style={{ ...td, fontWeight: 600, color: hasExtra ? "var(--orange)" : "var(--green)" }}>{hasExtra ? s.extraCleans : "✓"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {hskSummary.length === 0 && <div style={{ padding: 20, color: "var(--text3)", fontSize: 13 }}>No housekeeping data for this month.</div>}
                  </div>
                  {hskSummary.some(s => s.extraCleans > 0) && (
                    <div style={{ marginTop: 16, padding: "12px 20px", background: "var(--orange-s)", border: "1px solid rgba(207,149,110,0.12)", borderRadius: 10, fontSize: 13 }}>
                      {hskSummary.filter(s => s.extraCleans > 0).length} {hskSummary.filter(s => s.extraCleans > 0).length === 1 ? "property has" : "properties have"} extra cleans beyond included.
                    </div>
                  )}
                </div>
                );
              })()}

              {/* WEEKLY OVERVIEW */}
              {hskView === "weekly" && (() => {
                const weeks = Array.from(new Set(hskLogs.map(l => l.weekStart))).sort((a, b) => b.localeCompare(a));
                return (<>
                  {weeks.slice(0, 6).map(week => {
                    const weekLogs = hskLogs.filter(l => l.weekStart === week);
                    return (
                      <div key={week} style={{ ...card, marginBottom: 16, padding: 0 }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontSize: 15, fontWeight: 500 }}>{formatWeek(week)}</div>
                        <div style={{ overflowX: "auto" as const, padding: "16px 20px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "140px repeat(7, 1fr)", gap: 0, minWidth: 800 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", padding: "0 0 8px" }}>Housekeeper</div>
                            {dayLabels.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "center" as const, padding: "0 4px 8px" }}>{d}</div>)}
                            {weekLogs.map(log => (<div key={log.id} style={{ display: "contents" }}>
                              <div key={`name-${log.id}`} style={{ fontSize: 13, color: "var(--text2)", padding: "8px 0", display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid var(--border)" }}>
                                {log.housekeeper.split(" ")[0]}
                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 100, background: log.status === "Approved" ? "var(--green-s)" : "var(--accent-s)", color: log.status === "Approved" ? "var(--green)" : "var(--accent)" }}>{log.status === "Approved" ? "✓" : "○"}</span>
                              </div>
                              {dayKeys.map(dk => (
                                <div key={`${log.id}-${dk}`} style={{ padding: "4px", textAlign: "center" as const, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap" as const, gap: 2, borderTop: "1px solid var(--border)" }}>
                                  {log.days[dk] ? log.days[dk].split(", ").map((h, i) => <PropertyPill key={i} name={h.trim()} />) : <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>}
                                </div>
                              ))}
                            </div>))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>);
              })()}
            </div>
          );
        })()}


        {/* ====== PROPERTIES ====== */}
        {activePage === "properties" && (() => {
          const activePropList = propDetails.filter(p => p.status === "Active");
          const otherPropList = propDetails.filter(p => p.status !== "Active");
          const sel_prop = selectedProp ? propDetails.find(p => p.id === selectedProp) : null;


          // DETAIL VIEW
          if (sel_prop) {
            const isUSD = sel_prop.currency === "USD";
            const pmFee = isUSD ? sel_prop.pmFeeUSD : sel_prop.pmFeeMXN;
            const landscapingFee = isUSD ? sel_prop.landscapingFeeUSD : sel_prop.landscapingFeeMXN;
            const poolFee = isUSD ? sel_prop.poolFeeUSD : sel_prop.poolFeeMXN;
            const hskFee = isUSD ? sel_prop.hskFeeUSD : sel_prop.hskFeeMXN;
            const housemanFee = isUSD ? sel_prop.housemanFeeUSD : sel_prop.housemanFeeMXN;
            const bal = balances.find(b => b.house === sel_prop.name);
            const isNeg = bal && bal.finalBalance < 0;
            const tabStyle = (active: boolean): React.CSSProperties => ({ padding: "8px 20px", border: "1px solid var(--border2)", background: active ? "var(--accent-s)" : "transparent", color: active ? "var(--accent)" : "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });

            return (
              <div style={{ padding: "32px 40px", maxWidth: 900 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <span onClick={() => { setSelectedProp(null); setPropTab("overview"); }} style={{ fontSize: 13, color: "var(--teal-l)", cursor: "pointer" }}>Properties</span>
                  <span style={{ fontSize: 13, color: "var(--text3)" }}>/</span>
                  <span style={{ fontSize: 13, color: "var(--text)" }}>{sel_prop.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <div>
                    <h1 style={h1s}>{sel_prop.name}</h1>
                    <p style={{ fontSize: 14, color: "var(--text2)" }}>{sel_prop.owner} · {sel_prop.currency} · {sel_prop.status}</p>
                  </div>
                  {bal && (
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Georgia', serif", color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(bal.finalBalance, bal.currency)}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase" as const }}>Current balance</div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
                  <button onClick={() => setPropTab("overview")} style={{ ...tabStyle(propTab === "overview"), borderRadius: "8px 0 0 8px" }}>Overview</button>
                  <button onClick={() => setPropTab("fees")} style={{ ...tabStyle(propTab === "fees"), borderLeft: "none" }}>Fee Config</button>
                  <button onClick={() => setPropTab("housekeeping")} style={{ ...tabStyle(propTab === "housekeeping"), borderLeft: "none" }}>Housekeeping</button>
                  <button onClick={() => setPropTab("history")} style={{ ...tabStyle(propTab === "history"), borderLeft: "none" }}>History</button>
                  <button onClick={() => setPropTab("availability")} style={{ ...tabStyle(propTab === "availability"), borderLeft: "none", borderRadius: "0 8px 8px 0" }}>Availability</button>
                </div>
                {propSaved && <div style={{ padding: "10px 16px", background: "var(--green-s)", border: "1px solid rgba(110,207,151,0.2)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "var(--green)" }}>✓ Changes saved to Airtable</div>}

                {propTab === "overview" && (
                  <div style={{ ...card }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Owner information</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                      <div><label style={lbl}>Owner name</label><input defaultValue={sel_prop.owner} onBlur={e => saveProperty(sel_prop.id, { owner: e.target.value })} style={inp} /></div>
                      <div>
                        <label style={lbl}>Preferred currency</label>
                        <select defaultValue={sel_prop.currency} onChange={e => saveProperty(sel_prop.id, { currency: e.target.value })} style={{ ...inp, appearance: "none" as const }}>
                          <option value="USD">USD</option>
                          <option value="MXN">MXN</option>
                        </select>
                      </div>
                      <div><label style={lbl}>Primary email</label><input defaultValue={sel_prop.email} onBlur={e => saveProperty(sel_prop.id, { email: e.target.value })} style={inp} /></div>
                      <div><label style={lbl}>Secondary email</label><input defaultValue={sel_prop.secondaryEmail} onBlur={e => saveProperty(sel_prop.id, { secondaryEmail: e.target.value })} style={inp} /></div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, paddingTop: 16, borderTop: "1px solid var(--border)" }}>Quick actions</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setExpFilter(sel_prop.name); setActivePage("expenses"); }} style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--teal-l)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>View expenses</button>
                      <button onClick={() => setActivePage("reports")} style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--accent)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>View reports</button>
                      <button onClick={() => setActivePage("deposits")} style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--green)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>View deposits</button>
                    </div>
                  </div>
                )}

                {propTab === "fees" && (
                  <div style={{ ...card }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Monthly recurring fees ({sel_prop.currency})</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                      <div><label style={lbl}>PM Fee</label><input type="number" defaultValue={pmFee || ""} onBlur={e => saveProperty(sel_prop.id, { [isUSD ? "pmFeeUSD" : "pmFeeMXN"]: e.target.value })} style={inp} placeholder="0.00" /></div>
                      <div><label style={lbl}>Landscaping Fee</label><input type="number" defaultValue={landscapingFee || ""} onBlur={e => saveProperty(sel_prop.id, { [isUSD ? "landscapingFeeUSD" : "landscapingFeeMXN"]: e.target.value })} style={inp} placeholder="0.00" /></div>
                      <div><label style={lbl}>Pool Fee</label><input type="number" defaultValue={poolFee || ""} onBlur={e => saveProperty(sel_prop.id, { [isUSD ? "poolFeeUSD" : "poolFeeMXN"]: e.target.value })} style={inp} placeholder="0.00" /></div>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 12 }}>Changes save automatically when you click away from a field.</p>
                  </div>
                )}

                {propTab === "housekeeping" && (
                  <div style={{ ...card }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Housekeeping configuration</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      <div><label style={lbl}>Cadence</label><div style={{ padding: "10px 14px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, color: "var(--text2)" }}>{sel_prop.hskCadence}</div></div>
                      <div><label style={lbl}>Included cleans per week</label><input type="number" defaultValue={sel_prop.includedCleans || ""} onBlur={e => saveProperty(sel_prop.id, { includedCleans: e.target.value })} style={inp} placeholder="0" /></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div><label style={lbl}>HSK Fee ({sel_prop.currency})</label><input type="number" defaultValue={hskFee || ""} onBlur={e => saveProperty(sel_prop.id, { [isUSD ? "hskFeeUSD" : "hskFeeMXN"]: e.target.value })} style={inp} placeholder="0.00" /></div>
                      <div><label style={lbl}>Houseman Fee ({sel_prop.currency})</label><input type="number" defaultValue={housemanFee || ""} onBlur={e => saveProperty(sel_prop.id, { [isUSD ? "housemanFeeUSD" : "housemanFeeMXN"]: e.target.value })} style={inp} placeholder="0.00" /></div>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 12 }}>Changes save automatically when you click away from a field.</p>
                  </div>
                )}

                {propTab === "availability" && (() => {
                  const propVisits = visits.filter(v => v.propertyId === sel_prop.id);
                  const upcoming = propVisits.filter(v => v.status !== "Completed" && v.status !== "Cancelled").sort((a, b) => a.checkIn.localeCompare(b.checkIn));
                  function visitTypeColor(type: string) {
                    if (type === "Owner") return { bg: "var(--teal-s)", text: "var(--teal-l)", bar: "var(--teal)" };
                    if (type === "Rental") return { bg: "var(--blue-s)", text: "var(--blue)", bar: "var(--blue)" };
                    return { bg: "rgba(155,142,196,0.12)", text: "#9B8EC4", bar: "#9B8EC4" };
                  }
                  // Weekly grid helpers
                  const wsDate = new Date(calWeekStart + "T12:00:00");
                  const propWeekDays = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(wsDate); d.setDate(wsDate.getDate() + i);
                    return { date: d.toISOString().split("T")[0], label: d.toLocaleDateString("en-US", { weekday: "short" }), day: d.getDate(), month: d.toLocaleDateString("en-US", { month: "short" }) };
                  });
                  const propTodayStr = new Date().toISOString().split("T")[0];
                  function isOccWeek(dateStr: string): Visit | null {
                    return propVisits.find(v => v.status !== "Cancelled" && v.checkIn <= dateStr && v.checkOut > dateStr) || null;
                  }

                  return (
                    <div>
                      {/* Stats + view toggle */}
                      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ padding: "14px 18px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, flex: 1, minWidth: 120 }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600, marginBottom: 6 }}>Upcoming Visits</div><div style={{ fontFamily: "var(--fd)", fontSize: 22, color: "var(--accent)" }}>{upcoming.length}</div></div>
                        <div style={{ padding: "14px 18px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, flex: 1, minWidth: 120 }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600, marginBottom: 6 }}>Total Nights</div><div style={{ fontFamily: "var(--fd)", fontSize: 22, color: "var(--blue)" }}>{upcoming.reduce((sum, v) => sum + Math.max(0, Math.round((new Date(v.checkOut + "T00:00:00").getTime() - new Date(v.checkIn + "T00:00:00").getTime()) / 86400000)), 0)}</div></div>
                        <div style={{ display: "flex", gap: 0 }}>
                          <button onClick={() => setPropAvailView("weekly")} style={{ padding: "8px 14px", borderRadius: "6px 0 0 6px", border: "1px solid var(--border2)", background: propAvailView === "weekly" ? "var(--accent-s)" : "transparent", color: propAvailView === "weekly" ? "var(--accent)" : "var(--text3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Weekly Grid</button>
                          <button onClick={() => setPropAvailView("monthly")} style={{ padding: "8px 14px", border: "1px solid var(--border2)", borderLeft: "none", background: propAvailView === "monthly" ? "var(--accent-s)" : "transparent", color: propAvailView === "monthly" ? "var(--accent)" : "var(--text3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Monthly</button>
                          <button onClick={() => setPropAvailView("list")} style={{ padding: "8px 14px", borderRadius: "0 6px 6px 0", border: "1px solid var(--border2)", borderLeft: "none", background: propAvailView === "list" ? "var(--accent-s)" : "transparent", color: propAvailView === "list" ? "var(--accent)" : "var(--text3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>List View</button>
                        </div>
                      </div>

                      {/* Weekly Grid */}
                      {propAvailView === "weekly" && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                            <button onClick={() => { const d = new Date(calWeekStart); d.setDate(d.getDate() - 7); setCalWeekStart(d.toISOString().split("T")[0]); }} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>Week of {wsDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span>
                            <button onClick={() => { const d = new Date(calWeekStart); d.setDate(d.getDate() + 7); setCalWeekStart(d.toISOString().split("T")[0]); }} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                            {propWeekDays.map(wd => {
                              const v = isOccWeek(wd.date);
                              const c = v ? visitTypeColor(v.visitType) : null;
                              const isT = wd.date === propTodayStr;
                              return (
                                <div key={wd.date} style={{ background: v ? c!.bg : "var(--bg2)", border: `1px solid ${isT ? "var(--accent)" : v ? c!.bar : "var(--border)"}`, borderRadius: 10, padding: 14, minHeight: 90 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, color: isT ? "var(--accent)" : "var(--text3)", marginBottom: 4 }}>{wd.label}</div>
                                  <div style={{ fontSize: 18, fontWeight: 700, color: isT ? "var(--accent)" : "var(--text)", marginBottom: 6 }}>{wd.day} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text3)" }}>{wd.month}</span></div>
                                  {v ? (
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 500, color: c!.text }}>{v.guestName || v.visitType}</div>
                                      <div style={{ fontSize: 10, color: "var(--text3)" }}>{v.checkIn === wd.date ? "Check-in" : v.checkOut === wd.date ? "Check-out" : "In house"}</div>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 11, color: "var(--text3)" }}>Available</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* List View (original) */}
                      {propAvailView === "list" && (
                        <>
                          {upcoming.length === 0 ? (
                            <div style={{ padding: 24, color: "var(--text3)", fontSize: 13, textAlign: "center" }}>No upcoming visits for this property.</div>
                          ) : (
                            upcoming.map(v => {
                              const nights = Math.max(0, Math.round((new Date(v.checkOut + "T00:00:00").getTime() - new Date(v.checkIn + "T00:00:00").getTime()) / 86400000));
                              const c = visitTypeColor(v.visitType);
                              const today = new Date(); today.setHours(0,0,0,0);
                              const ci = new Date(v.checkIn + "T00:00:00");
                              const diff = Math.round((ci.getTime() - today.getTime()) / 86400000);
                              const daysLabel = diff < 0 ? "In progress" : diff === 0 ? "Arriving today" : `In ${diff} day${diff !== 1 ? "s" : ""}`;
                              return (
                                <div key={v.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                                  <div style={{ width: 4, borderRadius: 4, alignSelf: "stretch", background: c.bar, flexShrink: 0 }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                      <div>
                                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{v.visitName}</div>
                                        <div style={{ fontSize: 12, color: "var(--text3)" }}>{v.guestName || v.visitType} · {v.checkIn} → {v.checkOut} · {nights} night{nights !== 1 ? "s" : ""}{(v.adults || v.children) ? ` · ${v.adults || 0}A${v.children ? `/${v.children}C` : ""}` : ""}</div>
                                      </div>
                                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: c.bg, color: c.text, textTransform: "uppercase" as const }}>{v.visitType}</span>
                                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: "var(--accent-s)", color: "var(--accent)" }}>{daysLabel}</span>
                                      </div>
                                    </div>
                                    {v.notes && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>{v.notes}</div>}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </>
                      )}

                      {/* Monthly Calendar Grid */}
                      {propAvailView === "monthly" && (() => {
                        const [pYear, pMonth] = propCalMonth.split("-").map(Number);
                        const pDaysInMonth = new Date(pYear, pMonth, 0).getDate();
                        const pMonthLabel = new Date(pYear, pMonth - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                        const firstDow = new Date(pYear, pMonth - 1, 1).getDay(); // 0=Sun
                        const pTodayStr = new Date().toISOString().split("T")[0];

                        function isOccMonth(day: number): Visit | null {
                          const dateStr = `${pYear}-${String(pMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          return propVisits.find(v => v.status !== "Cancelled" && v.checkIn <= dateStr && v.checkOut > dateStr) || null;
                        }

                        function propVisitColor(type: string) {
                          if (type === "Owner") return "var(--teal)";
                          if (type === "Rental") return "var(--blue)";
                          return "#9B8EC4";
                        }

                        // Build grid cells: leading blanks + day cells
                        const cells: (number | null)[] = (Array.from({ length: firstDow }, () => null) as (number | null)[]).concat(Array.from({ length: pDaysInMonth }, (_, i) => i + 1));
                        // Pad trailing to fill last row
                        while (cells.length % 7 !== 0) cells.push(null);

                        return (
                          <div>
                            {/* Month nav */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                              <button onClick={() => { const d = new Date(pYear, pMonth - 2, 1); setPropCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2039"}</button>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{pMonthLabel}</span>
                              <button onClick={() => { const d = new Date(pYear, pMonth, 1); setPropCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u203A"}</button>
                            </div>
                            {/* Legend */}
                            <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
                              {[["Owner", "var(--teal)"], ["Rental", "var(--blue)"], ["Guest", "#9B8EC4"]].map(([label, color]) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text3)" }}>
                                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color as string }} />
                                  {label}
                                </div>
                              ))}
                            </div>
                            {/* Day-of-week headers */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                                <div key={d} style={{ textAlign: "center" as const, fontSize: 10, fontWeight: 600, color: "var(--text3)", padding: "4px 0", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{d}</div>
                              ))}
                            </div>
                            {/* Calendar grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                              {cells.map((day, idx) => {
                                if (day === null) return <div key={`blank-${idx}`} style={{ minHeight: 64 }} />;
                                const dateStr = `${pYear}-${String(pMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                const v = isOccMonth(day);
                                const isToday = dateStr === pTodayStr;
                                const isCheckIn = v?.checkIn === dateStr;
                                const bg = v ? propVisitColor(v.visitType) : "var(--bg2)";
                                return (
                                  <div key={day} title={v ? `${v.visitName} (${v.visitType})` : "Available"} style={{ minHeight: 64, background: v ? `${bg}18` : "var(--bg2)", border: `1px solid ${isToday ? "var(--accent)" : v ? bg : "var(--border)"}`, borderRadius: 8, padding: "4px 6px", position: "relative" as const }}>
                                    <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--accent)" : "var(--text)", marginBottom: 2 }}>{day}</div>
                                    {v && (
                                      <div style={{ fontSize: 10, lineHeight: "1.3", color: bg, fontWeight: 500 }}>
                                        {isCheckIn && <div>{v.visitName || v.guestName || v.visitType}</div>}
                                        <div style={{ fontSize: 9, color: "var(--text3)" }}>{isCheckIn ? "Check-in" : "Occupied"}</div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {propTab === "history" && (
                  <div style={{ ...card, padding: 0 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 100px 130px", padding: "10px 20px", borderBottom: "2px solid var(--border2)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>Month</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "right" as const }}>Starting</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "right" as const }}>Expenses</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "right" as const }}>Deposits</div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)", textAlign: "right" as const }}>Final Balance</div>
                    </div>
                    {balances.filter(b => b.house === sel_prop.name).length > 0 ? (
                      balances.filter(b => b.house === sel_prop.name).map((b, i, arr) => {
                        const neg = b.finalBalance < 0;
                        return (
                          <div key={`hist-${b.houseId}-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 100px 130px", padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{b.month}</div>
                            <div style={{ fontSize: 13, color: "var(--text2)", textAlign: "right" as const }}>{fmtCur(b.startingBalance, b.currency)}</div>
                            <div style={{ fontSize: 13, color: "var(--red)", textAlign: "right" as const }}>{fmtCur(b.totalExpenses, b.currency)}</div>
                            <div style={{ fontSize: 13, color: "var(--green)", textAlign: "right" as const }}>{fmtCur(b.totalDeposits, b.currency)}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: neg ? "var(--red)" : "var(--green)", textAlign: "right" as const }}>{neg ? "-" : ""}{fmtCur(b.finalBalance, b.currency)}</div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: 20, color: "var(--text3)", fontSize: 13 }}>No financial history available.</div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          // DASHBOARD LIST VIEW
          const totalBalance = balances.reduce((sum, b) => sum + (b.currency === "USD" ? b.finalBalance : 0), 0);
          const negCount = balances.filter(b => b.finalBalance < 0).length;
          const usdProps = activePropList.filter(p => p.currency === "USD").length;
          const mxnProps = activePropList.filter(p => p.currency === "MXN").length;

          return (
            <div style={{ padding: "32px 40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h1 style={h1s}>Properties</h1>
                  <p style={{ fontSize: 14, color: "var(--text2)" }}>{propLoading ? "Loading..." : `${activePropList.length} active, ${otherPropList.length} other`}</p>
                </div>
                <button onClick={() => setShowAddForm(!showAddForm)}
                  style={{ padding: "9px 20px", borderRadius: 100, border: "none", background: "linear-gradient(135deg, var(--teal), #2A6B7C)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  + Add Property
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                <div style={card}><div style={lbl}>Active</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--teal-l)" }}>{activePropList.length}</div></div>
                <div style={card}><div style={lbl}>USD Properties</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--blue)" }}>{usdProps}</div></div>
                <div style={card}><div style={lbl}>MXN Properties</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--teal-l)" }}>{mxnProps}</div></div>
                <div style={card}><div style={lbl}>Negative Balances</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: negCount > 0 ? "var(--red)" : "var(--green)" }}>{negCount}</div></div>
              </div>

              {/* Add property form */}
              {showAddForm && (
                <div style={{ ...card, marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Add a new property</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div><label style={lbl}>Property name</label><input value={newPropName} onChange={e => setNewPropName(e.target.value)} placeholder="e.g. Chileno RE40" style={inp} /></div>
                    <div><label style={lbl}>Owner name</label><input value={newPropOwner} onChange={e => setNewPropOwner(e.target.value)} placeholder="e.g. Mr. & Mrs. Smith" style={inp} /></div>
                    <div><label style={lbl}>Owner email</label><input value={newPropEmail} onChange={e => setNewPropEmail(e.target.value)} placeholder="email@example.com" style={inp} /></div>
                    <div>
                      <label style={lbl}>Preferred currency</label>
                      <select value={newPropCurrency} onChange={e => setNewPropCurrency(e.target.value)} style={{ ...inp, appearance: "none" as const }}>
                        <option value="MXN">MXN</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowAddForm(false)} style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                    <button onClick={addProperty} disabled={addingProp || !newPropName || !newPropOwner}
                      style={{ padding: "8px 18px", borderRadius: 100, border: "none", background: (!newPropName || !newPropOwner) ? "var(--bg2)" : "linear-gradient(135deg, var(--teal), #2A6B7C)", color: (!newPropName || !newPropOwner) ? "var(--text3)" : "#fff", fontSize: 12, fontWeight: 600, cursor: (!newPropName || !newPropOwner) ? "default" : "pointer", fontFamily: "inherit" }}>
                      {addingProp ? "Adding..." : "Add Property"}
                    </button>
                  </div>
                </div>
              )}

              {/* Property cards grid */}
              <h2 style={{ ...h2s, marginBottom: 12 }}>Active properties</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
                {activePropList.map(p => {
                  const bal = balances.find(b => b.house === p.name);
                  const isNeg = bal && bal.finalBalance < 0;
                  return (
                    <div key={p.id} onClick={() => { setSelectedProp(p.id); setPropTab("overview"); }}
                      style={{ ...card, cursor: "pointer", transition: "border-color 0.15s", border: `1px solid ${isNeg ? "rgba(207,110,110,0.15)" : "var(--border)"}`, padding: 16 }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = isNeg ? "rgba(207,110,110,0.15)" : "rgba(255,255,255,0.06)")}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</div>
                        <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 100, background: p.currency === "USD" ? "var(--blue-s)" : "var(--teal-s)", color: p.currency === "USD" ? "var(--blue)" : "var(--teal-l)" }}>{p.currency}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>{p.owner}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 12 }}>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>HSK: <span style={{ color: "var(--text2)" }}>{p.hskCadence}</span></div>
                          {p.includedCleans > 0 && <div style={{ fontSize: 11, color: "var(--text3)" }}>Cleans: <span style={{ color: "var(--text2)" }}>{p.includedCleans}/wk</span></div>}
                        </div>
                        {bal ? (
                          <div style={{ fontSize: 14, fontWeight: 600, color: isNeg ? "var(--red)" : "var(--green)" }}>{isNeg ? "-" : ""}{fmtCur(bal.finalBalance, bal.currency)}</div>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--green)" }}>Active</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {otherPropList.length > 0 && (
                <>
                  <h2 style={{ ...h2s, marginBottom: 12 }}>Other</h2>
                  {otherPropList.map(p => (
                    <div key={p.id} onClick={() => { setSelectedProp(p.id); setPropTab("overview"); }}
                      style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 8, cursor: "pointer", opacity: 0.6 }}>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{p.name}</div><div style={{ fontSize: 12, color: "var(--text3)" }}>{p.owner || "No owner"}</div></div>
                      <span style={{ fontSize: 12, color: "var(--text3)", padding: "3px 12px", borderRadius: 100, background: "var(--bg3)" }}>{p.status}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })()}

        
        {/* ====== USERS ====== */}
        {activePage === "users" && (
          <div style={{ padding: "32px 40px", maxWidth: 900 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={h1s}>Users</h1>
                <p style={{ fontSize: 14, color: "var(--text2)" }}>{usersLoading ? "Loading..." : `${appUsers.length} users registered`}</p>
              </div>
              <button onClick={() => setShowAddUser(!showAddUser)}
                style={{ padding: "9px 20px", borderRadius: 100, border: "none", background: "linear-gradient(135deg, var(--teal), #2A6B7C)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                + Add User
              </button>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              <div style={card}><div style={lbl}>Admins</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--teal-l)" }}>{appUsers.filter(u => u.role === "admin").length}</div></div>
              <div style={card}><div style={lbl}>Owners</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--accent)" }}>{appUsers.filter(u => u.role === "owner").length}</div></div>
              <div style={card}><div style={lbl}>Other</div><div style={{ fontFamily: "'Georgia', serif", fontSize: 26, color: "var(--text3)" }}>{appUsers.filter(u => u.role !== "admin" && u.role !== "owner").length}</div></div>
            </div>

            {/* Add user form */}
            {showAddUser && (
              <div style={{ ...card, marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Create a new user</div>
                {userError && <div style={{ padding: "10px 16px", background: "var(--red-s)", borderRadius: 8, marginBottom: 12, fontSize: 13, color: "var(--red)" }}>{userError}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div><label style={lbl}>First name</label><input value={newUserFirst} onChange={e => setNewUserFirst(e.target.value)} placeholder="Sofia" style={inp} /></div>
                  <div><label style={lbl}>Last name</label><input value={newUserLast} onChange={e => setNewUserLast(e.target.value)} placeholder="Garcia" style={inp} /></div>
                  <div><label style={lbl}>Email</label><input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="email@example.com" style={inp} /></div>
                  <div><label style={lbl}>Password</label><input type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} placeholder="Min 8 characters" style={inp} /></div>
                  <div>
                    <label style={lbl}>Role</label>
                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} style={inp}>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                      <option value="house_manager">House Manager</option>
                    </select>
                  </div>
                  {newUserRole === "owner" && (
                    <div>
                      <label style={lbl}>Linked property</label>
                      <select value={newUserProp} onChange={e => setNewUserProp(e.target.value)} style={inp}>
                        <option value="">Select a property...</option>
                        {propDetails.filter(p => p.status === "Active").map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => { setShowAddUser(false); setUserError(""); }} style={{ padding: "8px 18px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  <button onClick={createUser} disabled={addingUser || !newUserEmail || !newUserPass}
                    style={{ padding: "8px 18px", borderRadius: 100, border: "none", background: (!newUserEmail || !newUserPass) ? "var(--bg2)" : "linear-gradient(135deg, var(--teal), #2A6B7C)", color: (!newUserEmail || !newUserPass) ? "var(--text3)" : "#fff", fontSize: 12, fontWeight: 600, cursor: (!newUserEmail || !newUserPass) ? "default" : "pointer", fontFamily: "inherit" }}>
                    {addingUser ? "Creating..." : "Create User"}
                  </button>
                </div>
              </div>
            )}

            {/* User list */}
            <div style={{ ...card, padding: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 120px 100px", padding: "10px 20px", borderBottom: "2px solid var(--border2)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>User</div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>Email</div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>Role</div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>Last sign in</div>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text3)" }}>Actions</div>
              </div>
              {appUsers.map((u, i) => {
                const roleColor = u.role === "admin" ? "var(--teal-l)" : u.role === "owner" ? "var(--accent)" : "var(--text3)";
                const roleBg = u.role === "admin" ? "var(--teal-s)" : u.role === "owner" ? "var(--accent-s)" : "var(--bg2)";
                return (
                  <React.Fragment key={u.id}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 120px 100px", padding: "12px 20px", borderBottom: editUserId === u.id ? "none" : i < appUsers.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{u.firstName} {u.lastName}</div>
                      {u.linkedProperty && <div style={{ fontSize: 11, color: "var(--text3)" }}>{u.linkedProperty}</div>}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text2)" }}>{u.email}</div>
                    <div>
                      <select defaultValue={u.role} onChange={e => updateUserRole(u.id, e.target.value)}
                        style={{ padding: "3px 8px", borderRadius: 100, border: "none", background: roleBg, color: roleColor, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", appearance: "none" as const, textAlign: "center" as const, minWidth: 80 }}>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                        <option value="house_manager">House Mgr</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>
                      {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => { setEditUserId(u.id); setEditUserForm({ firstName: u.firstName, lastName: u.lastName, role: u.role, linkedProperty: u.linkedProperty }); }} title="Edit user" style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>✎ Edit</button>
                      <button onClick={() => resetUserPassword(u.id)} title="Reset password" style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Reset PW</button>
                      <button onClick={() => deactivateUser(u.id)} title="Deactivate user" style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(207,110,110,0.2)", background: "transparent", color: "var(--red)", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Deactivate</button>
                    </div>
                  </div>
                  {editUserId === u.id && (
                    <div style={{ padding: "12px 20px", background: "var(--accent-s)", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                      <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>First Name</div><input value={editUserForm.firstName} onChange={e => setEditUserForm(f => ({ ...f, firstName: e.target.value }))} style={{ ...inp, padding: "5px 8px", fontSize: 12 }} /></div>
                      <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Last Name</div><input value={editUserForm.lastName} onChange={e => setEditUserForm(f => ({ ...f, lastName: e.target.value }))} style={{ ...inp, padding: "5px 8px", fontSize: 12 }} /></div>
                      <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Role</div><select value={editUserForm.role} onChange={e => setEditUserForm(f => ({ ...f, role: e.target.value }))} style={{ ...sel, padding: "5px 8px", fontSize: 12 }}><option value="admin">Admin</option><option value="owner">Owner</option><option value="house_manager">House Mgr</option></select></div>
                      <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Linked Property</div><select value={editUserForm.linkedProperty} onChange={e => setEditUserForm(f => ({ ...f, linkedProperty: e.target.value }))} style={{ ...sel, padding: "5px 8px", fontSize: 12 }}><option value="">— None —</option>{active.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => saveUserEdit(u.id)} style={{ padding: "5px 12px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                        <button onClick={() => setEditUserId(null)} style={{ padding: "5px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                      </div>
                    </div>
                  )}
                  </React.Fragment>
                );
              })}
              {appUsers.length === 0 && !usersLoading && <div style={{ padding: 20, color: "var(--text3)", fontSize: 13 }}>No users found.</div>}
            </div>
          </div>
        )}

        {/* ====== CONCIERGE ====== */}
        {activePage === "concierge" && (() => {
          const activeVisits = visits.filter(v => v.status === "Active");
          const upcomingVisits = visits.filter(v => v.status === "Upcoming");
          const selectedVisit = visits.find(v => v.id === selectedVisitId);
          const visitsForBuilder = selectedVisitId ? itineraryEvents.filter(e => e.visitId === selectedVisitId) : [];
          const eventsByDate: Record<string, ItineraryEvent[]> = {};
          for (const e of visitsForBuilder) {
            if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
            eventsByDate[e.date].push(e);
          }
          const filteredVendors = vendors.filter(v => {
            const matchCat = vendorFilter === "all" || v.category === vendorFilter;
            const matchSearch = !vendorSearch || v.name.toLowerCase().includes(vendorSearch.toLowerCase()) || v.category.toLowerCase().includes(vendorSearch.toLowerCase());
            return matchCat && matchSearch;
          });

          async function addVisit() {
            if (!newVisitName || !newVisitCheckIn || !newVisitCheckOut) return;
            setAddingVisit(true);
            try {
              await fetch("/api/visits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitName: newVisitName, guestName: newVisitGuest, visitType: newVisitType, checkIn: newVisitCheckIn, checkOut: newVisitCheckOut, propertyId: newVisitProp, notes: newVisitNotes, adults: newVisitAdults, children: newVisitChildren, questionnaire: newVisitQ, status: "Upcoming" }) });
              const d = await fetch("/api/visits").then(r => r.json());
              setVisits(d.visits || []);
              setNewVisitName(""); setNewVisitGuest(""); setNewVisitProp(""); setNewVisitCheckIn(""); setNewVisitCheckOut(""); setNewVisitNotes(""); setNewVisitAdults(2); setNewVisitChildren(0); setNewVisitQ({});
              setShowAddVisit(false); setVisitSuccess(true); setTimeout(() => setVisitSuccess(false), 3000);
            } catch (e) { console.error(e); }
            setAddingVisit(false);
          }

          async function saveEditVisit() {
            if (!editVisitId) return;
            setSavingVisit(true);
            try {
              await fetch("/api/visits", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editVisitId, ...editVisitForm }) });
              const d = await fetch("/api/visits").then(r => r.json());
              setVisits(d.visits || []);
              setEditVisitId(null);
            } catch (e) { console.error(e); }
            setSavingVisit(false);
          }

          async function saveQuestionnaire() {
            if (!questVisitId) return;
            setSavingQuest(true);
            try {
              await fetch("/api/visits", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: questVisitId, questionnaire: questForm }) });
              const d = await fetch("/api/visits").then(r => r.json());
              setVisits(d.visits || []);
              setQuestVisitId(null);
            } catch (e) { console.error(e); }
            setSavingQuest(false);
          }

          async function importVendorCSV(e: React.ChangeEvent<HTMLInputElement>) {
            const file = e.target.files?.[0];
            if (!file) return;
            setCsvImporting(true);
            setCsvResult(null);
            try {
              const text = await file.text();
              const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
              const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
              const rows = lines.slice(1);
              let imported = 0;
              for (const row of rows) {
                const cols = row.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
                const obj: Record<string, string> = {};
                headers.forEach((h, i) => { obj[h] = cols[i] || ""; });
                if (!obj.name) continue;
                await fetch("/api/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: obj.name, category: obj.category || "", contact: obj.contact || "", location: obj.location || "", tags: obj.tags || "", notes: obj.notes || "" }) });
                imported++;
              }
              const d = await fetch("/api/vendors").then(r => r.json());
              setVendors(d.vendors || []);
              setCsvResult(`✓ Imported ${imported} vendor${imported !== 1 ? "s" : ""} successfully`);
            } catch (err) {
              setCsvResult("Error importing CSV. Check format and try again.");
            }
            setCsvImporting(false);
            e.target.value = "";
          }

          async function addEvent() {
            if (!newEventName || !newEventDate || !selectedVisitId) return;
            setAddingEvent(true);
            try {
              await fetch("/api/itinerary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventName: newEventName, visitId: selectedVisitId, vendorId: newEventVendor || undefined, date: newEventDate, time: newEventTime, details: newEventDetails, status: newEventStatus, eventType: newEventType || undefined, extraDetails: Object.keys(newEventExtraDetails).length > 0 ? newEventExtraDetails : undefined, showVendor: newEventShowVendor, chargeable: newEventChargeable, estimatedCost: newEventChargeable && newEventEstCost ? Number(newEventEstCost) : undefined, total: newEventTotal ? Number(newEventTotal) : undefined, currency: newEventCurrency || undefined }) });
              const d = await fetch(`/api/itinerary`).then(r => r.json());
              setItineraryEvents(d.events || []);
              setNewEventName(""); setNewEventDate(""); setNewEventTime(""); setNewEventDetails(""); setNewEventVendor(""); setNewEventStatus("Pending");
              setNewEventType(""); setNewEventExtraDetails({}); setNewEventShowVendor(true); setNewEventChargeable(false); setNewEventEstCost("");
              setNewEventTotal(""); setNewEventCurrency("USD");
              setShowAddEvent(false);
            } catch (e) { console.error(e); }
            setAddingEvent(false);
          }

          async function togglePublished(visitId: string, currentVal: boolean) {
            setPublishingVisit(true);
            try {
              await fetch("/api/visits", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: visitId, published: !currentVal }) });
              const d = await fetch("/api/visits").then(r => r.json());
              setVisits(d.visits || []);
            } catch (e) { console.error(e); }
            setPublishingVisit(false);
          }

          async function addVendor() {
            if (!newVendorName) return;
            setAddingVendor(true);
            try {
              await fetch("/api/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newVendorName, category: newVendorCat, contact: newVendorContact, location: newVendorLocation, tags: newVendorTags, notes: newVendorNotes }) });
              const d = await fetch("/api/vendors").then(r => r.json());
              setVendors(d.vendors || []);
              setNewVendorName(""); setNewVendorCat("Dining"); setNewVendorContact(""); setNewVendorLocation(""); setNewVendorTags(""); setNewVendorNotes("");
              setShowAddVendor(false);
            } catch (e) { console.error(e); }
            setAddingVendor(false);
          }

          function visitDaysUntil(checkIn: string) {
            const today = new Date(); today.setHours(0,0,0,0);
            const ci = new Date(checkIn + "T00:00:00");
            const diff = Math.round((ci.getTime() - today.getTime()) / 86400000);
            if (diff < 0) return null;
            if (diff === 0) return "Arriving today";
            if (diff === 1) return "Tomorrow";
            return `In ${diff} days`;
          }

          function statusColor(s: string) {
            if (s === "Active") return { bg: "var(--green-s)", text: "var(--green)" };
            if (s === "Upcoming") return { bg: "var(--blue-s)", text: "var(--blue)" };
            if (s === "Completed") return { bg: "rgba(255,255,255,0.05)", text: "var(--text3)" };
            if (s === "Cancelled") return { bg: "var(--red-s)", text: "var(--red)" };
            return { bg: "var(--accent-s)", text: "var(--accent)" };
          }

          function eventStatusColor(s: string) {
            if (s === "Confirmed") return { bg: "var(--green-s)", text: "var(--green)" };
            if (s === "Pending") return { bg: "var(--accent-s)", text: "var(--accent)" };
            return { bg: "var(--red-s)", text: "var(--red)" };
          }

          function catColor(cat: string) {
            const m: Record<string, { bg: string; text: string }> = {
              Dining: { bg: "var(--orange-s)", text: "var(--orange)" },
              Activities: { bg: "var(--teal-s)", text: "var(--teal-l)" },
              Transport: { bg: "var(--blue-s)", text: "var(--blue)" },
              Wellness: { bg: "var(--green-s)", text: "var(--green)" },
              "Private Chef": { bg: "rgba(207,196,110,0.1)", text: "#CFC46E" },
              Maintenance: { bg: "var(--accent-s)", text: "var(--accent)" },
              Other: { bg: "rgba(155,142,196,0.12)", text: "#9B8EC4" },
            };
            return m[cat] || { bg: "rgba(255,255,255,0.05)", text: "var(--text3)" };
          }

          return (
            <div style={{ padding: "32px 40px", maxWidth: 1000 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h1 style={h1s}>Concierge</h1>
                  <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 0 }}>Manage owner & guest visits, itineraries, and vendors</p>
                </div>
                {concTab === "visits" && <button onClick={() => setShowAddVisit(!showAddVisit)} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ New Visit</button>}
                {concTab === "directory" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowAddVendor(!showAddVendor)} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Add Vendor</button>
                    <label style={{ padding: "9px 20px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center" }}>
                      {csvImporting ? "Importing..." : "⬆ Import CSV"}
                      <input type="file" accept=".csv" onChange={importVendorCSV} style={{ display: "none" }} disabled={csvImporting} />
                    </label>
                  </div>
                )}
              </div>

              {/* Sub-tabs */}
              <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg2)", borderRadius: 100, marginBottom: 28, width: "fit-content" }}>
                {([["visits","Visits"],["builder","Itinerary Builder"],["directory","Vendor Directory"],["charges","Charges"]] as [string,string][]).map(([id, label]) => (
                  <button key={id} onClick={() => setConcTab(id as any)} style={{ padding: "8px 18px", borderRadius: 100, fontSize: 13, color: concTab === id ? "var(--accent)" : "var(--text3)", background: concTab === id ? "var(--accent-s)" : "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, transition: "all 0.15s" }}>{label}</button>
                ))}
              </div>

              {concLoading && <div style={{ fontSize: 13, color: "var(--text3)", padding: 20 }}>Loading...</div>}

              {/* ---- VISITS TAB ---- */}
              {!concLoading && concTab === "visits" && (
                <>
                  {/* Stats — clickable filters */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
                    {[
                      { label: "Active", value: activeVisits.length, color: "var(--green)", filter: "Active" as const },
                      { label: "Upcoming", value: upcomingVisits.length, color: "var(--blue)", filter: "Upcoming" as const },
                      { label: "Completed", value: visits.filter(v => v.status === "Completed").length, color: "var(--text3)", filter: "Completed" as const },
                      { label: "All Visits", value: visits.length, color: "var(--accent)", filter: "all" as const },
                    ].map(s => (
                      <div key={s.label} onClick={() => setVisitStatusFilter(s.filter)} style={{ padding: 20, background: visitStatusFilter === s.filter ? "var(--accent-s)" : "var(--bg2)", border: `1px solid ${visitStatusFilter === s.filter ? "var(--accent)" : "var(--border)"}`, borderRadius: 14, cursor: "pointer", transition: "all 0.15s" }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: visitStatusFilter === s.filter ? "var(--accent)" : "var(--text3)", marginBottom: 8, fontWeight: 500 }}>{s.label}</div>
                        <div style={{ fontFamily: "var(--fd)", fontSize: 26, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Add Visit Form */}
                  {showAddVisit && (
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>New Visit</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Visit Name *</div><input value={newVisitName} onChange={e => setNewVisitName(e.target.value)} placeholder="e.g. Smith Family Spring Visit" style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Guest Name</div><input value={newVisitGuest} onChange={e => setNewVisitGuest(e.target.value)} placeholder="Mr. & Mrs. Smith" style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Property</div><select value={newVisitProp} onChange={e => setNewVisitProp(e.target.value)} style={sel}><option value="">— Select property —</option>{properties.filter(p => p.status === "Active").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Visit Type</div><select value={newVisitType} onChange={e => setNewVisitType(e.target.value)} style={sel}><option>Owner</option><option>Rental</option><option>Guest</option></select></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Check-in *</div><input type="date" value={newVisitCheckIn} onChange={e => setNewVisitCheckIn(e.target.value)} style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Check-out *</div><input type="date" value={newVisitCheckOut} onChange={e => setNewVisitCheckOut(e.target.value)} style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Adults</div><input type="number" min={0} value={newVisitAdults} onChange={e => setNewVisitAdults(Number(e.target.value))} style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Children</div><input type="number" min={0} value={newVisitChildren} onChange={e => setNewVisitChildren(Number(e.target.value))} style={inp} /></div>
                      </div>
                      <div style={{ marginBottom: 16 }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Notes</div><textarea value={newVisitNotes} onChange={e => setNewVisitNotes(e.target.value)} placeholder="Special requests, preferences..." rows={2} style={{ ...inp, resize: "vertical" as const }} /></div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={addVisit} disabled={addingVisit} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{addingVisit ? "Saving..." : "Save Visit"}</button>
                        <button onClick={() => setShowAddVisit(false)} style={{ padding: "9px 20px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {visitSuccess && <div style={{ padding: "10px 16px", background: "var(--green-s)", color: "var(--green)", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>Visit created successfully!</div>}

                  {/* Visit cards */}
                  {visits.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No visits yet. Create the first one above.</div>
                  ) : (() => {
                    const displayVisits = [...(visitStatusFilter === "all" ? visits : visits.filter(v => v.status === visitStatusFilter))].sort((a, b) => {
                      const order: Record<string, number> = { Active: 0, Upcoming: 1, Completed: 2, Cancelled: 3 };
                      const diff = (order[a.status] ?? 2) - (order[b.status] ?? 2);
                      return diff !== 0 ? diff : a.checkIn.localeCompare(b.checkIn);
                    });
                    return displayVisits.length === 0 ? (
                      <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No {visitStatusFilter.toLowerCase()} visits.</div>
                    ) : displayVisits.map(v => {
                      const daysLabel = visitDaysUntil(v.checkIn);
                      const sc = statusColor(v.status);
                      const nights = Math.round((new Date(v.checkOut + "T00:00:00").getTime() - new Date(v.checkIn + "T00:00:00").getTime()) / 86400000);
                      return (
                        <div key={v.id} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{v.visitName}</div>
                              <div style={{ fontSize: 12, color: "var(--text3)" }}>{v.propertyName || "No property"} · {v.guestName || v.visitType} · {nights} night{nights !== 1 ? "s" : ""}</div>
                              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{v.checkIn} → {v.checkOut}{(v.adults || v.children) ? ` · ${v.adults || 0} adult${(v.adults || 0) !== 1 ? "s" : ""}${v.children ? `, ${v.children} child${v.children !== 1 ? "ren" : ""}` : ""}` : ""}</div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                              {daysLabel && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: "var(--accent-s)", color: "var(--accent)" }}>{daysLabel}</span>}
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: sc.bg, color: sc.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>{v.status}</span>
                            </div>
                          </div>
                          {v.notes && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, padding: "8px 12px", background: "var(--bg3)", borderRadius: 8 }}>{v.notes}</div>}
                          {/* Questionnaire summary */}
                          {Object.keys(v.questionnaire || {}).length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                              {v.questionnaire.dailyHousekeeping && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "var(--teal-s)", color: "var(--teal-l)" }}>Daily housekeeping</span>}
                              {v.questionnaire.celebration && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "var(--accent-s)", color: "var(--accent)" }}>🎉 {v.questionnaire.celebration}</span>}
                              {v.questionnaire.airportTransfer && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "var(--blue-s)", color: "var(--blue)" }}>Airport transfer</span>}
                              {v.questionnaire.poolHeated && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "var(--blue-s)", color: "var(--blue)" }}>Pool heated</span>}
                              {v.questionnaire.kitchenStocked && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "var(--green-s)", color: "var(--green)" }}>Kitchen stocked</span>}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => { setSelectedVisitId(v.id); setConcTab("builder"); }} style={{ padding: "7px 16px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>View Itinerary →</button>
                            <button onClick={() => { setQuestVisitId(questVisitId === v.id ? null : v.id); setQuestForm({ ...v.questionnaire }); setEditVisitId(null); }} style={{ padding: "7px 16px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>📋 Questionnaire</button>
                            <button onClick={() => { setEditVisitId(editVisitId === v.id ? null : v.id); setEditVisitForm({ visitName: v.visitName, guestName: v.guestName, visitType: v.visitType, checkIn: v.checkIn, checkOut: v.checkOut, status: v.status, propertyId: v.propertyId, notes: v.notes, adults: v.adults, children: v.children }); setQuestVisitId(null); }} style={{ padding: "7px 16px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>✎ Edit</button>
                          </div>
                          {/* Edit panel */}
                          {editVisitId === v.id && (
                            <div style={{ marginTop: 16, padding: 20, background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--border)" }}>
                              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Edit Visit</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                                <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Visit Name</div><input value={editVisitForm.visitName || ""} onChange={e => setEditVisitForm(f => ({ ...f, visitName: e.target.value }))} style={inp} /></div>
                                <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Guest Name</div><input value={editVisitForm.guestName || ""} onChange={e => setEditVisitForm(f => ({ ...f, guestName: e.target.value }))} style={inp} /></div>
                                <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Property</div><select value={editVisitForm.propertyId || ""} onChange={e => setEditVisitForm(f => ({ ...f, propertyId: e.target.value }))} style={sel}><option value="">— Select property —</option>{properties.filter(p => p.status === "Active").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                                <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Visit Type</div><select value={editVisitForm.visitType || "Owner"} onChange={e => setEditVisitForm(f => ({ ...f, visitType: e.target.value }))} style={sel}><option>Owner</option><option>Rental</option><option>Guest</option></select></div>
                                <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Check-in</div><input type="date" value={editVisitForm.checkIn || ""} onChange={e => setEditVisitForm(f => ({ ...f, checkIn: e.target.value }))} style={inp} /></div>
                                <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Check-out</div><input type="date" value={editVisitForm.checkOut || ""} onChange={e => setEditVisitForm(f => ({ ...f, checkOut: e.target.value }))} style={inp} /></div>
                                <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Adults</div><input type="number" min={0} value={editVisitForm.adults ?? 0} onChange={e => setEditVisitForm(f => ({ ...f, adults: Number(e.target.value) }))} style={inp} /></div>
                                <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Children</div><input type="number" min={0} value={editVisitForm.children ?? 0} onChange={e => setEditVisitForm(f => ({ ...f, children: Number(e.target.value) }))} style={inp} /></div>
                                <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Status</div><select value={editVisitForm.status || "Upcoming"} onChange={e => setEditVisitForm(f => ({ ...f, status: e.target.value }))} style={sel}><option>Upcoming</option><option>Active</option><option>Completed</option><option>Cancelled</option></select></div>
                              </div>
                              <div style={{ marginBottom: 16 }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Notes</div><textarea value={editVisitForm.notes || ""} onChange={e => setEditVisitForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inp, resize: "vertical" as const }} /></div>
                              <div style={{ display: "flex", gap: 10 }}>
                                <button onClick={saveEditVisit} disabled={savingVisit} style={{ padding: "7px 16px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{savingVisit ? "Saving..." : "Save Changes"}</button>
                                <button onClick={() => setEditVisitId(null)} style={{ padding: "7px 16px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                              </div>
                            </div>
                          )}
                          {/* Questionnaire panel */}
                          {questVisitId === v.id && (
                            <div style={{ marginTop: 16, padding: 20, background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--border)" }}>
                              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Visit Questionnaire</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text2)", cursor: "pointer" }}>
                                  <input type="checkbox" checked={!!questForm.dailyHousekeeping} onChange={e => setQuestForm(f => ({ ...f, dailyHousekeeping: e.target.checked }))} />
                                  Daily housekeeping needed?
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text2)", cursor: "pointer" }}>
                                  <input type="checkbox" checked={!!questForm.airportTransfer} onChange={e => setQuestForm(f => ({ ...f, airportTransfer: e.target.checked }))} />
                                  Airport transfer needed?
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text2)", cursor: "pointer" }}>
                                  <input type="checkbox" checked={!!questForm.poolHeated} onChange={e => setQuestForm(f => ({ ...f, poolHeated: e.target.checked }))} />
                                  Pool to be heated?
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text2)", cursor: "pointer" }}>
                                  <input type="checkbox" checked={!!questForm.kitchenStocked} onChange={e => setQuestForm(f => ({ ...f, kitchenStocked: e.target.checked }))} />
                                  Kitchen to be stocked?
                                </label>
                              </div>
                              <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Special celebration?</div><input value={questForm.celebration || ""} onChange={e => setQuestForm(f => ({ ...f, celebration: e.target.value }))} placeholder="e.g. Birthday, Anniversary" style={inp} /></div>
                              <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Dietary restrictions</div><input value={questForm.dietary || ""} onChange={e => setQuestForm(f => ({ ...f, dietary: e.target.value }))} placeholder="e.g. Vegetarian, gluten-free" style={inp} /></div>
                              <div style={{ marginBottom: 16 }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Other special requests</div><textarea value={questForm.otherRequests || ""} onChange={e => setQuestForm(f => ({ ...f, otherRequests: e.target.value }))} placeholder="Any other preferences or requests..." rows={2} style={{ ...inp, resize: "vertical" as const }} /></div>
                              <div style={{ display: "flex", gap: 10 }}>
                                <button onClick={saveQuestionnaire} disabled={savingQuest} style={{ padding: "7px 16px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{savingQuest ? "Saving..." : "Save"}</button>
                                <button onClick={() => setQuestVisitId(null)} style={{ padding: "7px 16px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </>
              )}

              {/* ---- BUILDER TAB ---- */}
              {!concLoading && concTab === "builder" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, minHeight: 400 }}>
                    {/* Left: Visit list */}
                    <div style={{ ...card, padding: 0, overflowY: "auto" as const, maxHeight: "calc(100vh - 200px)" }}>
                      <div style={{ padding: "12px 16px", borderBottom: "2px solid var(--border2)", fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Active & Upcoming</div>
                      {visits.filter(v => v.status === "Active" || v.status === "Upcoming").sort((a, b) => a.checkIn.localeCompare(b.checkIn)).map(v => {
                        const isSel = selectedVisitId === v.id;
                        const typeColor = v.visitType === "Owner" ? "var(--teal)" : "var(--blue)";
                        return (
                          <div key={v.id} onClick={() => setSelectedVisitId(v.id)} style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: isSel ? "var(--accent-s)" : "transparent", borderLeft: isSel ? "3px solid var(--accent)" : "3px solid transparent" }}
                            onMouseEnter={e => !isSel && (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                            onMouseLeave={e => !isSel && (e.currentTarget.style.background = "transparent")}>
                            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{v.guestName || v.visitName}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>{v.propertyName} · {v.checkIn}</div>
                            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                              {v.status === "Active" && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 100, background: "var(--green-s)", color: "var(--green)", fontWeight: 600 }}>IN HOUSE</span>}
                              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 100, background: `${typeColor}18`, color: typeColor, fontWeight: 600 }}>{v.visitType}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Right: Itinerary */}
                    <div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                    {selectedVisitId && <button onClick={() => setShowAddEvent(true)} style={{ padding: "9px 18px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Add Event</button>}
                    {selectedVisitId && selectedVisit && (
                      <div onClick={() => !publishingVisit && togglePublished(selectedVisitId, selectedVisit.published)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: publishingVisit ? "wait" : "pointer", padding: "7px 14px", borderRadius: 100, border: `1px solid ${selectedVisit.published ? "rgba(110,207,151,0.3)" : "var(--border2)"}`, background: selectedVisit.published ? "var(--green-s)" : "transparent" }}>
                        <div style={{ width: 34, height: 18, borderRadius: 9, background: selectedVisit.published ? "var(--green)" : "var(--text3)", position: "relative" as const, transition: "background 0.2s" }}>
                          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#fff", position: "absolute" as const, top: 2, left: selectedVisit.published ? 18 : 2, transition: "left 0.2s" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: selectedVisit.published ? "var(--green)" : "var(--text3)" }}>{selectedVisit.published ? "Published" : "Unpublished"}</span>
                      </div>
                    )}
                    {selectedVisitId && visitsForBuilder.length > 0 && (() => {
                      function copyItinerary() {
                        const sv = visits.find(v => v.id === selectedVisitId);
                        if (!sv) return;
                        const header = `📅 ITINERARY — ${sv.visitName}\n${sv.propertyName} · ${sv.checkIn} → ${sv.checkOut}\n${"─".repeat(40)}\n`;
                        const body = Object.keys(eventsByDate).sort().map(date => {
                          const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
                          const events = eventsByDate[date].map(ev => `  ${ev.time || "     "} · ${ev.eventName}${ev.vendorName ? ` (${ev.vendorName})` : ""}${ev.details ? `\n          ${ev.details}` : ""}${ev.status !== "Confirmed" ? ` [${ev.status}]` : ""}`).join("\n");
                          return `\n${dayLabel}\n${events}`;
                        }).join("\n");
                        const footer = `\n${"─".repeat(40)}\nPrepared by Cape Property Management`;
                        navigator.clipboard.writeText(header + body + footer).then(() => alert("Itinerary copied to clipboard!"));
                      }
                      return <button onClick={copyItinerary} style={{ padding: "9px 18px", borderRadius: 100, background: "var(--accent-s)", color: "var(--accent)", border: "1px solid rgba(201,169,110,0.3)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>📋 Copy</button>;
                    })()}
                  </div>

                  {/* Add event form */}
                  {showAddEvent && selectedVisitId && (
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Add Itinerary Event</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Event Name *</div><input value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="e.g. Sunset sailing" style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Event Type</div><select value={newEventType} onChange={e => { setNewEventType(e.target.value); setNewEventExtraDetails({}); }} style={sel}><option value="">— Select —</option>{["Restaurant Reservation","Arrival Transportation","Departure Transportation","Private Transportation","Private Chef","Activity","Spa/Wellness","Other"].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Date *</div><input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Time</div><input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Vendor</div><select value={newEventVendor} onChange={e => setNewEventVendor(e.target.value)} style={sel}><option value="">— None —</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Status</div><select value={newEventStatus} onChange={e => setNewEventStatus(e.target.value)} style={sel}><option>Pending</option><option>Confirmed</option><option>Cancelled</option></select></div>
                        {/* Conditional fields based on Event Type */}
                        {(newEventType === "Arrival Transportation" || newEventType === "Departure Transportation" || newEventType === "Private Transportation") && (<>
                          <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Flight Number</div><input value={newEventExtraDetails.flightNumber || ""} onChange={e => setNewEventExtraDetails(d => ({ ...d, flightNumber: e.target.value }))} placeholder="e.g. AA1234" style={inp} /></div>
                          <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Pickup Location</div><input value={newEventExtraDetails.pickupLocation || ""} onChange={e => setNewEventExtraDetails(d => ({ ...d, pickupLocation: e.target.value }))} placeholder="e.g. SJD Airport" style={inp} /></div>
                          <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Dropoff Location</div><input value={newEventExtraDetails.dropoffLocation || ""} onChange={e => setNewEventExtraDetails(d => ({ ...d, dropoffLocation: e.target.value }))} placeholder="e.g. Villa Esperanza" style={inp} /></div>
                        </>)}
                        {newEventType === "Restaurant Reservation" && (<>
                          <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Allergies</div><input value={newEventExtraDetails.allergies || ""} onChange={e => setNewEventExtraDetails(d => ({ ...d, allergies: e.target.value }))} placeholder="e.g. Shellfish, nuts" style={inp} /></div>
                          <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Special Celebration</div><input value={newEventExtraDetails.specialCelebration || ""} onChange={e => setNewEventExtraDetails(d => ({ ...d, specialCelebration: e.target.value }))} placeholder="e.g. Birthday, Anniversary" style={inp} /></div>
                        </>)}
                        {newEventType === "Private Chef" && (
                          <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Menu Preferences</div><input value={newEventExtraDetails.menuPreferences || ""} onChange={e => setNewEventExtraDetails(d => ({ ...d, menuPreferences: e.target.value }))} placeholder="e.g. Mexican cuisine, seafood focus" style={inp} /></div>
                        )}
                        <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Details</div><input value={newEventDetails} onChange={e => setNewEventDetails(e.target.value)} placeholder="e.g. Table for 4, outdoor garden" style={inp} /></div>
                        {/* Total & Currency — hidden for Restaurant Reservation */}
                        {newEventType !== "Restaurant Reservation" && (<>
                          <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Total</div><input type="number" value={newEventTotal} onChange={e => setNewEventTotal(e.target.value)} placeholder="0.00" style={inp} /></div>
                          <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Currency</div><select value={newEventCurrency} onChange={e => setNewEventCurrency(e.target.value)} style={sel}><option value="USD">USD</option><option value="MXN">MXN</option></select></div>
                        </>)}
                        {/* Show Vendor & Chargeable toggles */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text2)" }}>
                            <input type="checkbox" checked={newEventShowVendor} onChange={e => setNewEventShowVendor(e.target.checked)} style={{ accentColor: "var(--teal)" }} /> Show Vendor
                          </label>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text2)" }}>
                            <input type="checkbox" checked={newEventChargeable} onChange={e => setNewEventChargeable(e.target.checked)} style={{ accentColor: "var(--accent)" }} /> Chargeable
                          </label>
                          {newEventChargeable && (
                            <div style={{ flex: 1 }}><input type="number" value={newEventEstCost} onChange={e => setNewEventEstCost(e.target.value)} placeholder="Estimated cost ($)" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={addEvent} disabled={addingEvent} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{addingEvent ? "Saving..." : "Save Event"}</button>
                        <button onClick={() => setShowAddEvent(false)} style={{ padding: "9px 20px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {!selectedVisitId && <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Select a visit above to view or build its itinerary.</div>}

                  {selectedVisitId && selectedVisit && (
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "4px 0", marginBottom: 20 }}>
                      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div><div style={{ fontSize: 14, fontWeight: 500 }}>{selectedVisit.visitName}</div><div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{selectedVisit.propertyName} · {selectedVisit.checkIn} → {selectedVisit.checkOut}</div></div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, ...statusColor(selectedVisit.status) }}>{selectedVisit.status}</span>
                      </div>
                      {Object.keys(eventsByDate).length === 0 && <div style={{ padding: 24, color: "var(--text3)", fontSize: 13, textAlign: "center" }}>No events yet. Click "+ Add Event" to build the itinerary.</div>}
                      {Object.keys(eventsByDate).sort().map(date => {
                        const dayLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
                        return (
                          <div key={date} style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{dayLabel}</div>
                            {eventsByDate[date].map(ev => {
                              const ec = eventStatusColor(ev.status);
                              const isEditing = editEventId === ev.id;
                              return (
                                <div key={ev.id} style={{ marginBottom: 12, background: isEditing ? "var(--accent-s)" : "transparent", border: isEditing ? "1px solid var(--accent)" : "none", borderRadius: isEditing ? 10 : 0, padding: isEditing ? 14 : 0 }}>
                                {isEditing ? (
                                  <div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                                      <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Event Name *</div><input value={editEventForm.eventName || ""} onChange={e => setEditEventForm(f => ({ ...f, eventName: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                      <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Event Type</div><select value={editEventForm.eventType || ""} onChange={e => setEditEventForm(f => ({ ...f, eventType: e.target.value, extraDetails: {} }))} style={{ ...sel, padding: "6px 10px", fontSize: 12 }}><option value="">-- Select --</option>{["Restaurant Reservation","Arrival Transportation","Departure Transportation","Private Transportation","Private Chef","Activity","Spa/Wellness","Other"].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                      <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Date *</div><input type="date" value={editEventForm.date || ""} onChange={e => setEditEventForm(f => ({ ...f, date: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                      <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Time</div><input type="time" value={editEventForm.time || ""} onChange={e => setEditEventForm(f => ({ ...f, time: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                      <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Vendor</div><select value={editEventForm.vendorId || ""} onChange={e => setEditEventForm(f => ({ ...f, vendorId: e.target.value }))} style={{ ...sel, padding: "6px 10px", fontSize: 12 }}><option value="">-- None --</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                                      <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Status</div><select value={editEventForm.status || "Pending"} onChange={e => setEditEventForm(f => ({ ...f, status: e.target.value }))} style={{ ...sel, padding: "6px 10px", fontSize: 12 }}><option>Pending</option><option>Confirmed</option><option>Cancelled</option></select></div>
                                      {/* Conditional fields based on event type */}
                                      {(editEventForm.eventType === "Arrival Transportation" || editEventForm.eventType === "Departure Transportation" || editEventForm.eventType === "Private Transportation") && (<>
                                        <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Flight Number</div><input value={(editEventForm.extraDetails || {}).flightNumber || ""} onChange={e => setEditEventForm(f => ({ ...f, extraDetails: { ...(f.extraDetails || {}), flightNumber: e.target.value } }))} placeholder="e.g. AA1234" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                        <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Pickup Location</div><input value={(editEventForm.extraDetails || {}).pickupLocation || ""} onChange={e => setEditEventForm(f => ({ ...f, extraDetails: { ...(f.extraDetails || {}), pickupLocation: e.target.value } }))} placeholder="e.g. SJD Airport" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                        <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Dropoff Location</div><input value={(editEventForm.extraDetails || {}).dropoffLocation || ""} onChange={e => setEditEventForm(f => ({ ...f, extraDetails: { ...(f.extraDetails || {}), dropoffLocation: e.target.value } }))} placeholder="e.g. Villa Esperanza" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                      </>)}
                                      {editEventForm.eventType === "Restaurant Reservation" && (<>
                                        <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Allergies</div><input value={(editEventForm.extraDetails || {}).allergies || ""} onChange={e => setEditEventForm(f => ({ ...f, extraDetails: { ...(f.extraDetails || {}), allergies: e.target.value } }))} placeholder="e.g. Shellfish, nuts" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                        <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Special Celebration</div><input value={(editEventForm.extraDetails || {}).specialCelebration || ""} onChange={e => setEditEventForm(f => ({ ...f, extraDetails: { ...(f.extraDetails || {}), specialCelebration: e.target.value } }))} placeholder="e.g. Birthday, Anniversary" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                      </>)}
                                      {editEventForm.eventType === "Private Chef" && (
                                        <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Menu Preferences</div><input value={(editEventForm.extraDetails || {}).menuPreferences || ""} onChange={e => setEditEventForm(f => ({ ...f, extraDetails: { ...(f.extraDetails || {}), menuPreferences: e.target.value } }))} placeholder="e.g. Mexican cuisine, seafood focus" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                      )}
                                      <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Details</div><input value={editEventForm.details || ""} onChange={e => setEditEventForm(f => ({ ...f, details: e.target.value }))} placeholder="e.g. Table for 4, outdoor garden" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                      {/* Total & Currency — hidden for Restaurant Reservation */}
                                      {editEventForm.eventType !== "Restaurant Reservation" && (<>
                                        <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Total</div><input type="number" value={editEventForm.total ?? ""} onChange={e => setEditEventForm(f => ({ ...f, total: e.target.value }))} placeholder="0.00" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                        <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Currency</div><select value={editEventForm.currency || "USD"} onChange={e => setEditEventForm(f => ({ ...f, currency: e.target.value }))} style={{ ...sel, padding: "6px 10px", fontSize: 12 }}><option value="USD">USD</option><option value="MXN">MXN</option></select></div>
                                      </>)}
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text2)" }}>
                                          <input type="checkbox" checked={editEventForm.showVendor ?? true} onChange={e => setEditEventForm(f => ({ ...f, showVendor: e.target.checked }))} style={{ accentColor: "var(--teal)" }} /> Show Vendor
                                        </label>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text2)" }}>
                                          <input type="checkbox" checked={editEventForm.chargeable ?? false} onChange={e => setEditEventForm(f => ({ ...f, chargeable: e.target.checked }))} style={{ accentColor: "var(--accent)" }} /> Chargeable
                                        </label>
                                        {editEventForm.chargeable && (
                                          <div style={{ flex: 1 }}><input type="number" value={editEventForm.estimatedCost ?? ""} onChange={e => setEditEventForm(f => ({ ...f, estimatedCost: e.target.value }))} placeholder="Estimated cost ($)" style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                        )}
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <button onClick={async () => { setSavingEvent(true); try { await fetch("/api/itinerary", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ev.id, eventName: editEventForm.eventName, date: editEventForm.date, time: editEventForm.time, eventType: editEventForm.eventType || undefined, vendorId: editEventForm.vendorId || undefined, details: editEventForm.details, status: editEventForm.status, showVendor: editEventForm.showVendor, chargeable: editEventForm.chargeable, estimatedCost: editEventForm.chargeable && editEventForm.estimatedCost ? Number(editEventForm.estimatedCost) : 0, extraDetails: editEventForm.extraDetails && Object.keys(editEventForm.extraDetails).length > 0 ? editEventForm.extraDetails : undefined, total: editEventForm.total ? Number(editEventForm.total) : 0, currency: editEventForm.currency || "" }) }); const d = await fetch("/api/itinerary").then(r => r.json()); setItineraryEvents(d.events || []); setEditEventId(null); } catch (e) { console.error(e); } setSavingEvent(false); }} disabled={savingEvent} style={{ padding: "6px 16px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{savingEvent ? "..." : "Save"}</button>
                                      <button onClick={() => setEditEventId(null)} style={{ padding: "6px 16px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                                  <div style={{ fontSize: 12, color: "var(--text3)", minWidth: 60, paddingTop: 2 }}>{ev.time || "—"}</div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                      <span style={{ fontSize: 14, fontWeight: 500 }}>{ev.eventName}</span>
                                      {ev.eventType && <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 100, background: "var(--accent-s)", color: "var(--accent)", textTransform: "uppercase" as const, letterSpacing: "0.04em", flexShrink: 0 }}>{ev.eventType}</span>}
                                    </div>
                                    {(ev.details || ev.vendorName) && <div style={{ fontSize: 12, color: "var(--text3)" }}>{[ev.vendorName, ev.details].filter(Boolean).join(" · ")}</div>}
                                    {ev.total > 0 && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>${ev.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ev.currency || "USD"}{ev.chargeable ? " (chargeable)" : ""}</div>}
                                    {!ev.total && ev.chargeable && ev.estimatedCost > 0 && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>$ {ev.estimatedCost.toFixed(2)} (chargeable)</div>}
                                  </div>
                                  <button onClick={() => { setEditEventId(ev.id); setEditEventForm({ eventName: ev.eventName, date: ev.date, time: ev.time, eventType: ev.eventType, vendorId: ev.vendorId, details: ev.details, status: ev.status, showVendor: ev.showVendor, chargeable: ev.chargeable, estimatedCost: ev.estimatedCost, extraDetails: ev.extraDetails || {}, total: ev.total, currency: ev.currency }); }} style={{ padding: "4px 12px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>✎ Edit</button>
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.04em", background: ec.bg, color: ec.text, flexShrink: 0 }}>{ev.status}</span>
                                </div>
                                )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                    </div>
                  </div>
                </>
              )}

              {/* ---- VENDOR DIRECTORY TAB ---- */}
              {!concLoading && concTab === "directory" && (
                <>
                  <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20 }}>Cape PM's vendor and activity directory · <span style={{ color: "var(--text3)" }}>CSV format: Name, Category, Contact, Location, Tags, Notes</span></div>
                  {csvResult && <div style={{ padding: "10px 16px", background: csvResult.startsWith("✓") ? "var(--green-s)" : "var(--red-s)", color: csvResult.startsWith("✓") ? "var(--green)" : "var(--red)", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{csvResult}</div>}

                  {/* Add Vendor Form */}
                  {showAddVendor && (
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Add Vendor</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Name *</div><input value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="Vendor name" style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Category</div><select value={newVendorCat} onChange={e => setNewVendorCat(e.target.value)} style={sel}><option>Dining</option><option>Activities</option><option>Transport</option><option>Wellness</option><option>Private Chef</option><option>Maintenance</option><option>Other</option></select></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Contact</div><input value={newVendorContact} onChange={e => setNewVendorContact(e.target.value)} placeholder="+52 624 xxx xxxx" style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Location</div><input value={newVendorLocation} onChange={e => setNewVendorLocation(e.target.value)} placeholder="Cabo San Lucas" style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Tags</div><input value={newVendorTags} onChange={e => setNewVendorTags(e.target.value)} placeholder="e.g. Outdoor, Sunset, Emergency" style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Notes</div><input value={newVendorNotes} onChange={e => setNewVendorNotes(e.target.value)} placeholder="Additional details" style={inp} /></div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={addVendor} disabled={addingVendor} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{addingVendor ? "Saving..." : "Save Vendor"}</button>
                        <button onClick={() => setShowAddVendor(false)} style={{ padding: "9px 20px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Filters */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} style={{ ...sel, minWidth: 180 }}>
                      <option value="all">All categories</option>
                      {["Dining","Activities","Transport","Wellness","Private Chef","Maintenance","Other"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} placeholder="Search vendors..." style={{ ...inp, maxWidth: 220 }} />
                  </div>

                  {/* Vendor list */}
                  {filteredVendors.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No vendors found. Add your first vendor above.</div>
                  ) : (
                    filteredVendors.map(v => {
                      const cc = catColor(v.category);
                      const tags = v.tags ? v.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
                      const isEd = editVendorId === v.id;
                      return (
                        <div key={v.id} style={{ background: isEd ? "var(--accent-s)" : "var(--bg2)", border: `1px solid ${isEd ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, marginBottom: 8, padding: "14px 16px" }}>
                          {isEd ? (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                              <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Name</div><input value={editVendorForm.name || ""} onChange={e => setEditVendorForm(f => ({ ...f, name: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                              <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Category</div><select value={editVendorForm.category || ""} onChange={e => setEditVendorForm(f => ({ ...f, category: e.target.value }))} style={{ ...sel, padding: "6px 10px", fontSize: 12 }}>{["Dining", "Activities", "Transport", "Wellness", "Private Chef", "Maintenance", "Other"].map(c => <option key={c}>{c}</option>)}</select></div>
                              <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Contact</div><input value={editVendorForm.contact || ""} onChange={e => setEditVendorForm(f => ({ ...f, contact: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                              <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Location</div><input value={editVendorForm.location || ""} onChange={e => setEditVendorForm(f => ({ ...f, location: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                              <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Tags</div><input value={editVendorForm.tags || ""} onChange={e => setEditVendorForm(f => ({ ...f, tags: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                              <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Notes</div><input value={editVendorForm.notes || ""} onChange={e => setEditVendorForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                              <div style={{ gridColumn: "1/-1", display: "flex", gap: 8 }}>
                                <button onClick={async () => { setSavingVendor(true); await fetch("/api/vendors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: v.id, ...editVendorForm }) }); const d = await fetch("/api/vendors").then(r => r.json()); setVendors(d.vendors || []); setEditVendorId(null); setSavingVendor(false); }} disabled={savingVendor} style={{ padding: "6px 16px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{savingVendor ? "..." : "Save"}</button>
                                <button onClick={() => setEditVendorId(null)} style={{ padding: "6px 16px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 10, background: cc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                                {v.category === "Dining" ? "🍽" : v.category === "Activities" ? "⛵" : v.category === "Transport" ? "🚗" : v.category === "Wellness" ? "🧘" : v.category === "Private Chef" ? "👨‍🍳" : v.category === "Maintenance" ? "🔧" : "⭐"}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                  <span style={{ fontSize: 14, fontWeight: 500 }}>{v.name}</span>
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.04em", background: cc.bg, color: cc.text }}>{v.category}</span>
                                </div>
                                {v.contact && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 2 }}>{v.contact}{v.location ? ` · ${v.location}` : ""}</div>}
                                {v.notes && <div style={{ fontSize: 12, color: "var(--text3)" }}>{v.notes}</div>}
                                {tags.length > 0 && <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>{tags.map(t => <span key={t} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "var(--teal-s)", color: "var(--teal-l)", fontWeight: 500 }}>{t}</span>)}</div>}
                              </div>
                              <button onClick={() => { setEditVendorId(v.id); setEditVendorForm({ name: v.name, category: v.category, contact: v.contact, location: v.location, tags: v.tags, notes: v.notes }); }} style={{ padding: "5px 14px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>✎ Edit</button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* ---- CHARGES TAB ---- */}
              {!concLoading && concTab === "charges" && (() => {
                const chargeableEvents = itineraryEvents.filter(e => e.chargeable);
                const pendingCharges = chargeableEvents.filter(e => !e.expenseCreated);
                const processedCharges = chargeableEvents.filter(e => e.expenseCreated);
                const pendingTotal = pendingCharges.reduce((sum, e) => sum + (e.total || e.estimatedCost || 0), 0);

                async function approveCharge(ev: ItineraryEvent, overrideAmount?: number, overrideDesc?: string, overrideCurrency?: string) {
                  const visit = visits.find(v => v.id === ev.visitId);
                  if (!visit) return;
                  setApprovingCharge(ev.id);
                  try {
                    await fetch("/api/expenses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        propertyId: visit.propertyId,
                        date: ev.date,
                        category: "Concierge",
                        amount: overrideAmount ?? ev.total ?? ev.estimatedCost,
                        currency: overrideCurrency ?? (ev.currency || "USD"),
                        description: overrideDesc ?? ev.eventName,
                      }),
                    });
                    await fetch("/api/itinerary", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: ev.id, expenseCreated: true }),
                    });
                    const d = await fetch("/api/itinerary").then(r => r.json());
                    setItineraryEvents(d.events || []);
                    setEditChargeId(null);
                  } catch (e) { console.error(e); }
                  setApprovingCharge(null);
                }

                return (
                  <>
                    {/* Summary */}
                    <div style={{ padding: "16px 20px", background: "var(--bg2)", borderRadius: 12, marginBottom: 24, display: "flex", gap: 24, alignItems: "center" }}>
                      <div style={{ fontSize: 13, color: "var(--text3)" }}>Pending: <span style={{ color: "var(--orange)", fontWeight: 600 }}>{pendingCharges.length}</span> charge{pendingCharges.length !== 1 ? "s" : ""} totaling <span style={{ color: "var(--orange)", fontWeight: 600 }}>${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      <div style={{ fontSize: 13, color: "var(--text3)" }}>Processed: <span style={{ color: "var(--green)", fontWeight: 600 }}>{processedCharges.length}</span></div>
                    </div>

                    {/* Pending charges */}
                    {pendingCharges.length > 0 && (
                      <div style={{ marginBottom: 32 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text1)", marginBottom: 14 }}>Pending Charges</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {pendingCharges.map(ev => {
                            const visit = visits.find(v => v.id === ev.visitId);
                            const isEditing = editChargeId === ev.id;
                            return (
                              <div key={ev.id} style={{ padding: 18, background: "var(--bg2)", borderRadius: 12, border: "1px solid var(--border2)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text1)", marginBottom: 6 }}>{ev.eventName}</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: "var(--text3)" }}>
                                      <span>{ev.date}</span>
                                      {visit && <span>{visit.visitName} · {visit.propertyName}</span>}
                                      {ev.vendorName && <span>Vendor: {ev.vendorName}</span>}
                                    </div>
                                    <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>${(ev.total || ev.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ev.currency || "USD"}</div>
                                  </div>
                                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                    {!isEditing && (
                                      <>
                                        <button onClick={() => { setEditChargeId(ev.id); setEditChargeForm({ amount: String(ev.total || ev.estimatedCost || 0), description: ev.eventName, currency: ev.currency || "USD" }); }} style={{ padding: "6px 16px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                                        <button disabled={approvingCharge === ev.id} onClick={() => approveCharge(ev)} style={{ padding: "6px 16px", borderRadius: 100, border: "none", background: "var(--teal)", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, opacity: approvingCharge === ev.id ? 0.6 : 1 }}>{approvingCharge === ev.id ? "Processing..." : "Approve"}</button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {isEditing && (
                                  <div style={{ marginTop: 14, padding: 14, background: "var(--bg1)", borderRadius: 10, border: "1px solid var(--border2)" }}>
                                    <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                                      <div style={{ flex: 1, minWidth: 120 }}>
                                        <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>Amount</label>
                                        <input type="number" value={editChargeForm.amount} onChange={e => setEditChargeForm(f => ({ ...f, amount: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
                                      </div>
                                      <div style={{ flex: 1, minWidth: 90 }}>
                                        <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>Currency</label>
                                        <select value={editChargeForm.currency} onChange={e => setEditChargeForm(f => ({ ...f, currency: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}><option value="USD">USD</option><option value="MXN">MXN</option></select>
                                      </div>
                                      <div style={{ flex: 3, minWidth: 200 }}>
                                        <label style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4, display: "block" }}>Description</label>
                                        <input type="text" value={editChargeForm.description} onChange={e => setEditChargeForm(f => ({ ...f, description: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border2)", background: "var(--bg2)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                      <button onClick={() => setEditChargeId(null)} style={{ padding: "6px 16px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                                      <button disabled={approvingCharge === ev.id} onClick={() => approveCharge(ev, parseFloat(editChargeForm.amount) || ev.total || ev.estimatedCost, editChargeForm.description || ev.eventName, editChargeForm.currency || ev.currency || "USD")} style={{ padding: "6px 16px", borderRadius: 100, border: "none", background: "var(--teal)", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, opacity: approvingCharge === ev.id ? 0.6 : 1 }}>{approvingCharge === ev.id ? "Processing..." : "Approve with Changes"}</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {pendingCharges.length === 0 && <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>No pending charges to process.</div>}

                    {/* Processed charges */}
                    {processedCharges.length > 0 && (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text1)", marginBottom: 14 }}>Processed Charges</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {processedCharges.map(ev => {
                            const visit = visits.find(v => v.id === ev.visitId);
                            return (
                              <div key={ev.id} style={{ padding: "10px 16px", background: "var(--bg2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                                <span style={{ color: "var(--green)", fontSize: 15 }}>&#10003;</span>
                                <span style={{ color: "var(--text1)", fontWeight: 500, flex: 1 }}>{ev.eventName}</span>
                                <span style={{ color: "var(--text3)", fontSize: 12 }}>{ev.date}</span>
                                {visit && <span style={{ color: "var(--text3)", fontSize: 12 }}>{visit.propertyName}</span>}
                                <span style={{ color: "var(--text2)", fontWeight: 600 }}>${(ev.total || ev.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ev.currency || "USD"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          );
        })()}

        {/* ====== MAINTENANCE ====== */}
        {activePage === "maintenance" && (() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const todayStr = today.toISOString().split("T")[0];
          const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
          const weekEndStr = weekEnd.toISOString().split("T")[0];
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

          const activeTasks = maintTasks.filter(t => t.status !== "Cancelled" && t.status !== "Completed");
          const todayTasks = activeTasks.filter(t => t.scheduledDate === todayStr);
          const weekTasks = activeTasks.filter(t => t.scheduledDate >= todayStr && t.scheduledDate <= weekEndStr);
          const monthTasks = activeTasks.filter(t => t.scheduledDate >= todayStr && t.scheduledDate <= monthEnd);
          const openReactive = maintTasks.filter(t => t.type === "Reactive" && (t.status === "Open" || t.status === "In Progress"));
          const recentlyResolved = maintTasks.filter(t => t.status === "Completed").slice(0, 10);

          function priorityColor(p: string) {
            if (p === "Urgent") return { bg: "var(--red-s)", text: "var(--red)" };
            if (p === "High") return { bg: "var(--orange-s)", text: "var(--orange)" };
            if (p === "Medium") return { bg: "rgba(207,196,110,0.1)", text: "#CFC46E" };
            return { bg: "rgba(255,255,255,0.05)", text: "var(--text3)" };
          }

          function statusColor(s: string) {
            if (s === "Open") return { bg: "var(--orange-s)", text: "var(--orange)" };
            if (s === "In Progress") return { bg: "var(--blue-s)", text: "var(--blue)" };
            if (s === "Completed") return { bg: "var(--green-s)", text: "var(--green)" };
            return { bg: "rgba(255,255,255,0.05)", text: "var(--text3)" };
          }

          function catColor(cat: string) {
            const m: Record<string, { bg: string; text: string }> = {
              HVAC: { bg: "var(--blue-s)", text: "var(--blue)" },
              Pool: { bg: "rgba(110,196,207,0.1)", text: "var(--cyan)" },
              Landscaping: { bg: "var(--green-s)", text: "var(--green)" },
              "Pest Control": { bg: "var(--orange-s)", text: "var(--orange)" },
              Plumbing: { bg: "var(--teal-s)", text: "var(--teal-l)" },
              Electrical: { bg: "rgba(207,196,110,0.1)", text: "#CFC46E" },
              Appliances: { bg: "rgba(155,142,196,0.12)", text: "#9B8EC4" },
              General: { bg: "rgba(255,255,255,0.05)", text: "var(--text3)" },
            };
            return m[cat] || { bg: "rgba(255,255,255,0.05)", text: "var(--text3)" };
          }

          function freqColor(f: string) {
            const m: Record<string, { bg: string; text: string }> = {
              Weekly: { bg: "var(--teal-s)", text: "var(--teal-l)" },
              Monthly: { bg: "var(--blue-s)", text: "var(--blue)" },
              Quarterly: { bg: "var(--green-s)", text: "var(--green)" },
              "Semi-Annual": { bg: "rgba(207,196,110,0.1)", text: "#CFC46E" },
              Annual: { bg: "var(--orange-s)", text: "var(--orange)" },
            };
            return m[f] || { bg: "rgba(255,255,255,0.05)", text: "var(--text3)" };
          }

          async function addTask() {
            if (!newTaskTitle) return;
            setAddingTask(true);
            try {
              await fetch("/api/maintenance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTaskTitle, type: newTaskType, priority: newTaskPriority, propertyId: newTaskProp, vendorId: newTaskVendor, scheduledDate: newTaskDate, notes: newTaskNotes, cost: newTaskCost ? Number(newTaskCost) : 0 }) });
              const d = await fetch("/api/maintenance").then(r => r.json());
              setMaintTasks(d.tasks || []);
              setNewTaskTitle(""); setNewTaskProp(""); setNewTaskVendor(""); setNewTaskNotes(""); setNewTaskCost(""); setNewTaskType("Reactive"); setNewTaskPriority("Medium");
              setShowAddTask(false);
            } catch (e) { console.error(e); }
            setAddingTask(false);
          }

          async function addConfig() {
            if (!newCfgName) return;
            setAddingConfig(true);
            try {
              await fetch("/api/maintenance-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskName: newCfgName, category: newCfgCat, propertyIds: newCfgProps, frequency: newCfgFreq, vendorId: newCfgVendor, nextDue: newCfgNextDue, notes: newCfgNotes }) });
              const d = await fetch("/api/maintenance-config").then(r => r.json());
              setMaintConfigs(d.configs || []);
              setNewCfgName(""); setNewCfgProps([]); setNewCfgVendor(""); setNewCfgNextDue(""); setNewCfgNotes(""); setNewCfgCat("General"); setNewCfgFreq("Monthly");
              setShowAddConfig(false);
            } catch (e) { console.error(e); }
            setAddingConfig(false);
          }

          async function updateTaskStatus(id: string, status: string, extra?: Record<string, any>) {
            setTaskUpdating(id);
            try {
              await fetch("/api/maintenance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, ...(extra || {}), ...(status === "Completed" ? { completedDate: new Date().toISOString().split("T")[0] } : {}) }) });
              const d = await fetch("/api/maintenance").then(r => r.json());
              setMaintTasks(d.tasks || []);
            } catch (e) { console.error(e); }
            setTaskUpdating(null);
          }

          async function assignVendor(id: string, vendorId: string) {
            setTaskUpdating(id);
            try {
              await fetch("/api/maintenance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, vendorId, status: "In Progress" }) });
              const d = await fetch("/api/maintenance").then(r => r.json());
              setMaintTasks(d.tasks || []);
            } catch (e) { console.error(e); }
            setTaskUpdating(null);
          }

          function generateExpense(task: MaintenanceTask) {
            // Show review form instead of creating directly
            setExpenseReview({
              task,
              amount: String(task.cost || 0),
              date: task.completedDate || todayStr,
              property: task.propertyId,
              category: "Maintenance",
              description: task.title + (task.vendorName ? ` (${task.vendorName})` : ""),
              supplier: task.vendorName || "",
            });
          }

          async function confirmExpense() {
            if (!expenseReview) return;
            try {
              await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: expenseReview.property, date: expenseReview.date, category: expenseReview.category, amount: expenseReview.amount, currency: "MXN", description: expenseReview.description, supplier: expenseReview.supplier }) });
              await fetch("/api/maintenance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: expenseReview.task.id, expenseCreated: true }) });
              const d = await fetch("/api/maintenance").then(r => r.json());
              setMaintTasks(d.tasks || []);
              setExpenseReview(null);
            } catch (e) { console.error(e); }
          }

          const typeFiltered = maintTypeFilter === "all" ? maintTasks : maintTasks.filter(t => t.type === maintTypeFilter);
          const scheduleList = maintFilter === "all" ? typeFiltered : maintFilter === "today" ? typeFiltered.filter(t => t.scheduledDate === todayStr && t.status !== "Cancelled" && t.status !== "Completed") : maintFilter === "week" ? typeFiltered.filter(t => t.scheduledDate >= todayStr && t.scheduledDate <= weekEndStr && t.status !== "Cancelled" && t.status !== "Completed") : typeFiltered.filter(t => t.scheduledDate >= todayStr && t.scheduledDate <= monthEnd && t.status !== "Cancelled" && t.status !== "Completed");

          return (
            <div style={{ padding: "32px 40px", maxWidth: 1000 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h1 style={h1s}>Maintenance</h1>
                  <p style={{ fontSize: 14, color: "var(--text2)" }}>Track preventive and reactive maintenance across all properties</p>
                </div>
                {maintTab === "schedule" && <button onClick={() => setShowAddTask(!showAddTask)} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ New Task</button>}
                {maintTab === "config" && <button onClick={() => setShowAddConfig(!showAddConfig)} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ New Schedule</button>}
                {maintTab === "vendors" && <button onClick={() => setShowAddMaintVendor(!showAddMaintVendor)} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ Add Vendor</button>}
              </div>

              {/* Sub-tabs */}
              <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--bg2)", borderRadius: 100, marginBottom: 28, width: "fit-content" }}>
                {([["schedule","Schedule"],["inbox","Reactive Inbox"],["config","Preventive Config"],["vendors","Vendors"]] as [string,string][]).map(([id, label]) => (
                  <button key={id} onClick={() => setMaintTab(id as any)} style={{ padding: "8px 18px", borderRadius: 100, fontSize: 13, color: maintTab === id ? "var(--accent)" : "var(--text3)", background: maintTab === id ? "var(--accent-s)" : "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>{label}</button>
                ))}
              </div>

              {maintLoading && <div style={{ fontSize: 13, color: "var(--text3)", padding: 20 }}>Loading...</div>}

              {/* Expense Review Form — shown regardless of active tab */}
              {!maintLoading && expenseReview && (
                <div style={{ background: "var(--accent-s)", border: "1px solid var(--accent)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Review Expense Before Creating</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>From task: {expenseReview.task.title}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Amount *</div><input type="number" value={expenseReview.amount} onChange={e => setExpenseReview(r => r ? { ...r, amount: e.target.value } : r)} style={inp} /></div>
                    <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Date</div><input type="date" value={expenseReview.date} onChange={e => setExpenseReview(r => r ? { ...r, date: e.target.value } : r)} style={inp} /></div>
                    <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Property</div><select value={expenseReview.property} onChange={e => setExpenseReview(r => r ? { ...r, property: e.target.value } : r)} style={sel}>{properties.filter(p => p.status === "Active").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Category</div><select value={expenseReview.category} onChange={e => setExpenseReview(r => r ? { ...r, category: e.target.value } : r)} style={sel}>{["Maintenance", "Utilities", "Villa Staff", "Cleaning Supplies", "Groceries", "Miscellaneous", "Others"].map(c => <option key={c}>{c}</option>)}</select></div>
                    <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Supplier</div><input value={expenseReview.supplier} onChange={e => setExpenseReview(r => r ? { ...r, supplier: e.target.value } : r)} style={inp} /></div>
                    <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Description</div><input value={expenseReview.description} onChange={e => setExpenseReview(r => r ? { ...r, description: e.target.value } : r)} style={inp} /></div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={confirmExpense} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Create Expense</button>
                    <button onClick={() => setExpenseReview(null)} style={{ padding: "9px 20px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* ---- SCHEDULE TAB ---- */}
              {!maintLoading && maintTab === "schedule" && (
                <>
                  {/* Stat cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
                    {[
                      { label: "All Active", value: activeTasks.length, color: "var(--text)", key: "all" as const },
                      { label: "Scheduled Today", value: todayTasks.length, color: todayTasks.length > 0 ? "var(--red)" : "var(--green)", key: "today" as const },
                      { label: "This Week", value: weekTasks.length, color: "var(--accent)", key: "week" as const },
                      { label: "This Month", value: monthTasks.length, color: "var(--blue)", key: "month" as const },
                    ].map(s => (
                      <div key={s.label} onClick={() => setMaintFilter(s.key)} style={{ padding: 20, background: maintFilter === s.key ? "var(--accent-s)" : "var(--bg2)", border: `1px solid ${maintFilter === s.key ? "var(--accent)" : "var(--border)"}`, borderRadius: 14, cursor: "pointer", transition: "all 0.15s" }}>
                        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: maintFilter === s.key ? "var(--accent)" : "var(--text3)", marginBottom: 8, fontWeight: 500 }}>{s.label}</div>
                        <div style={{ fontFamily: "var(--fd)", fontSize: 26, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Add Task Form */}
                  {showAddTask && (
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>New Maintenance Task</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Title *</div><input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="e.g. AC filter replacement" style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Type</div><select value={newTaskType} onChange={e => setNewTaskType(e.target.value)} style={sel}><option>Reactive</option><option>Preventive</option></select></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Priority</div><select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} style={sel}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Property</div><select value={newTaskProp} onChange={e => setNewTaskProp(e.target.value)} style={sel}><option value="">— All properties —</option>{properties.filter(p => p.status === "Active").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Vendor</div><select value={newTaskVendor} onChange={e => setNewTaskVendor(e.target.value)} style={sel}><option value="">— None —</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Scheduled Date</div><input type="date" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Estimated Cost ($)</div><input type="number" value={newTaskCost} onChange={e => setNewTaskCost(e.target.value)} placeholder="0.00" style={inp} /></div>
                        <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Notes</div><textarea value={newTaskNotes} onChange={e => setNewTaskNotes(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" as const }} /></div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={addTask} disabled={addingTask} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{addingTask ? "Saving..." : "Save Task"}</button>
                        <button onClick={() => setShowAddTask(false)} style={{ padding: "9px 20px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Filter */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {(["all","Reactive","Preventive"] as const).map(f => (
                      <button key={f} onClick={() => setMaintTypeFilter(f)} style={{ padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 500, border: "1px solid var(--border2)", background: maintTypeFilter === f ? "var(--accent-s)" : "transparent", color: maintTypeFilter === f ? "var(--accent)" : "var(--text3)", cursor: "pointer", fontFamily: "inherit" }}>{f === "all" ? "All" : f}</button>
                    ))}
                  </div>

                  {/* Task list */}
                  {scheduleList.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No tasks yet.</div>
                  ) : scheduleList.map(t => {
                    const pc = priorityColor(t.priority);
                    const sc = statusColor(t.status);
                    const isReactive = t.type === "Reactive";
                    const isOverdue = t.scheduledDate && t.scheduledDate < todayStr && t.status !== "Completed" && t.status !== "Cancelled";
                    return (
                      <div key={t.id} style={{ background: "var(--bg2)", border: `1px solid ${isOverdue ? "rgba(207,110,110,0.3)" : "var(--border)"}`, borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }} onClick={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}>
                          <div style={{ width: 4, height: 32, borderRadius: 4, background: isReactive ? "var(--red)" : "var(--teal)", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{t.title}</div>
                            <div style={{ fontSize: 12, color: "var(--text3)" }}>{t.propertyName || "All properties"}{t.vendorName ? ` · ${t.vendorName}` : ""}{t.scheduledDate ? ` · ${t.scheduledDate}` : ""}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                            {isOverdue && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "var(--red-s)", color: "var(--red)" }}>OVERDUE</span>}
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: isReactive ? "var(--red-s)" : "var(--teal-s)", color: isReactive ? "var(--red)" : "var(--teal-l)", textTransform: "uppercase" as const }}>{t.type}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: pc.bg, color: pc.text, textTransform: "uppercase" as const }}>{t.priority}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: sc.bg, color: sc.text, textTransform: "uppercase" as const }}>{t.status}</span>
                          </div>
                        </div>
                        {expandedTaskId === t.id && (
                          <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--border)", background: "var(--bg3)" }}>
                            {editMaintId === t.id ? (
                              <div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                                  <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Title</div><input value={editMaintForm.title || ""} onChange={e => setEditMaintForm(f => ({ ...f, title: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                  <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Status</div><select value={editMaintForm.status || ""} onChange={e => setEditMaintForm(f => ({ ...f, status: e.target.value }))} style={{ ...sel, padding: "6px 10px", fontSize: 12 }}>{["Open","In Progress","Completed","Cancelled"].map(s => <option key={s}>{s}</option>)}</select></div>
                                  <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Priority</div><select value={editMaintForm.priority || ""} onChange={e => setEditMaintForm(f => ({ ...f, priority: e.target.value }))} style={{ ...sel, padding: "6px 10px", fontSize: 12 }}>{["Low","Medium","High","Urgent"].map(p => <option key={p}>{p}</option>)}</select></div>
                                  <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Scheduled Date</div><input type="date" value={editMaintForm.scheduledDate || ""} onChange={e => setEditMaintForm(f => ({ ...f, scheduledDate: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                  <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Vendor</div><select value={editMaintForm.vendorId || ""} onChange={e => setEditMaintForm(f => ({ ...f, vendorId: e.target.value }))} style={{ ...sel, padding: "6px 10px", fontSize: 12 }}><option value="">— None —</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                                  <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Cost ($)</div><input type="number" value={editMaintForm.cost ?? ""} onChange={e => setEditMaintForm(f => ({ ...f, cost: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                                  <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Notes</div><textarea value={editMaintForm.notes || ""} onChange={e => setEditMaintForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inp, padding: "6px 10px", fontSize: 12, resize: "vertical" as const }} /></div>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button onClick={async () => { setTaskUpdating(t.id); try { await fetch("/api/maintenance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, title: editMaintForm.title, status: editMaintForm.status, priority: editMaintForm.priority, scheduledDate: editMaintForm.scheduledDate, vendorId: editMaintForm.vendorId, cost: editMaintForm.cost ? Number(editMaintForm.cost) : 0, notes: editMaintForm.notes, ...(editMaintForm.status === "Completed" && t.status !== "Completed" ? { completedDate: new Date().toISOString().split("T")[0] } : {}) }) }); const d = await fetch("/api/maintenance").then(r => r.json()); setMaintTasks(d.tasks || []); setEditMaintId(null); } catch (e) { console.error(e); } setTaskUpdating(null); }} disabled={taskUpdating === t.id} style={{ padding: "6px 16px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{taskUpdating === t.id ? "Saving..." : "Save"}</button>
                                  <button onClick={() => setEditMaintId(null)} style={{ padding: "6px 16px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Approval status */}
                                {t.approvalStatus && t.approvalStatus !== "Pending Approval" ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: t.approvalStatus === "Approved" ? "var(--green-s)" : t.approvalStatus === "Rejected" ? "var(--red-s)" : "rgba(207,196,110,0.12)", color: t.approvalStatus === "Approved" ? "var(--green)" : t.approvalStatus === "Rejected" ? "var(--red)" : "#CFC46E" }}>{t.approvalStatus}</span>
                                    {t.approvalStatus === "Approved" && t.approvedBy && <span style={{ fontSize: 11, color: "var(--text3)" }}>by {t.approvedBy}{t.approvalDate ? ` on ${t.approvalDate}` : ""}</span>}
                                  </div>
                                ) : (
                                  <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: "rgba(207,196,110,0.12)", color: "#CFC46E" }}>Pending Approval</span>
                                    <button onClick={async () => { setTaskUpdating(t.id); try { await fetch("/api/maintenance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, approvalStatus: "Approved", approvedBy: userName, approvalDate: new Date().toISOString().split("T")[0] }) }); const d = await fetch("/api/maintenance").then(r => r.json()); setMaintTasks(d.tasks || []); } catch (e) { console.error(e); } setTaskUpdating(null); }} disabled={taskUpdating === t.id} style={{ padding: "4px 12px", borderRadius: 100, background: "var(--green-s)", color: "var(--green)", border: "1px solid rgba(110,207,151,0.2)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{taskUpdating === t.id ? "..." : "✓ Approve"}</button>
                                  </div>
                                )}
                                {t.notes && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>{t.notes}</div>}
                                {t.cost > 0 && <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>Estimated cost: <strong>${t.cost.toFixed(2)}</strong></div>}
                                {/* Attachments */}
                                {t.attachments && t.attachments.length > 0 && (
                                  <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 }}>Attachments</div>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                      {t.attachments.map((att, i) => (
                                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--teal-l)", textDecoration: "none", padding: "4px 10px", borderRadius: 6, background: "var(--teal-s)", border: "1px solid rgba(110,207,190,0.2)" }}>{att.filename || `Attachment ${i + 1}`}</a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button onClick={(e) => { e.stopPropagation(); setEditMaintId(t.id); setEditMaintForm({ title: t.title, status: t.status, priority: t.priority, scheduledDate: t.scheduledDate, vendorId: t.vendorId, cost: t.cost, notes: t.notes }); }} style={{ padding: "6px 14px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✎ Edit</button>
                                  {t.status !== "Completed" && t.status !== "Cancelled" && (
                                    <button onClick={() => updateTaskStatus(t.id, "Completed")} disabled={taskUpdating === t.id} style={{ padding: "6px 14px", borderRadius: 100, background: "var(--green-s)", color: "var(--green)", border: "1px solid rgba(110,207,151,0.2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✓ Mark Complete</button>
                                  )}
                                  {t.status !== "Completed" && t.status !== "Cancelled" && (
                                    <button onClick={() => updateTaskStatus(t.id, "In Progress")} disabled={taskUpdating === t.id} style={{ padding: "6px 14px", borderRadius: 100, background: "var(--blue-s)", color: "var(--blue)", border: "1px solid rgba(110,168,207,0.2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>In Progress</button>
                                  )}
                                  {t.status === "Completed" && !t.expenseCreated && (
                                    <button onClick={() => generateExpense(t)} style={{ padding: "6px 14px", borderRadius: 100, background: "var(--accent-s)", color: "var(--accent)", border: "1px solid rgba(201,169,110,0.2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⎙ Generate Expense</button>
                                  )}
                                  {t.expenseCreated && <span style={{ fontSize: 12, color: "var(--green)", padding: "6px 0" }}>✓ Expense created</span>}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* ---- REACTIVE INBOX TAB ---- */}
              {!maintLoading && maintTab === "inbox" && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, color: "var(--text2)" }}>Open Requests <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 400 }}>({openReactive.length})</span></div>
                  {openReactive.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "var(--text3)", fontSize: 13, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 24 }}>No open reactive requests 🎉</div>
                  ) : openReactive.map(t => {
                    const pc = priorityColor(t.priority);
                    const sc = statusColor(t.status);
                    return (
                      <div key={t.id} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                          <div style={{ width: 4, height: 40, borderRadius: 4, background: "var(--red)", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{t.title}</div>
                            <div style={{ fontSize: 12, color: "var(--text3)" }}>{t.propertyName || "—"}{t.scheduledDate ? ` · ${t.scheduledDate}` : ""}</div>
                            {t.notes && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{t.notes}</div>}
                            {/* Approval status */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                              {t.approvalStatus && t.approvalStatus !== "Pending Approval" ? (
                                <>
                                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: t.approvalStatus === "Approved" ? "var(--green-s)" : t.approvalStatus === "Rejected" ? "var(--red-s)" : "rgba(207,196,110,0.12)", color: t.approvalStatus === "Approved" ? "var(--green)" : t.approvalStatus === "Rejected" ? "var(--red)" : "#CFC46E" }}>{t.approvalStatus}</span>
                                  {t.approvalStatus === "Approved" && t.approvedBy && <span style={{ fontSize: 11, color: "var(--text3)" }}>by {t.approvedBy}{t.approvalDate ? ` on ${t.approvalDate}` : ""}</span>}
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: "rgba(207,196,110,0.12)", color: "#CFC46E" }}>Pending Approval</span>
                                  <button onClick={async () => { setTaskUpdating(t.id); try { await fetch("/api/maintenance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, approvalStatus: "Approved", approvedBy: userName, approvalDate: new Date().toISOString().split("T")[0] }) }); const d = await fetch("/api/maintenance").then(r => r.json()); setMaintTasks(d.tasks || []); } catch (e) { console.error(e); } setTaskUpdating(null); }} disabled={taskUpdating === t.id} style={{ padding: "4px 12px", borderRadius: 100, background: "var(--green-s)", color: "var(--green)", border: "1px solid rgba(110,207,151,0.2)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{taskUpdating === t.id ? "..." : "✓ Approve"}</button>
                                </>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexDirection: "column" as const, alignItems: "flex-end", flexShrink: 0 }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: pc.bg, color: pc.text, textTransform: "uppercase" as const }}>{t.priority}</span>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: sc.bg, color: sc.text, textTransform: "uppercase" as const }}>{t.status}</span>
                            </div>
                            {/* Vendor assign */}
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <select defaultValue={t.vendorId} onChange={e => assignVendor(t.id, e.target.value)} style={{ ...sel, fontSize: 11, padding: "4px 28px 4px 8px", minWidth: 140 }} disabled={taskUpdating === t.id}>
                                <option value="">Assign vendor…</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                              <button onClick={() => updateTaskStatus(t.id, "Completed")} disabled={taskUpdating === t.id} style={{ padding: "4px 12px", borderRadius: 100, background: "var(--green-s)", color: "var(--green)", border: "1px solid rgba(110,207,151,0.2)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const }}>✓ Resolve</button>
                            </div>
                          </div>
                        </div>
                        {t.status === "Completed" && !t.expenseCreated && (
                          <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={() => generateExpense(t)} style={{ padding: "5px 14px", borderRadius: 100, background: "var(--accent-s)", color: "var(--accent)", border: "1px solid rgba(201,169,110,0.2)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⎙ Generate Expense</button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, marginTop: 28, color: "var(--text2)" }}>Recently Resolved</div>
                  {recentlyResolved.length === 0 ? (
                    <div style={{ padding: 20, color: "var(--text3)", fontSize: 13, textAlign: "center" }}>No resolved tasks yet.</div>
                  ) : recentlyResolved.map(t => (
                    <div key={t.id} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 8, opacity: 0.7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                        <div style={{ width: 4, height: 32, borderRadius: 4, background: "var(--green)", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text3)" }}>{t.propertyName || "—"}{t.completedDate ? ` · Completed ${t.completedDate}` : ""}{t.vendorName ? ` · ${t.vendorName}` : ""}</div>
                          {/* Approval status */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                            {t.approvalStatus && t.approvalStatus !== "Pending Approval" ? (
                              <>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: t.approvalStatus === "Approved" ? "var(--green-s)" : t.approvalStatus === "Rejected" ? "var(--red-s)" : "rgba(207,196,110,0.12)", color: t.approvalStatus === "Approved" ? "var(--green)" : t.approvalStatus === "Rejected" ? "var(--red)" : "#CFC46E" }}>{t.approvalStatus}</span>
                                {t.approvalStatus === "Approved" && t.approvedBy && <span style={{ fontSize: 11, color: "var(--text3)" }}>by {t.approvedBy}{t.approvalDate ? ` on ${t.approvalDate}` : ""}</span>}
                              </>
                            ) : (
                              <>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: "rgba(207,196,110,0.12)", color: "#CFC46E" }}>Pending Approval</span>
                                <button onClick={async () => { setTaskUpdating(t.id); try { await fetch("/api/maintenance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, approvalStatus: "Approved", approvedBy: userName, approvalDate: new Date().toISOString().split("T")[0] }) }); const d = await fetch("/api/maintenance").then(r => r.json()); setMaintTasks(d.tasks || []); } catch (e) { console.error(e); } setTaskUpdating(null); }} disabled={taskUpdating === t.id} style={{ padding: "4px 12px", borderRadius: 100, background: "var(--green-s)", color: "var(--green)", border: "1px solid rgba(110,207,151,0.2)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{taskUpdating === t.id ? "..." : "✓ Approve"}</button>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {t.expenseCreated ? (
                            <span style={{ fontSize: 11, color: "var(--green)" }}>✓ Expense created</span>
                          ) : (
                            <button onClick={() => generateExpense(t)} style={{ padding: "4px 12px", borderRadius: 100, background: "var(--accent-s)", color: "var(--accent)", border: "1px solid rgba(201,169,110,0.2)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⎙ Generate Expense</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* ---- PREVENTIVE CONFIG TAB ---- */}
              {!maintLoading && maintTab === "config" && (
                <>
                  <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20 }}>Recurring maintenance schedules — these drive the preventive tasks on the Schedule tab</div>

                  {showAddConfig && (
                    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>New Preventive Schedule</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Task Name *</div><input value={newCfgName} onChange={e => setNewCfgName(e.target.value)} placeholder="e.g. Monthly pool inspection" style={inp} /></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Category</div><select value={newCfgCat} onChange={e => setNewCfgCat(e.target.value)} style={sel}><option>HVAC</option><option>Pool</option><option>Landscaping</option><option>Pest Control</option><option>Plumbing</option><option>Electrical</option><option>Appliances</option><option>General</option></select></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Frequency</div><select value={newCfgFreq} onChange={e => setNewCfgFreq(e.target.value)} style={sel}><option>Weekly</option><option>Monthly</option><option>Quarterly</option><option>Semi-Annual</option><option>Annual</option></select></div>
                        <div style={{ gridColumn: "1/-1" }}>
                          <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>
                            Properties <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({newCfgProps.length === 0 ? "All" : `${newCfgProps.length} selected`})</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: 12, background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--border)", maxHeight: 180, overflowY: "auto" as const }}>
                            {properties.filter(p => p.status === "Active").map(p => (
                              <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text2)", cursor: "pointer" }}>
                                <input type="checkbox" checked={newCfgProps.includes(p.id)} onChange={e => setNewCfgProps(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))} />
                                {p.name}
                              </label>
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>Leave all unchecked to apply to all properties</div>
                        </div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Vendor</div><select value={newCfgVendor} onChange={e => setNewCfgVendor(e.target.value)} style={sel}><option value="">— None —</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                        <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Next Due</div><input type="date" value={newCfgNextDue} onChange={e => setNewCfgNextDue(e.target.value)} style={inp} /></div>
                        <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Notes</div><textarea value={newCfgNotes} onChange={e => setNewCfgNotes(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" as const }} /></div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={addConfig} disabled={addingConfig} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{addingConfig ? "Saving..." : "Save Schedule"}</button>
                        <button onClick={() => setShowAddConfig(false)} style={{ padding: "9px 20px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {maintConfigs.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No preventive schedules configured yet.</div>
                  ) : maintConfigs.map(c => {
                    const cc = catColor(c.category);
                    const fc = freqColor(c.frequency);
                    const isDue = c.nextDue && c.nextDue <= todayStr;
                    return (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--bg2)", border: `1px solid ${isDue ? "rgba(207,110,110,0.3)" : "var(--border)"}`, borderRadius: 10, marginBottom: 8 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: cc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                          {c.category === "HVAC" ? "❄" : c.category === "Pool" ? "🏊" : c.category === "Landscaping" ? "🌿" : c.category === "Pest Control" ? "🪲" : c.category === "Plumbing" ? "🔧" : c.category === "Electrical" ? "⚡" : c.category === "Appliances" ? "🔌" : "⟡"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{c.taskName}</div>
                          <div style={{ fontSize: 12, color: "var(--text3)" }}>{c.propertyNames.length === 0 ? "All properties" : c.propertyNames.length === 1 ? c.propertyNames[0] : `${c.propertyNames[0]} +${c.propertyNames.length - 1} more`}{c.vendorName ? ` · ${c.vendorName}` : ""}{c.nextDue ? ` · Next: ${c.nextDue}` : ""}</div>
                          {c.notes && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{c.notes}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                          {isDue && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "var(--red-s)", color: "var(--red)" }}>DUE</span>}
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: cc.bg, color: cc.text, textTransform: "uppercase" as const }}>{c.category}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: fc.bg, color: fc.text }}>{c.frequency}</span>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: c.active ? "var(--green-s)" : "rgba(255,255,255,0.05)", color: c.active ? "var(--green)" : "var(--text3)" }}>{c.active ? "Active" : "Inactive"}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* ---- VENDORS TAB ---- */}
              {!maintLoading && maintTab === "vendors" && (() => {
                const maintVendors = vendors.filter(v => v.category === "Maintenance");

                async function addMaintVendor() {
                  if (!newVendorName) return;
                  setAddingVendor(true);
                  try {
                    await fetch("/api/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newVendorName, category: "Maintenance", contact: newVendorContact, location: newVendorLocation, tags: newVendorTags, notes: newVendorNotes }) });
                    const d = await fetch("/api/vendors").then(r => r.json());
                    setVendors(d.vendors || []);
                    setNewVendorName(""); setNewVendorContact(""); setNewVendorLocation(""); setNewVendorTags(""); setNewVendorNotes("");
                    setShowAddMaintVendor(false);
                  } catch (e) { console.error(e); }
                  setAddingVendor(false);
                }

                return (
                  <>
                    <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20 }}>
                      Vendors assigned to maintenance tasks · <span style={{ color: "var(--text3)" }}>{maintVendors.length} maintenance vendor{maintVendors.length !== 1 ? "s" : ""}</span>
                    </div>

                    {showAddMaintVendor && (
                      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>New Maintenance Vendor</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                          <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Name *</div><input value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="e.g. Cabo Pool Services" style={inp} /></div>
                          <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Contact</div><input value={newVendorContact} onChange={e => setNewVendorContact(e.target.value)} placeholder="+52 624 xxx xxxx" style={inp} /></div>
                          <div><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Location</div><input value={newVendorLocation} onChange={e => setNewVendorLocation(e.target.value)} placeholder="Cabo San Lucas" style={inp} /></div>
                          <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Specialties / Tags</div><input value={newVendorTags} onChange={e => setNewVendorTags(e.target.value)} placeholder="e.g. Pool, HVAC, Emergency" style={inp} /></div>
                          <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Notes</div><textarea value={newVendorNotes} onChange={e => setNewVendorNotes(e.target.value)} rows={2} placeholder="License #, availability, preferred contact method..." style={{ ...inp, resize: "vertical" as const }} /></div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={addMaintVendor} disabled={addingVendor} style={{ padding: "9px 20px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{addingVendor ? "Saving..." : "Save Vendor"}</button>
                          <button onClick={() => { setShowAddMaintVendor(false); setNewVendorName(""); setNewVendorContact(""); setNewVendorLocation(""); setNewVendorTags(""); setNewVendorNotes(""); }} style={{ padding: "9px 20px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {maintVendors.length === 0 && !showAddMaintVendor ? (
                      <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
                        No maintenance vendors yet. Click <strong>+ Add Vendor</strong> to get started.
                      </div>
                    ) : maintVendors.map(v => {
                      const activeTasks = maintTasks.filter(t => t.vendorId === v.id && t.status !== "Completed" && t.status !== "Cancelled");
                      const completedTasks = maintTasks.filter(t => t.vendorId === v.id && t.status === "Completed");
                      const tags = v.tags ? v.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
                      return (
                        <div key={v.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 8 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-s)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🔧</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{v.name}</div>
                            {v.contact && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 2 }}>{v.contact}{v.location ? ` · ${v.location}` : ""}</div>}
                            {v.notes && <div style={{ fontSize: 12, color: "var(--text3)" }}>{v.notes}</div>}
                            {tags.length > 0 && <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>{tags.map((t: string) => <span key={t} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "var(--teal-s)", color: "var(--teal-l)", fontWeight: 500 }}>{t}</span>)}</div>}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                            {activeTasks.length > 0 && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 100, background: "var(--orange-s)", color: "var(--orange)", fontWeight: 500 }}>{activeTasks.length} active</span>}
                            {completedTasks.length > 0 && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 100, background: "var(--green-s)", color: "var(--green)", fontWeight: 500 }}>{completedTasks.length} done</span>}
                            <button onClick={() => { setEditVendorId(v.id); setEditVendorForm({ name: v.name, category: v.category, contact: v.contact, location: v.location, tags: v.tags, notes: v.notes }); }} style={{ padding: "3px 10px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✎</button>
                          </div>
                          {editVendorId === v.id && (
                            <div style={{ gridColumn: "1/-1", marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "var(--bg3)", padding: 14, borderRadius: 8, border: "1px solid var(--border)" }}>
                              <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Name</div><input value={editVendorForm.name || ""} onChange={e => setEditVendorForm(f => ({ ...f, name: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                              <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Contact</div><input value={editVendorForm.contact || ""} onChange={e => setEditVendorForm(f => ({ ...f, contact: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                              <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Location</div><input value={editVendorForm.location || ""} onChange={e => setEditVendorForm(f => ({ ...f, location: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                              <div><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Tags</div><input value={editVendorForm.tags || ""} onChange={e => setEditVendorForm(f => ({ ...f, tags: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                              <div style={{ gridColumn: "1/-1" }}><div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 600, marginBottom: 4 }}>Notes</div><input value={editVendorForm.notes || ""} onChange={e => setEditVendorForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, padding: "6px 10px", fontSize: 12 }} /></div>
                              <div style={{ gridColumn: "1/-1", display: "flex", gap: 8 }}>
                                <button onClick={async () => { setSavingVendor(true); await fetch("/api/vendors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: v.id, ...editVendorForm }) }); const d = await fetch("/api/vendors").then(r => r.json()); setVendors(d.vendors || []); setEditVendorId(null); setSavingVendor(false); }} disabled={savingVendor} style={{ padding: "5px 14px", borderRadius: 100, background: "var(--teal)", color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{savingVendor ? "..." : "Save"}</button>
                                <button onClick={() => setEditVendorId(null)} style={{ padding: "5px 14px", borderRadius: 100, border: "1px solid var(--border2)", background: "transparent", color: "var(--text3)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          );
        })()}

        {/* ====== CALENDAR ====== */}
        {activePage === "calendar" && (() => {
          const [year, month] = calMonth.split("-").map(Number);
          const daysInMonth = new Date(year, month, 0).getDate();
          const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

          function prevMonth() {
            const d = new Date(year, month - 2, 1);
            setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          }
          function nextMonth() {
            const d = new Date(year, month, 1);
            setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          }

          function isOccupied(propId: string, day: number): Visit | null {
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            return visits.find(v => v.propertyId === propId && v.status !== "Cancelled" && v.checkIn <= dateStr && v.checkOut > dateStr) || null;
          }

          function visitColor(type: string) {
            if (type === "Owner") return "var(--teal)";
            if (type === "Rental") return "var(--blue)";
            return "#9B8EC4";
          }

          const activeProps = properties.filter(p => p.status === "Active");
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

          // Summary stats for this month
          const monthVisits = visits.filter(v => {
            const start = `${year}-${String(month).padStart(2, "0")}-01`;
            const end = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
            return v.status !== "Cancelled" && v.checkIn <= end && v.checkOut > start;
          });
          const ownerVisits = monthVisits.filter(v => v.visitType === "Owner").length;
          const rentalVisits = monthVisits.filter(v => v.visitType === "Rental").length;
          const occupiedProps = new Set(monthVisits.map(v => v.propertyId)).size;

          return (
            <div style={{ padding: "32px 40px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h1 style={h1s}>Availability Calendar</h1>
                  <p style={{ fontSize: 14, color: "var(--text2)" }}>Portfolio occupancy across all active properties</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", gap: 0 }}>
                    <button onClick={() => setCalView("monthly")} style={{ padding: "6px 14px", borderRadius: "6px 0 0 6px", border: "1px solid var(--border2)", background: calView === "monthly" ? "var(--accent-s)" : "transparent", color: calView === "monthly" ? "var(--accent)" : "var(--text3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Monthly</button>
                    <button onClick={() => setCalView("weekly")} style={{ padding: "6px 14px", borderRadius: "0 6px 6px 0", border: "1px solid var(--border2)", borderLeft: "none", background: calView === "weekly" ? "var(--accent-s)" : "transparent", color: calView === "weekly" ? "var(--accent)" : "var(--text3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Weekly</button>
                  </div>
                  {calView === "monthly" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                      <span style={{ fontSize: 14, fontWeight: 500, minWidth: 140, textAlign: "center" as const }}>{monthLabel}</span>
                      <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => { const d = new Date(calWeekStart); d.setDate(d.getDate() - 7); setCalWeekStart(d.toISOString().split("T")[0]); }} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                      <span style={{ fontSize: 14, fontWeight: 500, minWidth: 200, textAlign: "center" as const }}>Week of {new Date(calWeekStart + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                      <button onClick={() => { const d = new Date(calWeekStart); d.setDate(d.getDate() + 7); setCalWeekStart(d.toISOString().split("T")[0]); }} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                {[
                  { label: "Properties Occupied", value: occupiedProps, color: "var(--accent)" },
                  { label: "Owner Visits", value: ownerVisits, color: "var(--teal-l)" },
                  { label: "Rental Visits", value: rentalVisits, color: "var(--blue)" },
                  { label: "Total Active Properties", value: activeProps.length, color: "var(--text)" },
                ].map(s => (
                  <div key={s.label} style={{ padding: 18, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12 }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text3)", fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontFamily: "var(--fd)", fontSize: 24, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Weekly View */}
              {calView === "weekly" && (() => {
                const ws = new Date(calWeekStart + "T12:00:00");
                const weekDays = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(ws); d.setDate(ws.getDate() + i);
                  return { date: d.toISOString().split("T")[0], label: d.toLocaleDateString("en-US", { weekday: "short" }), day: d.getDate(), month: d.toLocaleDateString("en-US", { month: "short" }) };
                });
                function isOccupiedWeek(propId: string, dateStr: string): Visit | null {
                  return visits.find(v => v.propertyId === propId && v.status !== "Cancelled" && v.checkIn <= dateStr && v.checkOut > dateStr) || null;
                }
                return (
                  <div style={{ overflowX: "auto" }}>
                    <div style={{ minWidth: 700 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "180px repeat(7, 1fr)", gap: 1, marginBottom: 1 }}>
                        <div />
                        {weekDays.map(wd => {
                          const isT = wd.date === todayStr;
                          return <div key={wd.date} style={{ textAlign: "center" as const, padding: "8px 4px", fontSize: 11, color: isT ? "var(--accent)" : "var(--text3)", fontWeight: isT ? 700 : 500, borderBottom: isT ? "2px solid var(--accent)" : "2px solid var(--border)" }}>
                            <div>{wd.label}</div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: isT ? "var(--accent)" : "var(--text)" }}>{wd.day}</div>
                            <div style={{ fontSize: 9 }}>{wd.month}</div>
                          </div>;
                        })}
                      </div>
                      {activeProps.map((prop, ri) => (
                        <div key={prop.id} style={{ display: "grid", gridTemplateColumns: "180px repeat(7, 1fr)", gap: 1, marginBottom: 1 }}>
                          <div style={{ fontSize: 12, color: "var(--text2)", padding: "10px 8px", display: "flex", alignItems: "center", background: ri % 2 === 0 ? "var(--bg2)" : "transparent", borderRadius: "4px 0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{prop.name}</div>
                          {weekDays.map(wd => {
                            const v = isOccupiedWeek(prop.id, wd.date);
                            const isCheckIn = v?.checkIn === wd.date;
                            return <div key={wd.date} title={v ? `${v.guestName || v.visitName} (${v.visitType})` : "Available"} style={{
                              height: 40, background: v ? visitColor(v.visitType) : ri % 2 === 0 ? "var(--bg2)" : "transparent",
                              opacity: v ? 0.85 : 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: v ? "#fff" : "var(--text3)", fontWeight: v ? 600 : 400,
                              borderRadius: isCheckIn ? "4px 0 0 4px" : 0,
                            }}>{v ? (isCheckIn ? (v.guestName || v.visitType).split(" ")[0] : "") : "—"}</div>;
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Monthly View */}
              {calView === "monthly" && <>
              {/* Legend */}
              <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
                {[["Owner", "var(--teal)"], ["Rental", "var(--blue)"], ["Guest", "#9B8EC4"]].map(([label, color]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: color as string }} />
                    {label}
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text3)" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, border: "2px solid var(--accent)" }} />
                  Today
                </div>
              </div>

              {/* Grid */}
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: 900 }}>
                  {/* Day headers */}
                  <div style={{ display: "grid", gridTemplateColumns: `180px repeat(${daysInMonth}, 1fr)`, gap: 1, marginBottom: 1 }}>
                    <div />
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isToday = dateStr === todayStr;
                      const dow = new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "short" })[0];
                      return (
                        <div key={day} style={{ textAlign: "center" as const, padding: "4px 0", fontSize: 10, color: isToday ? "var(--accent)" : "var(--text3)", fontWeight: isToday ? 700 : 400, borderBottom: isToday ? "2px solid var(--accent)" : "2px solid transparent" }}>
                          <div>{dow}</div>
                          <div>{day}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Property rows */}
                  {activeProps.map((prop, ri) => (
                    <div key={prop.id} style={{ display: "grid", gridTemplateColumns: `180px repeat(${daysInMonth}, 1fr)`, gap: 1, marginBottom: 1 }}>
                      {/* Property name */}
                      <div onClick={() => { setActivePage("properties"); setSelectedProp(prop.id); setPropTab("availability"); }} style={{ fontSize: 12, color: "var(--text2)", padding: "6px 8px", display: "flex", alignItems: "center", background: ri % 2 === 0 ? "var(--bg2)" : "transparent", cursor: "pointer", borderRadius: "4px 0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}
                        title={prop.name}>
                        {prop.name}
                      </div>
                      {/* Day cells */}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const v = isOccupied(prop.id, day);
                        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isToday = dateStr === todayStr;
                        const isCheckIn = v?.checkIn === dateStr;
                        const isCheckOut = v ? new Date(v.checkOut + "T00:00:00").toISOString().split("T")[0] === dateStr : false;
                        return (
                          <div key={day} title={v ? `${v.visitName} (${v.visitType})` : undefined} style={{
                            height: 28,
                            background: v ? visitColor(v.visitType) : ri % 2 === 0 ? "var(--bg2)" : "transparent",
                            opacity: v ? 0.85 : 1,
                            borderRadius: isCheckIn ? "4px 0 0 4px" : isCheckOut ? "0 4px 4px 0" : 0,
                            outline: isToday ? "2px solid var(--accent)" : "none",
                            outlineOffset: -1,
                            cursor: v ? "pointer" : "default",
                          }} />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              </>}
            </div>
          );
        })()}

        {/* PLACEHOLDER */}
        {activePage !== "dashboard" && activePage !== "expenses" && activePage !== "deposits" && activePage !== "reports" && activePage !== "housekeeping" && activePage !== "properties" && activePage !== "users" && activePage !== "concierge" && activePage !== "calendar" && activePage !== "maintenance" && (
          <div style={{ padding: "32px 40px" }}><h1 style={h1s}>{navItems.find(n => n.id === activePage)?.label || ""}</h1><p style={{ fontSize: 14, color: "var(--text3)", marginTop: 20 }}>Coming soon — this module will be built next.</p></div>
        )}
      </main>
    </div>
    </>
  );
}